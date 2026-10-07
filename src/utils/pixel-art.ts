/**
 * Pixel-art sprite definitions (Milestone "polish" pass).
 * Every sprite is a character-grid pixel map — '.' = transparent.
 * Style: chibi big-head heroes with dark outlines (reference sheet), night-monument world.
 */

export type PixelMap = string[];

const BASE = {
  o: '#1e2a4a', // outline
  s: '#f6c9a0', // skin
  S: '#e2a97e', // skin shade
  k: '#202842', // eyes
  b: '#f5c542', // belt gold
  p: '#2b3760', // pants
  P: '#1e2745', // pants shade
  w: '#f2f2f2', // white
  v: '#d7e4f4', // blade
  g: '#f5c542', // guard
  f: '#ff5f9e', // flower pink
  t: '#38d6c4', // shirt (boy)
  T: '#20ab9b',
  h: '#f2d16b', // hair (boy)
  H: '#d3a945',
  z: '#f2f2f2', // shoes accent
};

export const BOY_PALETTE: Record<string, string> = { ...BASE };
export const GIRL_PALETTE: Record<string, string> = {
  ...BASE,
  t: '#f0509a', // pink shirt
  T: '#c93377',
  h: '#4a94dd', // blue hair
  H: '#2f6fae',
  z: '#e83e8c', // pink shoes
};

/** ---------------------------------------------------------------- Pip (boy) */
export const BOY_IDLE1: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..osssssssso',
  '..ossssSSsso',
  '..ovotttttto',
  '.ovgottttttto',
  '.ovotttTttoso',
  '.osottttttoso',
  '..obbbbbbbbo',
  '..oppoppoppo',
  '..oppo..oppo',
  '..oppo..oppo',
  '..oPpo..opPo',
  '..owwo..owwo',
  '..owwo..owwo',
  '..ooo....ooo',
];

export const BOY_IDLE2: PixelMap = BOY_IDLE1.map((row, i) => (i === 7 ? '..ossssssss' : row));

export const BOY_RUN1: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '.ovotttttto',
  'ovgottttttoso',
  'ovotttTttoso',
  '.sottttttoso',
  '..obbbbbbbbo',
  '..oppoppoppo',
  '.oppo....oppo',
  '.opo......opo',
  'owwo......owwo',
  'owo........owo',
  '.oo........oo',
  '.oo.........o',
];

export const BOY_RUN2: PixelMap = [
  '...oooooo...',
  '..oohhhhhhoo',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '..ovotttttto',
  '.ovgotttttto',
  '.ovotttTttoso',
  '..sotttttoso',
  '..obbbbbbbbo',
  '..oppoppoppo',
  '..oppo..oppo',
  '..oopo..opo',
  '..owwo..owwo',
  '...oww..owwo',
  '....oo...oo',
  '...........o',
];

export const BOY_AIR: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '.ovottttttoso',
  '.ovgottttttoso',
  '.ovotttTttoso',
  '..sottttttoso',
  '..obbbbbbbbo',
  '..oppoppoppo',
  '.oppo....oppo',
  '.oppo....oppo',
  '.owwo....owwo',
  '..oo......oo',
  '.............',
  '.............',
];

/** Wind-up: blade raised behind, body leans back. */
export const BOY_ATTACK1: PixelMap = [
  '....oooooo..vv',
  '..oohhhhhhoo.gv',
  '.ohhhhhhhhhogg',
  '.ohhhhhhhhhho.',
  '.ohhhhhhhhhho.',
  '.oHhhhhhhhhho.',
  '..osssssssho..',
  '..osksssksss..',
  '..osssssssso..',
  '..ossssSSsso..',
  '.ovottttttto..',
  'ovgotttttttso.',
  '.ovottTtttso..',
  '.osotttttosso.',
  '..obbbbbbbbo..',
  '..oppoppoppo..',
  '..oppo...oppo.',
  '..oppo...oppo.',
  '..oPpo...opPo.',
  '..owwo...owwo.',
  '..owwo...owwo.',
  '..ooo.....ooo.',
];

/** Swing: blade thrust forward with motion pixels. */
export const BOY_ATTACK2: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '..ottttttogg',
  '.ottttttosogvvvv',
  '.otttTttoso..vvv',
  '.osottttoso',
  '..obbbbbbbbo',
  '..oppoppoppo',
  '..oppo...oppo',
  '.oppo.....oppo',
  '.oPpo.....opPo',
  '.owwo.....owwo',
  '..oo.......oo',
  '..............',
];

/** ---------------------------------------------------------------- Pipa (girl) */
export const GIRL_IDLE1: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhfhhhhhho',
  '.ohhfhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '.ohvotttttto',
  '.ohgottttttto',
  '.ohvotttTttoso',
  '.ohottttttoso',
  '.ohobbbbbbbbo',
  '.ohoppoppoppo',
  '.oh.oppo..oppo',
  '.oh.oppo..oppo',
  '.oHo.opo..opPo',
  '....owwo..ozwo',
  '....owwo..ozwo',
  '....ooo....ooo',
];

export const GIRL_IDLE2: PixelMap = GIRL_IDLE1.map((row, i) => (i === 7 ? '..ossssssss' : row));

export const GIRL_RUN1: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhfhhhhhho',
  '.ohhfhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '.ohvotttttto',
  'ohgottttttoso',
  'ohvotttTttoso',
  '.hottttttoso',
  '.hobbbbbbbbo',
  '.hoppoppoppo',
  '.hoppo....oppo',
  '.hopo......opo',
  '.howwo....owwo',
  '.howo......owo',
  '..oo........oo',
  '.............o',
];

export const GIRL_RUN2: PixelMap = [
  '...oooooo',
  '..oohhhhhhoo',
  '.ohhhfhhhhhho',
  '.ohhfhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '.ohvotttttto',
  '.ohgottttttto',
  '.ohvotttTttoso',
  '.ohottttttoso',
  '.ohobbbbbbbbo',
  '.hoppoppoppo',
  '..hoppo..oppo',
  '...hopo..opo',
  '...howwo.ozwo',
  '....oww..ozwo',
  '.....oo...oo',
  '..........o',
];

export const GIRL_AIR: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhfhhhhhho',
  '.ohhfhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '.ohvottttttoso',
  '.ohgottttttoso',
  '.ohvotttTttoso',
  '.ohottttttoso',
  '.ohobbbbbbbbo',
  '.hoppoppoppo',
  '.hoppo....oppo',
  '.hoppo....oppo',
  '.howwo....owwo',
  '..oo......oo',
  '.............',
  '.............',
];

export const GIRL_ATTACK1: PixelMap = [
  '....oooooo..vv',
  '..oohhhhhhoo.gv',
  '.ohhhfhhhhhhogg',
  '.ohhfhhhhhhho.',
  '.ohhhhhhhhhho.',
  '.oHhhhhhhhhho.',
  '..osssssssho..',
  '..osksssksss..',
  '..osssssssso..',
  '..ossssSSsso..',
  '.ohvotttttto..',
  'ohgottttttso..',
  '.ohvottTttso..',
  '.ohotttttosso.',
  '.ohobbbbbbbbo.',
  '.hoppoppoppo..',
  '.hoppo...oppo.',
  '.hopo.....opo.',
  '.howwo...owwo.',
  '..owwo...ozwo.',
  '..oo......oo..',
  '..............',
];

export const GIRL_ATTACK2: PixelMap = [
  '....oooooo',
  '..oohhhhhhoo',
  '.ohhhfhhhhhho',
  '.ohhfhhhhhhho',
  '.ohhhhhhhhhho',
  '.oHhhhhhhhhho',
  '..osssssssho',
  '..osksssksss',
  '..ossssssss',
  '..ossssSSsso',
  '.ohottttttogg',
  'ohottttttosogvvvv',
  '.hotttTttoso..vvv',
  '.hottttttoso',
  '.hobbbbbbbbo',
  '.hoppoppoppo',
  '..hoppo...oppo',
  '..hopo.....opo',
  '..howwo....owwo',
  '...owwo....ozwo',
  '....oo......oo',
  '...............',
];

/** ---------------------------------------------------------------- enemies */
export const ENEMY_WALK1: PixelMap = [
  '...oooooo',
  '..oeeeeeeo',
  '.oeeeeeeeeo',
  '.oekweekeko',
  'oeeeeeeeeeeo',
  'oeeeeeeeeeeo',
  'oEeeeeeeeeEo',
  '.oEeeeeeeEo',
  '..oEoEEoEo',
  '..oE..oE.o',
  '...........',
];

export const ENEMY_WALK2: PixelMap = [
  '...........',
  '...oooooo',
  '..oeeeeeeo',
  '.oekweekeko',
  'oeeeeeeeeeeo',
  'oeeeeeeeeeeo',
  'oEeeeeeeeeEo',
  '.oEeeeeeeEo',
  '.oEoEEoEo.',
  '.oE....oE.',
  '...........',
];

export const ENEMY_PALETTE: Record<string, string> = {
  o: '#1e2a4a',
  e: '#b06ae8',
  E: '#7d3fb0',
  k: '#202842',
  w: '#ffffff',
};

/** Bronze Caretaker — stocky monument custodian with a golden visor. */
export const BOSS_MAP: PixelMap = [
  '........oooooo........',
  '......oobbbbbboo......',
  '.....obbbbbbbbbbo.....',
  '....obbbbbbbbbbbbo....',
  '....obbkkkkkkkkbbo....',
  '....obkyyyyyyyykbo....',
  '....obbkkkkkkkkbbo....',
  '.....obbbbbbbbbbo.....',
  '....oobbbbbbbbboo.....',
  '...obbbbbbbbbbbbbbo...',
  '..obbrbbbbbbbbbrbbbo..',
  '.obbbbbbbbbbbbbbbbbbo.',
  '.obbrrbbbbbbbbbbrrbbo.',
  'obbbrrrbbbnnbbbrrrbbbo',
  'obbbrbbbbnnnnbbrbbbbbo',
  'obbbbbbbnnnwnnnbbbbbbo',
  'obbbbbbbnnnwnnnbbbbbbo',
  '.obbbbbbnnnnnnnbbbbbo.',
  '.obbbbbbbrnnnrbbbbbbo.',
  '..obbbbbbbbbbbbbbbbo..',
  '..obbbbbbbbbbbbbbbbo..',
  '...obbbbbbbbbbbbbbo...',
  '...oobbbbbbbbbbboo....',
  '...obbbbo....obbbbo...',
  '..obbbbbo....obbbbbo..',
  '..obbbbbo....obbbbbo..',
  '..obbbbbo....obbbbbo..',
  '..oBBBBBo....oBBBBBo..',
  '..oBBBBBo....oBBBBBo..',
  '..oBBBBBBo..oBBBBBBo..',
  '..oBBBBBBo..oBBBBBBo..',
  '..oBwwBBo..oBwwBBo....',
  '..oBwwBBo..oBwwBBo....',
  '..ooooooo..ooooooo....',
];

export const BOSS_PALETTE: Record<string, string> = {
  o: '#1e2a4a',
  b: '#c98a3d', // bronze
  B: '#8f5a22', // bronze dark
  r: '#6f4a1e', // engraved line
  n: '#39415c', // door-mark panel
  k: '#241d14', // visor dark
  y: '#ffd24a', // visor glow
  w: '#ffe9a3',
};

/** ---------------------------------------------------------------- world tiles (drawn procedurally elsewhere) */
export const SLASH1: PixelMap = [
  '......ww',
  '....wwww',
  '...wwffw',
  '..wwffw.',
  '..wffw..',
  '.wffw...',
  '.wfw....',
  '.ww.....',
];
export const SLASH2: PixelMap = [
  '.....ww.',
  '...wwfw.',
  '..wfffw.',
  '.wfffw..',
  '.wffw...',
  'wffw....',
  'wfw.....',
  'ww......',
];
export const SLASH_PALETTE: Record<string, string> = {
  w: '#ffffff',
  f: '#ff9ecb',
};
