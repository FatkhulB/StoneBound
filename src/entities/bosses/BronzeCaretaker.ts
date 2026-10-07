import Phaser from 'phaser';
import type { DifficultyValues } from '../../config/difficulty';
import type { Player } from '../player/Player';
import { audioManager } from '../../systems/AudioManager';
import { EV, EventBus } from '../../utils/EventBus';

type BossState =
  | 'dormant'
  | 'intro'
  | 'idle'
  | 'telegraph_hammer'
  | 'hammer'
  | 'telegraph_leap'
  | 'leap'
  | 'land'
  | 'dead';

/**
 * Stage 1 boss — Bronze Caretaker (design.md §4): marked leap and slow hammer
 * swing. Two readable patterns; every attack telegraphs 400–600ms (scaled by
 * difficulty). Resets to full HP on player respawn until defeated.
 */
export class BronzeCaretaker extends Phaser.Physics.Arcade.Sprite {
  readonly id = 'caretaker';
  hpMax: number;
  hp: number;
  defeated = false;
  state: BossState = 'dormant';

  private readonly diff: DifficultyValues;
  private readonly homeX: number;
  private readonly homeY: number;
  private stateUntil = 0;
  private attackReadyAt = 0;
  private leapTargetX = 0;
  private hammer: Phaser.GameObjects.Image;
  private marker: Phaser.GameObjects.Image;
  private exclaim: Phaser.GameObjects.Text;
  private readonly arena: { x0: number; x1: number };
  private readonly reduceShake: boolean;
  private onDefeated: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    diff: DifficultyValues,
    arena: { x0: number; x1: number },
    opts: { reduceShake: boolean; onDefeated: () => void },
  ) {
    super(scene, x, y, 'caretaker');
    this.diff = diff;
    this.hpMax = Math.round(120 * diff.bossHpMultiplier);
    this.hp = this.hpMax;
    this.homeX = x;
    this.homeY = y;
    this.arena = arena;
    this.reduceShake = opts.reduceShake;
    this.onDefeated = opts.onDefeated;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(26, 34);
    body.setOffset(4, 6);
    this.setDepth(6);
    this.setActive(true).setVisible(true);

    this.hammer = scene.add.image(x, y, 'hammer').setOrigin(0, 0.5).setDepth(7);
    this.marker = scene.add.image(0, 0, 'marker').setVisible(false).setDepth(3);
    this.exclaim = scene.add
      .text(x, y - 60, '!', { fontFamily: 'monospace', fontSize: '16px', color: '#ff5050' })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(20);
  }

  /** Boss fight begins (player entered the arena). */
  startIntro(): void {
    if (this.defeated || this.state !== 'dormant') return;
    this.state = 'intro';
    this.stateUntil = this.scene.time.now + 900;
    this.exclaim.setText('!').setVisible(true);
    EventBus.emit(EV.bossActive, true);
    EventBus.emit(EV.bossHp, this.hp / this.hpMax);
    audioManager.playMusic('boss');
  }

  update(dt: number, player: Player): void {
    if (this.defeated || this.state === 'dormant') return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const distX = player.x - this.x;
    const dirToPlayer: 1 | -1 = distX >= 0 ? 1 : -1;
    const tele = this.diff.telegraphMultiplier;

    switch (this.state) {
      case 'intro': {
        body.setVelocityX(0);
        this.face(dirToPlayer);
        if (now >= this.stateUntil) {
          this.exclaim.setVisible(false);
          this.state = 'idle';
          this.attackReadyAt = now + 400;
        }
        break;
      }
      case 'idle': {
        this.face(dirToPlayer);
        body.setVelocityX(Math.abs(distX) > 60 ? dirToPlayer * 40 : 0);
        if (now >= this.attackReadyAt) {
          if (Math.abs(distX) < 46) {
            this.state = 'telegraph_hammer';
            this.stateUntil = now + 550 * tele;
            this.exclaim.setText('!').setVisible(true);
            audioManager.play('lever');
          } else {
            this.state = 'telegraph_leap';
            this.stateUntil = now + 650 * tele;
            this.leapTargetX = Phaser.Math.Clamp(player.x, this.arena.x0 + 40, this.arena.x1 - 40);
            this.marker.setPosition(this.leapTargetX, player.y - 4).setVisible(true);
            this.scene.tweens.add({ targets: this.marker, alpha: 0.25, yoyo: true, repeat: -1, duration: 130 });
          }
        }
        break;
      }
      case 'telegraph_hammer': {
        body.setVelocityX(0);
        this.face(dirToPlayer);
        // Hammer raised high — readable wind-up.
        this.hammer.setRotation(-2.1 * this.facingToSign());
        this.hammer.setPosition(this.x + this.facingToSign() * 12, this.y - 30);
        if (now >= this.stateUntil) {
          this.state = 'hammer';
          this.stateUntil = now + 260;
          this.exclaim.setVisible(false);
          audioManager.play('attack');
        }
        break;
      }
      case 'hammer': {
        body.setVelocityX(0);
        // Sweep the hammer down in front.
        const t = 1 - Math.max(0, (this.stateUntil - now) / 260);
        this.hammer.setRotation(Phaser.Math.Linear(-2.1, 0.9, t) * this.facingToSign());
        this.hammer.setPosition(this.x + this.facingToSign() * 12, this.y - 26);
        const zone = this.hammerHitbox();
        if (Phaser.Geom.Rectangle.Overlaps(zone, playerBounds(player))) {
          player.hurt(Math.round(20 * this.diff.enemyDamageMultiplier), this.x);
        }
        if (now >= this.stateUntil) {
          this.state = 'idle';
          this.attackReadyAt = now + 1200;
        }
        break;
      }
      case 'telegraph_leap': {
        body.setVelocityX(0);
        this.face(dirToPlayer);
        this.exclaim.setText('!').setVisible(true);
        this.marker.setVisible(true);
        if (now >= this.stateUntil) {
          this.exclaim.setVisible(false);
          this.scene.tweens.killTweensOf(this.marker);
          this.marker.setVisible(false);
          const airtime = 1.0; // vy=-460 under g=900
          body.setVelocityY(-460);
          body.setVelocityX((this.leapTargetX - this.x) / airtime);
          this.state = 'leap';
          audioManager.play('jump');
        }
        break;
      }
      case 'leap': {
        if (body.blocked.down) {
          this.state = 'land';
          this.stateUntil = now + 620;
          body.setVelocityX(0);
          audioManager.play('boss-hit');
          if (!this.reduceShake) this.scene.cameras.main.shake(140, 0.006);
          this.dustBurst();
          const landDmg = Math.round(20 * this.diff.enemyDamageMultiplier);
          if (Math.abs(player.x - this.x) < 36 && player.y > this.y - 40) {
            player.hurt(landDmg, this.x);
          }
        }
        break;
      }
      case 'land': {
        body.setVelocityX(0);
        this.hammer.setRotation(0);
        this.hammer.setPosition(this.x + this.facingToSign() * 12, this.y - 14);
        if (now >= this.stateUntil) {
          this.state = 'idle';
          this.attackReadyAt = now + 500;
        }
        break;
      }
      default:
        break;
    }
    void dt;
  }

  private hammerHitbox(): Phaser.Geom.Rectangle {
    const f = this.facingToSign();
    return new Phaser.Geom.Rectangle(this.x + (f === 1 ? 8 : -48), this.y - 40, 40, 40);
  }

  private facingToSign(): 1 | -1 {
    return this.flipX ? -1 : 1;
  }

  private face(dir: 1 | -1): void {
    this.setFlipX(dir === -1);
  }

  private dustBurst(): void {
    for (let i = 0; i < 10; i++) {
      const p = this.scene.add
        .image(this.x + Phaser.Math.Between(-20, 20), this.y - Phaser.Math.Between(0, 8), 'spark')
        .setDepth(3)
        .setTint(0x8b93b0);
      this.scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-40, 40),
        y: p.y - Phaser.Math.Between(10, 40),
        alpha: 0,
        duration: 380,
        onComplete: () => p.destroy(),
      });
    }
  }

  hurt(damage: number): void {
    if (this.defeated || this.state === 'dormant') return;
    this.hp = Math.max(0, this.hp - damage);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());
    EventBus.emit(EV.bossHp, this.hp / this.hpMax);
    audioManager.play('boss-hit');
    if (this.hp <= 0) this.die();
  }

  private die(): void {
    this.defeated = true;
    this.state = 'dead';
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    EventBus.emit(EV.bossActive, false);
    audioManager.play('boss-die');
    this.scene.tweens.add({
      targets: [this, this.hammer],
      alpha: 0,
      angle: this.flipX ? 90 : -90,
      duration: 700,
      onComplete: () => {
        this.hammer.setVisible(false);
        this.onDefeated();
      },
    });
  }

  /** Player respawn before defeat: boss returns to full HP at its post (design.md §7). */
  resetFight(): void {
    if (this.defeated) return;
    this.hp = this.hpMax;
    this.state = 'dormant';
    this.setAlpha(1).setAngle(0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(this.homeX, this.homeY);
    this.hammer.setAlpha(1).setRotation(0).setAngle(0);
    this.marker.setVisible(false);
    this.exclaim.setVisible(false);
    EventBus.emit(EV.bossActive, false);
  }

  destroy(fromScene?: boolean): void {
    this.hammer.destroy();
    this.marker.destroy();
    this.exclaim.destroy();
    super.destroy(fromScene);
  }
}

function playerBounds(player: Player): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(player.x - 6, player.y - 16, 12, 16);
}
