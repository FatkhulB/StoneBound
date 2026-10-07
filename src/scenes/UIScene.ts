import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { EV, EventBus, type SaveStatus } from '../utils/EventBus';
import { COLORS, cssColor } from '../ui/theme';
import { DialogueSystem } from '../systems/DialogueSystem';
import { audioManager } from '../systems/AudioManager';

export interface HudState {
  hp: number;
  maxHp: number;
  lives: number;
  attemptCoins: number;
  hasKey: boolean;
  dashCooldownFraction: number;
  skillCooldownFraction: number;
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  local: 'LOCAL SAVE',
  saving: 'SAVING...',
  saved: 'SAVED TO CLOUD',
  offline: 'OFFLINE — NOT SYNCED',
  conflict: 'SAVE CONFLICT',
  'not-configured': 'LOCAL SAVE',
};

/** Gameplay HUD + dialogue + toasts (design.md §10). Runs parallel to GameScene. */
export class UIScene extends Phaser.Scene {
  private hud!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private keyIcon!: Phaser.GameObjects.Image;
  private statusText!: Phaser.GameObjects.Text;
  private bossLabel!: Phaser.GameObjects.Text;
  private bossActive = false;
  private bossHp = 1;
  private toastText!: Phaser.GameObjects.Text;
  private toastUntil = 0;
  private dialogue!: DialogueSystem;
  private pauseBtn!: Phaser.GameObjects.Rectangle;
  private state: HudState = { hp: 100, maxHp: 100, lives: 3, attemptCoins: 0, hasKey: false, dashCooldownFraction: 0, skillCooldownFraction: 0 };

  constructor() {
    super('UI');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(900);
    this.hpText = this.text(92, 6, '100/100', cssColor(COLORS.uiText));
    this.add.image(8, 26, 'coin').setScrollFactor(0).setDepth(901);
    this.coinText = this.text(16, 21, '0', cssColor(COLORS.gold));
    this.livesText = this.text(8, 34, '♦♦♦', cssColor(COLORS.uiAccent));
    this.keyIcon = this.add.image(60, 26, 'key_main').setScrollFactor(0).setDepth(901).setAlpha(0.25);

    this.statusText = this.text(width - 6, 22, '', cssColor(COLORS.uiMuted)).setOrigin(1, 0);

    this.bossLabel = this.text(width / 2, height - 12, 'BRONZE CARETAKER', cssColor(COLORS.gold))
      .setOrigin(0.5)
      .setVisible(false);

    this.toastText = this.text(width / 2, 30, '', cssColor(COLORS.uiText)).setOrigin(0.5).setDepth(950).setAlpha(0);

    const pauseIcon = this.add.text(0, 0, '❚❚', { fontFamily: GAME.fontFamily, fontSize: '9px', color: cssColor(COLORS.uiText) }).setOrigin(0.5);
    this.pauseBtn = this.add
      .rectangle(width - 12, 10, 18, 14, COLORS.uiPanel, 0.8)
      .setStrokeStyle(1, COLORS.uiMuted)
      .setScrollFactor(0)
      .setDepth(902)
      .setInteractive({ useHandCursor: true });
    pauseIcon.setPosition(width - 12, 10).setScrollFactor(0).setDepth(903);
    this.pauseBtn.on('pointerdown', () => {
      audioManager.play('ui');
      EventBus.emit(EV.pauseRequested);
    });

    this.dialogue = new DialogueSystem(this);
    EventBus.on(EV.dialogueOpen, this.onDialogueOpen);
    EventBus.on(EV.saveStatus, this.onSaveStatus);
    EventBus.on(EV.bossActive, this.onBossActive);
    EventBus.on(EV.bossHp, this.onBossHp);
    EventBus.on(EV.toast, this.showToast);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(EV.dialogueOpen, this.onDialogueOpen);
      EventBus.off(EV.saveStatus, this.onSaveStatus);
      EventBus.off(EV.bossActive, this.onBossActive);
      EventBus.off(EV.bossHp, this.onBossHp);
      EventBus.off(EV.toast, this.showToast);
    });
  }

  private onDialogueOpen = (key: string, onDone?: () => void): void => {
    this.dialogue.start(key, onDone);
  };
  private onSaveStatus = (status: SaveStatus): void => {
    this.statusText.setText(STATUS_LABEL[status] ?? '');
  };
  private onBossActive = (active: boolean): void => {
    this.bossActive = active;
    this.bossLabel.setVisible(active);
  };
  private onBossHp = (frac: number): void => {
    this.bossHp = frac;
  };
  private showToast = (text: string): void => {
    this.toastText.setText(text).setAlpha(1);
    this.toastUntil = this.time.now + 1500;
  };

  private text(x: number, y: number, content: string, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, content, { fontFamily: GAME.fontFamily, fontSize: '8px', color })
      .setScrollFactor(0)
      .setDepth(901);
  }

  setHudState(state: HudState): void {
    this.state = state;
  }

  update(): void {
    // ---- HP bar + numbers ----
    const { hp, maxHp } = this.state;
    this.hud.clear();
    this.hud.fillStyle(COLORS.uiPanel, 0.85).fillRect(6, 5, 82, 10);
    this.hud.lineStyle(1, COLORS.uiMuted, 1).strokeRect(6, 5, 82, 10);
    const frac = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hud.fillStyle(hp / maxHp > 0.35 ? COLORS.uiAccent : COLORS.uiDanger, 1).fillRect(8, 7, 78 * frac, 6);
    this.hpText.setText(`${hp}/${maxHp}`);

    this.livesText.setText('♦'.repeat(Math.max(0, this.state.lives)));
    this.coinText.setText(String(this.state.attemptCoins));
    this.keyIcon.setAlpha(this.state.hasKey ? 1 : 0.25);

    // ---- dash + skill cooldown ----
    const dashFrac = 1 - this.state.dashCooldownFraction;
    this.hud.fillStyle(COLORS.uiPanel, 0.85).fillRect(6, 43, 40, 6);
    this.hud.fillStyle(dashFrac >= 1 ? COLORS.teal : COLORS.uiMuted, 1).fillRect(7, 44, 38 * dashFrac, 4);
    const skillFrac = 1 - this.state.skillCooldownFraction;
    this.hud.fillStyle(COLORS.uiPanel, 0.85).fillRect(6, 52, 40, 6);
    this.hud.fillStyle(skillFrac >= 1 ? 0xff5f9e : COLORS.uiMuted, 1).fillRect(7, 53, 38 * skillFrac, 4);

    // ---- boss bar ----
    if (this.bossActive) {
      const w = this.scale.gameSize.width - 60;
      const y = this.scale.gameSize.height - 18;
      this.hud.fillStyle(COLORS.uiPanel, 0.9).fillRect(30, y - 2, w, 10);
      this.hud.fillStyle(COLORS.boss, 1).fillRect(32, y, (w - 4) * Phaser.Math.Clamp(this.bossHp, 0, 1), 6);
    }

    // ---- toast fade ----
    if (this.toastUntil > 0 && this.time.now > this.toastUntil) {
      this.toastText.setAlpha(Math.max(0, this.toastText.alpha - 0.05));
    }
  }
}
