import Phaser from 'phaser';
import {
  BOY_AIR, BOY_ATTACK1, BOY_ATTACK2, BOY_IDLE1, BOY_IDLE2, BOY_PALETTE, BOY_RUN1, BOY_RUN2,
  BOLT, ENEMY_PALETTE, ENEMY_WALK1, ENEMY_WALK2, GIRL_AIR, GIRL_ATTACK1, GIRL_ATTACK2, GIRL_IDLE1,
  GIRL_IDLE2, GIRL_PALETTE, GIRL_RUN1, GIRL_RUN2, MONSTER_ATTACK, MONSTER_PALETTE, MONSTER_TELEGRAPH,
  MONSTER_WALK1, MONSTER_WALK2, SLASH1, SLASH2, SLASH_PALETTE, BOSS_MAP, BOSS_PALETTE, SPITTER_ATTACK,
  SPITTER_IDLE, SPITTER_PALETTE, type PixelMap,
} from './pixel-art';
import { COLORS } from '../ui/theme';

/**
 * Placeholder→polish art generator. Sprites are pixel maps; tiles/backgrounds are
 * procedural but far richer than the first pass. All still original, code-generated
 * assets (see ASSET_LICENSES.md) in the night-monument palette.
 */

function drawPixels(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  rows: PixelMap,
  palette: Record<string, string>,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
      g.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function spriteTex(scene: Phaser.Scene, key: string, rows: PixelMap, palette: Record<string, string>): void {
  if (scene.textures.exists(key)) return;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  tex(scene, key, w, h, (g) => drawPixels(g, 0, 0, rows, palette));
}

/** ---------------------------------------------------------------- characters */
export function createCharacterTextures(scene: Phaser.Scene): void {
  const frames = {
    idle1: [BOY_IDLE1, GIRL_IDLE1],
    idle2: [BOY_IDLE2, GIRL_IDLE2],
    run1: [BOY_RUN1, GIRL_RUN1],
    run2: [BOY_RUN2, GIRL_RUN2],
    air: [BOY_AIR, GIRL_AIR],
    attack1: [BOY_ATTACK1, GIRL_ATTACK1],
    attack2: [BOY_ATTACK2, GIRL_ATTACK2],
  } as const;
  const palettes = [BOY_PALETTE, GIRL_PALETTE];
  const names = ['boy', 'girl'] as const;
  names.forEach((name, i) => {
    for (const [frame, maps] of Object.entries(frames)) {
      spriteTex(scene, `pip_${name}_${frame}`, maps[i], palettes[i]);
    }
  });
  // Portrait icons for the character select cards (head & torso crop feel).
  spriteTex(scene, 'portrait_boy', BOY_IDLE1, BOY_PALETTE);
  spriteTex(scene, 'portrait_girl', GIRL_IDLE1, GIRL_PALETTE);

  // Veyr: the stonebound sword on the hero's back.
  tex(scene, 'veyr_stone', 12, 16, (g) => {
    g.fillStyle(0x8b93b0, 1);
    g.fillRoundedRect(1, 9, 10, 6, 2);
    g.fillStyle(0x5c6a8a, 1);
    g.fillRect(1, 13, 10, 2);
    g.fillStyle(0xd7e4f4, 1);
    g.fillRect(5, 0, 2, 9);
    g.fillStyle(0xffffff, 1);
    g.fillRect(5, 0, 1, 5);
    g.fillStyle(0xf5c542, 1);
    g.fillRect(3, 8, 6, 2);
  });
}

/** ---------------------------------------------------------------- enemies & boss */
export function createEnemyTextures(scene: Phaser.Scene): void {
  spriteTex(scene, 'patrol1', ENEMY_WALK1, ENEMY_PALETTE);
  spriteTex(scene, 'patrol2', ENEMY_WALK2, ENEMY_PALETTE);
  spriteTex(scene, 'monster_walk1', MONSTER_WALK1, MONSTER_PALETTE);
  spriteTex(scene, 'monster_walk2', MONSTER_WALK2, MONSTER_PALETTE);
  spriteTex(scene, 'monster_telegraph', MONSTER_TELEGRAPH, MONSTER_PALETTE);
  spriteTex(scene, 'monster_attack', MONSTER_ATTACK, MONSTER_PALETTE);
  spriteTex(scene, 'spitter_idle', SPITTER_IDLE, SPITTER_PALETTE);
  spriteTex(scene, 'spitter_attack', SPITTER_ATTACK, SPITTER_PALETTE);
  spriteTex(scene, 'bolt', BOLT, SPITTER_PALETTE);
  spriteTex(scene, 'caretaker', BOSS_MAP, BOSS_PALETTE);
  tex(scene, 'hammer', 24, 10, (g) => {
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(0, 4, 18, 2);
    g.fillStyle(0x9aa3bd, 1);
    g.fillRect(17, 0, 7, 10);
    g.fillStyle(0x6d7590, 1);
    g.fillRect(17, 6, 7, 4);
    g.fillStyle(0xcdd6ee, 1);
    g.fillRect(17, 0, 7, 2);
  });
}

/** ---------------------------------------------------------------- world tiles */
function cobble(g: Phaser.GameObjects.Graphics, ox: number, base: number, dark: number, light: number): void {
  g.fillStyle(dark, 1);
  g.fillRect(ox, 0, 16, 16);
  // staggered cobbles
  const stones = [
    [0, 0, 7, 7], [8, 0, 8, 7],
    [0, 8, 5, 8], [6, 8, 5, 8], [12, 8, 4, 8],
  ];
  for (const [sx, sy, sw, sh] of stones) {
    g.fillStyle(base, 1);
    g.fillRect(ox + sx + 1, sy + 1, sw - 1, sh - 1);
    g.fillStyle(light, 1);
    g.fillRect(ox + sx + 1, sy + 1, sw - 1, 1);
    g.fillRect(ox + sx + 1, sy + 1, 1, 3);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(ox + sx + sw - 1, sy + 1, 1, sh - 1);
  }
  g.fillStyle(0x000000, 0.22);
  g.fillRect(ox + 3, 4, 2, 1);
  g.fillRect(ox + 10, 11, 2, 1);
}

export function createTileset(scene: Phaser.Scene): void {
  tex(scene, 'tiles', 64, 16, (g) => {
    // GID 1 — mossy ground top
    cobble(g, 0, 0x565d7e, 0x3c4260, 0x6d7492);
    g.fillStyle(0x3f9a52, 1);
    g.fillRect(0, 0, 16, 2);
    g.fillStyle(0x67c96e, 1);
    g.fillRect(0, 0, 16, 1);
    g.fillRect(2, 2, 2, 1);
    g.fillRect(9, 2, 3, 1);
    g.fillRect(6, 3, 1, 2);
    g.fillStyle(0x8fe29a, 1);
    g.fillRect(4, 0, 1, 1);
    g.fillRect(12, 0, 1, 1);
    // GID 2 — inner ground
    cobble(g, 16, 0x4c5270, 0x353b58, 0x616886);
    // GID 3 — dark chamber wall
    cobble(g, 32, 0x39415e, 0x272d45, 0x4a5272);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(32, 7, 16, 1);
    // GID 4 — platform slab
    g.fillStyle(0x6d7492, 1);
    g.fillRect(48, 0, 16, 6);
    g.fillStyle(0x8b93b0, 1);
    g.fillRect(48, 0, 16, 2);
    g.fillStyle(0x464d6a, 1);
    g.fillRect(48, 6, 16, 3);
    g.fillStyle(0x000000, 0.2);
    g.fillRect(49, 9, 14, 1);
    g.fillStyle(0x3f9a52, 1);
    g.fillRect(49, 0, 3, 1);
    g.fillRect(11 + 48, 0, 2, 1);
  });
}

/** ---------------------------------------------------------------- pickups & interactives */
export function createInteractableTextures(scene: Phaser.Scene): void {
  tex(scene, 'coin', 10, 12, (g) => {
    g.fillStyle(0x1e2a4a, 1);
    g.fillRoundedRect(0, 0, 10, 12, 4);
    g.fillStyle(0xffd24a, 1);
    g.fillRoundedRect(1, 1, 8, 10, 3);
    g.fillStyle(0xfff3b0, 1);
    g.fillRoundedRect(2, 2, 6, 4, 2);
    g.fillStyle(0xd9a520, 1);
    g.fillRect(4, 5, 2, 4);
  });

  tex(scene, 'key_main', 16, 10, (g) => {
    g.fillStyle(0x1e2a4a, 1);
    g.fillCircle(5, 5, 4);
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(5, 5, 3);
    g.fillStyle(0xfff3b0, 1);
    g.fillCircle(4, 4, 1);
    g.fillStyle(0x1e2a4a, 1);
    g.fillRect(9, 4, 7, 2);
    g.fillStyle(0xffd24a, 1);
    g.fillRect(9, 4, 7, 1);
    g.fillRect(13, 6, 2, 2);
  });

  tex(scene, 'exit_door', 22, 34, (g) => {
    g.fillStyle(0x1e2a4a, 1);
    g.fillRect(0, 0, 22, 34);
    g.fillStyle(0x6e5a44, 1);
    g.fillRect(2, 2, 18, 32);
    g.fillStyle(0x8a7052, 1);
    g.fillRect(3, 3, 16, 2);
    g.fillRect(3, 3, 2, 30);
    g.fillStyle(0x4a3b2b, 1);
    g.fillRect(6, 6, 4, 26);
    g.fillRect(12, 6, 4, 26);
    g.fillStyle(0xf5c542, 1);
    g.fillRect(10, 16, 2, 3);
    g.fillStyle(0xffe9a3, 1);
    g.fillRect(10, 16, 1, 1);
  });

  const flag = (on: boolean): ((g: Phaser.GameObjects.Graphics) => void) => (g) => {
    g.fillStyle(0x8b93b0, 1);
    g.fillRect(5, 0, 2, 24);
    g.fillStyle(0x6a7288, 1);
    g.fillRect(5, 0, 1, 24);
    g.fillStyle(on ? 0x38d6c4 : 0xff5050, 1);
    g.fillRect(7, 1, 6, 5);
    g.fillStyle(on ? 0xa8f5e9 : 0xff9a9a, 1);
    g.fillRect(7, 1, 6, 1);
    if (on) {
      g.fillStyle(0x38d6c4, 0.35);
      g.fillRect(3, 7, 4, 3);
    }
  };
  tex(scene, 'checkpoint_off', 14, 24, flag(false));
  tex(scene, 'checkpoint_on', 14, 24, flag(true));

  tex(scene, 'stone_block', 16, 16, (g) => {
    cobble(g, 0, 0x767e9c, 0x525a78, 0x929ab8);
    g.fillStyle(0x1e2a4a, 1);
    g.fillRect(0, 0, 16, 1);
    g.fillRect(0, 15, 16, 1);
    g.fillRect(0, 0, 1, 16);
    g.fillRect(15, 0, 1, 16);
    g.fillStyle(0xf5c542, 0.5);
    g.fillRect(7, 2, 2, 2);
  });

  tex(scene, 'plate_up', 16, 8, (g) => {
    g.fillStyle(0x1e2a4a, 1);
    g.fillRect(0, 3, 16, 5);
    g.fillStyle(0xffd24a, 1);
    g.fillRect(1, 4, 14, 3);
    g.fillStyle(0xfff3b0, 1);
    g.fillRect(1, 4, 14, 1);
    g.fillStyle(0x8a6a1e, 1);
    g.fillRect(1, 6, 14, 1);
  });
  tex(scene, 'plate_down', 16, 8, (g) => {
    g.fillStyle(0x1e2a4a, 1);
    g.fillRect(0, 3, 16, 5);
    g.fillStyle(0x38d6c4, 1);
    g.fillRect(2, 5, 12, 2);
    g.fillStyle(0xa8f5e9, 1);
    g.fillRect(2, 5, 12, 1);
  });

  const lever = (dir: 1 | -1): ((g: Phaser.GameObjects.Graphics) => void) => (g) => {
    g.fillStyle(0x1e2a4a, 1);
    g.fillRect(2, 10, 10, 4);
    g.fillStyle(0x6a7288, 1);
    g.fillRect(3, 11, 8, 2);
    g.fillStyle(0x8b93b0, 1);
    g.fillRect(dir === 1 ? 6 : 5, 2, 2, 9);
    g.fillStyle(dir === 1 ? 0xff5050 : 0x38d6c4, 1);
    g.fillRect(dir === 1 ? 5 : 7, 1, 4, 3);
  };
  tex(scene, 'lever_left', 14, 14, lever(-1));
  tex(scene, 'lever_right', 14, 14, lever(1));

  tex(scene, 'gate', 16, 48, (g) => {
    g.fillStyle(0x1e2a4a, 1);
    g.fillRect(0, 0, 16, 48);
    g.fillStyle(0x39415c, 1);
    g.fillRect(1, 1, 14, 46);
    g.fillStyle(0x20263a, 1);
    g.fillRect(4, 0, 2, 48);
    g.fillRect(10, 0, 2, 48);
    g.fillRect(0, 8, 16, 3);
    g.fillRect(0, 24, 16, 3);
    g.fillRect(0, 40, 16, 3);
    g.fillStyle(0x525f80, 1);
    g.fillRect(1, 1, 14, 1);
  });

  tex(scene, 'cracked', 16, 16, (g) => {
    cobble(g, 0, 0x6a7288, 0x4a5266, 0x858da8);
    g.fillStyle(0x141824, 1);
    g.fillRect(3, 1, 2, 5);
    g.fillRect(5, 6, 2, 4);
    g.fillRect(7, 10, 2, 5);
    g.fillRect(10, 3, 2, 6);
    g.fillRect(8, 2, 3, 2);
    g.fillRect(2, 9, 3, 2);
  });

  tex(scene, 'spark', 3, 3, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 3, 3);
  });
  tex(scene, 'firefly', 3, 3, (g) => {
    g.fillStyle(0xffe9a3, 1);
    g.fillRect(1, 0, 1, 3);
    g.fillRect(0, 1, 3, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(1, 1, 1, 1);
  });
  tex(scene, 'px', 1, 1, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
  });
  spriteTex(scene, 'slash1', SLASH1, SLASH_PALETTE);
  spriteTex(scene, 'slash2', SLASH2, SLASH_PALETTE);
}

/** ---------------------------------------------------------------- decorations & background */
export function createDecorTextures(scene: Phaser.Scene): void {
  // Torch: iron bracket + animated flame (2 frames).
  const torchFlame = (f: 1 | 2): ((g: Phaser.GameObjects.Graphics) => void) => (g) => {
    g.fillStyle(0x6b4a2b, 1);
    g.fillRect(5, 9, 4, 7);
    g.fillStyle(0x8a6a3e, 1);
    g.fillRect(5, 9, 1, 7);
    g.fillStyle(0x39415c, 1);
    g.fillRect(3, 7, 8, 3);
    g.fillStyle(0x525f80, 1);
    g.fillRect(3, 7, 8, 1);
    if (f === 1) {
      g.fillStyle(0xff9a3d, 1);
      g.fillRect(4, 3, 6, 5);
      g.fillStyle(0xffd24a, 1);
      g.fillRect(5, 4, 4, 3);
      g.fillStyle(0xfff3b0, 1);
      g.fillRect(6, 5, 2, 2);
      g.fillStyle(0xff5f2e, 1);
      g.fillRect(6, 1, 2, 2);
    } else {
      g.fillStyle(0xff9a3d, 1);
      g.fillRect(5, 2, 5, 6);
      g.fillStyle(0xffd24a, 1);
      g.fillRect(6, 3, 3, 4);
      g.fillStyle(0xfff3b0, 1);
      g.fillRect(6, 4, 2, 2);
      g.fillStyle(0xff5f2e, 1);
      g.fillRect(4, 2, 1, 3);
    }
  };
  tex(scene, 'torch1', 14, 16, torchFlame(1));
  tex(scene, 'torch2', 14, 16, torchFlame(2));

  tex(scene, 'grass', 12, 7, (g) => {
    g.fillStyle(0x3f9a52, 1);
    g.fillRect(2, 3, 2, 4);
    g.fillRect(6, 1, 2, 6);
    g.fillRect(9, 4, 2, 3);
    g.fillStyle(0x67c96e, 1);
    g.fillRect(6, 1, 2, 2);
    g.fillRect(2, 3, 1, 2);
    g.fillRect(0, 5, 1, 2);
  });
  tex(scene, 'flower', 6, 8, (g) => {
    g.fillStyle(0x3f9a52, 1);
    g.fillRect(2, 4, 1, 4);
    g.fillStyle(0xff5f9e, 1);
    g.fillRect(1, 1, 3, 3);
    g.fillStyle(0xffd1e6, 1);
    g.fillRect(2, 2, 1, 1);
  });
  tex(scene, 'column', 18, 60, (g) => {
    g.fillStyle(0x2b3150, 1);
    g.fillRect(2, 4, 14, 56);
    g.fillStyle(0x39415e, 1);
    g.fillRect(3, 4, 5, 56);
    g.fillStyle(0x1e2a4a, 1);
    for (let y = 10; y < 60; y += 8) g.fillRect(2, y, 14, 1);
    g.fillRect(0, 0, 18, 5);
  });
  tex(scene, 'tree', 40, 44, (g) => {
    g.fillStyle(0x141828, 1);
    g.fillRect(18, 18, 4, 26);
    g.fillRect(10, 26, 8, 2);
    g.fillRect(24, 22, 8, 2);
    g.fillRect(8, 20, 2, 7);
    g.fillRect(32, 16, 2, 7);
    g.fillRect(16, 12, 2, 8);
    g.fillRect(24, 8, 2, 12);
    g.fillRect(20, 4, 2, 10);
    g.fillRect(12, 14, 2, 4);
  });

  tex(scene, 'cloud1', 52, 18, (g) => {
    g.fillStyle(0x4a4f7a, 1);
    g.fillRect(6, 8, 40, 8);
    g.fillRect(14, 4, 20, 6);
    g.fillRect(2, 12, 46, 4);
    g.fillStyle(0x6a70a2, 1);
    g.fillRect(14, 4, 12, 2);
    g.fillRect(6, 8, 10, 2);
    g.fillStyle(0x35395c, 1);
    g.fillRect(2, 18, 46, 2);
  });
  tex(scene, 'cloud2', 32, 12, (g) => {
    g.fillStyle(0x4a4f7a, 1);
    g.fillRect(4, 5, 24, 6);
    g.fillRect(10, 2, 12, 4);
    g.fillStyle(0x6a70a2, 1);
    g.fillRect(10, 2, 8, 2);
    g.fillStyle(0x35395c, 1);
    g.fillRect(0, 10, 30, 2);
  });
  tex(scene, 'moon', 22, 22, (g) => {
    g.fillStyle(0xffe9a3, 1);
    g.fillCircle(11, 11, 9);
    g.fillStyle(0xfff8d9, 1);
    g.fillCircle(8, 8, 4);
    g.fillStyle(0xf2cf6e, 1);
    g.fillCircle(14, 14, 3);
    g.fillCircle(15, 7, 2);
    // crescent bite (sky colored)
    g.fillStyle(0x0b0d18, 1);
    g.fillCircle(16, 8, 7);
    g.fillStyle(0xffe9a3, 1);
    g.fillCircle(11, 11, 9);
    g.fillStyle(0xfff8d9, 1);
    g.fillCircle(8, 9, 3);
    g.fillStyle(0xf2cf6e, 1);
    g.fillCircle(13, 15, 2);
  });
  tex(scene, 'tower_bg', 46, 74, (g) => {
    g.fillStyle(0x1c2038, 1);
    g.fillRect(0, 6, 46, 68);
    g.fillStyle(0x232848, 1);
    g.fillRect(4, 0, 10, 74);
    g.fillRect(30, 12, 12, 62);
    g.fillStyle(0xf2cf6e, 1);
    for (let y = 14; y < 66; y += 10) {
      for (let x = 8; x < 40; x += 10) {
        if (Phaser.Math.Between(0, 2) > 0) g.fillRect(x, y, 3, 4);
      }
    }
    g.fillStyle(0x0b0d18, 1);
    g.fillRect(20, 6, 6, 68);
  });
  tex(scene, 'hills_near', 480, 70, (g) => {
    g.fillStyle(0x171b30, 1);
    g.fillTriangle(40, 70, 200, 30, 360, 70);
    g.fillTriangle(300, 70, 420, 44, 480, 70);
    g.fillRect(430, 40, 14, 30);
  });
}

export function createAllPlaceholderTextures(scene: Phaser.Scene): void {
  createTileset(scene);
  createCharacterTextures(scene);
  createEnemyTextures(scene);
  createInteractableTextures(scene);
  createDecorTextures(scene);
  if (document.fonts?.load) {
    void document.fonts.load('10px "Press Start 2P"');
  }
  console.info('[STONEBOUND] Pixel art generated in code — original assets (ASSET_LICENSES.md).');
}

export { COLORS };
