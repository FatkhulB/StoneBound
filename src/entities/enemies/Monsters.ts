import Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';
import type { GameScene } from '../../scenes/GameScene';

export interface MonsterContext {
  playerX: number;
  playerY: number;
  playerHurt: (damage: number, fromX: number) => boolean;
  damageMult: number;
  groundAhead: (x: number, y: number) => boolean;
  onDeath: (id: string) => void;
}

/**
 * Gravemaw (design.md §5 rework): a horned gravewalker that PATROLS, CHASES,
 * TELEGRAPHS (crouch + blazing eyes + sound), then LUNGES with a bite. Damage
 * only happens during the lunge — walking near it is safe (playtest feedback).
 */
export class WalkerMonster extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  hp = 24;
  dead = false;

  private dir: 1 | -1 = 1;
  private readonly speed = 30;
  private readonly chaseSpeed = 46;
  private readonly minX: number;
  private readonly maxX: number;
  private flashUntil = 0;
  private walkTimer = 0;
  private walkFrame: 1 | 2 = 1;
  private aiState: 'patrol' | 'chase' | 'telegraph' | 'attack' | 'recover' = 'patrol';
  private stateUntil = 0;
  private attackHitDone = false;
  private readonly alert: Phaser.GameObjects.Text;
  private readonly damageMult: number;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    minX: number,
    maxX: number,
    damageMult: number,
  ) {
    super(scene, x, y, 'monster_walk1');
    this.id = id;
    this.minX = minX;
    this.maxX = maxX;
    this.damageMult = damageMult;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 13);
    body.setOffset(2, 2);
    this.setDepth(4);
    this.alert = scene.add
      .text(x, y - 26, '!', { fontFamily: 'monospace', fontSize: '10px', color: '#ff5f9e' })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  update(dt: number, ctx: MonsterContext): void {
    if (this.dead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down;
    const now = this.scene.time.now;
    const dx = ctx.playerX - this.x;
    const dy = Math.abs(ctx.playerY - this.y);
    const dist = Math.abs(dx);
    const facePlayer: 1 | -1 = dx >= 0 ? 1 : -1;

    // Ledge walls still turn a patrolling monster around.
    if (this.aiState === 'patrol' || this.aiState === 'chase') {
      const aheadX = this.x + this.dir * 10;
      if (
        grounded &&
        (!ctx.groundAhead(aheadX, this.y + 4) || body.blocked.left || body.blocked.right ||
          (this.aiState === 'patrol' && (aheadX < this.minX || aheadX > this.maxX)))
      ) {
        this.dir = (this.dir === 1 ? -1 : 1) as 1 | -1;
      }
    }

    switch (this.aiState) {
      case 'patrol': {
        body.setVelocityX(this.dir * this.speed);
        if (dist < 96 && dy < 34) {
          this.aiState = 'chase';
        }
        break;
      }
      case 'chase': {
        this.dir = facePlayer;
        body.setVelocityX(this.dir * this.chaseSpeed);
        if (dist < 34 && dy < 26) {
          this.aiState = 'telegraph';
          this.stateUntil = now + 430;
          this.attackHitDone = false;
          this.alert.setPosition(this.x, this.y - 26).setVisible(true);
          audioManager.play('telegraph');
        } else if (dist > 150 || dy > 44) {
          this.aiState = 'patrol';
        }
        break;
      }
      case 'telegraph': {
        body.setVelocityX(0);
        this.dir = facePlayer;
        this.setTexture('monster_telegraph');
        if (now >= this.stateUntil) {
          this.aiState = 'attack';
          this.stateUntil = now + 280;
          body.setVelocityX(this.dir * 210);
          audioManager.play('monsterlunge');
        }
        break;
      }
      case 'attack': {
        this.setTexture('monster_attack');
        // Bite hitbox in front, once per lunge.
        if (!this.attackHitDone) {
          const bx = this.x + this.dir * 18;
          if (Math.abs(ctx.playerX - bx) < 15 && Math.abs(ctx.playerY - this.y) < 20) {
            if (ctx.playerHurt(Math.round(12 * this.damageMult), this.x)) this.attackHitDone = true;
          }
        }
        if (now >= this.stateUntil) {
          this.aiState = 'recover';
          this.stateUntil = now + 700;
          body.setVelocityX(0);
        }
        break;
      }
      case 'recover': {
        body.setVelocityX(0);
        if (now >= this.stateUntil) this.aiState = 'patrol';
        break;
      }
    }

    // Frame animation outside telegraph/attack.
    if (this.aiState === 'patrol' || this.aiState === 'chase') {
      this.walkTimer += dt;
      if (this.walkTimer > 220) {
        this.walkTimer = 0;
        this.walkFrame = this.walkFrame === 1 ? 2 : 1;
      }
      this.setTexture(this.walkFrame === 1 ? 'monster_walk1' : 'monster_walk2');
    }
    this.setFlipX(this.dir === -1);
    if (this.scene.time.now < this.flashUntil) this.setTintFill(0xffffff);
    else this.clearTint();
    this.alert.setPosition(this.x, this.y - 26);
  }

  get isDangerous(): boolean {
    return this.aiState === 'attack';
  }

  hurt(damage: number, fromX: number): void {
    if (this.dead) return;
    this.hp -= damage;
    this.flashUntil = this.scene.time.now + 110;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.x < fromX ? -90 : 90);
    audioManager.play('hit');
    if (this.hp <= 0) this.kill();
  }

  kill(): void {
    if (this.dead) return;
    this.dead = true;
    audioManager.play('enemydie');
    this.alert.destroy();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.35,
      angle: this.dir * 60,
      duration: 240,
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene?: boolean): void {
    this.alert?.destroy();
    super.destroy(fromScene);
  }
}

/**
 * Cinderpot (design.md §5 rework): rooted urn-monster that TELEGRAPHS then SPITS
 * a slow ember bolt the player must jump or dash past. Adds ranged variety.
 */
export class SpitterMonster extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  hp = 20;
  dead = false;

  private aiState: 'idle' | 'telegraph' | 'recover' = 'idle';
  private stateUntil = 0;
  private flashUntil = 0;
  private readonly alert: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
  ) {
    super(scene, x, y, 'spitter_idle');
    this.id = id;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(9, 9);
    body.setOffset(1, 1);
    body.setImmovable(true);
    this.setDepth(4);
    this.alert = scene.add
      .text(x, y - 22, '!', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd24a' })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  update(dt: number, ctx: MonsterContext): void {
    if (this.dead) return;
    void dt;
    const now = this.scene.time.now;
    const dx = ctx.playerX - this.x;
    const dist = Math.abs(dx);
    const facePlayer: 1 | -1 = dx >= 0 ? 1 : -1;

    if (this.aiState === 'idle') {
      this.setTexture('spitter_idle');
      if (dist < 150 && Math.abs(ctx.playerY - this.y) < 30) {
        this.aiState = 'telegraph';
        this.stateUntil = now + 520;
        this.alert.setPosition(this.x, this.y - 22).setVisible(true);
        audioManager.play('telegraph');
      }
    } else if (this.aiState === 'telegraph') {
      this.setTexture('spitter_attack');
      this.setFlipX(facePlayer === -1);
      if (now >= this.stateUntil) {
        this.alert.setVisible(false);
        (this.scene as GameScene).spawnEmberBolt(this.x + facePlayer * 8, this.y - 7, facePlayer);
        audioManager.play('spit');
        this.aiState = 'recover';
        this.stateUntil = now + 1600;
      }
    } else if (this.aiState === 'recover' && now >= this.stateUntil) {
      this.aiState = 'idle';
    }

    if (this.scene.time.now < this.flashUntil) this.setTintFill(0xffffff);
    else this.clearTint();
    this.alert.setPosition(this.x, this.y - 22);
  }

  hurt(damage: number, fromX: number): void {
    if (this.dead) return;
    void fromX;
    this.hp -= damage;
    this.flashUntil = this.scene.time.now + 110;
    audioManager.play('hit');
    if (this.hp <= 0) this.kill();
  }

  kill(): void {
    if (this.dead) return;
    this.dead = true;
    audioManager.play('enemydie');
    this.alert.destroy();
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.4,
      duration: 220,
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene?: boolean): void {
    this.alert?.destroy();
    super.destroy(fromScene);
  }
}

/** Slow ember projectile: destroy on wall contact, expiry, or player hit. */
export class EmberBolt extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1, damage: number) {
    super(scene, x, y, 'bolt');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(dir * 130);
    body.setAllowGravity(false);
    this.setDepth(5);
    this.setFlipX(dir === -1);
    scene.tweens.add({ targets: this, alpha: 0.55, duration: 120, yoyo: true, repeat: -1 });
    scene.time.delayedCall(2600, () => {
      if (this.active) this.destroy();
    });
    void damage;
  }
}
