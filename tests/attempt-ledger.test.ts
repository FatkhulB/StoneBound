import { describe, it, expect } from 'vitest';
import { AttemptLedger } from '../src/systems/AttemptLedger';

describe('AttemptLedger (design.md §8)', () => {
  it('collects a pickup exactly once per stable id', () => {
    const ledger = new AttemptLedger();
    expect(ledger.collectPickup('coin_1', 1)).toBe(1);
    expect(ledger.collectPickup('coin_1', 1)).toBe(0); // checkpoint respawn must not duplicate
    expect(ledger.collectPickup('coin_2', 1)).toBe(1);
    expect(ledger.coins).toBe(2);
  });

  it('rewards an enemy at most once', () => {
    const ledger = new AttemptLedger();
    expect(ledger.rewardEnemy('patrol_1', 2)).toBe(2);
    expect(ledger.rewardEnemy('patrol_1', 2)).toBe(0);
    expect(ledger.coins).toBe(2);
  });

  it('restores from a persisted attempt without duplicating', () => {
    const a = new AttemptLedger();
    a.collectPickup('coin_1');
    a.collectPickup('coin_2');
    a.rewardEnemy('patrol_1', 3);
    const snap = a.snapshot();

    const b = new AttemptLedger();
    b.restore({
      attemptId: 'att-1',
      stageId: 1,
      difficultyAtStart: 'normal',
      livesRemaining: 2,
      checkpointId: 'cp_mid',
      checkpointSnapshot: null,
      hasMainKey: false,
      bossDefeated: false,
      attemptCoins: snap.coins,
      collectedPickupIds: snap.collected,
      rewardedEnemyIds: snap.rewarded,
      completionCommitted: false,
    });
    expect(b.coins).toBe(5);
    expect(b.collectPickup('coin_1')).toBe(0); // already recorded
    expect(b.collectPickup('coin_3')).toBe(1);
    expect(b.coins).toBe(6);
  });
});
