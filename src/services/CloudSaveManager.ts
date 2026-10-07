import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { EV, EventBus } from '../utils/EventBus';
import { validateSave, type PlayerSave } from './SaveModel';

/**
 * Cloud persistence (design.md §12). The Firebase SDK is fully wired, but stays
 * INACTIVE until the repository owner provides a real project config in .env /
 * CI secrets (see README.md). Until then the game runs in Guest/Local mode.
 *
 * NOT YET TESTED against a live project — milestone 4 covers authentication,
 * deployed rules and cross-device tests. Do not assume it works until then.
 */

interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readEnvConfig(): FirebaseEnvConfig | null {
  const env = import.meta.env;
  const cfg: FirebaseEnvConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  };
  const missing = Object.values(cfg).some((v) => !v);
  // Half-configured / placeholder values must not produce a broken initializeApp.
  if (missing || cfg.apiKey.includes('your-') || cfg.projectId.includes('your-')) return null;
  return cfg;
}

class CloudSaveManager {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private user: User | null = null;
  private writesAllowed = true;

  get isConfigured(): boolean {
    return readEnvConfig() !== null;
  }

  init(): void {
    if (this.app || !this.isConfigured) return;
    const cfg = readEnvConfig()!;
    this.app = getApps().length ? getApps()[0] : initializeApp(cfg);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    onAuthStateChanged(this.auth, (user) => {
      this.user = user;
      this.writesAllowed = true;
    });
  }

  get currentUser(): User | null {
    return this.user;
  }

  /** Google sign-in (design.md §12). Throws when cloud is not configured. */
  async signInGoogle(): Promise<User> {
    this.init();
    if (!this.auth) throw new Error('cloud-not-configured');
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    return credential.user;
  }

  async signOut(): Promise<void> {
    if (this.auth) await signOut(this.auth);
  }

  private saveRef(uid: string) {
    return doc(this.db!, 'saves', uid);
  }

  /** Pull the cloud save. Returns null when none exists yet. */
  async pull(): Promise<PlayerSave | null> {
    this.init();
    if (!this.db || !this.user) return null;
    try {
      const snap = await getDoc(this.saveRef(this.user.uid));
      if (!snap.exists()) return null;
      const parsed = validateSave(snap.data());
      return parsed.ok ? parsed.save : null;
    } catch (err) {
      console.warn('[STONEBOUND] cloud pull failed', err);
      EventBus.emit(EV.saveStatus, 'offline');
      return null;
    }
  }

  /**
   * Push with a revision transaction: never silently merge or overwrite a newer
   * cloud save (design.md §12). Emits 'conflict' when the cloud is ahead.
   */
  async push(save: PlayerSave): Promise<'saved' | 'conflict' | 'offline'> {
    this.init();
    if (!this.db || !this.user) return 'offline';
    if (!this.writesAllowed) return 'offline'; // lease lost to a newer session
    try {
      EventBus.emit(EV.saveStatus, 'saving');
      const outcome = await runTransaction(this.db, async (tx) => {
        const ref = this.saveRef(this.user!.uid);
        const snap = await tx.get(ref);
        const cloudRevision = snap.exists() ? Number(snap.data()?.revision ?? 0) : -1;
        if (cloudRevision > save.revision) {
          // Cloud is ahead — do not overwrite; let the user choose.
          return 'conflict' as const;
        }
        tx.set(ref, { ...save, updatedAtServer: serverTimestamp() });
        return 'saved' as const;
      });
      EventBus.emit(EV.saveStatus, outcome);
      return outcome;
    } catch (err) {
      console.warn('[STONEBOUND] cloud push failed', err);
      EventBus.emit(EV.saveStatus, 'offline');
      return 'offline';
    }
  }

  /** Best-effort: stop cloud writes after another device took over the session. */
  stopWrites(): void {
    this.writesAllowed = false;
  }

  resumeWrites(): void {
    this.writesAllowed = true;
  }
}

export const cloudSaveManager = new CloudSaveManager();
