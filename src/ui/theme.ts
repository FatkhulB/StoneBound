/** Shared UI palette. Pip's teal + orange scarf must stay readable on every biome. */
export const COLORS = {
  // Pip
  teal: 0x2ee6a8,
  tealDark: 0x17a577,
  scarf: 0xff7f3f,
  ivory: 0xf5f0dc,
  ink: 0x1a1c2c,

  // World
  stone: 0x5c6a8a,
  stoneDark: 0x3f4a66,
  stoneLight: 0x7c8ab0,
  moss: 0x58a55c,
  mossLight: 0x6fc46f,
  wall: 0x46516e,

  // Enemies / hazards
  enemy: 0xb06ae8,
  enemyDark: 0x7d3fb0,
  boss: 0xc98a3d,
  bossDark: 0x8f5a22,
  hazard: 0xff5050,

  // Pickups / interactives
  gold: 0xffd24a,
  goldDark: 0xd9a520,
  gate: 0x39415c,
  checkpoint: 0x8b93b0,

  // UI
  uiPanel: 0x151726,
  uiPanelLight: 0x232741,
  uiText: 0xd7dcf0,
  uiMuted: 0x8b93b0,
  uiAccent: 0x2ee6a8,
  uiDanger: 0xff5050,
} as const;

export const cssColor = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
