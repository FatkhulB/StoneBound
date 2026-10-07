import Phaser from 'phaser';
import { STORIES } from '../data/stories';
import { makeButton } from '../ui/Button';
import { COLORS, cssColor } from '../ui/theme';
import { GAME } from '../config/game-config';
import { progression } from '../services/ProgressionManager';

/** Story selection: Story 1 playable, future stories are Coming Soon cards. */
export class StorySelectScene extends Phaser.Scene {
  constructor() {
    super('StorySelect');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#141826');
    this.add
      .text(width / 2, 24, 'SELECT STORY', { fontFamily: GAME.fontFamily, fontSize: '14px', color: cssColor(COLORS.uiText) })
      .setOrigin(0.5);

    STORIES.forEach((story, i) => {
      const y = 66 + i * 44;
      const card = this.add.rectangle(width / 2, y, width - 60, 36, COLORS.uiPanel, 0.95);
      card.setStrokeStyle(1, story.playable ? COLORS.uiAccent : COLORS.uiMuted, 0.8);
      this.add
        .text(width / 2, y - 9, story.playable ? story.title : `${story.title} — Coming Soon`, {
          fontFamily: GAME.fontFamily,
          fontSize: '10px',
          color: story.playable ? cssColor(COLORS.teal) : cssColor(COLORS.uiMuted),
        })
        .setOrigin(0.5);
      this.add
        .text(width / 2, y + 6, story.subtitle, {
          fontFamily: GAME.fontFamily,
          fontSize: '7px',
          color: cssColor(COLORS.uiMuted),
        })
        .setOrigin(0.5);
      if (story.playable) {
        card.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('StageSelect'));
      } else {
        this.add
          .text(width - 36, y, 'LOCKED', { fontFamily: GAME.fontFamily, fontSize: '7px', color: cssColor(COLORS.uiMuted) })
          .setOrigin(0.5);
      }
    });

    makeButton(this, width / 2, height - 16, 'Back', { width: 110, onClick: () => this.scene.start('Menu') });
    void progression;
  }
}
