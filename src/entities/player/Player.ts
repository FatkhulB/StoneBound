import Phaser from 'phaser';
import { PLAYER } from '../../config/player-config';
import type { InputManager } from '../../systems/InputManager';
import type { DifficultyValues } from '../../config/difficulty';
import { audioManager } from '../../systems/AudioManager';

export type CharacterId = 'boy' | 'girl';

/**
 * Pip + the stonebound sword (design.md §5, §6). Chibi pixel hero with an
 * outline, animated idle/run/air/attack frames, double jump, and a readable
 * slash arc on every swing.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: 1 | -1 = 1;
  hp: number;
  readonly maxHp: number;
  dying = false;

  private readonly char: CharacterId;
  private invulnUntil = 0;
  private lastGroundedAt = -Infinity;
  private lastJumpPressAt = -Infinity;
  private jumpDamped = false;
  private airJumpsUsed = 0;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private attackStartedAt = -Infinity;
  private lungeUntil = 0;
  private knockbackUntil = 0;
  private swingId = 0;
  readonly swingHitIds = new Set<string>();
  private lastSafe = { x: 0, y: 0 };
  private lastSafeUpdateAt = 0;
  private blinkTimer = 0;
  private runAnimTimer = 0;
  private runFrame = 0;

  readonly veyr: Phaser.GameObjects.Image;
  private slash: Phaser.GameObjects.Image;
  private slash2: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, difficulty: DifficultyValues, character: CharacterId) {
    super(scene, x, y, `pip_${character}_idle1`);
    this.char = character;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.maxHp = difficulty.playerMaxHp;
    this.hp = this.maxHp;
    this.lastSafe = { x, y };

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(11, 21);
    body.setOffset(3, 1);

    this.veyr = scene.add.image(x, y, 'veyr_stone').setDepth(3);
    this.slash = scene.add.image(x, y, 'slash1').setOrigin(0.2, 0.5).setDepth(7).setVisible(false);
    this.slash2 = scene.add.image(x, y, 'slash2').setOrigin(0.2, 0.5).setDepth(7).setVisible(false);
    this.setDepth(5);
  }

  private frameKey(key: string): string {
    return `pip_${this.char}_${key}`;
  }

  update(time: number, dt: number, input: InputManager): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    if (this.dying) {
      body.setVelocityX(0);
      this.refreshVisual('idle1');
      return;
    }

    // ---- horizontal movement ----
    const moveX = input.moveX;
    if (moveX !== 0) this.facing = moveX > 0 ? 1 : -1;
    const dashing = time < this.dashUntil;
    const lunging = time < this.lungeUntil;
    const knocked = time < this.knockbackUntil;
    if (dashing) body.setVelocityX(this.facing * PLAYER.dash.speed);
    else if (lunging) body.setVelocityX(this.facing * (PLAYER.moveSpeed + 80));
    else if (!knocked) body.setVelocityX(moveX * PLAYER.moveSpeed);

    // ---- jump: coyote + buffer + double jump ----
    if (grounded) {
      this.lastGroundedAt = time;
      this.airJumpsUsed = 0;
      this.jumpDamped = false;
    }
    if (input.pressed('jump')) this.lastJumpPressAt = time;
    const canCoyote = time - this.lastGroundedAt <= PLAYER.coyoteTimeMs;
    const buffered = time - this.lastJumpPressAt <= PLAYER.jumpBufferMs;
    if (buffered && !dashing) {
      if (grounded || canCoyote) {
        body.setVelocityY(PLAYER.jumpVelocity);
        this.airJumpsUsed = 0;
        this.lastJumpPressAt = -Infinity;
        this.lastGroundedAt = -Infinity;
        audioManager.play('jump');
      } else if (this.airJumpsUsed < 1) {
        this.airJumpsUsed += 1;
        body.setVelocityY(PLAYER.jumpVelocity * 0.92);
        this.jumpDamped = false;
        this.lastJumpPressAt = -Infinity;
        this.airJumpPuff();
        audioManager.play('airjump');
      }
    }
    if (body.velocity.y < 0 && !input.held('jump') && !this.jumpDamped) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpReleaseDamp);
      this.jumpDamped = true;
    }

    // ---- dash ----
    if (input.pressed('dash') && time >= this.dashReadyAt && !dashing) {
      this.dashUntil = time + PLAYER.dash.durationMs;
      this.dashReadyAt = time + PLAYER.dash.cooldownMs;
      audioManager.play('dash');
      this.afterimage();
    }

    // ---- attack: windup → active → recovery ----
    if (input.pressed('attack') && time - this.attackStartedAt >= PLAYER.combat.intervalMs) {
      this.attackStartedAt = time;
      this.swingId += 1;
      this.swingHitIds.clear();
      this.lungeUntil = time + 140;
      audioManager.play('attack');
    }
    const sinceAttack = time - this.attackStartedAt;
    const attackActive = sinceAttack >= PLAYER.combat.windupMs && sinceAttack < PLAYER.combat.windupMs + PLAYER.combat.activeMs;
    this.slash.setVisible(attackActive);
    this.slash2.setVisible(attackActive && sinceAttack > PLAYER.combat.windupMs + PLAYER.combat.activeMs * 0.4);
    if (attackActive) {
      const sx = this.x + this.facing * 16;
      const sy = this.y - 12;
      this.slash.setPosition(sx, sy);
      this.slash2.setPosition(sx, sy);
      this.slash.setFlipX(this.facing === -1);
      this.slash2.setFlipX(this.facing === -1);
      this.slash.setAngle(this.facing === 1 ? 0 : 0);
    }

    // ---- last safe position (pit recovery) ----
    if (grounded && time - this.lastSafeUpdateAt > 300) {
      this.lastSafeUpdateAt = time;
      this.lastSafe = { x: this.x, y: this.y };
    }

    // ---- invulnerability blink ----
    const invuln = time < this.invulnUntil;
    this.setAlpha(invuln && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);

    // ---- frame selection ----
    let key = 'idle1';
    if (attackActive || sinceAttack < PLAYER.combat.windupMs) {
      key = attackActive ? 'attack2' : 'attack1';
    } else if (!grounded) {
      key = 'air';
    } else if (Math.abs(body.velocity.x) > 10) {
      this.runAnimTimer += dt;
      if (this.runAnimTimer > 110) {
        this.runAnimTimer = 0;
        this.runFrame = this.runFrame === 0 ? 1 : 0;
      }
      key = this.runFrame === 0 ? 'run1' : 'run2';
    } else {
      this.blinkTimer += dt;
      key = this.blinkTimer % 2600 > 2300 ? 'idle2' : 'idle1';
    }
    this.refreshVisual(key);
  }

  private refreshVisual(key: string): void {
    const wanted = this.frameKey(key);
    if (this.texture.key !== wanted) this.setTexture(wanted);
    this.setFlipX(this.facing === -1);
    this.veyr.setPosition(this.x - this.facing * 7, this.y - 13);
    this.veyr.setFlipX(this.facing === -1);
  }

  private airJumpPuff(): void {
    for (let i = 0; i < 6; i++) {
      const p = this.scene.add
        .image(this.x + Phaser.Math.Between(-6, 6), this.y - 4, 'spark')
        .setDepth(4)
        .setTint(0xa8f5e9)
        .setAlpha(0.9);
      this.scene.tweens.add({
        targets: p,
        y: p.y + Phaser.Math.Between(4, 10),
        x: p.x + Phaser.Math.Between(-10, 10),
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy(),
      });
    }
  }

  private afterimage(): void {
    const ghost = this.scene.add
      .image(this.x, this.y - 11, this.texture.key)
      .setFlipX(this.flipX)
      .setAlpha(0.35)
      .setTint(0x38d6c4)
      .setDepth(4);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  /** Attack hitbox during active frames, else null. One hit per target per swing. */
  get attackHitbox(): Phaser.Geom.Rectangle | null {
    if (this.dying) return null;
    const since = this.scene.time.now - this.attackStartedAt;
    if (since < PLAYER.combat.windupMs || since >= PLAYER.combat.windupMs + PLAYER.combat.activeMs) return null;
    const c = this.attackHitboxCenter();
    return new Phaser.Geom.Rectangle(
      c.x - PLAYER.combat.reachX / 2,
      c.y - PLAYER.combat.reachY / 2,
      PLAYER.combat.reachX,
      PLAYER.combat.reachY,
    );
  }

  private attackHitboxCenter(): { x: number; y: number } {
    return { x: this.x + this.facing * (PLAYER.combat.offset + PLAYER.combat.reachX / 2), y: this.y - 11 };
  }

  get currentSwingId(): number {
    return this.swingId;
  }

  get dashCooldownFraction(): number {
    const remaining = this.dashReadyAt - this.scene.time.now;
    if (remaining <= 0) return 0;
    return Phaser.Math.Clamp(remaining / PLAYER.dash.cooldownMs, 0, 1);
  }

  get invulnerable(): boolean {
    return this.scene.time.now < this.invulnUntil;
  }

  get lastSafePosition(): { x: number; y: number } {
    return this.lastSafe;
  }

  /** Apply damage with light knockback + 800ms invulnerability. False if ignored. */
  hurt(damage: number, fromX: number): boolean {
    if (this.dying || this.invulnerable) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.invulnUntil = this.scene.time.now + PLAYER.invulnerabilityMs;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dir = this.x < fromX ? -1 : 1;
    body.setVelocityX(dir * PLAYER.knockbackX);
    body.setVelocityY(PLAYER.knockbackY);
    this.knockbackUntil = this.scene.time.now + 160;
    audioManager.play('hurt');
    this.setTint(0xff6b6b);
    this.scene.time.delayedCall(160, () => this.clearTint());
    if (this.hp <= 0) {
      this.dying = true;
      audioManager.play('death');
    }
    return true;
  }

  /** Pit fall: damage, then return to the last safe position (design.md §5). */
  recoverFromPit(): boolean {
    if (this.dying) return false;
    const applied = this.hurt(PLAYER.pitDamage, this.x - this.facing * 10);
    this.teleport(this.lastSafe.x, this.lastSafe.y);
    return applied;
  }

  teleport(x: number, y: number): void {
    this.setPosition(x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    this.invulnUntil = this.scene.time.now + 500;
  }

  respawnFullHp(x: number, y: number): void {
    this.hp = this.maxHp;
    this.dying = false;
    this.teleport(x, y);
    this.setAlpha(1);
  }

  healFull(): void {
    this.hp = this.maxHp;
    this.dying = false;
  }

  destroy(fromScene?: boolean): void {
    this.veyr.destroy();
    this.slash.destroy();
    this.slash2.destroy();
    super.destroy(fromScene);
  }
}
