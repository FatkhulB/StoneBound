import { AUDIO } from '../config/audio-config';

/**
 * WebAudio synth for placeholder SFX and ambient loops (design.md §11).
 * All sound is code-generated (original) — see ASSET_LICENSES.md.
 * Audio starts only after a user action; music/SFX volumes are independent;
 * tracks never duplicate (one loop instance at a time).
 */

export type SfxName =
  | 'ui'
  | 'jump'
  | 'land'
  | 'attack'
  | 'hit'
  | 'hurt'
  | 'coin'
  | 'checkpoint'
  | 'key'
  | 'door'
  | 'puzzle'
  | 'lever'
  | 'gate'
  | 'dash'
  | 'break'
  | 'death'
  | 'boss-hit'
  | 'boss-die';

export type MusicTrack = 'menu' | 'explore' | 'boss' | 'results' | 'ending' | null;

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicVolume: number = AUDIO.defaultMusicVolume;
  private sfxVolume: number = AUDIO.defaultSfxVolume;
  private muted: boolean = AUDIO.defaultMuted;
  private currentTrack: MusicTrack = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private beat = 0;
  private unlocked = false;

  /** Must be called from a user-gesture handler (design.md §11). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.applyVolumes();
    this.unlocked = true;
  }

  private applyVolumes(): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.musicGain.gain.value = this.musicVolume * 0.35;
    this.sfxGain.gain.value = this.sfxVolume;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolumes();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; vol?: number; slideTo?: number; delay?: number; gain?: GainNode | null } = {},
  ): void {
    if (!this.ctx || !this.unlocked) return;
    const { type = 'square', vol = 0.25, slideTo, delay = 0, gain = this.sfxGain } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(gain ?? this.sfxGain!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.2, delay = 0): void {
    if (!this.ctx || !this.unlocked) return;
    const t0 = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(g).connect(this.sfxGain!);
    src.start(t0);
  }

  play(name: SfxName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'ui': this.tone(660, 0.06, { type: 'square', vol: 0.12 }); break;
      case 'jump': this.tone(280, 0.14, { type: 'triangle', slideTo: 520, vol: 0.2 }); break;
      case 'land': this.noise(0.05, 0.1); break;
      case 'attack': this.tone(180, 0.08, { type: 'square', vol: 0.16, slideTo: 120 }); this.noise(0.05, 0.1); break;
      case 'hit': this.tone(220, 0.09, { type: 'sawtooth', slideTo: 90, vol: 0.2 }); break;
      case 'hurt': this.tone(200, 0.18, { type: 'square', slideTo: 90, vol: 0.24 }); this.noise(0.12, 0.15); break;
      case 'coin': this.tone(880, 0.07, { type: 'sine', vol: 0.18 }); this.tone(1318, 0.1, { type: 'sine', vol: 0.15, delay: 0.06 }); break;
      case 'checkpoint': [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.16, delay: i * 0.09 })); break;
      case 'key': [700, 900, 1200].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.17, delay: i * 0.08 })); break;
      case 'door': this.tone(140, 0.3, { type: 'triangle', slideTo: 90, vol: 0.2 }); break;
      case 'puzzle': this.tone(400, 0.1, { type: 'triangle', vol: 0.15 }); this.tone(600, 0.14, { type: 'triangle', vol: 0.15, delay: 0.1 }); break;
      case 'lever': this.tone(250, 0.07, { type: 'square', vol: 0.15 }); break;
      case 'gate': this.tone(100, 0.4, { type: 'triangle', slideTo: 60, vol: 0.22 }); this.noise(0.25, 0.08, 0.05); break;
      case 'dash': this.noise(0.12, 0.16); break;
      case 'break': this.noise(0.25, 0.24); this.tone(120, 0.2, { type: 'square', slideTo: 60, vol: 0.15 }); break;
      case 'death': this.tone(300, 0.5, { type: 'sawtooth', slideTo: 55, vol: 0.22 }); break;
      case 'boss-hit': this.tone(150, 0.1, { type: 'sawtooth', slideTo: 80, vol: 0.2 }); break;
      case 'boss-die': this.tone(400, 0.7, { type: 'sawtooth', slideTo: 60, vol: 0.24 }); this.noise(0.4, 0.15, 0.1); break;
    }
  }

  /** Simple generative loops; switching tracks stops the previous one. */
  playMusic(track: MusicTrack): void {
    if (this.currentTrack === track) return;
    this.stopMusic();
    if (!track || !this.ctx) {
      this.currentTrack = track;
      return;
    }
    this.currentTrack = track;
    this.beat = 0;
    const patterns: Record<Exclude<MusicTrack, null>, { tempo: number; notes: (number | 0)[]; bass: (number | 0)[] }> = {
      menu: { tempo: 320, notes: [440, 0, 523, 0, 659, 0, 523, 0], bass: [110, 0, 0, 0, 87, 0, 0, 0] },
      explore: { tempo: 300, notes: [330, 0, 392, 440, 0, 392, 330, 0, 294, 0, 330, 0, 392, 0, 0, 0], bass: [110, 0, 0, 0, 98, 0, 0, 0, 87, 0, 0, 0, 98, 0, 0, 0] },
      boss: { tempo: 190, notes: [220, 0, 220, 262, 0, 220, 0, 175], bass: [55, 55, 0, 55, 62, 0, 55, 0] },
      results: { tempo: 240, notes: [523, 659, 784, 0, 659, 784, 1047, 0], bass: [131, 0, 0, 0, 98, 0, 0, 0] },
      ending: { tempo: 400, notes: [392, 0, 494, 0, 587, 0, 494, 0], bass: [98, 0, 0, 0, 117, 0, 0, 0] },
    };
    const pat = patterns[track];
    const step = (): void => {
      if (this.currentTrack !== track) return;
      const i = this.beat % pat.notes.length;
      const n = pat.notes[i];
      const b = pat.bass[i];
      if (n) this.tone(n, pat.tempo / 1000, { type: 'triangle', vol: 0.14, gain: this.musicGain });
      if (b) this.tone(b, (pat.tempo / 1000) * 2, { type: 'sine', vol: 0.2, gain: this.musicGain });
      this.beat += 1;
    };
    step();
    this.musicTimer = setInterval(step, pat.tempo);
  }

  stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.currentTrack = null;
  }
}

export const audioManager = new AudioManager();

/** Wire first-gesture unlock (call once from BootScene). */
export function installAudioUnlock(): void {
  const handler = (): void => {
    audioManager.unlock();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('touchstart', handler);
  };
  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
  window.addEventListener('touchstart', handler);
}
