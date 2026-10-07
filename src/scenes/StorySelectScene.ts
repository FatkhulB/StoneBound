import Phaser from 'phaser';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton, makeTitle, buildNightBackdrop } from '../ui/Button';
import { STORIES } from '../data/stories';
import { progression } from '../services/ProgressionManager';

/** Story selection: Story 1 playable, future stories are Coming Soon cards. */
export class StorySelectScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super('StorySelect');
  }

  create(): void {
    this.starting = false;
    const { width, height } = this.scale.gameSize;
    buildNightBackdrop(this);
    makeTitle(this, width / 2, 24, 'SELECT STORY', 14);

    STORIES.forEach((story, i) => {
      const y = 64 + i * 42;
      const card = this.add.rectangle(width / 2, y, width - 64, 34, 0x10131f, 0.97);
      card.setStrokeStyle(2, story.playable ? 0x38d6c4 : 0x525f80, story.playable ? 1 : 0.6);
      this.add
        .text(width / 2, y - 9, story.playable ? story.title : `${story.title} — Coming Soon`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: story.playable ? cssColor(COLORS.teal) : cssColor(COLORS.uiMuted),
        })
        .setOrigin(0.5);
      this.add
        .text(width / 2, y + 5, story.subtitle, { fontFamily: 'monospace', fontSize: '7px', color: cssColor(COLORS.uiMuted) })
        .setOrigin(0.5);
      if (story.playable) {
        // once() + guard: the click can never start the next scene twice.
        card.setInteractive({ useHandCursor: true }).once('pointerdown', () => {
          if (this.starting) return;
          this.starting = true;
          this.scene.start('StageSelect');
        });
      } else {
        this.add
          .text(width - 42, y, 'LOCKED', { fontFamily: 'monospace', fontSize: '7px', color: cssColor(COLORS.uiMuted) })
          .setOrigin(0.5);
      }
    });

    makeButton(this, width / 2, height - 16, 'Back', { width: 110, onClick: () => this.scene.start('Menu') });
    void progression;
  }
}
