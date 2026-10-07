import Phaser from 'phaser';
import { COLORS } from '../ui/theme';

/**
 * PLACEHOLDER ART GENERATOR — every texture below is drawn in code and is
 * temporary (design.md §11). Replace with real pixel art in the polish milestone
 * and record provenance in ASSET_LICENSES.md.
 */

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** ---------------------------------------------------------------- tiles */
function drawStoneTile(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  mossyTop: boolean,
  base: number = COLORS.stone,
): void {
  const dark = base === COLORS.stone ? COLORS.stoneDark : base === COLORS.wall ? 0x333c52 : 0x5a6480;
  const light = base === COLORS.stone ? COLORS.stoneLight : base === COLORS.wall ? 0x525f80 : 0x93a0bf;
  g.fillStyle(base, 1);
  g.fillRect(ox, 0, 16, 16);
  g.fillStyle(dark, 1);
  g.fillRect(ox, 14, 16, 2);
  g.fillRect(ox + 14, 0, 2, 16);
  g.fillStyle(light, 1);
  g.fillRect(ox, 0, 16, 2);
  // speckles
  g.fillStyle(0x000000, 0.12);
  g.fillRect(ox + 3, 6, 2, 2);
  g.fillRect(ox + 9, 9, 3, 2);
  if (mossyTop) {
    g.fillStyle(COLORS.moss, 1);
    g.fillRect(ox, 0, 16, 3);
    g.fillStyle(COLORS.mossLight, 1);
    g.fillRect(ox, 0, 16, 1);
    g.fillRect(ox + 2, 3, 3, 1);
    g.fillRect(ox + 10, 3, 4, 1);
  }
}

export function createTileset(scene: Phaser.Scene): void {
  // 4 frames of 16px → GIDs 1..4 in tilemap data.
  tex(scene, 'tiles', 64, 16, (g) => {
    drawStoneTile(g, 0, true); // GID 1: mossy ground top
    drawStoneTile(g, 16, false); // GID 2: inner ground
    drawStoneTile(g, 32, false, COLORS.wall); // GID 3: dark wall / chamber stone
    drawStoneTile(g, 48, false, COLORS.stoneLight); // GID 4: platform block
  });
}

/** ---------------------------------------------------------------- player */
function drawPipBase(g: Phaser.GameObjects.Graphics, scarfLift: number, legs: 'stand' | 'run1' | 'run2' | 'tuck'): void {
  // legs
  g.fillStyle(COLORS.tealDark, 1);
  if (legs === 'stand') {
    g.fillRect(4, 15, 3, 3);
    g.fillRect(9, 15, 3, 3);
  } else if (legs === 'run1') {
    g.fillRect(2, 15, 3, 3);
    g.fillRect(10, 14, 3, 3);
  } else if (legs === 'run2') {
    g.fillRect(4, 14, 3, 3);
    g.fillRect(9, 15, 3, 3);
  } else {
    g.fillRect(5, 14, 2, 2);
    g.fillRect(9, 14, 2, 2);
  }
  // body
  g.fillStyle(COLORS.teal, 1);
  g.fillRoundedRect(2, 4, 12, 12, 4);
  g.fillStyle(COLORS.tealDark, 1);
  g.fillRect(2, 13, 12, 3);
  // scarf (oversized, orange — signature silhouette)
  g.fillStyle(COLORS.scarf, 1);
  g.fillRect(1, 2 + scarfLift, 14, 4);
  g.fillRect(0, 4 + scarfLift, 3, 7 - scarfLift); // trailing tail
  // eyes (ivory)
  g.fillStyle(COLORS.ivory, 1);
  g.fillRect(6, 7, 2, 3);
  g.fillRect(11, 7, 2, 3);
  g.fillStyle(COLORS.ink, 1);
  g.fillRect(7, 8, 1, 2);
  g.fillRect(12, 8, 1, 2);
}

export function createPlayerTextures(scene: Phaser.Scene): void {
  tex(scene, 'pip_idle', 16, 18, (g) => drawPipBase(g, 0, 'stand'));
  tex(scene, 'pip_run1', 16, 18, (g) => drawPipBase(g, 0, 'run1'));
  tex(scene, 'pip_run2', 16, 18, (g) => drawPipBase(g, 0, 'run2'));
  tex(scene, 'pip_jump', 16, 18, (g) => drawPipBase(g, -1, 'tuck'));
  tex(scene, 'pip_fall', 16, 18, (g) => drawPipBase(g, -2, 'tuck'));

  // Veyr: the sword that stays in its stone, carried on a harness.
  tex(scene, 'veyr_stone', 12, 16, (g) => {
    g.fillStyle(COLORS.stoneLight, 1);
    g.fillRoundedRect(0, 9, 12, 7, 2);
    g.fillStyle(COLORS.stoneDark, 1);
    g.fillRect(0, 14, 12, 2);
    g.fillStyle(0xcdd6ee, 1); // blade
    g.fillRect(5, 0, 3, 9);
    g.fillStyle(COLORS.gold, 1); // guard
    g.fillRect(3, 8, 7, 2);
  });
}

/** ---------------------------------------------------------------- enemies */
export function createEnemyTextures(scene: Phaser.Scene): void {
  tex(scene, 'patrol', 16, 13, (g) => {
    g.fillStyle(COLORS.enemyDark, 1);
    g.fillRect(2, 9, 3, 4);
    g.fillRect(11, 9, 3, 4);
    g.fillStyle(COLORS.enemy, 1);
    g.fillRoundedRect(1, 0, 14, 11, 5);
    g.fillStyle(0x2a1038, 1);
    g.fillRect(4, 3, 3, 3);
    g.fillRect(9, 3, 3, 3);
    g.fillStyle(0xffffff, 1);
    g.fillRect(4, 3, 1, 1);
    g.fillRect(9, 3, 1, 1);
  });

  // Bronze Caretaker boss (stage 1): stocky monument custodian with a hammer.
  tex(scene, 'caretaker', 34, 40, (g) => {
    g.fillStyle(COLORS.bossDark, 1);
    g.fillRect(6, 34, 8, 6);
    g.fillRect(20, 34, 8, 6);
    g.fillStyle(COLORS.boss, 1);
    g.fillRoundedRect(2, 8, 30, 28, 6); // body
    g.fillStyle(COLORS.bossDark, 1);
    g.fillRect(2, 30, 30, 6);
    g.fillRect(8, 2, 18, 8); // head band
    g.fillStyle(0xd9a35b, 1);
    g.fillRect(4, 10, 26, 3);
    // glowing eye slit
    g.fillStyle(COLORS.gold, 1);
    g.fillRect(11, 4, 12, 3);
    // engraved door symbol (same mark as the sealed door)
    g.fillStyle(0x6f4a1e, 1);
    g.fillRect(15, 16, 4, 10);
    g.fillRect(12, 19, 10, 4);
  });
  tex(scene, 'hammer', 22, 8, (g) => {
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(0, 3, 16, 2);
    g.fillStyle(0x9aa3bd, 1);
    g.fillRect(15, 0, 7, 8);
    g.fillStyle(0x6d7590, 1);
    g.fillRect(15, 5, 7, 3);
  });
}

/** ---------------------------------------------------------------- pickups & interactives */
export function createInteractableTextures(scene: Phaser.Scene): void {
  tex(scene, 'coin', 8, 10, (g) => {
    g.fillStyle(COLORS.goldDark, 1);
    g.fillRoundedRect(0, 0, 8, 10, 3);
    g.fillStyle(COLORS.gold, 1);
    g.fillRoundedRect(1, 1, 6, 8, 2);
    g.fillStyle(COLORS.goldDark, 1);
    g.fillRect(3, 3, 2, 4);
  });

  tex(scene, 'key_main', 14, 8, (g) => {
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(4, 4, 3);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(4, 4, 1);
    g.fillStyle(COLORS.gold, 1);
    g.fillRect(7, 3, 7, 2);
    g.fillRect(11, 5, 2, 2);
  });

  tex(scene, 'exit_door', 20, 32, (g) => {
    g.fillStyle(0x3d3226, 1);
    g.fillRect(0, 0, 20, 32);
    g.fillStyle(0x6e5a44, 1);
    g.fillRect(2, 2, 16, 30);
    g.fillStyle(0x3d3226, 1);
    g.fillRect(4, 4, 6, 26);
    g.fillRect(12, 4, 4, 26);
    g.fillStyle(COLORS.gold, 1);
    g.fillRect(9, 14, 2, 3); // keyhole of a door without a handle
  });

  tex(scene, 'checkpoint_off', 12, 24, (g) => {
    g.fillStyle(COLORS.checkpoint, 1);
    g.fillRect(5, 0, 2, 24);
    g.fillStyle(COLORS.hazard, 1);
    g.fillRect(7, 1, 5, 4);
  });
  tex(scene, 'checkpoint_on', 12, 24, (g) => {
    g.fillStyle(COLORS.checkpoint, 1);
    g.fillRect(5, 0, 2, 24);
    g.fillStyle(COLORS.uiAccent, 1);
    g.fillRect(7, 1, 5, 4);
    g.fillStyle(COLORS.uiAccent, 0.4);
    g.fillRect(4, 5, 4, 3);
  });

  tex(scene, 'stone_block', 14, 14, (g) => {
    g.fillStyle(COLORS.stoneLight, 1);
    g.fillRoundedRect(0, 0, 14, 14, 2);
    g.fillStyle(COLORS.stoneDark, 1);
    g.fillRect(0, 11, 14, 3);
    g.fillRect(11, 0, 3, 14);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(3, 3, 2, 5);
    g.fillRect(8, 6, 3, 2);
  });

  tex(scene, 'plate_up', 16, 8, (g) => {
    g.fillStyle(COLORS.stoneDark, 1);
    g.fillRect(0, 4, 16, 4);
    g.fillStyle(COLORS.gold, 1);
    g.fillRect(2, 0, 12, 4); // marked plate — gold mark
    g.fillStyle(COLORS.goldDark, 1);
    g.fillRect(2, 2, 12, 2);
  });
  tex(scene, 'plate_down', 16, 8, (g) => {
    g.fillStyle(COLORS.stoneDark, 1);
    g.fillRect(0, 4, 16, 4);
    g.fillStyle(COLORS.uiAccent, 1);
    g.fillRect(2, 2, 12, 4);
  });

  tex(scene, 'lever_left', 14, 14, (g) => {
    g.fillStyle(COLORS.stoneDark, 1);
    g.fillRect(2, 10, 10, 4);
    g.fillStyle(COLORS.hazard, 1);
    g.fillRect(6, 2, 2, 9);
    g.fillRect(2, 1, 5, 3);
  });
  tex(scene, 'lever_right', 14, 14, (g) => {
    g.fillStyle(COLORS.stoneDark, 1);
    g.fillRect(2, 10, 10, 4);
    g.fillStyle(COLORS.uiAccent, 1);
    g.fillRect(6, 2, 2, 9);
    g.fillRect(7, 1, 5, 3);
  });

  tex(scene, 'gate', 14, 48, (g) => {
    g.fillStyle(COLORS.gate, 1);
    g.fillRect(0, 0, 14, 48);
    g.fillStyle(0x20263a, 1);
    g.fillRect(2, 0, 3, 48);
    g.fillRect(9, 0, 3, 48);
    g.fillRect(0, 10, 14, 3);
    g.fillRect(0, 30, 14, 3);
  });

  tex(scene, 'cracked', 16, 16, (g) => {
    drawStoneTile(g, 0, false, 0x6a7288);
    g.fillStyle(0x141824, 1);
    g.fillRect(3, 2, 2, 5);
    g.fillRect(5, 7, 2, 4);
    g.fillRect(7, 11, 2, 3);
    g.fillRect(10, 4, 2, 6);
    g.fillRect(8, 3, 3, 2);
  });

  tex(scene, 'marker', 24, 6, (g) => {
    g.fillStyle(COLORS.hazard, 0.85);
    g.fillRect(0, 0, 24, 6);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(0, 0, 24, 2);
  });

  tex(scene, 'spark', 4, 4, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
  });

  tex(scene, 'px', 1, 1, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
  });

  // Parallax silhouettes for the monument biome.
  tex(scene, 'hills_far', 480, 90, (g) => {
    g.fillStyle(0x272c44, 1);
    g.fillTriangle(0, 90, 120, 18, 260, 90);
    g.fillTriangle(180, 90, 330, 34, 470, 90);
    // broken monument column
    g.fillStyle(0x2e3450, 1);
    g.fillRect(390, 30, 18, 60);
    g.fillRect(386, 24, 26, 8);
  });
  tex(scene, 'hills_near', 480, 70, (g) => {
    g.fillStyle(0x20253b, 1);
    g.fillTriangle(40, 70, 200, 30, 360, 70);
    g.fillRect(430, 40, 14, 30);
  });
}

export function createAllPlaceholderTextures(scene: Phaser.Scene): void {
  createTileset(scene);
  createPlayerTextures(scene);
  createEnemyTextures(scene);
  createInteractableTextures(scene);
  console.info('[STONEBOUND] Placeholder art generated in code — temporary assets (design.md §11).');
}
