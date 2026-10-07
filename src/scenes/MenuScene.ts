import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton } from '../ui/Button';
import { audioManager } from '../systems/AudioManager';
import { progression } from '../services/ProgressionManager';
import { EV, EventBus } from '../utils/EventBus';

/** Main menu (design.md §10): New Game (confirmed), Continue, Stage Select, Shop, Settings. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    audioManager.playMusic('menu');
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#141826');

    this.add
      .text(width / 2, 46, 'STONEBOUND', { fontFamily: GAME.fontFamily, fontSize: '26px', color: cssColor(COLORS.teal) })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 68, 'The Sword That Hated Heroes', { fontFamily: GAME.fontFamily, fontSize: '10px', color: cssColor(COLORS.scarf) })
      .setOrigin(0.5);

    const attempt = progression.current.activeAttempt;
    const save = progression.current;
    const cx = width / 2;
    let y = 104;
    const next = () => y += 22;

    if (attempt) {
      this.add
        .text(cx, y - 4, `Attempt in progress — Stage ${attempt.stageId} · ${attempt.livesRemaining} lives`, {
          fontFamily: GAME.fontFamily,
          fontSize: '8px',
          color: cssColor(COLORS.gold),
        })
        .setOrigin(0.5);
      y += 14;
    }

    if (attempt) {
      makeButton(this, cx, y, `Continue — Stage ${attempt.stageId}`, {
        onClick: () => this.scene.start('Game', { stageId: attempt.stageId, resume: true }),
      });
      next();
    } else if (save.completedStageIds.length > 0 || save.unlockedStage > 1) {
      makeButton(this, cx, y, 'Continue', {
        onClick: () => this.scene.start('StageSelect'),
      });
      next();
    }
    makeButton(this, cx, y, 'New Game', { onClick: () => this.confirmNewGame() });
    next();
    makeButton(this, cx, y, 'Stage Select', { onClick: () => this.scene.start('StorySelect') });
    next();
    makeButton(this, cx, y, 'Shop & Equipment', { onClick: () => this.scene.start('Shop') });
    next();
    makeButton(this, cx, y, 'Settings', { onClick: () => this.scene.start('Settings') });
    next();

    // Sign-in / save status row.
    const authLabel = progression.cloudConfigured
      ? progression.isSignedIn
        ? 'Sign out (cloud on)'
        : 'Sign in with Google'
      : 'Cloud saves not configured';
    makeButton(
      this,
      cx,
      y + 4,
      authLabel,
      {
        muted: !progression.cloudConfigured || progression.isSignedIn,
        width: 200,
        onClick: () => {
          if (!progression.cloudConfigured) {
            EventBus.emit(EV.toast, 'Add Firebase config in .env to enable cloud saves.');
            return;
          }
          if (progression.isSignedIn) void progression.signOut().then(() => this.scene.restart());
          else void progression.signInGoogle().then(() => this.scene.restart());
        },
      },
    );
    next();

    this.add
      .text(cx, height - 22, 'A / D move · SPACE jump · J attack · K dash · E interact', {
        fontFamily: GAME.fontFamily,
        fontSize: '8px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height - 10, 'Pre-alpha build — placeholder art & audio', {
        fontFamily: GAME.fontFamily,
        fontSize: '7px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start(attempt ? 'Game' : 'StorySelect'));

    // Toast surface for menu-level notices.
    const toast = this.add
      .text(width / 2, height - 44, '', { fontFamily: GAME.fontFamily, fontSize: '8px', color: cssColor(COLORS.gold) })
      .setOrigin(0.5)
      .setDepth(50);
    let toastTimer: Phaser.Time.TimerEvent | null = null;
    const showToast = (text: string): void => {
      toast.setText(text).setAlpha(1);
      toastTimer?.remove();
      toastTimer = this.time.delayedCall(2200, () => toast.setAlpha(0));
    };
    EventBus.on(EV.toast, showToast);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off(EV.toast, showToast));
  }

  /** New Game requires explicit confirmation before replacing the save (design.md §10). */
  private confirmNewGame(): void {
    const { width, height } = this.scale.gameSize;
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(100);
    const box = this.add.rectangle(width / 2, height / 2, 260, 92, COLORS.uiPanel, 0.98).setStrokeStyle(1, COLORS.uiDanger).setDepth(101);
    const title = this.add
      .text(width / 2, height / 2 - 28, 'Start over? This replaces your save:\nstages, coins, weapons and skills reset.', {
        fontFamily: GAME.fontFamily,
        fontSize: '9px',
        color: cssColor(COLORS.uiText),
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(102);
    const yes = makeButton(this, width / 2 - 50, height / 2 + 22, 'Yes, reset', {
      width: 90,
      onClick: () => {
        progression.newGame();
        this.scene.restart();
      },
    }).setDepth(102);
    const no = makeButton(this, width / 2 + 50, height / 2 + 22, 'Cancel', {
      width: 90,
      onClick: () => {
        veil.destroy();
        box.destroy();
        title.destroy();
        yes.destroy();
        no.destroy();
      },
    }).setDepth(102);
  }
}
