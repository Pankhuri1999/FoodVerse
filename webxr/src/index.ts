/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { launchInstalledPwaXr, prepareIwerPreview, showBootError, startIwerPreviewGuard } from './boot.js';
import { BuildSystem } from './build-system.js';
import { ComfortSystem } from './comfort-system.js';
import { CookSystem } from './cook-system.js';
import { DeskOverlaySystem } from './desk-overlay.js';
import { CreatureVisualSystem } from './creature-visual-system.js';
import { DeliverySystem } from './delivery-system.js';
import { GrabInteractionSystem } from './grab-interaction.js';
import { GravitySystem } from './gravity-system.js';
import { IngredientVisualSystem } from './ingredient-visual-system.js';
import { MissionSystem } from './mission-system.js';
import { MixerSystem } from './mixer-system.js';
import { PanelSystem } from './panel.js';
import { RecipeFxSystem } from './recipe-fx-system.js';
import { SpaceVistaSystem } from './space-vista-system.js';

const container = document.getElementById('scene-container');
if (!(container instanceof HTMLDivElement)) {
  showBootError('The page is missing #scene-container.');
} else {
  World.create(container, projectOptions)
    .then((world) => {
      world.registerSystem(PanelSystem);
      world.registerSystem(DeskOverlaySystem);
      world.registerSystem(ComfortSystem);
      world.registerSystem(GrabInteractionSystem);
      world.registerSystem(GravitySystem);
      world.registerSystem(MixerSystem);
      world.registerSystem(CookSystem);
      world.registerSystem(BuildSystem);
      world.registerSystem(RecipeFxSystem);
      world.registerSystem(IngredientVisualSystem);
      world.registerSystem(CreatureVisualSystem);
      world.registerSystem(DeliverySystem);
      world.registerSystem(MissionSystem);
      world.registerSystem(SpaceVistaSystem);
      prepareIwerPreview();
      startIwerPreviewGuard();
      launchInstalledPwaXr(world);
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      showBootError(detail || 'World.create rejected.');
    });
}
