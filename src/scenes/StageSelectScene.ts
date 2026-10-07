import Phaser from 'phaser';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton, makeTitle, buildNightBackdrop } from '../ui/Button';
import { STAGES, isStageUnlocked } from '../data/stages';
import { progression } from '../services/ProgressionManager';
import { DIFFICULTIES, type DifficultyId } from '../config/difficulty';
import { touchControls } from '../ui/TouchControls';

/** Stage selection + difficulty pick. Sequential unlock (design.md §3, §9). */
export class StageSelectScene extends Phaser.Scene {
  private startingStage = 0;

  constructor() {
    super('StageSelect');
  }

  create(): void {
    this.startingStage = 0;
    const { width, height } = this.scale.gameSize;
    buildNightBackdrop(this);
    const save = progression.current;

    makeTitle(this, width / 2, 20, 'THE BURIED ROAD', 13);
    this.add
      .text(10, 8, `Wallet: ${save.walletCoins} coins`, { fontFamily: 'monospace', fontSize: '9px', color: cssColor(COLORS.gold) });

    // ---- difficulty selector (applies to new attempts) ----
    (Object.keys(DIFFICULTIES) as DifficultyId[]).forEach((id, i) => {
      makeButton(this, width / 2 + (i - 1) * 92, 42, DIFFICULTIES[id].label, {
        width: 82,
        muted: save.difficulty !== id,
        onClick: () => {
          progression.setDifficulty(id);
          this.scene.restart();
        },
      });
    });
    this.add
      .text(width / 2, 58, 'Difficulty applies to new attempts', { fontFamily: 'monospace', fontSize: '7px', color: cssColor(COLORS.uiMuted) })
      .setOrigin(0.5);

    // ---- stage grid: 5 × 2 ----
    STAGES.forEach((stage, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = width / 2 + (col - 2) * 82;
      const y = 96 + row * 60;
      const unlocked = isStageUnlocked(stage.id, save.unlockedStage);
      const completed = save.completedStageIds.includes(stage.id);
      const firstClear = save.firstClearClaimedIds.includes(stage.id);

      const card = this.add.rectangle(x, y, 74, 50, unlocked ? 0x182036 : 0x10131f, 0.97);
      card.setStrokeStyle(2, completed ? 0x38d6c4 : unlocked ? 0xffd24a : 0x525f80, unlocked ? 1 : 0.6);

      this.add
        .text(x, y - 16, `${stage.id}`, { fontFamily: 'monospace', fontSize: '14px', color: cssColor(unlocked ? COLORS.teal : COLORS.uiMuted) })
        .setOrigin(0.5);
      this.add
        .text(x, y - 2, unlocked ? stage.name : '???', {
          fontFamily: 'monospace',
          fontSize: '6px',
          color: cssColor(unlocked ? COLORS.uiText : COLORS.uiMuted),
          align: 'center',
          wordWrap: { width: 68 },
        })
        .setOrigin(0.5);
      const status = completed ? (firstClear ? 'CLEAR ★' : 'CLEAR') : unlocked ? 'READY' : 'LOCKED';
      this.add
        .text(x, y + 16, status, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: cssColor(completed ? COLORS.uiAccent : unlocked ? COLORS.gold : COLORS.uiMuted),
        })
        .setOrigin(0.5);

      if (unlocked) {
        // once() + starting guard: no double-start, no "stuck on the menu".
        card.setInteractive({ useHandCursor: true }).once('pointerdown', () => {
          if (this.startingStage !== 0) return;
          this.startingStage = stage.id;
          touchControls.show();
          this.scene.start('Game', { stageId: stage.id });
        });
      }
    });

    this.add
      .text(width / 2, height - 24, 'Stages 2–10 arrive in a later milestone. Stage 1: The Fallen Monument.', {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5);
    makeButton(this, width / 2, height - 10, 'Back', { width: 110, onClick: () => this.scene.start(this.startingStage ? 'Game' : 'StorySelect') });
  }
}
