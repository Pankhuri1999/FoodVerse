import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { box, cylinder, named, sphere } from './kitchen-kit.js';

const matPlaque = createSceneMaterial({
  id: 'archive-plaque',
  model: 'physical',
  baseColor: '#2a2d33',
  roughness: 0.38,
  metalness: 0.28,
});

const matTrim = createSceneMaterial({
  id: 'archive-trim',
  model: 'standard',
  baseColor: '#c4a05a',
  roughness: 0.35,
  metalness: 0.45,
  emissive: '#c4a05a',
  emissiveIntensity: 0.18,
});

const matLocked = createSceneMaterial({
  id: 'archive-locked',
  model: 'standard',
  baseColor: '#3a3d44',
  roughness: 0.55,
  emissive: '#1a1d22',
  emissiveIntensity: 0.08,
});

const matEmber = createSceneMaterial({
  id: 'archive-ember',
  model: 'standard',
  baseColor: '#e07028',
  roughness: 0.35,
  emissive: '#c04010',
  emissiveIntensity: 0.7,
});

const matGrove = createSceneMaterial({
  id: 'archive-grove',
  model: 'standard',
  baseColor: '#4a9a58',
  roughness: 0.4,
  emissive: '#2a6a34',
  emissiveIntensity: 0.55,
});

const matMint = createSceneMaterial({
  id: 'archive-mint',
  model: 'standard',
  baseColor: '#7ec8b0',
  roughness: 0.32,
  emissive: '#3ec8e0',
  emissiveIntensity: 0.6,
});

const matGem = createSceneMaterial({
  id: 'archive-gem',
  model: 'physical',
  baseColor: '#e0b24a',
  roughness: 0.28,
  metalness: 0.2,
  emissive: '#e0b24a',
  emissiveIntensity: 0.45,
});

/** Seated Discovery Archive: recipes and ingredients light up as they are found. */
export function createDiscoveryArchive(): Object3D {
  const root = new Group();
  root.name = 'DiscoveryArchive';

  const plaque = box([0.22, 0.12, 0.02], matPlaque, 0.008);
  plaque.position.set(0, 0.06, 0);
  root.add(named(plaque, 'Plaque'));

  const rail = cylinder(0.006, 0.14, matTrim, 8);
  rail.position.set(0, 0.01, 0.012);
  rail.rotation.z = Math.PI / 2;
  root.add(named(rail, 'Rail'));

  const recipes = [
    ['RecipeEmber', matEmber, -0.06] as const,
    ['RecipeGrove', matGrove, 0] as const,
    ['RecipeMint', matMint, 0.06] as const,
  ];
  for (const [name, material, x] of recipes) {
    const token = sphere(0.016, material, 12);
    token.position.set(x, 0.082, 0.018);
    token.visible = false;
    root.add(named(token, name));
    const socket = sphere(0.014, matLocked, 10);
    socket.position.set(x, 0.082, 0.016);
    root.add(named(socket, `${name}Socket`));
  }

  const gems: Array<[string, number]> = [
    ['Ing-cosmic-fruit', -0.09],
    ['Ing-star-pepper', -0.054],
    ['Ing-space-leaves', -0.018],
    ['Ing-crystal-sugar', 0.018],
    ['Ing-chocolate', 0.054],
    ['Ing-mint-crystal', 0.09],
  ];
  for (const [name, x] of gems) {
    const gem = sphere(0.007, matGem, 8);
    gem.position.set(x, 0.038, 0.018);
    gem.visible = false;
    gem.castShadow = false;
    root.add(named(gem, name));
  }

  return root;
}
