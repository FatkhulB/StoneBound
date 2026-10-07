import { DEFAULT_DIFFICULTY, type DifficultyId } from '../config/difficulty';
import { AUDIO } from '../config/audio-config';
import { STARTER_WEAPON_ID } from '../data/weapons';

/**
 * Save model (design.md §12). Everything is plain JSON so it can live in
 * localStorage and Firestore unchanged. `revision` drives conflict detection.
 */
export const SCHEMA_VERSION = 1;

export interface SaveSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  reduceShake: boolean;
  reduceFlash: boolean;
}

/** Restorable world state captured when a checkpoint activates (design.md §7). */
export interface WorldSnapshot {
  playerX: number;
  playerY: number;
  blocks: { id: string; x: number; y: number }[];
  platesPressed: string[];
  gatesOpen: string[];
  crackedOpen: string[];
  enemiesDead: string[];
  hasMainKey: boolean;
  bossDefeated: boolean;
}

export interface ActiveAttempt {
  attemptId: string;
  stageId: number;
  difficultyAtStart: DifficultyId;
  livesRemaining: number;
  checkpointId: string | null;
  checkpointSnapshot: WorldSnapshot | null;
  hasMainKey: boolean;
  bossDefeated: boolean;
  attemptCoins: number;
  collectedPickupIds: string[];
  rewardedEnemyIds: string[];
  completionCommitted: boolean;
}

export interface PlayerSave {
  schemaVersion: number;
  revision: number;
  updatedAt: number;
  accountId: string;
  /** Cosmetic hero variant chosen on the character select screen. */
  character: 'boy' | 'girl';
  unlockedStage: number;
  completedStageIds: number[];
  firstClearClaimedIds: number[];
  walletCoins: number;
  ownedWeaponIds: string[];
  equippedWeaponId: string;
  unlockedSkillIds: string[];
  equippedSkillId: string | null;
  difficulty: DifficultyId;
  settings: SaveSettings;
  activeAttempt: ActiveAttempt | null;
}

export function createDefaultSave(accountId: string): PlayerSave {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    updatedAt: 0,
    accountId,
    character: 'boy',
    unlockedStage: 1,
    completedStageIds: [],
    firstClearClaimedIds: [],
    walletCoins: 0,
    ownedWeaponIds: [STARTER_WEAPON_ID],
    equippedWeaponId: STARTER_WEAPON_ID,
    unlockedSkillIds: ['dash', 'light_burst'],
    equippedSkillId: 'light_burst',
    difficulty: DEFAULT_DIFFICULTY,
    settings: {
      musicVolume: AUDIO.defaultMusicVolume,
      sfxVolume: AUDIO.defaultSfxVolume,
      muted: AUDIO.defaultMuted,
      reduceShake: false,
      reduceFlash: false,
    },
    activeAttempt: null,
  };
}

const DIFFICULTY_IDS: DifficultyId[] = ['easy', 'normal', 'hard'];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number' && Number.isFinite(x));
}

/**
 * Strict validation: a corrupt or unsupported save must not crash the game
 * (design.md §12). Returns a fresh default when unrecoverable.
 */
export function validateSave(raw: unknown): { ok: boolean; save: PlayerSave; error?: string } {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, save: createDefaultSave('unknown'), error: 'not an object' };
  }
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, save: createDefaultSave('unknown'), error: `unsupported schemaVersion ${String(s.schemaVersion)}` };
  }
  const fallback = createDefaultSave(typeof s.accountId === 'string' ? s.accountId : 'unknown');
  const settings = (s.settings ?? {}) as Record<string, unknown>;
  const attempt = s.activeAttempt as Record<string, unknown> | null;

  const difficultiesOk = typeof s.difficulty === 'string' && DIFFICULTY_IDS.includes(s.difficulty as DifficultyId);
  const snapshot = attempt?.checkpointSnapshot as WorldSnapshot | null;

  const save: PlayerSave = {
    schemaVersion: SCHEMA_VERSION,
    revision: isFiniteNumber(s.revision) ? s.revision : 0,
    updatedAt: isFiniteNumber(s.updatedAt) ? s.updatedAt : 0,
    accountId: typeof s.accountId === 'string' ? s.accountId : fallback.accountId,
    character: s.character === 'girl' ? 'girl' : 'boy',
    unlockedStage: isFiniteNumber(s.unlockedStage) ? Math.max(1, Math.floor(s.unlockedStage)) : 1,
    completedStageIds: isNumberArray(s.completedStageIds) ? s.completedStageIds : [],
    firstClearClaimedIds: isNumberArray(s.firstClearClaimedIds) ? s.firstClearClaimedIds : [],
    walletCoins: isFiniteNumber(s.walletCoins) ? Math.max(0, Math.floor(s.walletCoins)) : 0,
    ownedWeaponIds: isStringArray(s.ownedWeaponIds) && s.ownedWeaponIds.length > 0 ? s.ownedWeaponIds : fallback.ownedWeaponIds,
    equippedWeaponId: typeof s.equippedWeaponId === 'string' ? s.equippedWeaponId : fallback.equippedWeaponId,
    unlockedSkillIds: isStringArray(s.unlockedSkillIds) ? s.unlockedSkillIds : fallback.unlockedSkillIds,
    equippedSkillId: typeof s.equippedSkillId === 'string' ? s.equippedSkillId : null,
    difficulty: difficultiesOk ? (s.difficulty as DifficultyId) : DEFAULT_DIFFICULTY,
    settings: {
      musicVolume: isFiniteNumber(settings.musicVolume) ? settings.musicVolume : fallback.settings.musicVolume,
      sfxVolume: isFiniteNumber(settings.sfxVolume) ? settings.sfxVolume : fallback.settings.sfxVolume,
      muted: typeof settings.muted === 'boolean' ? settings.muted : fallback.settings.muted,
      reduceShake: typeof settings.reduceShake === 'boolean' ? settings.reduceShake : false,
      reduceFlash: typeof settings.reduceFlash === 'boolean' ? settings.reduceFlash : false,
    },
    activeAttempt:
      attempt && typeof attempt === 'object' && typeof attempt.attemptId === 'string'
        ? {
            attemptId: attempt.attemptId,
            stageId: isFiniteNumber(attempt.stageId) ? attempt.stageId : 1,
            difficultyAtStart:
              typeof attempt.difficultyAtStart === 'string' && DIFFICULTY_IDS.includes(attempt.difficultyAtStart as DifficultyId)
                ? (attempt.difficultyAtStart as DifficultyId)
                : DEFAULT_DIFFICULTY,
            livesRemaining: isFiniteNumber(attempt.livesRemaining) ? Math.max(0, Math.floor(attempt.livesRemaining)) : 3,
            checkpointId: typeof attempt.checkpointId === 'string' ? attempt.checkpointId : null,
            checkpointSnapshot: snapshot && typeof snapshot === 'object' ? snapshot : null,
            hasMainKey: attempt.hasMainKey === true,
            bossDefeated: attempt.bossDefeated === true,
            attemptCoins: isFiniteNumber(attempt.attemptCoins) ? Math.max(0, Math.floor(attempt.attemptCoins)) : 0,
            collectedPickupIds: isStringArray(attempt.collectedPickupIds) ? attempt.collectedPickupIds : [],
            rewardedEnemyIds: isStringArray(attempt.rewardedEnemyIds) ? attempt.rewardedEnemyIds : [],
            completionCommitted: attempt.completionCommitted === true,
          }
        : null,
  };
  return { ok: true, save };
}
