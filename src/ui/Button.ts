import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { COLORS, cssColor } from '../ui/theme';
import { audioManager } from '../systems/AudioManager';

export interface ButtonOptions {
  width?: number;
  height?: number;
  disabled?: boolean;
  muted?: boolean;
  onClick?: () => void;
}

/** Small canvas text button used across menu/overlay scenes. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const { width = 160, height = 18, disabled = false, muted = false, onClick } = opts;
  const bg = scene.add.rectangle(0, 0, width, height, COLORS.uiPanel, 0.95);
  const border = disabled ? COLORS.uiMuted : muted ? COLORS.uiMuted : COLORS.uiAccent;
  bg.setStrokeStyle(1, border, 0.9);
  const text = scene.add
    .text(0, 0, disabled ? `${label} (locked)` : label, {
      fontFamily: GAME.fontFamily,
      fontSize: '9px',
      color: disabled ? cssColor(COLORS.uiMuted) : cssColor(muted ? COLORS.uiMuted : COLORS.uiText),
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  if (!disabled) {
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      audioManager.play('ui');
      onClick?.();
    });
    bg.on('pointerover', () => bg.setFillStyle(COLORS.uiPanelLight, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(COLORS.uiPanel, 0.95));
  }
  return container;
}
