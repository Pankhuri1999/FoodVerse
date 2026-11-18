import { Object3D } from '@iwsdk/core';
import { createEmberDragon } from './scene-assets/ember-dragon.scene-asset.js';
import { createGroveGuardian } from './scene-assets/grove-guardian.scene-asset.js';
import { createMintCurrent } from './scene-assets/mint-current.scene-asset.js';

export type CreatureId = 'ember-dragon' | 'grove-guardian' | 'mint-current';
export type DeliveryTarget = 'IceGate' | 'BarrenSoil' | 'WaterPath';
export type CreatureIdle = 'flap' | 'sway' | 'flow';

export type CreatureDef = {
  id: CreatureId;
  recipeId: string;
  label: string;
  deliveryTarget: DeliveryTarget;
  kingdomFlag: 'ice' | 'grove' | 'water';
  idle: CreatureIdle;
  hatchChord: readonly number[];
  landChord: readonly number[];
  createVisual: () => Object3D;
};

export const CREATURES: Record<CreatureId, CreatureDef> = {
  'ember-dragon': {
    id: 'ember-dragon',
    recipeId: 'ember-spark',
    label: 'Ember Dragon',
    deliveryTarget: 'IceGate',
    kingdomFlag: 'ice',
    idle: 'flap',
    hatchChord: [392, 523, 784, 1174],
    landChord: [330, 392, 523],
    createVisual: createEmberDragon,
  },
  'grove-guardian': {
    id: 'grove-guardian',
    recipeId: 'grove-bloom',
    label: 'Grove Guardian',
    deliveryTarget: 'BarrenSoil',
    kingdomFlag: 'grove',
    idle: 'sway',
    hatchChord: [349, 440, 523, 659],
    landChord: [196, 262, 330],
    createVisual: createGroveGuardian,
  },
  'mint-current': {
    id: 'mint-current',
    recipeId: 'mint-current',
    label: 'Mint Current',
    deliveryTarget: 'WaterPath',
    kingdomFlag: 'water',
    idle: 'flow',
    hatchChord: [523, 659, 784, 988],
    landChord: [784, 988, 1174],
    createVisual: createMintCurrent,
  },
};

export function getCreatureDef(id: string | undefined): CreatureDef | undefined {
  if (!id) return undefined;
  return CREATURES[id as CreatureId];
}
