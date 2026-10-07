import stage1 from './stage1.json';

export interface StageObject {
  type: string;
  id?: string;
  x: number;
  y?: number;
  minX?: number;
  maxX?: number;
  heightTiles?: number;
  key?: string;
  text?: string;
}

export interface StageData {
  id: number;
  name: string;
  storyId: number;
  width: number;
  height: number;
  tileSize: number;
  theme: string;
  bossArena?: { x0: number; x1: number };
  layout: string[];
  objects: StageObject[];
  /** false = metadata only, map arrives in a later milestone. */
  playable: boolean;
  /** Main-key puzzle summary shown on the stage card (design.md §4). */
  puzzle: string;
  boss: string;
}

export const STAGES: StageData[] = [
  { ...stage1, playable: true, puzzle: 'Move stone blocks onto pressure plates.', boss: 'Bronze Caretaker' },
  meta(2, 'The Rootbound Mill', 'Redirect water to power lifts.', 'Mill Warden'),
  meta(3, 'The Bell Quarry', 'Strike bells according to carved symbols.', 'Hollow Bellkeeper'),
  meta(4, 'The Hanging Market', 'Balance suspended platforms using counterweights.', 'Toll Collector'),
  meta(5, 'The Glass Furnace', 'Rotate cooled mirrors to expose the key chamber.', 'Furnace Marshal'),
  meta(6, 'The Drowned Archive', 'Drain rooms to assemble a route diagram.', 'Inkbound Archivist'),
  meta(7, 'The Winter Granary', 'Slide frozen crates to repair a supply lift.', 'White Quartermaster'),
  meta(8, 'The Unfinished Bridge', 'Position bridge sections with winches.', 'Bridge Captain'),
  meta(9, 'The Gateworks', 'Connect mechanical relays.', 'Last Gatekeeper'),
  meta(10, 'The Door Beneath Home', 'Combine plates, mirrors, and relays.', 'The First Hero'),
];

function meta(id: number, name: string, puzzle: string, boss: string): StageData {
  return {
    id,
    name,
    storyId: 1,
    width: 0,
    height: 0,
    tileSize: 16,
    theme: 'monument',
    layout: [],
    objects: [],
    playable: false,
    puzzle,
    boss,
  };
}

export function getStage(id: number): StageData | undefined {
  return STAGES.find((s) => s.id === id);
}

/** Sequential unlock (design.md §3): stage N unlocks after completing N-1. */
export function isStageUnlocked(id: number, unlockedStage: number): boolean {
  return id >= 1 && id <= unlockedStage;
}
