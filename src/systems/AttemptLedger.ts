import type { ActiveAttempt } from '../services/SaveModel';

/**
 * Attempt coin ledger (design.md §8). Coins earned during an attempt are
 * provisional; every pickup/enemy reward has a stable unique ID so checkpoint
 * respawns never duplicate recorded rewards. Repeated collection yields 0.
 */
export class AttemptLedger {
  readonly collectedPickupIds = new Set<string>();
  readonly rewardedEnemyIds = new Set<string>();
  private total = 0;

  get coins(): number {
    return this.total;
  }

  collectPickup(id: string, amount = 1): number {
    if (this.collectedPickupIds.has(id)) return 0;
    this.collectedPickupIds.add(id);
    this.total += amount;
    return amount;
  }

  rewardEnemy(id: string, amount: number): number {
    if (this.rewardedEnemyIds.has(id)) return 0;
    this.rewardedEnemyIds.add(id);
    this.total += Math.max(0, Math.round(amount));
    return amount;
  }

  /** Restore from a persisted attempt (resume across reload/devices). */
  restore(attempt: ActiveAttempt): void {
    this.collectedPickupIds.clear();
    attempt.collectedPickupIds.forEach((id) => this.collectedPickupIds.add(id));
    this.rewardedEnemyIds.clear();
    attempt.rewardedEnemyIds.forEach((id) => this.rewardedEnemyIds.add(id));
    this.total = attempt.attemptCoins;
  }

  snapshot(): { coins: number; collected: string[]; rewarded: string[] } {
    return {
      coins: this.total,
      collected: [...this.collectedPickupIds],
      rewarded: [...this.rewardedEnemyIds],
    };
  }
}
