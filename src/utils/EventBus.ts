import Phaser from 'phaser';

/**
 * Application-wide event bus. Scenes and systems communicate through it so UI never
 * mutates domain state directly (design.md §13).
 */
export const EventBus = new Phaser.Events.EventEmitter();

/** Event names shared across scenes/systems. */
export const EV = {
  /** Toast message: (text: string) */
  toast: 'toast',
  /** HUD refresh (player stats changed) */
  hud: 'hud:update',
  /** Boss fight active: (active: boolean) */
  bossActive: 'boss:active',
  /** Boss HP fraction 0..1 */
  bossHp: 'boss:hp',
  /** Dialogue queue: (key: string) */
  dialogueStart: 'dialogue:start',
  /** Request to open dialogue: (key: string, onDone?: () => void) */
  dialogueOpen: 'dialogue:open',
  /** Dialogue overlay finished */
  dialogueClosed: 'dialogue:closed',
  /** Contextual interact target available: (available: boolean) */
  interactAvailable: 'interact:available',
  /** Touch layer visibility: (visible: boolean) */
  touchVisible: 'touch:visible',
  /** Save/cloud status: (status: SaveStatus) */
  saveStatus: 'save:status',
  /** Attempt finished with a completion (Go to results) */
  stageComplete: 'stage:complete',
  /** Pause requested from touch UI */
  pauseRequested: 'pause:requested',
  /** Pause overlay actions */
  pauseResume: 'pause:resume',
  pauseRestart: 'pause:restart',
  pauseExit: 'pause:exit',
  /** Game over overlay actions */
  gameOverRestart: 'gameover:restart',
  gameOverExit: 'gameover:exit',
} as const;

export type SaveStatus =
  | 'local'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'conflict'
  | 'not-configured';
