/**
 * Weapon catalog (design.md §6). Proposed playtest values — keep tunable here.
 * Veyr stays carried regardless of the equipped combat weapon; its environmental
 * interaction is a contextual action, not a permanent combat button.
 */
export interface WeaponDef {
  id: string;
  name: string;
  price: number;
  damage: number;
  /** Seconds between swings. */
  intervalMs: number;
  reach: 'short' | 'medium' | 'ranged';
  description: string;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'stonebound_sword',
    name: 'Stonebound Sword',
    price: 0,
    damage: 12,
    intervalMs: 600,
    reach: 'short',
    description: 'Heavy starter melee. Veyr stays in its stone; puzzle interaction intact.',
  },
  {
    id: 'guardian_sword',
    name: 'Guardian Sword',
    price: 150,
    damage: 18,
    intervalMs: 550,
    reach: 'medium',
    description: 'Medium reach, faster swings.',
  },
  {
    id: 'light_bow',
    name: 'Light Bow',
    price: 250,
    damage: 10,
    intervalMs: 700,
    reach: 'ranged',
    description: 'Ranged shots without consumable ammunition.',
  },
];

export const STARTER_WEAPON_ID = 'stonebound_sword';

export function getWeapon(id: string): WeaponDef | undefined {
  return WEAPONS.find((w) => w.id === id);
}
