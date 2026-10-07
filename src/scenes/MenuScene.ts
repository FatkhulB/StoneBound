import Phaser from 'phaser';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton, makeTitle, buildNightBackdrop } from '../ui/Button';
import { audioManager } from '../systems/AudioManager';
import { progression } from '../services/ProgressionManager';
import { openCharacterSelect } from './CharacterSelectScene';
import { EV, EventBus } from '../utils/EventBus';

/** Main menu (design.md §10): New Game (confirmed → character pick), Continue, etc. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    audioManager.playMusic('menu');
    const { width, height } = this.scale.gameSize;
    buildNightBackdrop(this);

    makeTitle(this, width / 2, 40, 'STONEBOUND', 26);
    this.add
      .text(width / 2, 64, 'The Sword That Hated Heroes', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: cssColor(COLORS.gold),
      })
      .setOrigin(0.5);

    const attempt = progression.current.activeAttempt;
    const save = progression.current;
    const cx = width / 2;
    let y = 92;
    const next = () => (y += 22);

    if (attempt) {
      this.add
        .text(cx, y - 4, `Attempt in progress — Stage ${attempt.stageId} · ${attempt.livesRemaining} lives`, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: cssColor(COLORS.gold),
        })
        .setOrigin(0.5);
      y += 12;
    }

    const accent = (i: number): 'teal' | 'pink' => (i % 2 === 0 ? 'teal' : 'pink');
    let idx = 0;

    if (attempt) {
      makeButton(this, cx, y, `Continue — Stage ${attempt.stageId}`, {
        width: 190, accent: accent(idx++),
        onClick: () => this.scene.start('Game', { stageId: attempt.stageId, resume: true }),
      });
      next();
    } else if (save.completedStageIds.length > 0 || save.unlockedStage > 1) {
      makeButton(this, cx, y, 'Continue', { width: 190, accent: accent(idx++), onClick: () => this.scene.start('StageSelect') });
      next();
    }
    makeButton(this, cx, y, 'New Game', { width: 190, accent: accent(idx++), onClick: () => this.confirmNewGame() });
    next();
    makeButton(this, cx, y, 'Stage Select', { width: 190, accent: accent(idx++), onClick: () => this.scene.start('StorySelect') });
    next();
    makeButton(this, cx, y, `Character: ${save.character === 'girl' ? 'Pipa' : 'Pip'}`, {
      width: 190, accent: accent(idx++), onClick: () => {
        openCharacterSelect('menu');
        this.scene.start('CharacterSelect');
      },
    });
    next();
    makeButton(this, cx, y, 'Shop & Equipment', { width: 190, accent: accent(idx++), onClick: () => this.scene.start('Shop') });
    next();
    makeButton(this, cx, y, 'Settings', { width: 190, accent: accent(idx++), onClick: () => this.scene.start('Settings') });
    next();

    const authLabel = progression.cloudConfigured
      ? progression.isSignedIn
        ? 'Sign out (cloud on)'
        : 'Sign in with Google'
      : 'Cloud saves not configured';
    makeButton(this, cx, y + 4, authLabel, {
      width: 210,
      muted: !progression.cloudConfigured || progression.isSignedIn,
      onClick: () => {
        if (!progression.cloudConfigured) {
          EventBus.emit(EV.toast, 'Add Firebase config in .env to enable cloud saves.');
          return;
        }
        if (progression.isSignedIn) void progression.signOut().then(() => this.scene.restart());
        else {
          progression
            .signInGoogle()
            .then(() => this.scene.restart())
            .catch((err: unknown) => {
              const code = String((err as { code?: string })?.code ?? err ?? '');
              const msg =
                code.includes('popup-blocked')
                  ? 'Popup blocked — allow popups for this site and try again.'
                  : code.includes('popup-closed-by-user')
                    ? 'Sign-in cancelled.'
                    : code.includes('unauthorized-domain')
                      ? 'Domain not authorized in Firebase Authentication settings.'
                      : 'Sign-in failed — check your connection and try again.';
              EventBus.emit(EV.toast, msg);
            });
        }
      },
    });
    next();

    this.add
      .text(cx, height - 22, 'A / D move · W or SPACE jump (double jump!) · J attack · K dash · E interact', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height - 10, 'Pixel art & audio generated in code — original assets', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start(attempt ? 'Game' : 'StorySelect'));

    // Toast surface for menu-level notices.
    const toast = this.add
      .text(width / 2, height - 44, '', { fontFamily: 'monospace', fontSize: '8px', color: cssColor(COLORS.gold) })
      .setOrigin(0.5)
      .setDepth(50);
    let toastTimer: Phaser.Time.TimerEvent | null = null;
    const showToast = (text: string): void => {
      toast.setText(text).setAlpha(1);
      toastTimer?.remove();
      toastTimer = this.time.delayedCall(2400, () => toast.setAlpha(0));
    };
    EventBus.on(EV.toast, showToast);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off(EV.toast, showToast));
  }

  /** New Game requires explicit confirmation before replacing the save (design.md §10). */
  private confirmNewGame(): void {
    const { width, height } = this.scale.gameSize;
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(100);
    const box = this.add
      .rectangle(width / 2, height / 2, 268, 96, 0x10131f, 0.98)
      .setStrokeStyle(2, 0xff5f9e)
      .setDepth(101);
    const title = this.add
      .text(width / 2, height / 2 - 28, 'Start over? This replaces your save:\nstages, coins, weapons and skills reset.', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: cssColor(COLORS.uiText),
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(102);
    const yes = makeButton(this, width / 2 - 52, height / 2 + 22, 'Yes, reset', {
      width: 92,
      accent: 'pink',
      onClick: () => {
        progression.newGame();
        openCharacterSelect('newgame');
        this.scene.start('CharacterSelect');
      },
    }).setDepth(102);
    const no = makeButton(this, width / 2 + 52, height / 2 + 22, 'Cancel', {
      width: 92,
      onClick: () => {
        veil.destroy();
        box.destroy();
        title.destroy();
        yes.destroy();
        no.destroy();
      },
    }).setDepth(102);
    void progression;
  }
}
