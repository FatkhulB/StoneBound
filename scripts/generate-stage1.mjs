/**
 * Stage 1 "The Fallen Monument" map generator.
 * Authoring tool: emits src/data/stages/stage1.json from segment definitions so
 * every layout row is exactly `width` chars (validated by tests/stage-data.test.ts).
 *
 * Layout legend: '.' empty, '#' ground (auto mossy top), 'W' wall/chamber stone,
 * 'P' platform block. Interactables live in `objects` with tile coordinates.
 *
 * Run: node scripts/generate-stage1.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const W = 142;
const H = 22;

const rows = Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));

const fill = (r, c0, c1, ch) => {
  for (let c = c0; c <= c1; c++) rows[r][c] = ch;
};

// ---- Ground (rows 18-21) with pits at 16-17, 21-22, 76-78, 84-86 ----
const groundRanges = [
  [0, 15],
  [18, 20],
  [23, 75],
  [79, 83],
  [87, 141],
];
for (const r of [18, 19, 20, 21]) for (const [a, b] of groundRanges) fill(r, a, b, '#');

// ---- Boundary / chamber walls ----
fill2d(10, 17, 0, 0, 'W'); // left wall
fill2d(10, 17, 137, 141, 'W'); // right end wall

// ---- Coin branch: hollow hill (cols 41-47, rows 9-17) with carved interior ----
fill2d(9, 17, 41, 47, 'W');
fill2d(10, 11, 41, 46, '.'); // hollow interior (2 tiles tall)
// crack_1 object seals col 44 rows 10-11

// ---- Key chamber: ceiling row 10 cols 61-70, right wall col 70 rows 11-15 ----
fill(10, 61, 70, 'W');
fill2d(11, 15, 70, 70, 'W');
// gate object (key_gate) fills col 61 rows 11-17 until both plates are pressed.
// pedestal at (66,17):
fill(17, 66, 66, 'W');

// ---- Boss arena: ceiling row 9 cols 101-125, walls col 101 (12-15) & col 125 (10-17) ----
fill(9, 101, 125, 'W');
fill2d(12, 15, 101, 101, 'W');
fill2d(10, 17, 125, 125, 'W');

// ---- Single platform tiles ----
for (const [c, r] of [[33, 14], [36, 13], [39, 12], [81, 15], [86, 14], [90, 13]]) {
  rows[r][c] = 'P';
}

function fill2d(r0, r1, c0, c1, ch) {
  for (let r = r0; r <= r1; r++) fill(r, c0, c1, ch);
}

// ---- Interactable objects (tile coords; y = row the object stands on / anchor) ----
const objects = [
  { type: 'spawn', x: 4, y: 17 },
  { type: 'hint', x: 6, y: 15, text: 'A / D or Arrows: move' },
  { type: 'hint', x: 10, y: 15, text: 'SPACE: jump' },
  { type: 'hint', x: 26, y: 15, text: 'J: attack   |   K: dash' },
  { type: 'hint', x: 48, y: 15, text: 'E: interact. Push blocks onto the gold plates' },
  { type: 'hint', x: 74, y: 15, text: 'K: dash across the gaps' },
  { type: 'hint', x: 131, y: 15, text: 'E: interact' },

  { type: 'dialog', id: 'dlg_open', key: 'stage1_open', x: 5 },
  { type: 'dialog', id: 'dlg_preboss', key: 'stage1_preboss', x: 98 },

  // 34 pickup coins (design target 30-60 per stage)
  ...[
    [7, 16], [9, 16],
    [15, 16], [16, 15], [17, 15], [18, 16],
    [25, 16], [27, 16], [29, 16],
    [33, 13], [36, 12],
    [41, 11], [42, 11], [45, 10], [45, 11], [46, 11],
    [42, 8], [44, 8], [46, 8],
    [63, 16], [64, 16], [68, 16], [69, 16],
    [72, 16], [74, 16],
    [77, 15], [81, 14], [86, 13], [90, 12], [85, 15],
    [92, 16], [94, 16],
    [128, 16], [131, 16],
  ].map(([x, y], i) => ({ type: 'coin', id: `coin_${i + 1}`, x, y })),

  { type: 'patrol', id: 'patrol_1', x: 30, y: 17, minX: 24, maxX: 36 },
  { type: 'patrol', id: 'patrol_2', x: 80, y: 17, minX: 79, maxX: 83 },
  { type: 'patrol', id: 'patrol_3', x: 91, y: 17, minX: 88, maxX: 95 },

  { type: 'lever', id: 'lever_reset', x: 50, y: 17 },
  { type: 'block', id: 'block_a', x: 52, y: 17 },
  { type: 'plate', id: 'plate_a', x: 55, y: 17 },
  { type: 'plate', id: 'plate_b', x: 57, y: 17 },
  { type: 'block', id: 'block_b', x: 59, y: 17 },
  { type: 'gate', id: 'key_gate', x: 61, y: 11, heightTiles: 7 },
  { type: 'key', id: 'main_key', x: 66, y: 16 },

  { type: 'cracked', id: 'crack_1', x: 44, y: 10, heightTiles: 2 },

  { type: 'checkpoint', id: 'cp_mid', x: 74, y: 17 },
  { type: 'checkpoint', id: 'cp_boss', x: 97, y: 17 },

  // Living-world dressing (design.md §4 vibe pass)
  ...[
    ['torch', 2], ['torch', 20], ['torch', 26], ['torch', 40], ['torch', 63],
    ['torch', 73], ['torch', 88], ['torch', 96], ['torch', 103], ['torch', 111], ['torch', 132],
  ].map(([kind, x]) => ({ type: 'decor', id: `${kind}_${x}`, x, y: 17 })),
  ...[5, 11, 19, 24, 28, 31, 34, 38, 54, 56, 64, 71, 80, 89, 93, 99, 108, 116, 120, 129, 136]
    .map((x, i) => ({ type: 'decor', id: `grass_${i}`, x, y: 17 })),
  ...[[8, 17], [30, 17], [56, 17], [72, 17], [91, 17], [129, 17]].map(([x, y], i) => ({
    type: 'decor', id: `flower_${i}`, x, y,
  })),
  ...[[9, 17], [37, 17], [60, 17], [82, 17], [110, 17], [136, 17]].map(([x, y], i) => ({
    type: 'decor', id: `column_${i}`, x, y,
  })),

  { type: 'arena_gate', id: 'arena_gate', x: 102, y: 14, heightTiles: 4 },
  { type: 'boss', id: 'caretaker', x: 113, y: 17 },
  { type: 'exit', id: 'exit_door', x: 133, y: 17 },
];

const stage = {
  id: 1,
  name: 'The Fallen Monument',
  storyId: 1,
  width: W,
  height: H,
  tileSize: 16,
  theme: 'monument',
  /** Camera locks to this rect (tile coords) during the boss fight. */
  bossArena: { x0: 101, x1: 125 },
  layout: rows.map((r) => r.join('')),
  objects,
};

// ---- Self-validation ----
const bad = stage.layout.filter((r) => r.length !== W);
if (bad.length) throw new Error(`Row length mismatch: ${bad.length} rows`);
const at = (x, y) => stage.layout[y]?.[x] ?? '?';
for (const o of objects) {
  if (o.x < 0 || o.x >= W || o.y < 0 || o.y >= H) throw new Error(`Out of bounds: ${o.type} ${o.id ?? ''}`);
  if (['spawn', 'coin', 'key', 'checkpoint', 'patrol', 'boss', 'exit', 'lever', 'block', 'plate'].includes(o.type)) {
    const t = at(o.x, o.y);
    if (t !== '.') throw new Error(`${o.type} ${o.id} anchored inside solid tile '${t}' at ${o.x},${o.y}`);
  }
}
const coins = objects.filter((o) => o.type === 'coin').length;
if (coins < 30 || coins > 60) throw new Error(`Coin count ${coins} outside 30-60 target`);

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'stages', 'stage1.json');
writeFileSync(out, JSON.stringify(stage, null, 2) + '\n');
console.log(`stage1.json written: ${W}x${H}, ${objects.length} objects, ${coins} coins.`);
