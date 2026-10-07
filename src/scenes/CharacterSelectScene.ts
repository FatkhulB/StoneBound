import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton, makeTitle, buildNightBackdrop } from '../ui/Button';
import { progression } from '../services/ProgressionManager';
import { audioManager } from '../systems/AudioManager';
import type { CharacterId } from '../entities/player/Player';

/**
 * Character select (design.md §10 addition): pick Pip's look — boy or girl —
 * shown when starting a new game and reachable from the menu anytime.
 *
 * The mode travels in a module variable on purpose: scene-start payloads proved
 * unreliable across the input stack, and this removes that whole bug class.
 */
let selectMode: 'newgame' | 'menu' = 'menu';
export function openCharacterSelect(mode: 'newgame' | 'menu'): void {
  selectMode = mode;
}

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    const mode = selectMode;
    audioManager.playMusic('menu');
    const { width, height } = this.scale.gameSize;
    buildNightBackdrop(this);

    makeTitle(this, width / 2, 34, 'CHOOSE YOUR HERO', 16);
    this.add
      .text(width / 2, 54, 'Pip carries Veyr either way — pick your look.', {
        fontFamily: GAME.fontFamily,
        fontSize: '8px',
        color: cssColor(COLORS.uiMuted),
      })
      .setOrigin(0.5);

    const current = progression.current.character;
    const cards: { id: CharacterId; label: string; desc: string; x: number }[] = [
      { id: 'boy', label: 'PIP', desc: 'Blond scarf-boy — quick and stubbon.', x: width / 2 - 92 },
      { id: 'girl', label: 'PIPA', desc: 'Blue-haired sister-scarf fighter.', x: width / 2 + 92 },
    ];

    for (const card of cards) {
      const selected = current === card.id;
      const panel = this.add.rectangle(card.x, 128, 150, 108, selected ? 0x182036 : 0x10131f, 0.97);
      panel.setStrokeStyle(2, selected ? 0xff5f9e : 0x525f80, 1);

      const hero = this.add
        .image(card.x - 26, 132, `portrait_${card.id}`)
        .setScale(3.4)
        .setOrigin(0.5, 0.6);
      // idle bob
      this.tweens.add({ targets: hero, y: '-=3', yoyo: true, repeat: -1, duration: 900 + (card.id === 'girl' ? 180 : 0), ease: 'Sine.easeInOut' });
      // Veyr on the back
      this.add.image(card.x - 26 - 12 * 3.4 / 2 + 6, 118, 'veyr_stone').setScale(2).setOrigin(0.5);

      this.add
        .text(card.x + 22, 100, card.label, { fontFamily: GAME.fontFamily, fontSize: '13px', color: cssColor(COLORS.teal) })
        .setOrigin(0.5);
      this.add
        .text(card.x + 22, 116, card.desc, {
          fontFamily: GAME.fontFamily,
          fontSize: '7px',
          color: cssColor(COLORS.uiMuted),
          wordWrap: { width: 70 },
          align: 'left',
        })
        .setOrigin(0.5, 0);
      this.add
        .text(card.x + 22, 140, selected ? 'SELECTED' : ' ', {
          fontFamily: GAME.fontFamily,
          fontSize: '7px',
          color: cssColor(COLORS.scarf),
        })
        .setOrigin(0.5);

      panel.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        audioManager.play('puzzle');
        progression.mutate((s) => {
          s.character = card.id;
        });
        if (mode === 'newgame') this.scene.start('StageSelect');
        else this.scene.restart();
      });
    }

    makeButton(this, width / 2, height - 20, mode === 'newgame' ? 'Skip — keep current' : 'Back', {
      width: 150,
      onClick: () => this.scene.start(mode === 'newgame' ? 'StageSelect' : 'Menu'),
    });
    void GAME;
  }
}
