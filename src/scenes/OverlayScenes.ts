import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton } from '../ui/Button';
import { progression } from '../services/ProgressionManager';
import { audioManager } from '../systems/AudioManager';
import { touchControls } from '../ui/TouchControls';
import { EV, EventBus } from '../utils/EventBus';

/** Settings (design.md §10): audio levels, global mute, shake/flash reduction. */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#141826');
    const s = progression.current.settings;

    this.add
      .text(width / 2, 18, 'SETTINGS', { fontFamily: GAME.fontFamily, fontSize: '14px', color: cssColor(COLORS.uiText) })
      .setOrigin(0.5);

    const rows: { label: string; get: () => string; cycle: () => void }[] = [
      {
        label: 'Music',
        get: () => `${Math.round(s.musicVolume * 100)}%`,
        cycle: () => {
          const v = s.musicVolume >= 1 ? 0 : Math.min(1, s.musicVolume + 0.25);
          progression.updateSettings({ musicVolume: v });
          audioManager.setMusicVolume(v);
        },
      },
      {
        label: 'Sound effects',
        get: () => `${Math.round(s.sfxVolume * 100)}%`,
        cycle: () => {
          const v = s.sfxVolume >= 1 ? 0 : Math.min(1, s.sfxVolume + 0.25);
          progression.updateSettings({ sfxVolume: v });
          audioManager.setSfxVolume(v);
        },
      },
      {
        label: 'Mute all',
        get: () => (s.muted ? 'ON' : 'OFF'),
        cycle: () => {
          const m = !s.muted;
          progression.updateSettings({ muted: m });
          audioManager.setMuted(m);
        },
      },
      {
        label: 'Reduce camera shake',
        get: () => (s.reduceShake ? 'ON' : 'OFF'),
        cycle: () => progression.updateSettings({ reduceShake: !s.reduceShake }),
      },
      {
        label: 'Reduce flash effects',
        get: () => (s.reduceFlash ? 'ON' : 'OFF'),
        cycle: () => progression.updateSettings({ reduceFlash: !s.reduceFlash }),
      },
    ];

    rows.forEach((row, i) => {
      const y = 52 + i * 26;
      this.add
        .text(width / 2 - 10, y, row.label, { fontFamily: GAME.fontFamily, fontSize: '9px', color: cssColor(COLORS.uiText) })
        .setOrigin(1, 0.5);
      makeButton(this, width / 2 + 36, y, row.get(), {
        width: 76,
        onClick: () => {
          row.cycle();
          this.scene.restart();
        },
      });
    });

    makeButton(this, width / 2, height - 14, 'Back', { width: 110, onClick: () => this.scene.start('Menu') });
  }
}

/** Pause overlay (design.md §10): pauses gameplay, clears held inputs, offers
 *  Resume / Restart Stage / Return to Stage Map (with confirmation). */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setDepth(0);
    this.add
      .text(width / 2, height / 2 - 34, 'PAUSED', { fontFamily: GAME.fontFamily, fontSize: '16px', color: cssColor(COLORS.uiText) })
      .setOrigin(0.5)
      .setDepth(1);

    const exit = (): void => {
      // Abandoning the attempt discards stage-local progress (design.md §7).
      this.confirm('Abandon this attempt?\nStage progress and attempt coins are lost.', () => {
        EventBus.emit(EV.pauseExit);
      });
    };

    makeButton(this, width / 2, height / 2 - 2, 'Resume', {
      width: 150,
      onClick: () => {
        EventBus.emit(EV.pauseResume);
        this.scene.stop();
      },
    }).setDepth(1);
    makeButton(this, width / 2, height / 2 + 22, 'Restart Stage', {
      width: 150,
      onClick: () => this.confirm('Restart the stage from the beginning?\nAttempt progress is lost.', () => EventBus.emit(EV.pauseRestart)),
    }).setDepth(1);
    makeButton(this, width / 2, height / 2 + 46, 'Return to Stage Map', { width: 150, onClick: exit }).setDepth(1);

    this.input.keyboard?.once('keydown-ESC', () => {
      EventBus.emit(EV.pauseResume);
      this.scene.stop();
    });
    touchControls.setInteractAvailable(false);
  }

  private confirm(message: string, onYes: () => void): void {
    const { width, height } = this.scale.gameSize;
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(10);
    const label = this.add
      .text(width / 2, height / 2 - 14, message, {
        fontFamily: GAME.fontFamily,
        fontSize: '9px',
        color: cssColor(COLORS.uiText),
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(11);
    const yes = makeButton(this, width / 2 - 45, height / 2 + 22, 'Yes', { width: 80, onClick: onYes }).setDepth(11);
    const no = makeButton(this, width / 2 + 45, height / 2 + 22, 'No', {
      width: 80,
      onClick: () => {
        veil.destroy();
        label.destroy();
        yes.destroy();
        no.destroy();
      },
    }).setDepth(11);
  }
}

/** Game over: No Lives Remaining (design.md §7) — only same-stage restart or map. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0d12, 0.82).setDepth(0);
    this.add
      .text(width / 2, height / 2 - 30, 'NO LIVES REMAINING', { fontFamily: GAME.fontFamily, fontSize: '16px', color: cssColor(COLORS.uiDanger) })
      .setOrigin(0.5)
      .setDepth(1);
    this.add
      .text(width / 2, height / 2 - 10, 'Checkpoint continuation is not offered.', {
        fontFamily: GAME.fontFamily,
        fontSize: '8px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5)
      .setDepth(1);

    makeButton(this, width / 2, height / 2 + 18, 'Restart Stage', {
      width: 160,
      onClick: () => EventBus.emit(EV.gameOverRestart),
    }).setDepth(1);
    makeButton(this, width / 2, height / 2 + 42, 'Return to Stage Map', {
      width: 160,
      onClick: () => EventBus.emit(EV.gameOverExit),
    }).setDepth(1);
  }
}

/** Stage results (design.md §3): coins committed, first-clear bonus, next actions. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: { stageId: number; summary: { coinsCommitted: number; firstClearBonus: number; wasFirstClear: boolean } | null; timeMs: number }): void {
    audioManager.playMusic('results');
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#141826');
    const summary = data.summary;

    this.add
      .text(width / 2, 40, `STAGE ${data.stageId} COMPLETE`, { fontFamily: GAME.fontFamily, fontSize: '18px', color: cssColor(COLORS.teal) })
      .setOrigin(0.5);

    const seconds = Math.floor(data.timeMs / 1000);
    const lines = [
      `Time: ${Math.floor(seconds / 60)}m ${seconds % 60}s`,
      summary ? `Coins committed to wallet: ${summary.coinsCommitted}` : 'Coins: (already committed)',
      summary && summary.wasFirstClear ? `First-clear bonus: +${summary.firstClearBonus}` : 'First-clear bonus: already claimed',
    ];
    lines.forEach((line, i) => {
      this.add
        .text(width / 2, 74 + i * 14, line, { fontFamily: GAME.fontFamily, fontSize: '9px', color: cssColor(COLORS.uiText) })
        .setOrigin(0.5);
    });

    const save = progression.current;
    const nextUnlocked = Math.min(10, save.unlockedStage);
    const hasNext = nextUnlocked > data.stageId;

    makeButton(this, width / 2, height - 44, hasNext ? `Next Stage (${nextUnlocked})` : 'Coming Soon — Story complete', {
      width: 200,
      disabled: !hasNext,
      onClick: () => this.scene.start('Game', { stageId: nextUnlocked }),
    });
    makeButton(this, width / 2, height - 22, 'Stage Map', {
      width: 140,
      onClick: () => this.scene.start('StageSelect'),
    });
  }
}
