import { validateSave, type PlayerSave } from './SaveModel';

const SAVE_KEY = 'stonebound.save.v1';
const BACKUP_KEY = 'stonebound.save.v1.backup';
const ACCOUNT_KEY = 'stonebound.guestAccount';

function storage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* storage blocked — in-memory fallback below */
  }
  return null;
}

const memory = new Map<string, string>();

function getItem(key: string): string | null {
  const s = storage();
  if (s) {
    try {
      return s.getItem(key);
    } catch {
      return null;
    }
  }
  return memory.get(key) ?? null;
}

function setItem(key: string, value: string): void {
  const s = storage();
  if (s) {
    try {
      s.setItem(key, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memory.set(key, value);
}

/** localStorage persistence with a last-known-good backup (design.md §12). */
export const LocalSaveManager = {
  /** Stable pseudo-account id for guest play on this browser. */
  guestAccountId(): string {
    let id = getItem(ACCOUNT_KEY);
    if (!id) {
      id = `guest-${Math.random().toString(36).slice(2, 10)}`;
      setItem(ACCOUNT_KEY, id);
    }
    return id;
  },

  load(): { save: PlayerSave | null; corrupt: boolean } {
    const raw = getItem(SAVE_KEY);
    if (raw) {
      try {
        const parsed = validateSave(JSON.parse(raw));
        if (parsed.ok) return { save: parsed.save, corrupt: false };
      } catch {
        /* corrupt JSON — try backup */
      }
      const backup = getItem(BACKUP_KEY);
      if (backup) {
        try {
          const parsed = validateSave(JSON.parse(backup));
          if (parsed.ok) return { save: parsed.save, corrupt: true };
        } catch {
          /* both corrupt */
        }
      }
      return { save: null, corrupt: true };
    }
    return { save: null, corrupt: false };
  },

  save(save: PlayerSave): void {
    const prev = getItem(SAVE_KEY);
    if (prev) setItem(BACKUP_KEY, prev);
    setItem(SAVE_KEY, JSON.stringify(save));
  },

  clear(): void {
    const s = storage();
    memory.clear();
    if (s) {
      try {
        s.removeItem(SAVE_KEY);
        s.removeItem(BACKUP_KEY);
      } catch {
        /* ignore */
      }
    }
  },
};
