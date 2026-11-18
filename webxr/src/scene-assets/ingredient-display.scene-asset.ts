import { Group, Object3D } from '@iwsdk/core';
import {
  box,
  lathe,
  matCeramic,
  matCeramicGlaze,
  matGold,
  matWarmSteel,
  matWood,
  named,
} from './kitchen-kit.js';

/** Countertop prep tray with glazed ceramic dishes. Origin at deck. */
export function createIngredientDisplay(): Object3D {
  const root = new Group();
  root.name = 'IngredientDisplay';

  const riser = box([0.42, 0.04, 0.22], matWood, 0.01);
  riser.position.set(0, 0.79, 0.04);
  root.add(named(riser, 'Tray'));

  const lip = box([0.4, 0.01, 0.012], matWarmSteel, 0.003);
  lip.position.set(0, 0.812, 0.14);
  root.add(named(lip, 'Lip'));

  const dishes = [-0.13, 0, 0.13];
  for (let i = 0; i < dishes.length; i += 1) {
    const dish = lathe(
      [
        [0.001, 0],
        [0.04, 0],
        [0.048, 0.008],
        [0.046, 0.016],
        [0.028, 0.018],
      ],
      matCeramic,
      28,
    );
    dish.position.set(dishes[i], 0.812, 0.03);
    root.add(named(dish, `Dish${i}`));
    const glaze = lathe(
      [
        [0.001, 0],
        [0.026, 0],
        [0.028, 0.004],
      ],
      matCeramicGlaze,
      20,
    );
    glaze.position.set(dishes[i], 0.824, 0.03);
    glaze.castShadow = false;
    root.add(named(glaze, `Glaze${i}`));
    const rim = lathe(
      [
        [0.044, 0],
        [0.05, 0.002],
        [0.046, 0.006],
      ],
      matGold,
      20,
    );
    rim.position.set(dishes[i], 0.826, 0.03);
    rim.castShadow = false;
    root.add(named(rim, `Rim${i}`));
  }

  return root;
}
