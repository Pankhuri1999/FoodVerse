/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineComponents } from '@iwsdk/core';
import {
  BuildPiece,
  ComfortSettings,
  CookieKingdom,
  CoolControl,
  Creature,
  GravityCore,
  HeatControl,
  Ingredient,
  IngredientStation,
  KitchenStation,
  Mission,
  MissionHud,
  QuantumMixer,
  StabilizerControl,
  StirWell,
} from './kitchen-components.js';
import { Robot } from './robot-component.js';

export default defineComponents([
  Robot,
  KitchenStation,
  QuantumMixer,
  IngredientStation,
  CookieKingdom,
  MissionHud,
  Mission,
  ComfortSettings,
  Ingredient,
  HeatControl,
  CoolControl,
  StirWell,
  Creature,
  GravityCore,
  StabilizerControl,
  BuildPiece,
]);
