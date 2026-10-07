import Phaser from 'phaser';
import { GAME } from '../config/game-config';
import { COLORS, cssColor } from '../ui/theme';
import { makeButton } from '../ui/Button';
import { WEAPONS } from '../data/weapons';
import { SKILLS } from '../data/skills';
import { progression } from '../services/ProgressionManager';
import { purchaseWeapon } from '../services/ProgressionCore';
import { EV, EventBus } from '../utils/EventBus';

const toast = (text: string): void => {
  EventBus.emit(EV.toast, text);
};

/** Shop & equipment (design.md §6, §8). Purchases use the permanent wallet; buttons
 *  disable for insufficient funds or owned items; loadout is chosen before a stage. */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setBackgroundColor('#141826');
    const save = progression.current;

    this.add
      .text(10, 8, `Wallet: ${save.walletCoins} coins`, { fontFamily: GAME.fontFamily, fontSize: '10px', color: cssColor(COLORS.gold) });
    this.add
      .text(width / 2, 12, 'SHOP & EQUIPMENT', { fontFamily: GAME.fontFamily, fontSize: '13px', color: cssColor(COLORS.uiText) })
      .setOrigin(0.5);

    // ---- weapons ----
    this.add.text(24, 30, 'WEAPONS', { fontFamily: GAME.fontFamily, fontSize: '9px', color: cssColor(COLORS.uiMuted) });
    WEAPONS.forEach((w, i) => {
      const y = 52 + i * 34;
      const owned = save.ownedWeaponIds.includes(w.id);
      const equipped = save.equippedWeaponId === w.id;
      const affordable = save.walletCoins >= w.price;
      this.add.text(24, y - 8, w.name, { fontFamily: GAME.fontFamily, fontSize: '10px', color: cssColor(COLORS.uiText) });
      this.add
        .text(24, y + 3, `${w.damage} dmg · ${(w.intervalMs / 1000).toFixed(2)}s · ${w.description}`, {
          fontFamily: GAME.fontFamily,
          fontSize: '7px',
          color: cssColor(COLORS.uiMuted),
        });
      if (equipped) {
        makeButton(this, width - 60, y, 'Equipped', { width: 96, muted: true, disabled: true });
      } else if (owned) {
        makeButton(this, width - 60, y, 'Equip', {
          width: 96,
          onClick: () => {
            progression.mutate((s) => {
              s.equippedWeaponId = w.id;
            });
            this.scene.restart();
          },
        });
      } else {
        makeButton(this, width - 60, y, `Buy — ${w.price}`, {
          width: 96,
          disabled: !affordable,
          onClick: () => {
            let err: ReturnType<typeof purchaseWeapon> = null;
            progression.mutate((s) => {
              err = purchaseWeapon(s, w.id);
            });
            if (err === 'insufficient-funds') toast('Not enough coins.');
            else if (err) toast('Purchase failed.');
            else {
              toast(`Purchased ${w.name}.`);
              this.scene.restart();
            }
          },
        });
      }
    });

    // ---- skills (loadout) ----
    this.add
      .text(24, 160, 'SKILLS — equip one active skill besides Dash', { fontFamily: GAME.fontFamily, fontSize: '9px', color: cssColor(COLORS.uiMuted) });
    SKILLS.filter((s) => s.id !== 'dash').forEach((s, i) => {
      const y = 182 + i * 30;
      const unlocked = save.unlockedSkillIds.includes(s.id);
      const equipped = save.equippedSkillId === s.id;
      this.add.text(24, y - 6, s.name, {
        fontFamily: GAME.fontFamily,
        fontSize: '10px',
        color: cssColor(unlocked ? COLORS.uiText : COLORS.uiMuted),
      });
      this.add.text(24, y + 5, unlocked ? s.description : `Unlocks after stage ${s.unlockedAfterStage}`, {
        fontFamily: GAME.fontFamily,
        fontSize: '7px',
        color: cssColor(COLORS.uiMuted),
      });
      if (equipped) {
        makeButton(this, width - 60, y, 'Equipped', { width: 96, muted: true, disabled: true });
      } else {
        makeButton(this, width - 60, y, unlocked ? 'Equip' : 'Locked', {
          width: 96,
          disabled: !unlocked,
          onClick: () => {
            progression.mutate((st) => {
              st.equippedSkillId = s.id;
            });
            this.scene.restart();
          },
        });
      }
    });
    if (save.equippedSkillId) {
      const sk = SKILLS.find((s) => s.id === save.equippedSkillId);
      this.add
        .text(width - 24, 152, `Active: ${sk?.name ?? '—'}`, {
          fontFamily: GAME.fontFamily,
          fontSize: '7px',
          color: cssColor(COLORS.uiAccent),
        })
        .setOrigin(1, 0);
      makeButton(this, width - 60, 244, 'Unequip skill', {
        width: 96,
        onClick: () => {
          progression.mutate((st) => {
            st.equippedSkillId = null;
          });
          this.scene.restart();
        },
      });
    }

    makeButton(this, width / 2, height - 12, 'Back', { width: 110, onClick: () => this.scene.start('Menu') });
  }
}
