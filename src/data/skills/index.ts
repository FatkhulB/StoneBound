/**
 * Skill catalog (design.md §6). Dash is available from stage 1; Light Burst and
 * Guard unlock after completing stages 3 and 6. Exactly one active combat skill
 * may be equipped next to dash.
 */
export interface SkillDef {
  id: string;
  name: string;
  unlockedAfterStage: number;
  cooldownMs: number;
  description: string;
}

export const SKILLS: SkillDef[] = [
  {
    id: 'dash',
    name: 'Dash',
    unlockedAfterStage: 0,
    cooldownMs: 2000,
    description: 'Short horizontal burst. 2s cooldown. No wall phasing, no immunity.',
  },
  {
    id: 'light_burst',
    name: 'Light Burst',
    // Playtest change (v0.3): available from the start so every attempt has an
    // active skill; 20 area damage around the hero, 8s cooldown.
    unlockedAfterStage: 0,
    cooldownMs: 8000,
    description: '20 area damage around Pip. 8s cooldown.',
  },
  {
    id: 'guard',
    name: 'Guard',
    unlockedAfterStage: 6,
    cooldownMs: 10000,
    description: '60% incoming damage reduction for 1.5s.',
  },
];

export function skillsUnlockedBy(completedStageIds: number[]): string[] {
  const max = completedStageIds.length ? Math.max(...completedStageIds) : 0;
  return SKILLS.filter((s) => s.unlockedAfterStage <= max).map((s) => s.id);
}
