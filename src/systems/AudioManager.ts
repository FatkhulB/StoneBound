import { AUDIO } from '../config/audio-config';

/**
 * WebAudio synth v2 (design.md §11). Original code-generated audio — see
 * ASSET_LICENSES.md. Audio starts after a user gesture; music/SFX volumes are
 * independent; one music loop at a time.
 *
 * Music v2: chord-progression sequencer with four voices (bass, arpeggio lead
 * with echo, warm pad, percussion) so the loops sound composed, not flat.
 */

export type SfxName =
  | 'ui' | 'jump' | 'airjump' | 'land' | 'attack' | 'hit' | 'hurt' | 'coin'
  | 'checkpoint' | 'key' | 'door' | 'puzzle' | 'lever' | 'gate' | 'dash'
  | 'break' | 'death' | 'boss-hit' | 'boss-die' | 'torch' | 'skill' | 'telegraph'
  | 'monsterlunge' | 'enemydie' | 'spit';

export type MusicTrack = 'menu' | 'explore' | 'boss' | 'results' | 'ending' | null;

const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  C2: 65.41, D2: 73.42, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
};

interface ChordBar {
  root: number;      // bass note
  tones: number[];   // chord tones (octave 3/4) for arpeggio + pad
}

interface TrackDef {
  /** Sing the lead through vowel formants instead of a plain wave. */
  leadVoice?: boolean;
  tempo: number;            // BPM
  progression: ChordBar[];
  bassSteps: number[];      // 16th-step indices the bass plays (root)
  leadPattern: number[];    // chord-tone index per quarter step (-1 = rest)
  kick: number[];
  snare: number[];
  hat: number[];
  leadWave: OscillatorType;
  leadVol: number;
}

const TRACKS: Record<Exclude<MusicTrack, null>, TrackDef> = {
  // Dreamy: slow pad chords + sparse bright arpeggio.
  menu: {
    tempo: 92,
    progression: [
      { root: N.A2, tones: [N.A3, N.C4, N.E4] },
      { root: N.F2, tones: [N.F3, N.A3, N.C4] },
      { root: N.C3, tones: [N.C4, N.E4, N.G4] },
      { root: N.G2, tones: [N.G3, N.B3, N.D4] },
    ],
    bassSteps: [0, 8],
    leadPattern: [0, -1, 2, -1, 1, -1, 2, -1],
    kick: [0],
    snare: [],
    hat: [4, 12],
    leadWave: 'triangle',
    leadVol: 0.1,
    leadVoice: true,
  },
  // Explore: A-minor journey — walking bass, arpeggio lead, steady beat.
  explore: {
    tempo: 126,
    progression: [
      { root: N.A2, tones: [N.A3, N.C4, N.E4] },
      { root: N.F2, tones: [N.F3, N.A3, N.C4] },
      { root: N.C3, tones: [N.C4, N.E4, N.G4] },
      { root: N.G2, tones: [N.G3, N.B3, N.D4] },
    ],
    bassSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    leadPattern: [0, 1, 2, 1, 0, 2, 1, 2],
    kick: [0, 8],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    leadWave: 'square',
    leadVol: 0.07,
  },
  // Boss: driving, faster, darker (D minor feel via D/A/F/G).
  boss: {
    tempo: 148,
    progression: [
      { root: N.D2, tones: [N.D4, N.F4, N.A4] },
      { root: N.A2, tones: [N.A3, N.C4, N.E4] },
      { root: N.F2, tones: [N.F4, N.A4, N.C5] },
      { root: N.G2, tones: [N.G3, N.B3, N.D4] },
    ],
    bassSteps: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14],
    leadPattern: [0, 2, 1, 2, 0, 1, 2, 1],
    kick: [0, 6, 8, 14],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    leadWave: 'sawtooth',
    leadVol: 0.06,
  },
  results: {
    tempo: 120,
    progression: [
      { root: N.C3, tones: [N.C4, N.E4, N.G4] },
      { root: N.G2, tones: [N.G3, N.B3, N.D4] },
      { root: N.A2, tones: [N.A3, N.C4, N.E4] },
      { root: N.F2, tones: [N.F3, N.A3, N.C4] },
    ],
    bassSteps: [0, 4, 8, 12],
    leadPattern: [0, 1, 2, 1, 2, 1, 0, 1],
    kick: [0, 8],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    leadWave: 'triangle',
    leadVol: 0.09,
  },
  ending: {
    tempo: 84,
    progression: [
      { root: N.F2, tones: [N.F3, N.A3, N.C4] },
      { root: N.C3, tones: [N.C4, N.E4, N.G4] },
      { root: N.D3, tones: [N.D4, N.F4, N.A4] },
      { root: N.G2, tones: [N.G3, N.B3, N.D4] },
    ],
    bassSteps: [0, 8],
    leadPattern: [0, -1, 1, -1, 2, -1, 1, 2],
    kick: [0],
    snare: [],
    hat: [8],
    leadWave: 'triangle',
    leadVol: 0.1,
    leadVoice: true,
  },
};

const STEP_SUBDIV = 4; // 16th steps per beat

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private echo: DelayNode | null = null;
  private musicVolume: number = AUDIO.defaultMusicVolume;
  private sfxVolume: number = AUDIO.defaultSfxVolume;
  private muted: boolean = AUDIO.defaultMuted;
  private currentTrack: MusicTrack = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
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
    // Feedback echo bus for the lead voice.
    this.echo = this.ctx.createDelay(0.6);
    this.echo.delayTime.value = 0.24;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.22;
    const echoOut = this.ctx.createGain();
    echoOut.gain.value = 0.5;
    this.echo.connect(feedback);
    feedback.connect(this.echo);
    this.echo.connect(echoOut);
    echoOut.connect(this.musicGain);
    this.applyVolumes();
    this.unlocked = true;
  }

  private applyVolumes(): void {
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.musicGain.gain.value = this.musicVolume * 0.3;
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
    opts: {
      type?: OscillatorType;
      vol?: number;
      slideTo?: number;
      delay?: number;
      gain?: GainNode | null;
      attack?: number;
      echo?: boolean;
    } = {},
  ): void {
    if (!this.ctx || !this.unlocked) return;
    const { type = 'square', vol = 0.2, slideTo, delay = 0, gain = this.sfxGain, attack = 0.004, echo = false } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vol, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(env);
    env.connect(gain ?? this.sfxGain!);
    if (echo && this.echo) env.connect(this.echo);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol = 0.2, delay = 0, gain: GainNode | null = this.sfxGain): void {
    if (!this.ctx || !this.unlocked) return;
    const t0 = this.ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 1.5;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(vol, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(env);
    env.connect(gain ?? this.sfxGain!);
    src.start(t0);
  }

  play(name: SfxName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'ui': this.tone(660, 0.06, { vol: 0.1 }); this.tone(880, 0.05, { vol: 0.06, delay: 0.04 }); break;
      case 'jump': this.tone(300, 0.13, { type: 'triangle', slideTo: 620, vol: 0.2 }); break;
      case 'airjump': this.tone(420, 0.12, { type: 'triangle', slideTo: 820, vol: 0.16 }); this.noise(0.08, 0.08); break;
      case 'land': this.noise(0.05, 0.09); break;
      // Punchy attack: whoosh + impact thump + crack.
      case 'attack':
        this.noise(0.06, 0.22);
        this.tone(320, 0.06, { slideTo: 120, vol: 0.16 });
        this.tone(160, 0.09, { type: 'sine', slideTo: 70, vol: 0.26, delay: 0.015 });
        this.tone(900, 0.03, { vol: 0.09, delay: 0.01 });
        break;
      case 'hit':
        this.noise(0.08, 0.24);
        this.tone(240, 0.09, { type: 'triangle', slideTo: 80, vol: 0.28 });
        this.tone(1200, 0.025, { vol: 0.1 });
        break;
      case 'hurt': this.tone(220, 0.16, { slideTo: 90, vol: 0.22 }); this.noise(0.1, 0.14); break;
      case 'coin': this.tone(988, 0.06, { type: 'sine', vol: 0.16 }); this.tone(1319, 0.12, { type: 'sine', vol: 0.14, delay: 0.055 }); break;
      case 'checkpoint': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.11, { type: 'triangle', vol: 0.13, delay: i * 0.07, echo: true })); break;
      case 'key': [700, 900, 1200, 1500].forEach((f, i) => this.tone(f, 0.1, { type: 'triangle', vol: 0.15, delay: i * 0.06, echo: true })); break;
      case 'door': this.tone(140, 0.3, { type: 'triangle', slideTo: 90, vol: 0.2 }); this.noise(0.2, 0.08, 0.05); break;
      case 'puzzle': this.tone(400, 0.1, { type: 'triangle', vol: 0.14 }); this.tone(600, 0.14, { type: 'triangle', vol: 0.14, delay: 0.1, echo: true }); break;
      case 'lever': this.tone(250, 0.07, { vol: 0.14 }); break;
      case 'gate': this.tone(100, 0.4, { type: 'triangle', slideTo: 60, vol: 0.2 }); this.noise(0.25, 0.08, 0.05); break;
      case 'dash': this.noise(0.1, 0.14); this.tone(500, 0.08, { slideTo: 900, vol: 0.05, type: 'sine' }); break;
      case 'break': this.noise(0.22, 0.24); this.tone(120, 0.2, { slideTo: 60, vol: 0.16 }); break;
      case 'death': this.tone(300, 0.5, { type: 'sawtooth', slideTo: 55, vol: 0.2 }); this.noise(0.3, 0.1, 0.1); break;
      case 'boss-hit': this.tone(150, 0.1, { type: 'sawtooth', slideTo: 80, vol: 0.18 }); this.noise(0.05, 0.12); break;
      case 'boss-die': this.tone(400, 0.7, { type: 'sawtooth', slideTo: 60, vol: 0.22 }); this.noise(0.4, 0.14, 0.1); this.tone(80, 0.6, { type: 'sine', slideTo: 40, vol: 0.2 }); break;
      case 'torch': this.noise(0.15, 0.03); break;
      // v3 additions
      case 'skill': [660, 880, 1174, 1568].forEach((f, i) => this.tone(f, 0.09, { type: 'triangle', vol: 0.14, delay: i * 0.045, echo: true })); this.noise(0.18, 0.08); break;
      case 'telegraph': this.tone(1180, 0.07, { vol: 0.09 }); this.tone(1180, 0.07, { vol: 0.09, delay: 0.11 }); break;
      case 'monsterlunge': this.noise(0.09, 0.2); this.tone(180, 0.12, { type: 'sawtooth', slideTo: 70, vol: 0.18 }); break;
      case 'enemydie': this.tone(340, 0.22, { type: 'sawtooth', slideTo: 60, vol: 0.18 }); this.noise(0.16, 0.12, 0.02); break;
      case 'spit': this.tone(300, 0.1, { slideTo: 520, vol: 0.12 }); this.noise(0.06, 0.08); break;
    }
  }

  /**
   * Pseudo-vocal lead: a saw through two vowel formant band-passes (00e0 la 'ah').
   * Gives the loop a singer-like hook without any recorded audio.
   */
  private voice(freq: number, dur: number, vol = 0.12): void {
    if (!this.ctx || !this.unlocked || !this.musicGain) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.linearRampToValueAtTime(freq * 1.01, t0 + dur);
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vibGain = this.ctx.createGain();
    vibGain.gain.value = freq * 0.012;
    vib.connect(vibGain).connect(osc.frequency);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(vol, t0 + 0.06);
    env.gain.setValueAtTime(vol, t0 + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 720; f1.Q.value = 9;
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 1180; f2.Q.value = 7;
    const mix = this.ctx.createGain();
    mix.gain.value = 0.9;
    osc.connect(f1).connect(mix);
    osc.connect(f2).connect(mix);
    const body = this.ctx.createGain();
    body.gain.value = 2.2;
    mix.connect(body).connect(env).connect(this.musicGain);
    env.connect(this.echo!);
    osc.start(t0); vib.start(t0);
    osc.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05);
  }

  /** Chord-progression sequencer; switching tracks stops the previous one. */
  playMusic(track: MusicTrack): void {
    if (this.currentTrack === track) return;
    this.stopMusic();
    this.currentTrack = track;
    if (!track || !this.ctx) return;
    const def = TRACKS[track];
    this.step = 0;
    const stepMs = (60 / def.tempo / STEP_SUBDIV) * 1000;

    const stepFn = (): void => {
      if (this.currentTrack !== track) return;
      const s = this.step % 16;
      const bar = Math.floor(this.step / 16) % def.progression.length;
      const chord = def.progression[bar];

      if (def.bassSteps.includes(s)) {
        this.tone(chord.root, stepMs / 1000 * 1.8, { type: 'triangle', vol: 0.16, gain: this.musicGain });
      }
      const leadIdx = def.leadPattern[Math.floor(s / 2)];
      if (s % 2 === 0 && leadIdx >= 0 && leadIdx < chord.tones.length) {
        const freq = chord.tones[leadIdx] * 2;
        if (def.leadVoice) this.voice(freq, (stepMs / 1000) * 1.9, def.leadVol + 0.03);
        else this.tone(freq, (stepMs / 1000) * 1.4, { type: def.leadWave, vol: def.leadVol, gain: this.musicGain, echo: true });
      }
      if (s === 0) {
        chord.tones.forEach((tone, i) =>
          this.tone(tone, stepMs / 1000 * 14, { type: 'sine', vol: 0.035, gain: this.musicGain, delay: i * 0.02 }),
        );
      }
      if (def.kick.includes(s)) this.tone(120, 0.11, { type: 'sine', slideTo: 45, vol: 0.22, gain: this.musicGain });
      if (def.snare.includes(s)) this.noise(0.07, 0.1, 0, this.musicGain);
      if (def.hat.includes(s)) this.noise(0.025, 0.045, 0, this.musicGain);

      this.step += 1;
    };
    stepFn();
    this.musicTimer = setInterval(stepFn, stepMs);
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
