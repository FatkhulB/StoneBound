import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';

/**
 * Best-effort per-account active-session lease (design.md §12).
 *
 * Honest scope: advisory only. A second device may offer an explicit takeover,
 * after which the older session stops cloud writes. Offline divergence is still
 * handled by revision conflict resolution — this module does NOT guarantee
 * single-session enforcement.
 */

const LEASE_TTL_MS = 120_000;

export interface LeaseInfo {
  deviceId: string;
  updatedAtClient: number;
}

export class SessionManager {
  private deviceId: string;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  /** Start renewing the lease for this account while online. */
  start(uid: string, db: Firestore): void {
    this.stop();
    void this.renew(uid, db);
    this.timer = setInterval(() => void this.renew(uid, db), 30_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async renew(uid: string, db: Firestore): Promise<void> {
    try {
      const ref = doc(db, 'sessions', uid);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? (snap.data() as Partial<LeaseInfo>) : null;
      if (existing && existing.deviceId && existing.deviceId !== this.deviceId) {
        const age = Date.now() - (existing.updatedAtClient ?? 0);
        if (age < LEASE_TTL_MS) return; // another live session holds the lease
      }
      await setDoc(ref, { deviceId: this.deviceId, updatedAtClient: Date.now(), updatedAtServer: serverTimestamp() });
    } catch {
      // Best-effort only; offline divergence is handled by revision conflicts.
    }
  }

  /** Explicit takeover from a second device (design.md §12). */
  async takeover(uid: string, db: Firestore): Promise<void> {
    await setDoc(doc(db, 'sessions', uid), {
      deviceId: this.deviceId,
      updatedAtClient: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  }
}
