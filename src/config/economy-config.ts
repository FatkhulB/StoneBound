/**
 * Coin economy values (design.md §8). Attempt coins are provisional until the
 * stage is completed; then they commit to the permanent wallet exactly once.
 */
export const ECONOMY = {
  /** First-clear bonus per stage, granted only the first time a stage is completed. */
  firstClearBonus: 40,
  /** Per-regular-enemy reward range (design targets 1–3). */
  enemyReward: { min: 1, max: 3 },
  /** Design target for pickup coins per stage: 30–60 (validated by tests). */
  pickupTarget: { min: 30, max: 60 },
} as const;
