import Phaser from 'phaser';
import { PLAYER } from '../../config/player-config';
import type { InputManager } from '../../systems/InputManager';
import type { DifficultyValues } from '../../config/difficulty';
import { audioManager } from '../../systems/AudioManager';

/**
 * Pip + the stonebound sword (design.md §5, §6). Deliberate heavy swings with
 * visible wind-up and recovery; each swing damages a target at most once.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: 1 | -1 = 1;
  hp: number;
  readonly maxHp: number;
  dying = false;

  private invulnUntil = 0;
  private lastGroundedAt = -Infinity;
  private lastJumpPressAt = -Infinity;
  private jumpedSinceGround = false;
  private jumpDamped = false;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private knockbackUntil = 0;
  private attackStartedAt = -Infinity;
  private swingId = 0;
  readonly swingHitIds = new Set<string>();
  private lastSafe = { x: 0, y: 0 };
  private lastSafeUpdateAt = 0;
  private runAnimTimer = 0;
  private runFrame = 0;

  readonly veyr: Phaser.GameObjects.Image;
  private slash: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, difficulty: DifficultyValues) {
    super(scene, x, y, 'pip_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1); // feet anchor
    this.maxHp = difficulty.playerMaxHp;
    this.hp = this.maxHp;
    this.lastSafe = { x, y };

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 16);
    body.setOffset((this.width - 12) / 2, this.height - 16);

    this.veyr = scene.add.image(x, y, 'veyr_stone').setDepth(4);
    this.slash = scene.add
      .rectangle(x, y, PLAYER.combat.reachX, PLAYER.combat.reachY, 0xffffff, 0.3)
      .setDepth(6)
      .setVisible(false);
    this.setDepth(5);
  }

  update(time: number, dt: number, input: InputManager): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    if (this.dying) {
      body.setVelocityX(0);
      this.refreshVisual(grounded, 0);
      return;
    }

    // ---- horizontal movement (keep facing when standing still) ----
    const moveX = input.moveX;
    if (moveX !== 0) this.facing = moveX > 0 ? 1 : -1;
    const dashing = time < this.dashUntil;
    // Knockback overrides input briefly so the push is actually visible.
    const knocked = time < this.knockbackUntil;
    if (dashing) body.setVelocityX(this.facing * PLAYER.dash.speed);
    else if (!knocked) body.setVelocityX(moveX * PLAYER.moveSpeed);

    // ---- jump: coyote time + buffer + variable height ----
    if (grounded) {
      this.lastGroundedAt = time;
      this.jumpedSinceGround = false;
      this.jumpDamped = false;
    }
    if (input.pressed('jump')) this.lastJumpPressAt = time;
    const canCoyote = time - this.lastGroundedAt <= PLAYER.coyoteTimeMs;
    const buffered = time - this.lastJumpPressAt <= PLAYER.jumpBufferMs;
    if (buffered && canCoyote && !this.jumpedSinceGround && !dashing) {
      body.setVelocityY(PLAYER.jumpVelocity);
      this.jumpedSinceGround = true;
      this.jumpDamped = false;
      this.lastJumpPressAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      audioManager.play('jump');
    }
    if (this.jumpedSinceGround && body.velocity.y < 0 && !input.held('jump') && !this.jumpDamped) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpReleaseDamp);
      this.jumpDamped = true;
    }

    // ---- dash ----
    if (input.pressed('dash') && time >= this.dashReadyAt && !dashing) {
      this.dashUntil = time + PLAYER.dash.durationMs;
      this.dashReadyAt = time + PLAYER.dash.cooldownMs;
      audioManager.play('dash');
    }

    // ---- attack: windup → active → recovery ----
    if (input.pressed('attack') && time - this.attackStartedAt >= PLAYER.combat.intervalMs) {
      this.attackStartedAt = time;
      this.swingId += 1;
      this.swingHitIds.clear();
      audioManager.play('attack');
    }
    const sinceAttack = time - this.attackStartedAt;
    const attackActive = sinceAttack >= PLAYER.combat.windupMs && sinceAttack < PLAYER.combat.windupMs + PLAYER.combat.activeMs;
    this.slash.setVisible(attackActive);
    if (attackActive) {
      const c = this.attackHitboxCenter();
      this.slash.setPosition(c.x, c.y);
    }

    // ---- last safe position (pit recovery, design.md §5) ----
    if (grounded && time - this.lastSafeUpdateAt > 300) {
      this.lastSafeUpdateAt = time;
      this.lastSafe = { x: this.x, y: this.y };
    }

    // ---- invulnerability blink ----
    const invuln = time < this.invulnUntil;
    this.setAlpha(invuln && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);

    this.refreshVisual(grounded, Math.abs(body.velocity.x), dt);
  }

  private refreshVisual(grounded: boolean, speedX: number, dt = 0): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let key = 'pip_idle';
    if (!grounded) key = body.velocity.y < 0 ? 'pip_jump' : 'pip_fall';
    else if (speedX > 10) {
      this.runAnimTimer += dt;
      if (this.runAnimTimer > 120) {
        this.runAnimTimer = 0;
        this.runFrame = this.runFrame === 0 ? 1 : 0;
      }
      key = this.runFrame === 0 ? 'pip_run1' : 'pip_run2';
    }
    if (this.texture.key !== key) this.setTexture(key);
    this.setFlipX(this.facing === -1);
    this.veyr.setPosition(this.x - this.facing * 7, this.y - 9);
    this.veyr.setFlipX(this.facing === -1);
    this.veyr.setDepth(3);
  }

  /** Attack hitbox during active frames, else null. One hit per target per swing. */
  get attackHitbox(): Phaser.Geom.Rectangle | null {
    const since = this.scene.time.now - this.attackStartedAt;
    if (this.dying) return null;
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
    return { x: this.x + this.facing * (PLAYER.combat.offset + PLAYER.combat.reachX / 2), y: this.y - 10 };
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
    super.destroy(fromScene);
  }
}
