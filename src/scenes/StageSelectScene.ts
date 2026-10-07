import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton } from '../ui/Button';
import { STAGES, isStageUnlocked } from '../data/stages';
import { progression } from '../services/ProgressionManager';
import { DIFFICULTIES, type DifficultyId } from '../config/difficulty';
import { touchControls } from '../ui/TouchControls';

/** Stage selection + difficulty pick. Sequential unlock (design.md §3, §9). */
export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelect');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#141826');
    const save = progression.current;

    this.add
      .text(width / 2, 18, 'THE BURIED ROAD — STAGES', { fontFamily: GAME.fontFamily, fontSize: '13px', color: cssColor(COLORS.uiText) })
      .setOrigin(0.5);
    this.add
      .text(10, 10, `Wallet: ${save.walletCoins} coins`, { fontFamily: GAME.fontFamily, fontSize: '9px', color: cssColor(COLORS.gold) });

    // ---- difficulty selector (applies to new attempts) ----
    const diffRow: Phaser.GameObjects.Container[] = [];
    (Object.keys(DIFFICULTIES) as DifficultyId[]).forEach((id, i) => {
      const btn = makeButton(this, width / 2 + (i - 1) * 96, 40, DIFFICULTIES[id].label, {
        width: 84,
        muted: save.difficulty !== id,
        onClick: () => {
          progression.setDifficulty(id);
          this.scene.restart();
        },
      });
      diffRow.push(btn);
    });
    this.add
      .text(width / 2, 56, 'Difficulty (applies to new attempts)', { fontFamily: GAME.fontFamily, fontSize: '7px', color: cssColor(COLORS.uiMuted) })
      .setOrigin(0.5);

    // ---- stage grid: 5 × 2 ----
    STAGES.forEach((stage, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = width / 2 + (col - 2) * 84;
      const y = 96 + row * 64;
      const unlocked = isStageUnlocked(stage.id, save.unlockedStage);
      const completed = save.completedStageIds.includes(stage.id);
      const firstClear = save.firstClearClaimedIds.includes(stage.id);

      const card = this.add.rectangle(x, y, 76, 54, unlocked ? COLORS.uiPanelLight : COLORS.uiPanel, 0.97);
      card.setStrokeStyle(1, completed ? COLORS.uiAccent : unlocked ? COLORS.gold : COLORS.uiMuted, 0.9);

      this.add
        .text(x, y - 18, `${stage.id}`, { fontFamily: GAME.fontFamily, fontSize: '14px', color: cssColor(unlocked ? COLORS.teal : COLORS.uiMuted) })
        .setOrigin(0.5);
      this.add
        .text(x, y - 3, unlocked ? stage.name : '???', {
          fontFamily: GAME.fontFamily,
          fontSize: '6px',
          color: cssColor(unlocked ? COLORS.uiText : COLORS.uiMuted),
          align: 'center',
          wordWrap: { width: 70 },
        })
        .setOrigin(0.5);
      const status = completed ? (firstClear ? 'CLEAR ★' : 'CLEAR') : unlocked ? 'READY' : 'LOCKED';
      this.add
        .text(x, y + 18, status, {
          fontFamily: GAME.fontFamily,
          fontSize: '7px',
          color: cssColor(completed ? COLORS.uiAccent : unlocked ? COLORS.gold : COLORS.uiMuted),
        })
        .setOrigin(0.5);

      if (unlocked) {
        card.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          touchControls.show();
          this.scene.start('Game', { stageId: stage.id });
        });
      }
    });

    this.add
      .text(width / 2, height - 24, 'Stage 1 is playable in this pre-alpha. Stages 2–10 arrive in the next milestone.', {
        fontFamily: GAME.fontFamily,
        fontSize: '7px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5);
    makeButton(this, width / 2, height - 10, 'Back', { width: 110, onClick: () => this.scene.start('Menu') });
  }
}
