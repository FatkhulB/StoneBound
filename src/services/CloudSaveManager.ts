import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
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
 * Cloud persistence (design.md §12). Aktif ketika VITE_FIREBASE_* terisi
 * (.env untuk dev lokal, .env.production / CI secrets untuk Pages).
 * Tanpa config → Guest/Local mode (localStorage saja).
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
    apiKey: (env.VITE_FIREBASE_API_KEY as string ?? '').trim(),
    authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string ?? '').trim(),
    projectId: (env.VITE_FIREBASE_PROJECT_ID as string ?? '').trim(),
    storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string ?? '').trim(),
    messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string ?? '').trim(),
    appId: (env.VITE_FIREBASE_APP_ID as string ?? '').trim(),
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
  private initStarted = false;
  private initPromise: Promise<void> | null = null;
  private authReadyResolve: (() => void) | null = null;
  private authReadyPromise: Promise<void>;

  constructor() {
    this.authReadyPromise = new Promise<void>((resolve) => {
      this.authReadyResolve = resolve;
    });
  }

  get isConfigured(): boolean {
    return readEnvConfig() !== null;
  }

  get currentUser(): User | null {
    return this.user;
  }

  get firestore(): Firestore | null {
    return this.db;
  }

  init(): void {
    if (this.app || this.initStarted || !this.isConfigured) {
      // Tetap resolve agar penunggu tidak menggantung saat tidak dikonfigurasi.
      if (!this.isConfigured) this.authReadyResolve?.();
      return;
    }
    this.initStarted = true;
    this.initPromise = this.initAsync();
  }

  /** Tunggu Firebase Auth selesai restore sesi (penting agar refresh tetap login). */
  async ready(): Promise<void> {
    this.init();
    await this.initPromise;
    await this.authReadyPromise;
  }

  private async initAsync(): Promise<void> {
    try {
      const cfg = readEnvConfig();
      if (!cfg) {
        this.authReadyResolve?.();
        return;
      }
      this.app = getApps().length ? getApps()[0] : initializeApp(cfg);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      try {
        await setPersistence(this.auth, browserLocalPersistence);
      } catch (err) {
        console.warn('[STONEBOUND] auth persistence fallback', err);
      }
      // Selesaikan login redirect (fallback dari signInGoogle) bila ada.
      try {
        const redirect = await getRedirectResult(this.auth);
        if (redirect?.user) this.user = redirect.user;
      } catch (err) {
        console.warn('[STONEBOUND] redirect login result failed', err);
      }
      onAuthStateChanged(
        this.auth,
        (user) => {
          this.user = user;
          // Sesi baru (atau baru login) boleh menulis lagi.
          if (user) this.writesAllowed = true;
          this.authReadyResolve?.();
        },
        () => {
          this.authReadyResolve?.();
        },
      );
    } catch (err) {
      console.warn('[STONEBOUND] cloud init failed, falling back to local', err);
      this.authReadyResolve?.();
    }
  }

  /** Google sign-in (design.md §12). Throws when cloud is not configured. */
  async signInGoogle(): Promise<User> {
    await this.ready();
    if (!this.auth) throw new Error('cloud-not-configured');
    try {
      const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
      this.user = credential.user;
      this.writesAllowed = true;
      return credential.user;
    } catch (err) {
      const code = String((err as { code?: string })?.code ?? '');
      // Popup diblokir / tidak didukung (mobile, iframe, popup-blocker) → pakai redirect.
      if (code.includes('popup-blocked') || code.includes('operation-not-supported') || code.includes('popup-window-closed')) {
        await signInWithRedirect(this.auth, new GoogleAuthProvider());
        throw new Error('redirecting');
      }
      throw err;
    }
  }

  async signOut(): Promise<void> {
    if (this.auth) await signOut(this.auth);
    this.user = null;
    this.writesAllowed = true;
  }

  private saveRef(uid: string) {
    return doc(this.db!, 'saves', uid);
  }

  /** Pull the cloud save. Returns null when none exists yet. */
  async pull(): Promise<PlayerSave | null> {
    await this.ready();
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
    await this.ready();
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