/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AssetType, defineAssets } from '@iwsdk/core';
import { createCabinHull } from './scene-assets/cabin-hull.scene-asset.js';
import { createCookStation } from './scene-assets/cook-station.scene-asset.js';
import { createCookieKingdom } from './scene-assets/cookie-kingdom.scene-asset.js';
import { createIngredientDisplay } from './scene-assets/ingredient-display.scene-asset.js';
import {
  createChocolate,
  createCosmicFruit,
  createCrystalSugar,
  createMintCrystal,
  createSpaceLeaves,
  createStarPepper,
} from './scene-assets/ingredient.scene-asset.js';
import { CREATURES } from './creature-catalog.js';
import {
  createChocolateRiver,
  createCookieWafer,
  createLeafBundle,
} from './scene-assets/build-piece.scene-asset.js';
import { createCoolControl } from './scene-assets/cool-control.scene-asset.js';
import { createDiscoveryArchive } from './scene-assets/discovery-archive.scene-asset.js';
import { createGravityControl } from './scene-assets/gravity-control.scene-asset.js';
import { createHeatControl } from './scene-assets/heat-control.scene-asset.js';
import { createQuantumMixer } from './scene-assets/quantum-mixer.scene-asset.js';
import { createSpaceVista } from './scene-assets/space-vista.scene-asset.js';
import { createStirWell } from './scene-assets/stir-well.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

const uikitml = (fileName: string, name: string) => ({
  url: publicAssetUrl(`ui/${fileName}`),
  type: AssetType.UIKitML,
  name,
});

export default defineAssets({
  'cabin-hull': createCabinHull(),
  'space-vista': createSpaceVista(),
  'cook-station': createCookStation(),
  'quantum-mixer': createQuantumMixer(),
  'heat-control': createHeatControl(),
  'cool-control': createCoolControl(),
  'gravity-control': createGravityControl(),
  'stir-well': createStirWell(),
  'build-cookie': createCookieWafer(),
  'build-chocolate': createChocolateRiver(),
  'build-leaf': createLeafBundle(),
  'ember-dragon': CREATURES['ember-dragon'].createVisual(),
  'grove-guardian': CREATURES['grove-guardian'].createVisual(),
  'mint-current': CREATURES['mint-current'].createVisual(),
  'ingredient-display': createIngredientDisplay(),
  'ing-cosmic-fruit': createCosmicFruit(),
  'ing-star-pepper': createStarPepper(),
  'ing-space-leaves': createSpaceLeaves(),
  'ing-crystal-sugar': createCrystalSugar(),
  'ing-chocolate': createChocolate(),
  'ing-mint-crystal': createMintCrystal(),
  'cookie-kingdom': createCookieKingdom(),
  'discovery-archive': createDiscoveryArchive(),
  'mission-panel': uikitml('mission-panel.uikitml', 'Mission Panel'),
  'cook-guide': uikitml('cook-guide.uikitml', 'Cook Guide'),
});
