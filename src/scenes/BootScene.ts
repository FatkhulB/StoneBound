import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { createAllPlaceholderTextures } from '../utils/TextureFactory';
import { installAudioUnlock } from '../systems/AudioManager';

/** First scene: create placeholder textures, then hand over to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    installAudioUnlock();
    createAllPlaceholderTextures(this);
    // Wait (briefly) for the pixel webfont so no text pops in with the fallback.
    const go = (): void => {
      this.scene.start('Preload');
    };
    const cap = this.time.delayedCall(1200, go);
    if (document.fonts?.load) {
      document.fonts
        .load('10px "Press Start 2P"')
        .then(() => {
          cap.remove();
          go();
        })
        .catch(go);
    }
  }
}

/** Minimal loading gate (all assets are generated, so this is instant). */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add
      .text(width / 2, height / 2 - 10, 'STONEBOUND', {
        fontFamily: GAME.fontFamily,
        fontSize: '20px',
        color: '#2ee6a8',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 12, 'The Sword That Hated Heroes', {
        fontFamily: GAME.fontFamily,
        fontSize: '9px',
        color: '#8b93b0',
      })
      .setOrigin(0.5);
    this.time.delayedCall(600, () => this.scene.start('Menu'));
  }
}
