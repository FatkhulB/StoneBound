import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { COLORS, cssColor } from '../ui/theme';
import { audioManager } from '../systems/AudioManager';

export interface ButtonOptions {
  width?: number;
  height?: number;
  disabled?: boolean;
  muted?: boolean;
  accent?: 'teal' | 'pink' | 'muted';
  onClick?: () => void;
}

const ACCENTS = { teal: 0x38d6c4, pink: 0xff5f9e, muted: 0x525f80 } as const;

/** Retro pixel-border button (dark fill, neon outline) used by all menu scenes. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const { height = 20, disabled = false, muted = false, accent = 'teal', onClick } = opts;
  // Auto-grow with the pixel font so long labels never touch the border.
  const width = Math.max(opts.width ?? 160, label.length * 11 + 26);
  const color = disabled || muted ? ACCENTS.muted : ACCENTS[accent];

  const bg = scene.add.graphics();
  const w = width;
  const h = height;
  bg.fillStyle(0x0d1020, 0.95);
  bg.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  // pixel border (stepped corners)
  const drawBorder = (g: Phaser.GameObjects.Graphics, c: number, a: number): void => {
    g.fillStyle(c, a);
    g.fillRect(-w / 2, -h / 2 + 2, w, 2);
    g.fillRect(-w / 2, h / 2 - 4, w, 2);
    g.fillRect(-w / 2 + 2, -h / 2, 2, h);
    g.fillRect(w / 2 - 4, -h / 2, 2, h);
    g.fillRect(-w / 2 + 4, -h / 2, 2, 2);
    g.fillRect(w / 2 - 6, -h / 2, 2, 2);
    g.fillRect(-w / 2 + 4, h / 2 - 2, 2, 2);
    g.fillRect(w / 2 - 6, h / 2 - 2, 2, 2);
  };
  drawBorder(bg, color, disabled ? 0.6 : 1);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: GAME.fontFamily,
      fontSize: '10px',
      color: disabled || muted ? '#8b93b0' : cssColor(COLORS.ivory),
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  if (!disabled) {
    const hit = scene.add.rectangle(0, 0, w, h, 0xffffff, 0.001);
    container.add(hit);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      audioManager.play('ui');
      container.setScale(0.96);
      scene.time.delayedCall(60, () => container.setScale(1));
      onClick?.();
    });
    hit.on('pointerover', () => drawBorder(bg, ACCENTS.pink, 1));
    hit.on('pointerout', () => drawBorder(bg, color, 1));
  }
  return container;
}

/** Big pixel title with the pink/teal two-tone look of the reference sheet. */
export function makeTitle(scene: Phaser.Scene, x: number, y: number, text: string, size = 30): Phaser.GameObjects.Text {
  const shadow = scene.add
    .text(x + 2, y + 3, text, { fontFamily: GAME.fontFamily, fontSize: `${size}px`, fontStyle: 'bold', color: '#5a1e4a' })
    .setOrigin(0.5);
  const main = scene.add
    .text(x, y, text, { fontFamily: GAME.fontFamily, fontSize: `${size}px`, fontStyle: 'bold', color: '#ff5f9e' })
    .setOrigin(0.5);
  main.setStroke('#38d6c4', 4);
  scene.tweens.add({ targets: [main, shadow], y: '-=2', yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });
  return main;
}

/** Night-menu backdrop: sky, twinkling stars, moon, drifting clouds, ruins + cobble strip. */
export function buildNightBackdrop(scene: Phaser.Scene): void {
  const { width, height } = scene.scale.gameSize;
  scene.cameras.main.setBackgroundColor('#0b0d18');

  const groundY = height - 14;
  // ruined towers silhouette
  scene.add.image(width * 0.16, groundY - 30, 'tower_bg').setOrigin(0.5, 1).setAlpha(0.9);
  scene.add.image(width * 0.86, groundY - 24, 'tower_bg').setOrigin(0.5, 1).setAlpha(0.9).setScale(0.8);
  // dead trees
  scene.add.image(width * 0.07, groundY, 'tree').setOrigin(0.5, 1).setAlpha(0.8);
  scene.add.image(width * 0.94, groundY, 'tree').setOrigin(0.5, 1).setScale(-1, 1).setAlpha(0.8);

  // moon + clouds
  const moon = scene.add.image(width - 52, 34, 'moon').setAlpha(0.95);
  scene.tweens.add({ targets: moon, y: '+=3', yoyo: true, repeat: -1, duration: 3200, ease: 'Sine.easeInOut' });
  const cloud1 = scene.add.image(40, 30, 'cloud1').setAlpha(0.8);
  const cloud2 = scene.add.image(width - 80, 62, 'cloud2').setAlpha(0.7);
  const cloud3 = scene.add.image(width * 0.45, 18, 'cloud2').setAlpha(0.6).setScale(1.4, 1);
  const drift = (img: Phaser.GameObjects.Image, speed: number): void => {
    scene.tweens.add({
      targets: img,
      x: img.x + speed,
      duration: 26000,
      repeat: -1,
      yoyo: true,
      onRepeat: () => {},
    });
  };
  drift(cloud1, 30);
  drift(cloud2, -24);
  drift(cloud3, 18);

  // twinkling stars
  for (let i = 0; i < 26; i++) {
    const star = scene.add
      .image(Phaser.Math.Between(6, width - 6), Phaser.Math.Between(4, groundY - 60), 'spark')
      .setScale(Phaser.Math.Between(5, 10) / 10)
      .setTint(Phaser.Math.Between(0, 3) === 0 ? 0xffb7d5 : 0xffffff)
      .setAlpha(Phaser.Math.FloatBetween(0.25, 0.9));
    scene.tweens.add({
      targets: star,
      alpha: 0.1,
      duration: Phaser.Math.Between(900, 2400),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 1500),
    });
  }

  // cobble ground strip
  for (let x = 0; x < width; x += 16) {
    scene.add.image(x + 8, groundY + 7, 'px').setScale(16, 14).setTint(0x464d6a).setAlpha(1);
  }
  scene.add.rectangle(0, groundY + 1, width, 2, 0x6d7492).setOrigin(0);
  for (let x = 0; x < width; x += 8) {
    scene.add.rectangle(x, groundY + 2, 1, 12, 0x353b58).setOrigin(0);
  }
  // grass tufts along the strip
  for (let x = 10; x < width; x += 56) {
    scene.add.image(x + Phaser.Math.Between(0, 20), groundY, 'grass').setOrigin(0.5, 1);
    if (x % 112 === 10) scene.add.image(x + 24, groundY, 'flower').setOrigin(0.5, 1);
  }
}
