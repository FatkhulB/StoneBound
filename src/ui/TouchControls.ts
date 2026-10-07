/**
 * DOM touch controls (design.md §10). Lives outside the canvas so CSS
 * safe-area insets and 48px+ hit targets work natively. Supports simultaneous
 * movement/jump/attack via independent per-button pointer capture. All held
 * inputs release on pointercancel, blur, and pause.
 */

export interface TouchState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  dash: boolean;
  skill: boolean;
  interact: boolean;
}

export const touchState: TouchState = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  dash: false,
  skill: false,
  interact: false,
};

export function releaseAllTouch(): void {
  touchState.left = false;
  touchState.right = false;
  touchState.jump = false;
  touchState.attack = false;
  touchState.dash = false;
  touchState.skill = false;
  touchState.interact = false;
  document.querySelectorAll('#touch-layer .tbtn').forEach((el) => el.classList.remove('pressed'));
}

const BUTTONS: { id: string; key: keyof TouchState; label: string; small?: boolean }[] = [
  { id: 'left', key: 'left', label: '◀' },
  { id: 'right', key: 'right', label: '▶' },
  { id: 'attack', key: 'attack', label: 'ATK' },
  { id: 'jump', key: 'jump', label: 'JMP' },
  { id: 'dash', key: 'dash', label: 'DASH', small: true },
  { id: 'skill', key: 'skill', label: 'SKL', small: true },
  { id: 'interact', key: 'interact', label: 'E', small: true },
];

export class TouchControls {
  private layer: HTMLElement | null = null;
  private visible = false;

  mount(): void {
    if (this.layer) return;
    this.layer = document.getElementById('touch-layer');
    if (!this.layer) return;
    for (const b of BUTTONS) {
      const el = document.createElement('div');
      el.id = `btn-${b.id}`;
      el.className = `tbtn${b.small ? ' small' : ''}`;
      el.textContent = b.label;
      const set = (v: boolean) => (e: Event) => {
        e.preventDefault();
        touchState[b.key] = v;
        el.classList.toggle('pressed', v);
      };
      el.addEventListener('pointerdown', set(true));
      el.addEventListener('pointerup', set(false));
      el.addEventListener('pointercancel', set(false));
      el.addEventListener('pointerleave', set(false));
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      this.layer.appendChild(el);
    }
    window.addEventListener('blur', releaseAllTouch);
    this.setSkillAvailable(false);
  }

  get isTouchDevice(): boolean {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  show(): void {
    this.mount();
    this.visible = true;
    this.layer?.classList.add('visible');
  }

  hide(): void {
    this.visible = false;
    this.layer?.classList.remove('visible');
    releaseAllTouch();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** Contextual interact button — only within range (design.md §10). */
  setInteractAvailable(available: boolean): void {
    document.getElementById('btn-interact')?.classList.toggle('hidden', !available);
  }

  setSkillAvailable(available: boolean): void {
    document.getElementById('btn-skill')?.classList.toggle('hidden', !available);
  }
}

export const touchControls = new TouchControls();
