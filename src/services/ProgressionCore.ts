import type { DifficultyId } from '../config/difficulty';
import { ECONOMY } from '../config/economy-config';
import { STARTING_LIVES } from '../config/player-config';
import { skillsUnlockedBy } from '../data/skills';
import { WEAPONS } from '../data/weapons';
import type { ActiveAttempt, PlayerSave, SaveSettings, WorldSnapshot } from './SaveModel';
import { createDefaultSave } from './SaveModel';

/**
 * Pure progression rules (design.md §3, §7, §8). No I/O — fully unit-testable.
 * The ProgressionManager service applies these to a save and persists it.
 */

export function startAttempt(save: PlayerSave, stageId: number, difficulty: DifficultyId): ActiveAttempt {
  const attempt: ActiveAttempt = {
    attemptId: `att-${stageId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    stageId,
    difficultyAtStart: difficulty,
    livesRemaining: STARTING_LIVES,
    checkpointId: null,
    checkpointSnapshot: null,
    hasMainKey: false,
    bossDefeated: false,
    attemptCoins: 0,
    collectedPickupIds: [],
    rewardedEnemyIds: [],
    completionCommitted: false,
  };
  save.activeAttempt = attempt;
  return attempt;
}

export function abandonAttempt(save: PlayerSave): void {
  save.activeAttempt = null;
}

export function recordCheckpoint(save: PlayerSave, checkpointId: string, snapshot: WorldSnapshot): void {
  const attempt = save.activeAttempt;
  if (!attempt) return;
  attempt.checkpointId = checkpointId;
  attempt.checkpointSnapshot = snapshot;
}

export function recordLifeLoss(save: PlayerSave): number {
  const attempt = save.activeAttempt;
  if (!attempt) return 0;
  attempt.livesRemaining = Math.max(0, attempt.livesRemaining - 1);
  return attempt.livesRemaining;
}

export function recordKeyPickup(save: PlayerSave): void {
  const attempt = save.activeAttempt;
  if (attempt) attempt.hasMainKey = true;
}

export function recordBossDefeat(save: PlayerSave): void {
  const attempt = save.activeAttempt;
  if (attempt) attempt.bossDefeated = true;
}

export function syncAttemptLedger(save: PlayerSave, attemptCoins: number, collected: Set<string>, rewarded: Set<string>): void {
  const attempt = save.activeAttempt;
  if (!attempt) return;
  attempt.attemptCoins = attemptCoins;
  attempt.collectedPickupIds = [...collected];
  attempt.rewardedEnemyIds = [...rewarded];
}

export interface CompletionSummary {
  attemptId: string;
  coinsCommitted: number;
  firstClearBonus: number;
  wasFirstClear: boolean;
}

/**
 * Commit a completed stage exactly once per attemptId (design.md §8, §12):
 * wallet gains attempt coins + first-clear bonus only if unclaimed; unlocks and
 * skill list refresh; the attempt is closed. Repeat calls are no-ops.
 */
export function completeStage(save: PlayerSave, attemptId: string): CompletionSummary | null {
  const attempt = save.activeAttempt;
  if (!attempt || attempt.attemptId !== attemptId || attempt.completionCommitted) return null;

  const wasFirstClear = !save.firstClearClaimedIds.includes(attempt.stageId);
  const bonus = wasFirstClear ? ECONOMY.firstClearBonus : 0;
  save.walletCoins += attempt.attemptCoins + bonus;
  if (wasFirstClear) save.firstClearClaimedIds.push(attempt.stageId);
  if (!save.completedStageIds.includes(attempt.stageId)) save.completedStageIds.push(attempt.stageId);
  save.unlockedStage = Math.max(save.unlockedStage, attempt.stageId + 1);
  save.unlockedSkillIds = skillsUnlockedBy(save.completedStageIds);
  attempt.completionCommitted = true;
  save.activeAttempt = null;

  return {
    attemptId,
    coinsCommitted: attempt.attemptCoins,
    firstClearBonus: bonus,
    wasFirstClear,
  };
}

export type PurchaseError = 'not-found' | 'already-owned' | 'insufficient-funds';

/** Validate funds & ownership, charge exactly once (design.md §8). */
export function purchaseWeapon(save: PlayerSave, weaponId: string): PurchaseError | null {
  const weapon = WEAPONS.find((w) => w.id === weaponId);
  if (!weapon) return 'not-found';
  if (save.ownedWeaponIds.includes(weaponId)) return 'already-owned';
  if (save.walletCoins < weapon.price) return 'insufficient-funds';
  save.walletCoins -= weapon.price;
  save.ownedWeaponIds.push(weaponId);
  return null;
}

export function applySettings(save: PlayerSave, settings: Partial<SaveSettings>): void {
  save.settings = { ...save.settings, ...settings };
}

export function setDifficulty(save: PlayerSave, difficulty: DifficultyId): void {
  // Applies at the start of the NEXT attempt, never mid-attempt (design.md §9).
  save.difficulty = difficulty;
}

export function setCharacter(save: PlayerSave, character: 'boy' | 'girl'): void {
  save.character = character;
}

/** New Game: explicit reset of everything except the account id (design.md §10). */
export function resetProgress(save: PlayerSave): void {
  // Mutate in place so existing references to the save object stay valid.
  Object.assign(save, createDefaultSave(save.accountId));
}
