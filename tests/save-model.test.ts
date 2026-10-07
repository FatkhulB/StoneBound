import { describe, it, expect } from 'vitest';
import { createDefaultSave, validateSave } from '../src/services/SaveModel';

describe('SaveModel validation (design.md §12)', () => {
  it('accepts a fresh default save', () => {
    const save = createDefaultSave('acc-1');
    const result = validateSave(save);
    expect(result.ok).toBe(true);
    expect(result.save.unlockedStage).toBe(1);
    expect(result.save.ownedWeaponIds).toContain('stonebound_sword');
  });

  it('rejects non-objects and wrong schema versions without crashing', () => {
    expect(validateSave(null).ok).toBe(false);
    expect(validateSave('junk').ok).toBe(false);
    expect(validateSave({ schemaVersion: 999 }).ok).toBe(false);
  });

  it('coerces corrupt fields into a safe save instead of throwing', () => {
    const result = validateSave({
      schemaVersion: 1,
      walletCoins: 'lots',
      unlockedStage: -5,
      completedStageIds: 'nope',
      difficulty: 'impossible',
      settings: { musicVolume: 'loud' },
    });
    expect(result.ok).toBe(true);
    expect(result.save.walletCoins).toBe(0);
    expect(result.save.unlockedStage).toBe(1);
    expect(result.save.completedStageIds).toEqual([]);
    expect(result.save.difficulty).toBe('normal');
    expect(typeof result.save.settings.musicVolume).toBe('number');
  });

  it('keeps a structurally valid activeAttempt', () => {
    const attempt = {
      attemptId: 'att-42',
      stageId: 1,
      difficultyAtStart: 'normal',
      livesRemaining: 2,
      checkpointId: 'cp_mid',
      checkpointSnapshot: null,
      hasMainKey: true,
      bossDefeated: false,
      attemptCoins: 17,
      collectedPickupIds: ['coin_1'],
      rewardedEnemyIds: ['patrol_1'],
      completionCommitted: false,
    };
    const result = validateSave({ ...createDefaultSave('a'), activeAttempt: attempt });
    expect(result.ok).toBe(true);
    expect(result.save.activeAttempt?.attemptId).toBe('att-42');
    expect(result.save.activeAttempt?.livesRemaining).toBe(2);
  });

  it('drops an invalid activeAttempt rather than crashing', () => {
    const result = validateSave({ ...createDefaultSave('a'), activeAttempt: 'garbage' });
    expect(result.ok).toBe(true);
    expect(result.save.activeAttempt).toBeNull();
  });
});
