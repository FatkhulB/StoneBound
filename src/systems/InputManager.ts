import Phaser from 'phaser';
import { touchState } from '../ui/TouchControls';

/**
 * Unified keyboard + touch input (design.md §10).
 * Laptop: A/D or arrows move, Space jumps, J attacks, K dashes, L uses the
 * equipped skill, E interacts, Esc pauses.
 */
export type GameAction =
  | 'left'
  | 'right'
  | 'jump'
  | 'attack'
  | 'dash'
  | 'skill'
  | 'interact'
  | 'pause';

const KEYMAP: Record<GameAction, number[]> = {
  left: [Phaser.Input.Keyboard.KeyCodes.A, Phaser.Input.Keyboard.KeyCodes.LEFT],
  right: [Phaser.Input.Keyboard.KeyCodes.D, Phaser.Input.Keyboard.KeyCodes.RIGHT],
  jump: [Phaser.Input.Keyboard.KeyCodes.W, Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.UP],
  attack: [Phaser.Input.Keyboard.KeyCodes.J],
  dash: [Phaser.Input.Keyboard.KeyCodes.K],
  skill: [Phaser.Input.Keyboard.KeyCodes.L],
  interact: [Phaser.Input.Keyboard.KeyCodes.E],
  pause: [Phaser.Input.Keyboard.KeyCodes.ESC, Phaser.Input.Keyboard.KeyCodes.P],
};

export class InputManager {
  private keys = new Map<number, Phaser.Input.Keyboard.Key>();
  private prev: Record<GameAction, boolean>;
  private current: Record<GameAction, boolean>;

  constructor(private scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      for (const codes of Object.values(KEYMAP)) {
        for (const code of codes) this.keys.set(code, keyboard.addKey(code, false, true));
      }
      // Stop Space/arrows from scrolling the page.
      keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    }
    const blank = () =>
      ({ left: false, right: false, jump: false, attack: false, dash: false, skill: false, interact: false, pause: false }) as Record<GameAction, boolean>;
    this.prev = blank();
    this.current = blank();
  }

  /** Call once per frame BEFORE reading held()/pressed(). */
  update(): void {
    this.prev = { ...this.current };
    for (const action of Object.keys(KEYMAP) as GameAction[]) {
      let down = touchState[action as keyof typeof touchState] ?? false;
      for (const code of KEYMAP[action]) {
        const key = this.keys.get(code);
        if (key && key.isDown) down = true;
      }
      this.current[action] = down;
    }
  }

  held(action: GameAction): boolean {
    return this.current[action];
  }

  /** True only on the frame the action went down. */
  pressed(action: GameAction): boolean {
    return this.current[action] && !this.prev[action];
  }

  /** Signed horizontal movement: -1, 0, or 1. */
  get moveX(): number {
    const l = this.held('left') ? 1 : 0;
    const r = this.held('right') ? 1 : 0;
    return r - l;
  }

  releaseAll(): void {
    for (const action of Object.keys(this.current) as GameAction[]) {
      this.current[action] = false;
      this.prev[action] = false;
    }
  }

  destroy(): void {
    this.keys.forEach((k) => this.scene.input.keyboard?.removeKey(k, false, false));
    this.keys.clear();
  }
}
