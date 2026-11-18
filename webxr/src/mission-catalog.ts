import { IngredientId } from './ingredient-catalog.js';
import { RecipeId } from './recipe-catalog.js';

export type MissionStageId =
  | 'collect-ember'
  | 'cook-ember'
  | 'deliver-ember'
  | 'collect-grove'
  | 'cook-grove'
  | 'deliver-grove'
  | 'collect-mint'
  | 'cook-mint'
  | 'deliver-mint'
  | 'restored';

export type MissionFacts = {
  emberCollected: boolean;
  emberHatched: boolean;
  ice: boolean;
  groveCollected: boolean;
  groveHatched: boolean;
  grove: boolean;
  mintCollected: boolean;
  mintHatched: boolean;
  water: boolean;
  wafer: boolean;
  cocoa: boolean;
  foliage: boolean;
};

export type MissionStageDef = {
  id: MissionStageId;
  index: number;
  title: string;
  objective: string;
  xrObjective: string;
  desktopObjective: string;
  allowedRecipe: RecipeId | '';
  target: 'IceGate' | 'BarrenSoil' | 'WaterPath' | '';
};

export const MISSION_STAGES: readonly MissionStageDef[] = [
  {
    id: 'collect-ember',
    index: 1,
    title: 'Gather Ember Spark',
    objective: 'Place Cosmic Fruit and Star Pepper in the mixer bowl.',
    xrObjective: 'Look at the mixer table. Pinch Cosmic Fruit and Star Pepper into the bowl.',
    desktopObjective: 'Pick up Cosmic Fruit and Star Pepper. Place both in the mixer bowl.',
    allowedRecipe: 'ember-spark',
    target: '',
  },
  {
    id: 'cook-ember',
    index: 2,
    title: 'Cook Ember Spark',
    objective: 'Heat the mixer, stir to 45%, and catch any food that floats.',
    xrObjective: 'Press the orange Heat knob. Stir with an open hand to 45%. Catch floating food, or press the Stabilizer.',
    desktopObjective: 'Press Heat (H). Stir to 45% (S). If food floats, catch it or press Stabilizer (G).',
    allowedRecipe: 'ember-spark',
    target: '',
  },
  {
    id: 'deliver-ember',
    index: 3,
    title: 'Open the Ice Gate',
    objective: 'Place Ember Dragon on the Ice Gate, then set the cookie wafer on Cookie Bridge.',
    xrObjective: 'Pinch Ember Dragon onto the Ice Gate. Place the cookie wafer on Cookie Bridge.',
    desktopObjective: 'Set Ember Dragon on the Ice Gate. Place the cookie wafer on Cookie Bridge.',
    allowedRecipe: '',
    target: 'IceGate',
  },
  {
    id: 'collect-grove',
    index: 4,
    title: 'Gather Grove Bloom',
    objective: 'Place Space Leaves and Crystal Sugar in the mixer bowl.',
    xrObjective: 'Pinch Space Leaves and Crystal Sugar into the mixer bowl.',
    desktopObjective: 'Pick up Space Leaves and Crystal Sugar. Place both in the mixer bowl.',
    allowedRecipe: 'grove-bloom',
    target: '',
  },
  {
    id: 'cook-grove',
    index: 5,
    title: 'Cook Grove Bloom',
    objective: 'Stir to 45% to hatch Grove Guardian. No heat is required.',
    xrObjective: 'Wave an open hand over the bowl until stir reaches 45%. Temperature can stay idle.',
    desktopObjective: 'Stir to 45% (S, or hold the pointer on the bowl). No heat is required.',
    allowedRecipe: 'grove-bloom',
    target: '',
  },
  {
    id: 'deliver-grove',
    index: 6,
    title: 'Restore the barren soil',
    objective: 'Plant the leaf bundle on the barren soil, then place Grove Guardian there.',
    xrObjective: 'Place the leaf bundle on the barren soil. Pinch Grove Guardian onto the same pad.',
    desktopObjective: 'Place the leaf bundle on the barren soil, then set Grove Guardian there.',
    allowedRecipe: '',
    target: 'BarrenSoil',
  },
  {
    id: 'collect-mint',
    index: 7,
    title: 'Gather Mint Current',
    objective: 'Place Chocolate and Mint Crystal in the mixer bowl.',
    xrObjective: 'Pinch Chocolate and Mint Crystal into the mixer bowl.',
    desktopObjective: 'Pick up Chocolate and Mint Crystal. Place both in the mixer bowl.',
    allowedRecipe: 'mint-current',
    target: '',
  },
  {
    id: 'cook-mint',
    index: 8,
    title: 'Cook Mint Current',
    objective: 'Cool the mixer, stir to 45%, and catch any food that lifts.',
    xrObjective: 'Press the mint Cool knob. Stir with an open hand to 45%. Catch lifting food, or press the Stabilizer.',
    desktopObjective: 'Press Cool (C). Stir to 45% (S). If food lifts, catch it or press Stabilizer (G).',
    allowedRecipe: 'mint-current',
    target: '',
  },
  {
    id: 'deliver-mint',
    index: 9,
    title: 'Freeze the water path',
    objective: 'Lay chocolate on the water path, then place Mint Current to freeze the crossing.',
    xrObjective: 'Place chocolate on the water path. Pinch Mint Current onto that path.',
    desktopObjective: 'Place chocolate on the water path, then set Mint Current there.',
    allowedRecipe: '',
    target: 'WaterPath',
  },
  {
    id: 'restored',
    index: 10,
    title: 'Kingdom restored',
    objective: 'The Cookie Kingdom lives: ice melted, forest grown, river frozen, and every structure in place.',
    xrObjective: 'The Cookie Kingdom lives: ice melted, forest grown, river frozen, and every structure in place.',
    desktopObjective: 'The Cookie Kingdom lives: ice melted, forest grown, river frozen, and every structure in place.',
    allowedRecipe: '',
    target: '',
  },
];

export const MISSION_STAGE_COUNT = MISSION_STAGES.length;

export function stageById(id: string | undefined): MissionStageDef {
  return MISSION_STAGES.find((stage) => stage.id === id) ?? MISSION_STAGES[0];
}

export function deriveMissionStage(facts: MissionFacts): MissionStageDef {
  if (facts.ice && facts.grove && facts.water && facts.wafer && facts.cocoa && facts.foliage) {
    return stageById('restored');
  }
  if (facts.mintHatched) return stageById('deliver-mint');
  if (facts.mintCollected) return stageById('cook-mint');
  if (facts.grove) return stageById('collect-mint');
  if (facts.groveHatched) return stageById('deliver-grove');
  if (facts.groveCollected) return stageById('cook-grove');
  if (facts.ice) return stageById('collect-grove');
  if (facts.emberHatched) return stageById('deliver-ember');
  if (facts.emberCollected) return stageById('cook-ember');
  return stageById('collect-ember');
}

export function pairCollected(
  ids: readonly IngredientId[],
  present: ReadonlySet<string>,
): boolean {
  return ids.every((id) => present.has(id));
}

export function kingdomLine(facts: MissionFacts): string {
  const gate = facts.ice ? 'Ice Gate: open' : 'Ice Gate: frozen';
  const soil = facts.grove ? 'Forest: grown' : 'Soil: barren';
  const path = facts.water ? 'Crossing: frozen' : 'Water: open';
  const bridge = facts.wafer ? 'Cookie Bridge: built' : 'Cookie Bridge: needed';
  const keep =
    facts.ice && facts.grove && facts.water && facts.wafer && facts.cocoa && facts.foliage
      ? 'Kingdom: restored'
      : 'Kingdom: waiting';
  return `${gate} · ${soil} · ${path} · ${bridge} · ${keep}`;
}

export type ArchiveItem = { label: string; found: boolean };

export function recipeItems(facts: MissionFacts): ArchiveItem[] {
  return [
    { label: 'Ember Spark', found: facts.emberHatched },
    { label: 'Grove Bloom', found: facts.groveHatched },
    { label: 'Mint Current', found: facts.mintHatched },
  ];
}

export function planetItems(facts: MissionFacts): ArchiveItem[] {
  return [
    { label: 'Ice Gate', found: facts.ice },
    { label: 'Forest', found: facts.grove },
    { label: 'Water Path', found: facts.water },
    { label: 'Cookie wafer', found: facts.wafer },
    { label: 'Leaf canopy', found: facts.foliage },
    { label: 'Chocolate river', found: facts.cocoa },
  ];
}

export function archiveItems(facts: MissionFacts): ArchiveItem[] {
  return [...recipeItems(facts), ...planetItems(facts).slice(3)];
}

export function archiveLine(facts: MissionFacts): string {
  return recipeItems(facts)
    .map((item) => `${item.label}: ${item.found ? 'found' : 'locked'}`)
    .join(' · ');
}

export function planetLine(facts: MissionFacts): string {
  return planetItems(facts)
    .map((item) => `${item.label}: ${item.found ? 'found' : 'locked'}`)
    .join(' · ');
}

export function cookGuide(
  stageId: string,
  immersive: boolean,
): {
  name: string;
  recipe: string;
  steps: [string, string, string, string];
} {
  const grab = immersive ? 'Pinch' : 'Pick up';
  const stir = immersive
    ? 'Wave an open hand over the bowl until stir reaches 45%. Pinching cancels the stir.'
    : 'Press S, or hold the pointer on the bowl, until stir reaches 45%.';
  if (stageId === 'collect-grove' || stageId === 'cook-grove' || stageId === 'deliver-grove') {
    return {
      name: 'Grove Bloom',
      recipe: 'Grove Bloom — Space Leaves and Crystal Sugar. Any temperature.',
      steps: [
        `${grab} Space Leaves and Crystal Sugar. Place both in the mixer bowl.`,
        'No heat is required. Grove Bloom cooks at any temperature.',
        stir,
        `${grab} the leaf bundle onto the barren soil, then place Grove Guardian on that pad.`,
      ],
    };
  }
  if (stageId === 'collect-mint' || stageId === 'cook-mint' || stageId === 'deliver-mint') {
    return {
      name: 'Mint Current',
      recipe: 'Mint Current — Chocolate and Mint Crystal. Requires cold.',
      steps: [
        `${grab} Chocolate and Mint Crystal. Place both in the mixer bowl.`,
        immersive
          ? 'Press the mint Cool knob. Gravity may reverse. Catch food, or press the Stabilizer.'
          : 'Press Cool (C). If food lifts, catch it or press Stabilizer (G).',
        stir,
        `${grab} chocolate onto the water path, then place Mint Current on that path.`,
      ],
    };
  }
  if (stageId === 'restored') {
    return {
      name: 'Cookie Kingdom',
      recipe: 'The Cookie Kingdom is restored.',
      steps: [
        'The Ice Gate is open.',
        'A forest has grown on the barren soil.',
        'The water path is a frozen crossing.',
        'Use Replay hints or Restart mission on the panel to play again.',
      ],
    };
  }
  return {
    name: 'Ember Spark',
    recipe: 'Ember Spark — Cosmic Fruit and Star Pepper. Requires heat.',
    steps: [
      `${grab} Cosmic Fruit and Star Pepper. Place both in the mixer bowl.`,
      immersive
        ? 'Press the orange Heat knob. Loose food may float. Catch it, or press the Stabilizer.'
        : 'Press Heat (H). If food floats, catch it or press Stabilizer (G).',
      stir,
      `${grab} Ember Dragon onto the Ice Gate, then place the cookie wafer on Cookie Bridge.`,
    ],
  };
}
