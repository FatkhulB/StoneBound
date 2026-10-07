/**
 * Difficulty table (design.md §9). Difficulty affects only the columns below —
 * never puzzles, unlock order, lives, or coin rewards. Applied at the start of a
 * new attempt, never mid-boss.
 */
export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface DifficultyValues {
  readonly id: DifficultyId;
  readonly label: string;
  readonly playerMaxHp: number;
  readonly startingLives: number;
  readonly enemyDamageMultiplier: number;
  readonly bossHpMultiplier: number;
  /** Telegraph durations scale by this (longer = easier to read). */
  readonly telegraphMultiplier: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyValues> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    playerMaxHp: 150,
    startingLives: 3,
    enemyDamageMultiplier: 0.7,
    bossHpMultiplier: 0.8,
    telegraphMultiplier: 1.25,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    playerMaxHp: 100,
    startingLives: 3,
    enemyDamageMultiplier: 1.0,
    bossHpMultiplier: 1.0,
    telegraphMultiplier: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    playerMaxHp: 100,
    startingLives: 3,
    enemyDamageMultiplier: 1.3,
    bossHpMultiplier: 1.2,
    telegraphMultiplier: 0.85,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';
