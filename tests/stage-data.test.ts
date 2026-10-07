import { describe, it, expect } from 'vitest';
import { STAGES, getStage, isStageUnlocked } from '../src/data/stages';
import { WEAPONS, STARTER_WEAPON_ID } from '../src/data/weapons';
import { SKILLS } from '../src/data/skills';
import { ECONOMY } from '../src/config/economy-config';
import { DIFFICULTIES } from '../src/config/difficulty';

describe('Story 1 stage plan (design.md §4)', () => {
  it('has exactly 10 sequential stages', () => {
    expect(STAGES).toHaveLength(10);
    STAGES.forEach((s, i) => expect(s.id).toBe(i + 1));
  });

  it('unlocks sequentially from stage 1', () => {
    expect(isStageUnlocked(1, 1)).toBe(true);
    expect(isStageUnlocked(2, 1)).toBe(false);
    expect(isStageUnlocked(2, 2)).toBe(true);
    expect(isStageUnlocked(0, 5)).toBe(false);
  });

  it('stage 1 map is well-formed', () => {
    const stage = getStage(1);
    expect(stage).toBeDefined();
    expect(stage!.playable).toBe(true);
    expect(stage!.layout).toHaveLength(stage!.height);
    stage!.layout.forEach((row) => expect(row).toHaveLength(stage!.width));

    // Exactly one spawn, one key, one exit, one boss, two checkpoints.
    const count = (type: string): number => stage!.objects.filter((o) => o.type === type).length;
    expect(count('spawn')).toBe(1);
    expect(count('key')).toBe(1);
    expect(count('exit')).toBe(1);
    expect(count('boss')).toBe(1);
    expect(count('checkpoint')).toBe(2);
    expect(count('plate')).toBe(2);
    expect(count('block')).toBe(2);
    expect(count('lever')).toBeGreaterThanOrEqual(1); // puzzle reset interaction

    // Pickup coin target 30–60 (design.md §8).
    const coins = count('coin');
    expect(coins).toBeGreaterThanOrEqual(ECONOMY.pickupTarget.min);
    expect(coins).toBeLessThanOrEqual(ECONOMY.pickupTarget.max);

    // Every id used by pickups/enemies is unique (ledger requirement).
    const ids = stage!.objects.filter((o) => o.id).map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stage 1 spawn and critical objects sit on free ground', () => {
    const stage = getStage(1)!;
    const at = (x: number, y: number): string => stage.layout[y]?.[x] ?? '?';
    for (const o of stage.objects) {
      if (['spawn', 'coin', 'key', 'checkpoint', 'patrol', 'boss', 'exit', 'lever', 'block', 'plate'].includes(o.type)) {
        expect(at(o.x, o.y!)).toBe('.');
      }
    }
  });

  it('stages 2-10 are metadata-only until implemented', () => {
    for (let id = 2; id <= 10; id++) {
      const stage = getStage(id)!;
      expect(stage.playable).toBe(false);
    }
  });
});

describe('equipment data (design.md §6)', () => {
  it('starter weapon is free and owned by default', () => {
    const starter = WEAPONS.find((w) => w.id === STARTER_WEAPON_ID)!;
    expect(starter.price).toBe(0);
  });

  it('prices and stats match the design table', () => {
    const guardian = WEAPONS.find((w) => w.id === 'guardian_sword')!;
    expect(guardian.price).toBe(150);
    expect(guardian.damage).toBe(18);
    const bow = WEAPONS.find((w) => w.id === 'light_bow')!;
    expect(bow.price).toBe(250);
    expect(bow.damage).toBe(10);
  });

  it('skills unlock after stages 0/3/6', () => {
    expect(SKILLS.find((s) => s.id === 'dash')!.unlockedAfterStage).toBe(0);
    expect(SKILLS.find((s) => s.id === 'light_burst')!.unlockedAfterStage).toBe(3);
    expect(SKILLS.find((s) => s.id === 'guard')!.unlockedAfterStage).toBe(6);
  });
});

describe('difficulty table (design.md §9)', () => {
  it('matches the design table; lives stay 3 everywhere', () => {
    expect(DIFFICULTIES.easy.playerMaxHp).toBe(150);
    expect(DIFFICULTIES.easy.enemyDamageMultiplier).toBeCloseTo(0.7);
    expect(DIFFICULTIES.normal.playerMaxHp).toBe(100);
    expect(DIFFICULTIES.hard.enemyDamageMultiplier).toBeCloseTo(1.3);
    expect(DIFFICULTIES.hard.bossHpMultiplier).toBeCloseTo(1.2);
    for (const d of Object.values(DIFFICULTIES)) expect(d.startingLives).toBe(3);
  });
});
