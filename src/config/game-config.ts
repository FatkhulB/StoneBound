/**
 * Core game configuration (design.md §10, §13).
 * Logical resolution 480×270 (16:9), pixel-art rendering, letterboxed scaling.
 */
export const GAME = {
  width: 480,
  height: 270,
  backgroundColor: '#1e2233',
  fontFamily: '"Press Start 2P", "Courier New", monospace',
  /** World-space hint text for the pre-alpha build (placeholder assets notice). */
  versionLabel: 'STONEBOUND pre-alpha — placeholder art',
} as const;

export const TILE = 16;

/** Runtime states of a stage (design.md §3). */
export type StageRuntimeState =
  | 'exploration'
  | 'bossIntro'
  | 'bossFight'
  | 'exitReady'
  | 'complete';
