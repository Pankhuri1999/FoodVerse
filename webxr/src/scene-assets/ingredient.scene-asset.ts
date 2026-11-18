import { Object3D } from '@iwsdk/core';
import { INGREDIENTS } from '../ingredient-catalog.js';

export function createCosmicFruit(): Object3D {
  return INGREDIENTS['cosmic-fruit'].createVisual();
}

export function createStarPepper(): Object3D {
  return INGREDIENTS['star-pepper'].createVisual();
}

export function createSpaceLeaves(): Object3D {
  return INGREDIENTS['space-leaves'].createVisual();
}

export function createCrystalSugar(): Object3D {
  return INGREDIENTS['crystal-sugar'].createVisual();
}

export function createChocolate(): Object3D {
  return INGREDIENTS.chocolate.createVisual();
}

export function createMintCrystal(): Object3D {
  return INGREDIENTS['mint-crystal'].createVisual();
}
