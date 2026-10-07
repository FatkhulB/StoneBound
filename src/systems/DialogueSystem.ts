import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { getDialogue } from '../data/dialogs';
import { EV, EventBus } from '../utils/EventBus';
import { COLORS, cssColor } from '../ui/theme';
import { audioManager } from './AudioManager';

/**
 * Text-only dialogue overlay (design.md §2.3, §10): short exchanges, manually
 * advanced, skippable, always pauses gameplay — never readable under attack.
 */
export class DialogueSystem {
  private panel!: Phaser.GameObjects.Rectangle;
  private nameTag!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private skipBtn!: Phaser.GameObjects.Rectangle;
  private skipLabel!: Phaser.GameObjects.Text;
  private lines: { speaker: string; style: string; text: string }[] = [];
  private index = 0;
  private open = false;
  private onDone: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale.gameSize;
    this.panel = scene.add
      .rectangle(width / 2, height - 28, width - 12, 44, COLORS.uiPanel, 0.94)
      .setOrigin(0.5)
      .setStrokeStyle(1, COLORS.uiPanelLight)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    this.nameTag = scene.add
      .text(12, height - 48, '', { fontFamily: GAME.fontFamily, fontSize: '8px', color: cssColor(COLORS.uiAccent) })
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    this.body = scene.add
      .text(12, height - 39, '', {
        fontFamily: GAME.fontFamily,
        fontSize: '8px',
        color: cssColor(COLORS.uiText),
        wordWrap: { width: width - 76 },
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);

    this.prompt = scene.add
      .text(width - 18, height - 14, '▼', { fontFamily: GAME.fontFamily, fontSize: '8px', color: cssColor(COLORS.uiMuted) })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false);
    scene.tweens.add({ targets: this.prompt, y: '+=3', yoyo: true, repeat: -1, duration: 260 });

    this.skipBtn = scene.add
      .rectangle(width - 24, height - 44, 34, 12, COLORS.uiPanelLight, 0.95)
      .setStrokeStyle(1, COLORS.uiMuted)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.skipLabel = scene.add
      .text(width - 24, height - 44, 'SKIP', { fontFamily: GAME.fontFamily, fontSize: '7px', color: cssColor(COLORS.uiMuted) })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002)
      .setVisible(false);
    this.skipBtn.on('pointerdown', () => this.skip());

    const advance = (): void => this.advance();
    scene.input.keyboard?.on('keydown-SPACE', advance);
    scene.input.keyboard?.on('keydown-J', advance);
    scene.input.keyboard?.on('keydown-E', advance);
    scene.input.on('pointerdown', (_p: unknown, over: unknown[]) => {
      // Clicking SKIP is handled above; anywhere else advances.
      if (this.open && (!Array.isArray(over) || over.length === 0 || !over.includes(this.skipBtn))) this.advance();
    });
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Opens a script by key and pauses gameplay until closed/skipped. */
  start(scriptKey: string, onDone?: () => void): void {
    const script = getDialogue(scriptKey);
    if (!script || script.lines.length === 0) {
      onDone?.();
      return;
    }
    this.lines = script.lines;
    this.index = 0;
    this.open = true;
    this.onDone = onDone ?? null;
    this.panel.setVisible(true);
    this.nameTag.setVisible(true);
    this.body.setVisible(true);
    this.prompt.setVisible(true);
    this.skipBtn.setVisible(true);
    this.skipLabel.setVisible(true);
    this.showLine();
    EventBus.emit(EV.dialogueStart, scriptKey);
  }

  private showLine(): void {
    const line = this.lines[this.index];
    this.nameTag.setText(line.speaker);
    this.nameTag.setColor(
      line.style === 'pip' ? cssColor(COLORS.uiAccent) : line.style === 'veyr' ? cssColor(COLORS.gold) : cssColor(COLORS.uiMuted),
    );
    this.body.setText(line.text);
    audioManager.play('ui');
  }

  advance(): void {
    if (!this.open) return;
    this.index += 1;
    if (this.index >= this.lines.length) this.close();
    else this.showLine();
  }

  skip(): void {
    if (!this.open) return;
    this.close();
  }

  private close(): void {
    this.open = false;
    this.panel.setVisible(false);
    this.nameTag.setVisible(false);
    this.body.setVisible(false);
    this.prompt.setVisible(false);
    this.skipBtn.setVisible(false);
    this.skipLabel.setVisible(false);
    EventBus.emit(EV.dialogueClosed);
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }
}
