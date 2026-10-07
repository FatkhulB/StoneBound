import Phaser from 'phaser';
import { GAME } from './config/game-config';
import { BootScene, PreloadScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { StorySelectScene } from './scenes/StorySelectScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { ShopScene } from './scenes/ShopScene';
import { SettingsScene, PauseScene, GameOverScene, ResultScene } from './scenes/OverlayScenes';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { progression } from './services/ProgressionManager';
import { audioManager } from './systems/AudioManager';
import { touchControls } from './ui/TouchControls';

async function bootstrap(): Promise<void> {
  await progression.load();

  // Apply persisted audio settings once volumes exist.
  const s = progression.current.settings;
  audioManager.setMusicVolume(s.musicVolume);
  audioManager.setSfxVolume(s.sfxVolume);
  audioManager.setMuted(s.muted);

  touchControls.mount();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME.width,
    height: GAME.height,
    backgroundColor: GAME.backgroundColor,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 900 },
        debug: false,
      },
    },
    scene: [
      BootScene,
      PreloadScene,
      MenuScene,
      StorySelectScene,
      StageSelectScene,
      ShopScene,
      SettingsScene,
      GameScene,
      UIScene,
      PauseScene,
      GameOverScene,
      ResultScene,
    ],
  });

  // Portrait on touch devices pauses gameplay and shows the rotate overlay (design.md §10).
  const portraitOverlay = document.getElementById('portrait-overlay');
  const evaluateOrientation = (): void => {
    const isTouch = touchControls.isTouchDevice;
    const portrait = window.innerHeight > window.innerWidth;
    if (isTouch && portrait) {
      portraitOverlay?.classList.add('armed');
      touchControls.hide();
      if (game.scene.isActive('Game')) game.scene.pause('Game');
    } else {
      portraitOverlay?.classList.remove('armed');
      if (isTouch && game.scene.isActive('Game')) touchControls.show();
      // Do not force-resume while the user is intentionally in the pause overlay.
      if (game.scene.isPaused('Game') && !game.scene.isActive('Pause')) game.scene.resume('Game');
    }
  };
  window.addEventListener('resize', evaluateOrientation);
  window.addEventListener('orientationchange', evaluateOrientation);
  evaluateOrientation();

  // Development convenience: expose the game for browser-based smoke tests.
  if (import.meta.env.DEV) {
    (window as unknown as { __STONEBOUND__: Phaser.Game }).__STONEBOUND__ = game;
  }
}

void bootstrap();
