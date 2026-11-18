import { CreatureId } from './creature-catalog.js';
import { IngredientId } from './ingredient-catalog.js';

const KEY = 'foodiverse.webxr.mission.v1';

export type CreatureSave = {
  hatched: boolean;
  delivered: boolean;
};

export type MissionSave = {
  version: 1;
  ice: boolean;
  grove: boolean;
  water: boolean;
  wafer: boolean;
  cocoa: boolean;
  foliage: boolean;
  everRestored: boolean;
  creatures: Record<CreatureId, CreatureSave>;
  consumed: Record<IngredientId, boolean>;
};

const CREATURE_IDS: CreatureId[] = ['ember-dragon', 'grove-guardian', 'mint-current'];
const INGREDIENT_IDS: IngredientId[] = [
  'cosmic-fruit',
  'star-pepper',
  'space-leaves',
  'crystal-sugar',
  'chocolate',
  'mint-crystal',
];

export function emptyMissionSave(): MissionSave {
  return {
    version: 1,
    ice: false,
    grove: false,
    water: false,
    wafer: false,
    cocoa: false,
    foliage: false,
    everRestored: false,
    creatures: {
      'ember-dragon': { hatched: false, delivered: false },
      'grove-guardian': { hatched: false, delivered: false },
      'mint-current': { hatched: false, delivered: false },
    },
    consumed: {
      'cosmic-fruit': false,
      'star-pepper': false,
      'space-leaves': false,
      'crystal-sugar': false,
      chocolate: false,
      'mint-crystal': false,
    },
  };
}

function asBool(value: unknown): boolean {
  return value === true;
}

export function loadMissionSave(): MissionSave {
  const data = emptyMissionSave();
  if (typeof localStorage === 'undefined') return data;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return data;
    const parsed = JSON.parse(raw) as Partial<MissionSave>;
    data.ice = asBool(parsed.ice);
    data.grove = asBool(parsed.grove);
    data.water = asBool(parsed.water);
    data.wafer = asBool(parsed.wafer) || (data.ice && data.grove && data.water);
    data.cocoa = asBool(parsed.cocoa) || (data.ice && data.grove && data.water);
    data.foliage = asBool(parsed.foliage) || (data.ice && data.grove && data.water);
    data.everRestored = asBool(parsed.everRestored);
    for (const id of CREATURE_IDS) {
      const row = parsed.creatures?.[id];
      data.creatures[id] = {
        hatched: asBool(row?.hatched) || asBool(row?.delivered) || (id === 'ember-dragon' && data.ice) || (id === 'grove-guardian' && data.grove) || (id === 'mint-current' && data.water),
        delivered:
          asBool(row?.delivered) ||
          (id === 'ember-dragon' && data.ice) ||
          (id === 'grove-guardian' && data.grove) ||
          (id === 'mint-current' && data.water),
      };
    }
    for (const id of INGREDIENT_IDS) {
      data.consumed[id] = asBool(parsed.consumed?.[id]);
    }
    if (data.creatures['ember-dragon'].hatched) {
      data.consumed['cosmic-fruit'] = true;
      data.consumed['star-pepper'] = true;
    }
    if (data.creatures['grove-guardian'].hatched) {
      data.consumed['space-leaves'] = true;
      data.consumed['crystal-sugar'] = true;
    }
    if (data.creatures['mint-current'].hatched) {
      data.consumed.chocolate = true;
      data.consumed['mint-crystal'] = true;
    }
  } catch {
    return emptyMissionSave();
  }
  return data;
}

export function writeMissionSave(data: MissionSave): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage can be blocked in private XR browsers; gameplay still runs.
  }
}

export function clearRunKeepJournal(everRestored: boolean): MissionSave {
  const data = emptyMissionSave();
  data.everRestored = everRestored;
  writeMissionSave(data);
  return data;
}
