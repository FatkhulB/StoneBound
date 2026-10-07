/**
 * Player movement & combat parameters (design.md §5).
 * Initial playtest values — tune here, never inline in gameplay code.
 */
export const PLAYER = {
  /** Horizontal run speed, world units (px) per second. */
  moveSpeed: 160,
  /** Gravity, px/s². */
  gravity: 900,
  /** Initial jump velocity, px/s (negative = up). */
  jumpVelocity: -360,
  /** Coyote time in ms after leaving ground during which a jump is still allowed. */
  coyoteTimeMs: 100,
  /** Jump buffer in ms; a jump pressed slightly early still fires on landing. */
  jumpBufferMs: 120,
  /** Velocity multiplier applied once when jump is released early (shorter hop). */
  jumpReleaseDamp: 0.45,

  /** Starter max HP on Normal; Easy/Hard override via difficulty table. */
  maxHp: 100,
  /** Post-hit invulnerability in ms. */
  invulnerabilityMs: 800,
  /** Light knockback on damage. */
  knockbackX: 130,
  knockbackY: -140,
  /** Damage taken when falling into a pit (then returned to last safe position). */
  pitDamage: 15,
  /** No ordinary fall damage (design.md §5). */

  /** Dash (design.md §6): available from stage 1. */
  dash: {
    speed: 330,
    durationMs: 180,
    cooldownMs: 2000,
    grantsImmunity: false,
    passesThroughWalls: false,
  },

  /** Starter melee combat: visible wind-up and recovery, single hit per target per swing. */
  combat: {
    damage: 12,
    intervalMs: 600,
    windupMs: 150,
    activeMs: 150,
    /** recoveryMs = interval - windup - active */
    reachX: 20,
    reachY: 26,
    offset: 14,
  },
} as const;

/** Starting lives per stage attempt (design.md §7) — identical across difficulties. */
export const STARTING_LIVES = 3;
