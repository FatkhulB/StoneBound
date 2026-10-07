import Phaser from 'phaser';
import { GAME, TILE, type StageRuntimeState } from '../config/game-config';
import { DIFFICULTIES, type DifficultyValues } from '../config/difficulty';
import { STARTING_LIVES } from '../config/player-config';
import { getStage, type StageData, type StageObject } from '../data/stages';
import { getWeapon } from '../data/weapons';
import { Player } from '../entities/player/Player';
import { PatrolEnemy } from '../entities/enemies/PatrolEnemy';
import { BronzeCaretaker } from '../entities/bosses/BronzeCaretaker';
import { AttemptLedger } from '../systems/AttemptLedger';
import { InputManager } from '../systems/InputManager';
import { audioManager } from '../systems/AudioManager';
import { progression } from '../services/ProgressionManager';
import type { WorldSnapshot } from '../services/SaveModel';
import { EV, EventBus } from '../utils/EventBus';
import { releaseAllTouch, touchControls } from '../ui/TouchControls';
import { UIScene } from './UIScene';

interface PushBlock {
  id: string;
  sprite: Phaser.Physics.Arcade.Image;
  homeX: number;
  homeY: number;
}

interface GateObj {
  id: string;
  image: Phaser.GameObjects.Image;
  body: Phaser.Physics.Arcade.StaticBody;
  open: boolean;
}

interface CrackedObj {
  id: string;
  images: Phaser.GameObjects.Image[];
  bodies: Phaser.Physics.Arcade.StaticBody[];
  broken: boolean;
}

/**
 * Gameplay scene for a stage attempt (design.md §3, §7). Owns the world; UI
 * lives in the parallel UIScene and only renders through the event bus.
 */
export class GameScene extends Phaser.Scene {
  private stage!: StageData;
  private difficulty!: DifficultyValues;
  private inputMgr!: InputManager;
  private player!: Player;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private map!: Phaser.Tilemaps.Tilemap;

  private enemies = new Map<string, PatrolEnemy>();
  private blocks: PushBlock[] = [];
  private plates: { id: string; x: number; y: number; image: Phaser.GameObjects.Image }[] = [];
  private gates = new Map<string, GateObj>();
  private cracked = new Map<string, CrackedObj>();
  private checkpoints: { id: string; x: number; y: number; image: Phaser.GameObjects.Image; activated: boolean }[] = [];
  private coins = new Map<string, { sprite: Phaser.GameObjects.Image; x: number; y: number }>();
  private lever: { x: number; y: number; image: Phaser.GameObjects.Image } | null = null;
  private keySprite: Phaser.GameObjects.Image | null = null;
  private exitDoor: { x: number; y: number } | null = null;
  private boss: BronzeCaretaker | null = null;
  private dialogTriggers: { key: string; x: number; fired: boolean }[] = [];

  private ledger = new AttemptLedger();
  private lives = STARTING_LIVES;
  private hasMainKey = false;
  private bossDefeated = false;
  private keyTaken = false;
  private attemptId = '';
  private attemptStartedAt = 0;
  private runtimeState: StageRuntimeState = 'exploration';
  private worldPaused = false;
  private deathProcessing = false;

  /**
   * Pause/resume the whole simulation (input AND physics). Dialogue must never
   * be readable under attack, and a frozen world cannot moonwalk into a pit.
   */
  private setWorldPaused(paused: boolean): void {
    this.worldPaused = paused;
    if (paused) {
      this.physics.world.pause();
      (this.player?.body as Phaser.Physics.Arcade.Body | null)?.setVelocity(0, 0);
    } else {
      this.physics.world.resume();
    }
  }
  private interactPrompt!: Phaser.GameObjects.Text;
  private interactTarget: { kind: 'lever' | 'cracked' | 'exit'; id?: string; x: number; y: number } | null = null;
  private uiRef: UIScene | null = null;

  constructor() {
    super('Game');
  }

  private invalidStage = false;

  init(data: { stageId?: number; resume?: boolean }): void {
    const stageId = data.stageId ?? progression.current.activeAttempt?.stageId ?? 1;
    const stage = getStage(stageId);
    if (!stage || !stage.playable) {
      this.invalidStage = true;
      this.stage = getStage(1)!;
      return;
    }
    this.stage = stage;
    const existing = progression.current.activeAttempt;
    if (data.resume && existing && existing.stageId === stageId && !existing.completionCommitted) {
      this.difficulty = DIFFICULTIES[existing.difficultyAtStart];
    } else {
      progression.startAttempt(stageId, progression.current.difficulty);
      this.difficulty = DIFFICULTIES[progression.current.difficulty];
    }
  }

  create(): void {
    try {
      if (this.invalidStage) {
        this.scene.start('StageSelect');
        return;
      }
      this.runtimeState = 'exploration';
      this.worldPaused = false;
      this.deathProcessing = false;

      this.buildMap();
      this.buildNightWorld();
      this.spawnObjects();
      this.setupPlayer();
      this.setupCamera();
      this.setupEvents();

      // ---- attempt state: fresh or resumed (design.md §7, §12) ----
      const attempt = progression.current.activeAttempt;
      this.attemptId = attempt?.attemptId ?? '';
      this.attemptStartedAt = this.time.now;
      if (attempt && attempt.stageId === this.stage.id && attempt.completionCommitted === false) {
        this.ledger.restore(attempt);
        this.lives = attempt.livesRemaining;
        this.hasMainKey = attempt.hasMainKey;
        this.keyTaken = attempt.hasMainKey;
        this.bossDefeated = attempt.bossDefeated;
        if (this.bossDefeated) this.markBossDefeatedRestored();
        const snap = attempt.checkpointSnapshot;
        if (snap) {
          this.restoreSnapshot(snap);
          this.player.respawnFullHp(snap.playerX, snap.playerY);
        }
      } else {
        this.lives = STARTING_LIVES;
      }

      this.scene.launch('UI');
      this.uiRef = this.scene.get('UI') as UIScene;
      if (touchControls.isTouchDevice) touchControls.show();
      audioManager.playMusic('explore');
    } catch (err) {
      // A broken stage must never leave the player stuck on a dead screen.
      console.error('[STONEBOUND] stage failed to load', err);
      EventBus.emit(EV.toast, 'Stage failed to load — returning to the map.');
      this.scene.start('StageSelect');
      return;
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
  }

  // ------------------------------------------------------------ map

  private buildMap(): void {
    const { width, height } = this.stage;
    const pxW = width * TILE;
    const pxH = height * TILE;
    const rows: number[][] = this.stage.layout.map((row, y) =>
      row.split('').map((ch, x) => {
        if (ch === '#') {
          const above = y > 0 ? this.stage.layout[y - 1][x] : '.';
          return above === '#' || above === 'W' ? 2 : 1;
        }
        if (ch === 'W') return 3;
        if (ch === 'P') return 4;
        return 0;
      }),
    );
    this.map = this.make.tilemap({ data: rows, tileWidth: TILE, tileHeight: TILE });
    const tileset = this.map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    this.layer = this.map.createLayer(0, tileset!, 0, 0)!;
    this.layer.setCollision([1, 2, 3, 4]);
    this.layer.setDepth(1);

    this.physics.world.setBounds(0, 0, pxW, pxH);
    this.cameras.main.setBounds(0, 0, pxW, pxH);
    this.cameras.main.setBackgroundColor(GAME.backgroundColor);

    // Parallax silhouettes (placeholder art).
    this.add
      .tileSprite(0, pxH - 130, pxW, 90, 'hills_far')
      .setOrigin(0, 0)
      .setScrollFactor(0.15, 0.9)
      .setDepth(-3);
    this.add
      .tileSprite(0, pxH - 76, pxW, 70, 'hills_near')
      .setOrigin(0, 0)
      .setScrollFactor(0.3, 0.95)
      .setDepth(-2);
  }

  private spawnObjects(): void {
    for (const o of this.stage.objects) this.spawnObject(o);
    this.interactPrompt = this.add
      .text(0, 0, 'E', { fontFamily: GAME.fontFamily, fontSize: '9px', color: '#ffd24a' })
      .setOrigin(0.5)
      .setDepth(30)
      .setVisible(false);
  }

  private spawnObject(o: StageObject): void {
    const cx = o.x * TILE + TILE / 2;
    const bottom = (o.y !== undefined ? o.y + 1 : 0) * TILE;
    switch (o.type) {
      case 'spawn':
        break; // handled in setupPlayer
      case 'hint':
        this.add
          .text(cx, (o.y ?? 15) * TILE, o.text ?? '', {
            fontFamily: GAME.fontFamily,
            fontSize: '7px',
            color: '#8b93b0',
          })
          .setOrigin(0.5, 1)
          .setDepth(0);
        break;
      case 'dialog':
        this.dialogTriggers.push({ key: o.key ?? '', x: o.x * TILE, fired: false });
        break;
      case 'coin': {
        const x = o.x * TILE + 8;
        const y = o.y! * TILE + 8;
        const sprite = this.add.image(x, y, 'coin').setDepth(2);
        this.tweens.add({ targets: sprite, y: y - 3, yoyo: true, repeat: -1, duration: 420 });
        this.coins.set(o.id ?? `c${o.x}-${o.y}`, { sprite, x, y });
        break;
      }
      case 'patrol': {
        const e = new PatrolEnemy(this, o.id!, cx, bottom, o.minX! * TILE, o.maxX! * TILE);
        this.enemies.set(o.id!, e);
        this.physics.add.collider(e, this.layer);
        break;
      }
      case 'checkpoint': {
        const image = this.add.image(cx, bottom, 'checkpoint_off').setOrigin(0.5, 1).setDepth(2);
        this.checkpoints.push({ id: o.id!, x: cx, y: bottom, image, activated: false });
        break;
      }
      case 'plate': {
        const image = this.add.image(cx, bottom, 'plate_up').setOrigin(0.5, 1).setDepth(1);
        this.plates.push({ id: o.id!, x: cx, y: bottom, image });
        break;
      }
      case 'block': {
        const sprite = this.physics.add.image(cx, bottom - 7, 'stone_block');
        const body = sprite.body as Phaser.Physics.Arcade.Body;
        body.setSize(14, 14);
        body.setDragX(1400);
        body.setMaxVelocity(70, 600);
        sprite.setDepth(3);
        this.blocks.push({ id: o.id!, sprite, homeX: cx, homeY: bottom - 7 });
        this.physics.add.collider(sprite, this.layer);
        break;
      }
      case 'lever':
        this.lever = { x: cx, y: bottom, image: this.add.image(cx, bottom, 'lever_right').setOrigin(0.5, 1).setDepth(2) };
        break;
      case 'gate':
      case 'arena_gate': {
        const h = (o.heightTiles ?? 3) * TILE;
        const top = (o.y ?? 17) * TILE;
        const image = this.add.image(cx, top + h / 2, 'gate').setDisplaySize(14, h);
        this.physics.add.existing(image, true);
        const body = image.body as Phaser.Physics.Arcade.StaticBody;
        image.setDepth(4);
        const gate: GateObj = { id: o.id!, image, body, open: false };
        if (o.type === 'arena_gate') {
          image.setVisible(false);
          body.enable = false;
        }
        this.gates.set(o.id!, gate);
        break;
      }
      case 'key': {
        this.keySprite = this.add.image(cx, (o.y ?? 16) * TILE + 8, 'key_main').setDepth(3);
        this.tweens.add({ targets: this.keySprite, y: '-=3', yoyo: true, repeat: -1, duration: 380 });
        break;
      }
      case 'cracked': {
        const images: Phaser.GameObjects.Image[] = [];
        const bodies: Phaser.Physics.Arcade.StaticBody[] = [];
        for (let i = 0; i < (o.heightTiles ?? 1); i++) {
          const y = (o.y! + i) * TILE + TILE / 2;
          const img = this.add.image(cx, y, 'cracked').setDepth(3);
          this.physics.add.existing(img, true);
          const body = img.body as Phaser.Physics.Arcade.StaticBody;
          images.push(img);
          bodies.push(body);
        }
        this.cracked.set(o.id!, { id: o.id!, images, bodies, broken: false });
        break;
      }
      case 'boss': {
        const arenaPx = this.stage.bossArena
          ? { x0: this.stage.bossArena.x0 * TILE, x1: (this.stage.bossArena.x1 + 1) * TILE }
          : { x0: 0, x1: this.stage.width * TILE };
        this.boss = new BronzeCaretaker(this, cx, bottom, this.difficulty, arenaPx, {
          reduceShake: progression.current.settings.reduceShake,
          onDefeated: () => this.onBossDefeated(),
        });
        this.physics.add.collider(this.boss, this.layer);
        break;
      }
      case 'exit':
        this.add.image(cx, bottom, 'exit_door').setOrigin(0.5, 1).setDepth(3);
        this.exitDoor = { x: cx, y: bottom };
        break;
      case 'decor': {
        // Living-world dressing: torches flicker, grass/flowers frame the path.
        const kind = o.id ?? '';
        if (kind.startsWith('torch')) {
          const img = this.add.image(cx, bottom, 'torch1').setOrigin(0.5, 1).setDepth(2);
          this.time.addEvent({
            delay: 160,
            loop: true,
            callback: () => img.setTexture(img.texture.key === 'torch1' ? 'torch2' : 'torch1'),
          });
          const glow = this.add.image(cx, bottom - 9, 'spark').setScale(14, 10).setTint(0xffb054).setAlpha(0.13).setDepth(1);
          this.tweens.add({ targets: glow, alpha: 0.07, duration: 300, yoyo: true, repeat: -1 });
        } else if (kind.startsWith('grass')) {
          this.add.image(cx, bottom, 'grass').setOrigin(0.5, 1).setDepth(2);
        } else if (kind.startsWith('flower')) {
          this.add.image(cx, bottom, 'flower').setOrigin(0.5, 1).setDepth(2);
        } else if (kind.startsWith('column')) {
          this.add.image(cx, bottom, 'column').setOrigin(0.5, 1).setDepth(0).setAlpha(0.85);
        }
        break;
      }
      default:
        break;
    }
  }

  private setupPlayer(): void {
    const spawn = this.stage.objects.find((o) => o.type === 'spawn');
    const x = spawn ? spawn.x * TILE + 8 : 32;
    const y = spawn ? (spawn.y ?? 17) * TILE : 270;
    this.player = new Player(this, x, y, this.difficulty, progression.current.character);
    this.physics.add.collider(this.player, this.layer);
    for (const b of this.blocks) this.physics.add.collider(this.player, b.sprite);
    for (const b of this.blocks) {
      for (const other of this.blocks) {
        if (b !== other) this.physics.add.collider(b.sprite, other.sprite);
      }
    }
    for (const g of this.gates.values()) this.physics.add.collider(this.player, g.image);
    for (const c of this.cracked.values()) for (const img of c.images) this.physics.add.collider(this.player, img);
  }

  /**
   * Living night world behind the playable layer: gradient sky, twinkling stars,
   * a crescent moon, drifting clouds, ruined towers with lit windows, and
   * fireflies wandering near the ground (design.md §4 "vibes" pass).
   */
  private nightClouds: { image: Phaser.GameObjects.TileSprite; speed: number }[] = [];

  private buildNightWorld(): void {
    const pxW = this.stage.width * TILE;
    const pxH = this.stage.height * TILE;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#0b0d18');

    // Gradient sky bands (parallax ~fixed).
    const sky = this.add.graphics().setScrollFactor(0.02, 0.02).setDepth(-6);
    const bands = ['#0b0d18', '#101226', '#171a33', '#1d2040'];
    bands.forEach((c, i) => {
      sky.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1);
      sky.fillRect(0, i * 46, cam.width + 4, 47);
    });

    // Stars: static field + a few twinklers, far background.
    const starGfx = this.add.graphics().setScrollFactor(0.05, 0.05).setDepth(-5);
    starGfx.fillStyle(0xffffff, 0.85);
    for (let i = 0; i < 90; i++) {
      starGfx.fillRect(Phaser.Math.Between(4, cam.width - 4), Phaser.Math.Between(4, 150), 1, 1);
    }
    for (let i = 0; i < 10; i++) {
      const s = this.add
        .image(Phaser.Math.Between(10, cam.width - 10), Phaser.Math.Between(8, 140), 'spark')
        .setScrollFactor(0.05, 0.05)
        .setDepth(-5)
        .setAlpha(0.9);
      this.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(800, 2000), yoyo: true, repeat: -1 });
    }

    // Moon (slow parallax).
    this.add.image(cam.width - 60, 34, 'moon').setScrollFactor(0.04, 0.04).setDepth(-5);

    // Drifting clouds, three parallax depths.
    const mkCloud = (key: string, y: number, scroll: number, speed: number, alpha: number): void => {
      const img = this.add
        .tileSprite(0, y, pxW + 240, 20, key)
        .setOrigin(0, 0)
        .setScrollFactor(scroll, 0.1)
        .setDepth(-4)
        .setAlpha(alpha);
      this.nightClouds.push({ image: img, speed });
    };
    mkCloud('cloud1', 24, 0.12, 2.2, 0.75);
    mkCloud('cloud2', 52, 0.18, -1.6, 0.65);
    mkCloud('cloud1', 80, 0.24, 1.1, 0.5);

    // Ruined towers with lit windows + dead trees, mid-ground.
    const towers = this.add
      .tileSprite(0, pxH - 160, pxW + 240, 74, 'tower_bg')
      .setOrigin(0, 0)
      .setScrollFactor(0.35, 0.9)
      .setDepth(-3)
      .setAlpha(0.95);
    void towers;
    this.add.tileSprite(0, pxH - 120, pxW + 240, 44, 'tree').setOrigin(0, 0).setScrollFactor(0.5, 0.92).setDepth(-2).setAlpha(0.7);

    // Near hills (existing silhouette).
    this.add
      .tileSprite(0, pxH - 76, pxW, 70, 'hills_near')
      .setOrigin(0, 0)
      .setScrollFactor(0.3, 0.95)
      .setDepth(-2)
      .setAlpha(0.9);

    // Fireflies wandering near the ground across the whole stage.
    for (let i = 0; i < 12; i++) {
      const fx = Phaser.Math.Between(40, pxW - 40);
      const fy = pxH - Phaser.Math.Between(20, 90);
      const fly = this.add.image(fx, fy, 'firefly').setDepth(2).setAlpha(0.7);
      this.tweens.add({
        targets: fly,
        x: fx + Phaser.Math.Between(-50, 50),
        y: fy + Phaser.Math.Between(-22, 22),
        alpha: 0.25,
        duration: Phaser.Math.Between(1600, 3200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1200),
      });
    }
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.setDeadzone(50, 36);
  }

  private setupEvents(): void {
    this.inputMgr = new InputManager(this);

    EventBus.on(EV.dialogueStart, this.onDialogueStart);
    EventBus.on(EV.dialogueClosed, this.onDialogueClosed);
    EventBus.on(EV.pauseRequested, this.openPause);
    EventBus.on(EV.pauseResume, this.onResume);
    EventBus.on(EV.pauseRestart, this.onRestartRequested);
    EventBus.on(EV.pauseExit, this.onExitToMap);
    EventBus.on(EV.gameOverRestart, this.onRestartRequested);
    EventBus.on(EV.gameOverExit, this.onExitToMap);

    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onShutdown = (): void => {
    EventBus.off(EV.dialogueStart, this.onDialogueStart);
    EventBus.off(EV.dialogueClosed, this.onDialogueClosed);
    EventBus.off(EV.pauseRequested, this.openPause);
    EventBus.off(EV.pauseResume, this.onResume);
    EventBus.off(EV.pauseRestart, this.onRestartRequested);
    EventBus.off(EV.pauseExit, this.onExitToMap);
    EventBus.off(EV.gameOverRestart, this.onRestartRequested);
    EventBus.off(EV.gameOverExit, this.onExitToMap);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    releaseAllTouch();
    touchControls.hide();
    this.inputMgr?.destroy();
  };

  // ------------------------------------------------------------ frame

  update(_time: number, delta: number): void {
    this.inputMgr.update();
    this.uiRef?.setHudState({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      lives: this.lives,
      attemptCoins: this.ledger.coins,
      hasKey: this.hasMainKey,
      dashCooldownFraction: this.player.dashCooldownFraction,
    });

    if (this.worldPaused) return;
    if (this.inputMgr.pressed('pause')) {
      this.openPause();
      return;
    }
    const dt = delta / 1000;
    for (const cloud of this.nightClouds) cloud.image.tilePositionX += cloud.speed * dt * 10;

    this.player.update(this.time.now, delta, this.inputMgr);
    this.updateEnemies();
    this.boss?.update(dt, this.player);
    this.updateBlocks();
    this.updatePuzzle();
    this.updatePickups();
    this.updateCombat();
    this.updateTriggers();
    this.updateInteract();
    this.updatePitAndDeath();
  }

  private updateEnemies(): void {
    const groundAhead = (x: number, y: number): boolean => {
      const tile = this.map.getTileAtWorldXY(x, y);
      return tile !== null && tile.collides;
    };
    this.enemies.forEach((e) => e.update(0, groundAhead));
    // Contact damage.
    for (const e of this.enemies.values()) {
      if (e.dead) continue;
      if (Math.abs(e.x - this.player.x) < 13 && Math.abs(e.y - this.player.y) < 16) {
        this.player.hurt(Math.round(10 * this.difficulty.enemyDamageMultiplier), e.x);
      }
    }
  }

  private updateBlocks(): void {
    const pv = (this.player.body as Phaser.Physics.Arcade.Body).velocity;
    for (const b of this.blocks) {
      const body = b.sprite.body as Phaser.Physics.Arcade.Body;
      if (!body.blocked.down && body.velocity.y !== 0) continue; // only push grounded blocks
      const dx = b.sprite.x - this.player.x;
      const dy = b.sprite.y - this.player.y;
      if (
        Math.abs(dx) < 18 &&
        Math.abs(dy) < 18 &&
        Math.abs(pv.x) > 5 &&
        Math.sign(pv.x) === Math.sign(dx)
      ) {
        body.setVelocityX(Math.sign(dx) * 55);
      }
    }
  }

  private updatePuzzle(): void {
    let allPressed = true;
    for (const plate of this.plates) {
      const pressed = this.blocks.some((b) => {
        const body = b.sprite.body as Phaser.Physics.Arcade.Body;
        return Math.abs(b.sprite.x - plate.x) < 7 && Math.abs(b.sprite.y - (plate.y - 7)) < 10 && body.blocked.down;
      });
      plate.image.setTexture(pressed ? 'plate_down' : 'plate_up');
      if (!pressed) allPressed = false;
    }
    const gate = this.gates.get('key_gate');
    if (gate && !gate.open && allPressed && this.plates.length > 0) this.openGate('key_gate');
  }

  private updatePickups(): void {
    this.coins.forEach((c, id) => {
      if (!c.sprite.visible) return;
      if (Math.abs(c.x - this.player.x) < 11 && Math.abs(c.y - (this.player.y - 8)) < 14) {
        if (this.ledger.collectPickup(id, 1) > 0) {
          c.sprite.setVisible(false);
          audioManager.play('coin');
        }
      }
    });
    if (this.keySprite && this.keySprite.visible && !this.keyTaken) {
      if (Math.abs(this.keySprite.x - this.player.x) < 13 && Math.abs(this.keySprite.y - (this.player.y - 8)) < 16) {
        this.keyTaken = true;
        this.hasMainKey = true;
        this.keySprite.setVisible(false);
        audioManager.play('key');
        EventBus.emit(EV.toast, 'Main key acquired.');
        progression.recordKeyPickup();
      }
    }
  }

  private updateCombat(): void {
    const hitbox = this.player.attackHitbox;
    if (!hitbox) return;
    const weapon = getWeapon(progression.current.equippedWeaponId);
    const damage = weapon?.damage ?? 12;
    const hit = (id: string): boolean => {
      if (this.player.swingHitIds.has(id)) return false;
      this.player.swingHitIds.add(id);
      return true;
    };
    this.enemies.forEach((e, id) => {
      if (e.dead) return;
      if (hitbox.contains(e.x, e.y - 6) && hit(id)) {
        const wasAlive = e.hp > 0;
        e.hurt(damage, this.player.x);
        this.hitSparks(e.x, e.y - 6, 0xff9ecb);
        if (wasAlive && e.dead) {
          // Enemy reward: 1–3 coins, granted once per enemy per attempt (design.md §8).
          const reward = Phaser.Math.Between(1, 3);
          this.ledger.rewardEnemy(id, reward);
          this.syncLedger();
        }
      }
    });
    if (this.boss && !this.boss.defeated && this.boss.state !== 'dormant') {
      if (hitbox.contains(this.boss.x, this.boss.y - 20) && hit('boss')) {
        this.boss.hurt(damage);
        this.hitSparks(this.boss.x, this.boss.y - 20, 0xffd24a);
      }
    }
    // Boss body contact damage.
    if (this.boss && !this.boss.defeated && this.boss.state !== 'dormant') {
      if (Math.abs(this.boss.x - this.player.x) < 20 && Math.abs(this.boss.y - this.player.y) < 22) {
        this.player.hurt(Math.round(15 * this.difficulty.enemyDamageMultiplier), this.boss.x);
      }
    }
  }

  private updateTriggers(): void {
    for (const t of this.dialogTriggers) {
      if (!t.fired && this.player.x > t.x) {
        t.fired = true;
        EventBus.emit(EV.dialogueOpen, t.key);
      }
    }
    // Boss arena trigger (key required first — design.md §3).
    if (
      this.runtimeState === 'exploration' &&
      this.boss &&
      !this.boss.defeated &&
      this.hasMainKey &&
      this.player.x > (this.stage.bossArena!.x0 + 3) * TILE
    ) {
      this.runtimeState = 'bossIntro';
      this.closeGate('arena_gate');
      const arena = this.stage.bossArena!;
      this.cameras.main.setBounds(arena.x0 * TILE, 0, (arena.x1 + 1 - arena.x0) * TILE, this.stage.height * TILE);
      this.boss.startIntro();
      this.time.delayedCall(950, () => {
        if (this.runtimeState === 'bossIntro') this.runtimeState = 'bossFight';
      });
    }
    for (const cp of this.checkpoints) {
      if (!cp.activated && Math.abs(cp.x - this.player.x) < 10 && Math.abs(cp.y - this.player.y) < 20) {
        this.activateCheckpoint(cp);
      }
    }
  }

  private updateInteract(): void {
    let target: { kind: 'lever' | 'cracked' | 'exit'; id?: string; x: number; y: number } | null = null;
    if (this.lever && Math.abs(this.lever.x - this.player.x) < 26) {
      target = { kind: 'lever', x: this.lever.x, y: this.lever.y - 26 };
    }
    if (!target) {
      for (const c of this.cracked.values()) {
        if (c.broken) continue;
        const near = c.images.some((img) => Math.abs(img.x - this.player.x) < 26 && Math.abs(img.y - this.player.y) < 30);
        if (near) {
          target = { kind: 'cracked', id: c.id, x: c.images[0].x, y: c.images[0].y - 12 };
          break;
        }
      }
    }
    if (!target && this.exitDoor && Math.abs(this.exitDoor.x - this.player.x) < 26) {
      target = { kind: 'exit', x: this.exitDoor.x, y: this.exitDoor.y - 40 };
    }
    const changed = this.interactTarget?.kind !== target?.kind || this.interactTarget?.id !== target?.id;
    this.interactTarget = target;
    if (changed) touchControls.setInteractAvailable(target !== null);
    if (target) {
      this.interactPrompt.setPosition(target.x, target.y).setVisible(true);
      if (this.inputMgr.pressed('interact')) this.activateInteract();
    } else {
      this.interactPrompt.setVisible(false);
    }
  }

  private activateInteract(): void {
    const t = this.interactTarget;
    if (!t) return;
    if (t.kind === 'lever') {
      audioManager.play('lever');
      this.lever?.image.setTexture('lever_left');
      this.time.delayedCall(300, () => this.lever?.image.setTexture('lever_right'));
      // Puzzle reset: only this puzzle's objects (design.md §4).
      for (const b of this.blocks) {
        const body = b.sprite.body as Phaser.Physics.Arcade.Body;
        body.reset(b.homeX, b.homeY);
      }
      if (!this.keyTaken) this.closeGate('key_gate');
      EventBus.emit(EV.toast, 'Puzzle reset.');
    } else if (t.kind === 'cracked' && t.id) {
      const c = this.cracked.get(t.id);
      if (c && !c.broken) {
        c.broken = true;
        for (const body of c.bodies) body.enable = false;
        c.images.forEach((img) =>
          this.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => img.setVisible(false) }),
        );
        audioManager.play('break');
      }
    } else if (t.kind === 'exit') {
      this.tryCompleteStage();
    }
  }

  private updatePitAndDeath(): void {
    const worldBottom = this.stage.height * TILE;
    if (this.player.y > worldBottom + 24) {
      this.player.recoverFromPit();
      // Harden: if the recovery spot is not safe ground, fall back to spawn.
      const safe = this.player.lastSafePosition;
      if (!this.isSafeGround(safe.x, safe.y)) {
        const spawn = this.stage.objects.find((o) => o.type === 'spawn');
        this.player.teleport((spawn?.x ?? 2) * TILE + 8, (spawn?.y ?? 17) * TILE);
      }
    }
    if (this.player.dying && !this.deathProcessing) {
      this.deathProcessing = true;
      this.setWorldPaused(true);
      releaseAllTouch();
      this.tweens.add({ targets: this.player, angle: 90, duration: 250 });
      this.time.delayedCall(950, () => this.processLifeLoss());
    }
  }

  private processLifeLoss(): void {
    this.syncLedger();
    const remaining = progression.recordLifeLoss();
    this.lives = remaining;
    if (remaining > 0) {
      EventBus.emit(EV.toast, `Lives remaining: ${remaining}`);
      this.player.setAngle(0);
      this.respawnPlayer();
      this.setWorldPaused(false);
      this.deathProcessing = false;
    } else {
      // No Lives Remaining — checkpoint continuation is not offered (design.md §7).
      this.scene.pause();
      this.scene.launch('GameOver');
    }
  }

  private respawnPlayer(): void {
    const snap = progression.current.activeAttempt?.checkpointSnapshot;
    if (snap) {
      this.restoreSnapshot(snap);
      this.player.respawnFullHp(snap.playerX, snap.playerY);
    } else {
      // No checkpoint yet: initial world state, but key/ledger/boss flags persist.
      for (const b of this.blocks) (b.sprite.body as Phaser.Physics.Arcade.Body).reset(b.homeX, b.homeY);
      if (!this.keyTaken) this.closeGate('key_gate');
      if (this.keySprite) this.keySprite.setVisible(!this.keyTaken);
      this.syncEnemies([]);
      if (!this.bossDefeated) this.boss?.resetFight();
      const spawn = this.stage.objects.find((o) => o.type === 'spawn');
      this.player.respawnFullHp((spawn?.x ?? 2) * TILE + 8, (spawn?.y ?? 17) * TILE);
    }
  }

  /** Make enemy alive/dead state match the given dead-id list. */
  private syncEnemies(deadIds: string[]): void {
    const defs = this.stage.objects.filter((o) => o.type === 'patrol');
    for (const def of defs) {
      const id = def.id!;
      const current = this.enemies.get(id);
      const shouldStayDead = deadIds.includes(id);
      if (shouldStayDead) {
        if (current && !current.dead) current.kill();
        continue;
      }
      if (!current || current.dead) {
        current?.destroy();
        this.enemies.delete(id);
        const ne = new PatrolEnemy(this, id, def.x * TILE + 8, (def.y ?? 17) * TILE + TILE, def.minX! * TILE, def.maxX! * TILE);
        this.physics.add.collider(ne, this.layer);
        this.enemies.set(id, ne);
      }
    }
  }

  private restoreSnapshot(snap: WorldSnapshot): void {
    for (const b of this.blocks) {
      const saved = snap.blocks.find((s) => s.id === b.id);
      const x = saved?.x ?? b.homeX;
      const y = saved?.y ?? b.homeY;
      (b.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y);
    }
    for (const c of this.cracked.values()) {
      const wasOpen = snap.crackedOpen.includes(c.id);
      c.broken = wasOpen;
      for (const body of c.bodies) body.enable = !wasOpen;
      c.images.forEach((img) => {
        img.setVisible(!wasOpen);
        img.setAlpha(1);
      });
    }
    this.syncEnemies(snap.enemiesDead);
    if (this.keyTaken || snap.hasMainKey) this.openGate('key_gate');
    else this.closeGate('key_gate');
    if (this.keySprite) this.keySprite.setVisible(!this.keyTaken);
    if (!this.bossDefeated) {
      this.boss?.resetFight();
      this.closeGate('arena_gate');
      this.cameras.main.setBounds(0, 0, this.stage.width * TILE, this.stage.height * TILE);
      if (this.runtimeState === 'bossFight' || this.runtimeState === 'bossIntro') this.runtimeState = 'exploration';
    }
  }

  // ------------------------------------------------------------ gates & puzzle

  /** Impact spark burst that sells every landed hit. */
  private hitSparks(x: number, y: number, tint: number): void {
    for (let i = 0; i < 7; i++) {
      const p = this.add.image(x, y, 'spark').setDepth(8).setTint(i % 2 ? tint : 0xffffff).setScale(0.8);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-18, 18),
        y: y + Phaser.Math.Between(-14, 10),
        alpha: 0,
        angle: Phaser.Math.Between(-90, 90),
        duration: 240,
        onComplete: () => p.destroy(),
      });
    }
  }

  private openGate(id: string): void {
    const gate = this.gates.get(id);
    if (!gate || gate.open) return;
    gate.open = true;
    gate.body.enable = false;
    this.tweens.add({ targets: gate.image, alpha: 0, duration: 350 });
    audioManager.play('gate');
  }

  private closeGate(id: string): void {
    const gate = this.gates.get(id);
    if (!gate || !gate.open) return;
    gate.open = false;
    gate.body.enable = true;
    gate.image.setAlpha(1);
    if (id === 'arena_gate') gate.image.setVisible(true);
    audioManager.play('gate');
  }

  private markBossDefeatedRestored(): void {
    if (!this.boss) return;
    this.boss.defeated = true;
    this.boss.state = 'dead';
    this.boss.setAlpha(0);
    (this.boss.body as Phaser.Physics.Arcade.Body).enable = false;
    this.openGate('arena_gate');
  }

  private onBossDefeated(): void {
    this.bossDefeated = true;
    this.runtimeState = 'exitReady';
    this.syncLedger();
    progression.recordBossDefeat();
    this.openGate('arena_gate');
    this.cameras.main.setBounds(0, 0, this.stage.width * TILE, this.stage.height * TILE);
    audioManager.playMusic('explore');
    EventBus.emit(EV.dialogueOpen, 'stage1_bossdown');
  }

  // ------------------------------------------------------------ checkpoint & completion

  /** A position is safe when its landing tile is solid and the two body corners above are free. */
  private isSafeGround(x: number, y: number): boolean {
    const below = this.map.getTileAtWorldXY(x, y + 2);
    if (!below || !below.collides) return false;
    const topLeft = this.map.getTileAtWorldXY(x - 6, y - 18);
    const topRight = this.map.getTileAtWorldXY(x + 6, y - 18);
    const mid = this.map.getTileAtWorldXY(x, y - 8);
    return (!topLeft || !topLeft.collides) && (!topRight || !topRight.collides) && (!mid || !mid.collides);
  }

  private activateCheckpoint(cp: { id: string; x: number; y: number; image: Phaser.GameObjects.Image; activated: boolean }): void {
    cp.activated = true;
    cp.image.setTexture('checkpoint_on');
    audioManager.play('checkpoint');
    EventBus.emit(EV.toast, 'Checkpoint Reached');
    const snap: WorldSnapshot = {
      playerX: cp.x,
      playerY: cp.y,
      blocks: this.blocks.map((b) => ({ id: b.id, x: b.sprite.x, y: b.sprite.y })),
      platesPressed: [],
      gatesOpen: [...this.gates.entries()].filter(([, g]) => g.open).map(([id]) => id),
      crackedOpen: [...this.cracked.values()].filter((c) => c.broken).map((c) => c.id),
      enemiesDead: [...this.enemies.values()].filter((e) => e.dead).map((e) => e.id),
      hasMainKey: this.hasMainKey,
      bossDefeated: this.bossDefeated,
    };
    this.syncLedger();
    progression.recordCheckpoint(cp.id, snap);
  }

  private syncLedger(): void {
    progression.syncAttemptLedger(this.ledger.coins, this.ledger.collectedPickupIds, this.ledger.rewardedEnemyIds);
  }

  /** Exit requires key AND boss defeat — with visible feedback (design.md §3). */
  private tryCompleteStage(): void {
    if (this.runtimeState === 'complete') return;
    if (!this.hasMainKey) {
      EventBus.emit(EV.toast, 'Find the key first.');
      audioManager.play('ui');
      return;
    }
    if (!this.bossDefeated) {
      EventBus.emit(EV.toast, 'Defeat the guardian first.');
      audioManager.play('ui');
      return;
    }
    this.runtimeState = 'complete';
    this.setWorldPaused(true);
    releaseAllTouch();
    audioManager.play('door');
    EventBus.emit(EV.dialogueOpen, 'stage1_exit', () => {
      this.syncLedger();
      const summary = progression.completeStage(this.attemptId);
      const timeMs = this.time.now - this.attemptStartedAt;
      this.scene.stop('UI');
      this.scene.start('Result', { stageId: this.stage.id, summary, timeMs });
    });
  }

  // ------------------------------------------------------------ pause / navigation

  private onDialogueStart = (): void => {
    this.setWorldPaused(true);
    releaseAllTouch();
  };
  private onDialogueClosed = (): void => {
    if (!this.deathProcessing) this.setWorldPaused(false);
  };

  private openPause = (): void => {
    if (!this.scene.isActive()) return;
    releaseAllTouch();
    this.scene.launch('Pause');
    this.scene.pause();
  };
  private onResume = (): void => {
    this.scene.resume();
  };
  private onRestartRequested = (): void => {
    progression.abandonAttempt();
    this.scene.resume();
    this.scene.stop('Pause');
    this.scene.stop('GameOver');
    this.scene.stop('UI');
    this.scene.restart({ stageId: this.stage.id });
  };
  private onExitToMap = (): void => {
    progression.abandonAttempt();
    this.scene.resume();
    this.scene.stop('Pause');
    this.scene.stop('GameOver');
    this.scene.stop('UI');
    this.scene.start('StageSelect');
  };

  private onWindowBlur = (): void => {
    if (this.scene.isActive() && !this.worldPaused) this.openPause();
  };
  private onVisibility = (): void => {
    if (document.hidden && this.scene.isActive() && !this.worldPaused) this.openPause();
  };
}
