import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { cylinder, named } from './kitchen-kit.js';

const matWell = createSceneMaterial({
  id: 'stir-well',
  model: 'standard',
  baseColor: '#3ec8e0',
  roughness: 0.4,
  emissive: '#3ec8e0',
  emissiveIntensity: 0.12,
  opacity: 0.12,
  side: 'double',
});

export function createStirWell(): Object3D {
  const root = new Group();
  root.name = 'StirWell';
  const disc = cylinder(0.16, 0.04, matWell, 28);
  disc.castShadow = false;
  root.add(named(disc, 'WellDisc'));
  return root;
}
