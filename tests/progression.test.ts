import { describe, it, expect } from 'vitest';
import { createDefaultSave, type PlayerSave } from '../src/services/SaveModel';
import {
  startAttempt,
  recordLifeLoss,
  recordCheckpoint,
  recordKeyPickup,
  recordBossDefeat,
  syncAttemptLedger,
  completeStage,
  purchaseWeapon,
  resetProgress,
} from '../src/services/ProgressionCore';

function freshSave(): PlayerSave {
  return createDefaultSave('test-account');
}

describe('attempt lifecycle (design.md §7)', () => {
  it('starts with exactly three lives', () => {
    const save = freshSave();
    const attempt = startAttempt(save, 1, 'normal');
    expect(attempt.livesRemaining).toBe(3);
  });

  it('subtracts one life per death; at zero no continuation', () => {
    const save = freshSave();
    startAttempt(save, 1, 'normal');
    expect(recordLifeLoss(save)).toBe(2);
    expect(recordLifeLoss(save)).toBe(1);
    expect(recordLifeLoss(save)).toBe(0);
  });

  it('records checkpoint snapshots and key/boss flags separately', () => {
    const save = freshSave();
    startAttempt(save, 1, 'normal');
    recordCheckpoint(save, 'cp_mid', { playerX: 100, playerY: 200, blocks: [], platesPressed: [], gatesOpen: [], crackedOpen: [], enemiesDead: [], hasMainKey: false, bossDefeated: false });
    recordKeyPickup(save);
    recordBossDefeat(save);
    expect(save.activeAttempt?.checkpointId).toBe('cp_mid');
    expect(save.activeAttempt?.hasMainKey).toBe(true);
    expect(save.activeAttempt?.bossDefeated).toBe(true);
  });
});

describe('completion commit (design.md §8)', () => {
  it('commits attempt coins exactly once and grants first-clear bonus once', () => {
    const save = freshSave();
    const attempt = startAttempt(save, 1, 'normal');
    syncAttemptLedger(save, 55, new Set(['c1', 'c2']), new Set(['p1']));

    const first = completeStage(save, attempt.attemptId);
    expect(first).not.toBeNull();
    expect(first?.coinsCommitted).toBe(55);
    expect(first?.firstClearBonus).toBe(40);
    expect(save.walletCoins).toBe(95);
    expect(save.unlockedStage).toBe(2);
    expect(save.completedStageIds).toEqual([1]);
    expect(save.activeAttempt).toBeNull();

    // Repeated completion request for the same attemptId must be a no-op (idempotent).
    expect(completeStage(save, attempt.attemptId)).toBeNull();
    expect(save.walletCoins).toBe(95);
  });

  it('never repeats the first-clear bonus on replay', () => {
    const save = freshSave();
    let attempt = startAttempt(save, 1, 'normal');
    syncAttemptLedger(save, 10, new Set(), new Set());
    completeStage(save, attempt.attemptId);
    const walletAfterFirst = save.walletCoins; // 10 + 40

    attempt = startAttempt(save, 1, 'normal');
    syncAttemptLedger(save, 10, new Set(), new Set());
    const second = completeStage(save, attempt.attemptId);
    expect(second?.wasFirstClear).toBe(false);
    expect(second?.firstClearBonus).toBe(0);
    expect(save.walletCoins).toBe(walletAfterFirst + 10);
  });

  it('unlocks skills by completed stage (design.md §6)', () => {
    const save = freshSave();
    const attempt = startAttempt(save, 3, 'normal');
    completeStage(save, attempt.attemptId);
    expect(save.unlockedSkillIds).toContain('light_burst');
    expect(save.unlockedSkillIds).not.toContain('guard');
  });
});

describe('purchases (design.md §8)', () => {
  it('validates funds, charges exactly once, persists ownership', () => {
    const save = freshSave();
    expect(purchaseWeapon(save, 'guardian_sword')).toBe('insufficient-funds');
    save.walletCoins = 150;
    expect(purchaseWeapon(save, 'guardian_sword')).toBeNull();
    expect(save.walletCoins).toBe(0);
    expect(save.ownedWeaponIds).toContain('guardian_sword');
    expect(purchaseWeapon(save, 'guardian_sword')).toBe('already-owned');
    expect(save.walletCoins).toBe(0);
    expect(save.ownedWeaponIds.filter((w) => w === 'guardian_sword')).toHaveLength(1);
  });

  it('rejects unknown weapons', () => {
    const save = freshSave();
    expect(purchaseWeapon(save, 'megalaser')).toBe('not-found');
  });
});

describe('new game reset (design.md §10)', () => {
  it('resets progression but keeps the account id', () => {
    const save = freshSave();
    const attempt = startAttempt(save, 2, 'normal');
    syncAttemptLedger(save, 30, new Set(), new Set());
    completeStage(save, attempt.attemptId);
    save.walletCoins = 123;
    resetProgress(save);
    expect(save.accountId).toBe('test-account');
    expect(save.walletCoins).toBe(0);
    expect(save.unlockedStage).toBe(1);
    expect(save.completedStageIds).toEqual([]);
    expect(save.ownedWeaponIds).toEqual(['stonebound_sword']);
  });
});
