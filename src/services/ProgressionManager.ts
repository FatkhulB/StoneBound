import { EV, EventBus } from '../utils/EventBus';
import type { DifficultyId } from '../config/difficulty';
import type { SaveSettings, WorldSnapshot } from './SaveModel';
import { createDefaultSave, validateSave, type PlayerSave } from './SaveModel';
import { LocalSaveManager } from './LocalSaveManager';
import { cloudSaveManager } from './CloudSaveManager';
import * as Core from './ProgressionCore';

/**
 * Session-level progression service. Owns the current save, applies the pure
 * rules from ProgressionCore, and persists locally (always) plus to the cloud
 * (when signed in). UI calls these methods — never mutates the save directly
 * (design.md §13).
 */
class ProgressionManager {
  private save: PlayerSave = createDefaultSave('guest');
  private started = false;

  /** Load the best available save: cloud when signed in, else local. */
  async load(): Promise<void> {
    cloudSaveManager.init();
    if (cloudSaveManager.isConfigured && cloudSaveManager.currentUser) {
      const cloud = await cloudSaveManager.pull();
      const local = LocalSaveManager.load();
      if (cloud && local.save && local.save.revision > cloud.revision) {
        // Local has queued offline progress: keep it and push it up.
        this.save = local.save;
        await cloudSaveManager.push(this.save);
      } else if (cloud) {
        this.save = cloud;
        LocalSaveManager.save(this.save);
      } else if (local.save) {
        this.save = local.save;
        await cloudSaveManager.push(this.save);
      } else {
        this.save = createDefaultSave(cloudSaveManager.currentUser.uid);
      }
    } else {
      const local = LocalSaveManager.load();
      this.save = local.save ?? createDefaultSave(LocalSaveManager.guestAccountId());
      if (local.corrupt) {
        // A corrupt save must not crash the game (design.md §12) — offer recovery.
        EventBus.emit(EV.toast, 'Save data was damaged. Progress reset to last backup.');
      }
      EventBus.emit(EV.saveStatus, cloudSaveManager.isConfigured ? 'local' : 'not-configured');
    }
    // An attempt with no lives left cannot be continued — clear it up front.
    if (this.save.activeAttempt && this.save.activeAttempt.livesRemaining <= 0) {
      this.save.activeAttempt = null;
      LocalSaveManager.save(this.save);
    }
    this.started = true;
  }

  get current(): PlayerSave {
    return this.save;
  }

  get isSignedIn(): boolean {
    return cloudSaveManager.currentUser !== null;
  }

  get cloudConfigured(): boolean {
    return cloudSaveManager.isConfigured;
  }

  /**
   * Apply a mutation, bump the revision, persist locally and (async) to the
   * cloud. Cloud result is reported through EV.saveStatus; conflicts surface as
   * 'conflict' and must be resolved by the user, never auto-merged.
   */
  mutate(fn: (save: PlayerSave) => void): void {
    if (!this.started) return;
    fn(this.save);
    const check = validateSave(this.save);
    if (!check.ok) {
      console.error('[STONEBOUND] mutation produced an invalid save; refusing to persist.');
      this.save = check.save;
      return;
    }
    this.save.revision += 1;
    this.save.updatedAt = Date.now();
    LocalSaveManager.save(this.save);
    if (cloudSaveManager.isConfigured && cloudSaveManager.currentUser) {
      void cloudSaveManager.push(this.save);
    }
  }

  // ---- attempt lifecycle (design.md §7) ----

  startAttempt(stageId: number, difficulty: DifficultyId): void {
    this.mutate((s) => Core.startAttempt(s, stageId, difficulty));
  }

  recordCheckpoint(checkpointId: string, snapshot: WorldSnapshot): void {
    this.mutate((s) => Core.recordCheckpoint(s, checkpointId, snapshot));
  }

  recordLifeLoss(): number {
    let remaining = 0;
    this.mutate((s) => {
      remaining = Core.recordLifeLoss(s);
    });
    return remaining;
  }

  recordKeyPickup(): void {
    this.mutate((s) => Core.recordKeyPickup(s));
  }

  recordBossDefeat(): void {
    this.mutate((s) => Core.recordBossDefeat(s));
  }

  syncAttemptLedger(attemptCoins: number, collected: Set<string>, rewarded: Set<string>): void {
    this.mutate((s) => Core.syncAttemptLedger(s, attemptCoins, collected, rewarded));
  }

  completeStage(attemptId: string): Core.CompletionSummary | null {
    let summary: Core.CompletionSummary | null = null;
    this.mutate((s) => {
      summary = Core.completeStage(s, attemptId);
    });
    return summary;
  }

  abandonAttempt(): void {
    this.mutate((s) => Core.abandonAttempt(s));
  }

  newGame(): void {
    this.mutate((s) => Core.resetProgress(s));
  }

  updateSettings(settings: Partial<SaveSettings>): void {
    this.mutate((s) => Core.applySettings(s, settings));
  }

  setDifficulty(difficulty: DifficultyId): void {
    this.mutate((s) => Core.setDifficulty(s, difficulty));
  }

  // ---- cloud account ----

  async signInGoogle(): Promise<void> {
    const user = await cloudSaveManager.signInGoogle();
    this.save.accountId = user.uid;
    const cloud = await cloudSaveManager.pull();
    const local = LocalSaveManager.load();
    if (cloud && local.save && local.save.revision > cloud.revision) {
      this.save = local.save;
      this.save.accountId = user.uid;
      await cloudSaveManager.push(this.save);
    } else if (cloud) {
      this.save = cloud;
      LocalSaveManager.save(this.save);
    } else if (local.save) {
      this.save = local.save;
      this.save.accountId = user.uid;
      await cloudSaveManager.push(this.save);
    } else {
      this.save = createDefaultSave(user.uid);
      LocalSaveManager.save(this.save);
      await cloudSaveManager.push(this.save);
    }
  }

  async signOut(): Promise<void> {
    await cloudSaveManager.signOut();
    this.save = createDefaultSave(LocalSaveManager.guestAccountId());
    LocalSaveManager.save(this.save);
    EventBus.emit(EV.saveStatus, 'not-configured');
  }

  /** Conflict resolution hook (design.md §12): explicit user choice. */
  async resolveConflict(keep: 'local' | 'cloud'): Promise<void> {
    if (keep === 'cloud') {
      const cloud = await cloudSaveManager.pull();
      if (cloud) {
        this.save = cloud;
        LocalSaveManager.save(this.save);
      }
    } else {
      cloudSaveManager.resumeWrites();
      await cloudSaveManager.push(this.save);
    }
    EventBus.emit(EV.saveStatus, keep === 'cloud' ? 'saved' : 'local');
  }
}

export const progression = new ProgressionManager();
