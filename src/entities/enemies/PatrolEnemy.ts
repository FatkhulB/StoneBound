import Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';

/**
 * Patrol archetype (design.md §5): moves between limits, avoids unintentional
 * ledge falls, contact damage, dies to attacks and yields a coin reward once.
 */
export class PatrolEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  hp = 30;
  dead = false;
  private dir: 1 | -1 = 1;
  private readonly speed = 30;
  private readonly minX: number;
  private readonly maxX: number;
  private flashUntil = 0;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    minX: number,
    maxX: number,
  ) {
    super(scene, x, y, 'patrol');
    this.id = id;
    this.minX = minX;
    this.maxX = maxX;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 11);
    body.setOffset(1, 2);
    this.setDepth(4);
  }

  /** groundAhead: callback the scene provides for ledge detection. */
  update(dt: number, groundAhead: (x: number, y: number) => boolean): void {
    if (this.dead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down;
    const aheadX = this.x + this.dir * 10;
    if (
      grounded &&
      (!groundAhead(aheadX, this.y + 4) || body.blocked.left || body.blocked.right || aheadX < this.minX || aheadX > this.maxX)
    ) {
      this.dir = this.dir === 1 ? -1 : 1;
    }
    body.setVelocityX(this.dir * this.speed);
    this.setFlipX(this.dir === -1);
    if (this.scene.time.now < this.flashUntil) this.setTintFill(0xffffff);
    else this.clearTint();
    void dt;
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
    audioManager.play('boss-hit');
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.4,
      duration: 220,
      onComplete: () => this.destroy(),
    });
  }
}
