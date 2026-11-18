import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { box, cone, cylinder, grabAssist, lathe, markFeedback, named } from './kitchen-kit.js';

const matWafer = createSceneMaterial({
  id: 'build-wafer',
  model: 'standard',
  roughness: 0.62,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 128],
      seed: 16,
      bands: [
        { frequency: [8, 8], amplitude: 0.6 },
        { frequency: [24, 24], amplitude: 0.4 },
      ],
      ramp: [
        { at: 0, color: '#a06a38' },
        { at: 1, color: '#e0b070' },
      ],
    },
  },
});

const matCocoa = createSceneMaterial({
  id: 'build-cocoa',
  model: 'physical',
  roughness: 0.26,
  metalness: 0.08,
  clearcoat: 0.5,
  clearcoatRoughness: 0.2,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 128],
      seed: 42,
      bands: [
        { frequency: [10, 10], amplitude: 0.65 },
        { frequency: [28, 28], amplitude: 0.35 },
      ],
      ramp: [
        { at: 0, color: '#2a140c' },
        { at: 1, color: '#6a3a20' },
      ],
    },
  },
});

const matLeaf = createSceneMaterial({
  id: 'build-leaf',
  model: 'physical',
  roughness: 0.58,
  metalness: 0.02,
  emissive: '#2a6a34',
  emissiveIntensity: 0.12,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 256],
      seed: 33,
      bands: [
        { frequency: [3, 18], amplitude: 0.7 },
        { frequency: [10, 48], amplitude: 0.3 },
      ],
      ramp: [
        { at: 0, color: '#1e4a28' },
        { at: 1, color: '#5aaa58' },
      ],
    },
  },
});

export function createCookieWafer(): Object3D {
  const root = new Group();
  root.name = 'CookieWafer';
  const motion = new Group();
  motion.name = 'Motion';
  const plank = box([0.1, 0.016, 0.04], matWafer, 0.006);
  motion.add(named(plank, 'Plank'));
  const ridgeA = box([0.092, 0.004, 0.006], matWafer, 0.002);
  ridgeA.position.set(0, 0.01, -0.01);
  motion.add(named(ridgeA, 'RidgeA'));
  const ridgeB = box([0.092, 0.004, 0.006], matWafer, 0.002);
  ridgeB.position.set(0, 0.01, 0.01);
  motion.add(named(ridgeB, 'RidgeB'));
  motion.add(grabAssist(0.08));
  root.add(motion);
  return markFeedback(root);
}

export function createChocolateRiver(): Object3D {
  const root = new Group();
  root.name = 'ChocolateRiverBit';
  const motion = new Group();
  motion.name = 'Motion';
  const slab = box([0.08, 0.014, 0.05], matCocoa, 0.01);
  motion.add(named(slab, 'Slab'));
  const squareA = box([0.032, 0.006, 0.02], matCocoa, 0.003);
  squareA.position.set(-0.018, 0.01, 0);
  motion.add(named(squareA, 'SquareA'));
  const squareB = box([0.032, 0.006, 0.02], matCocoa, 0.003);
  squareB.position.set(0.018, 0.01, 0);
  motion.add(named(squareB, 'SquareB'));
  motion.add(grabAssist(0.08));
  root.add(motion);
  return markFeedback(root);
}

export function createLeafBundle(): Object3D {
  const root = new Group();
  root.name = 'LeafBundle';
  const motion = new Group();
  motion.name = 'Motion';
  const stem = cylinder(0.004, 0.05, matLeaf, 8);
  stem.position.set(0, 0.02, 0);
  motion.add(named(stem, 'Stem'));
  const bladeL = lathe(
    [
      [0.001, 0],
      [0.018, 0.01],
      [0.008, 0.04],
      [0.001, 0.055],
    ],
    matLeaf,
    10,
  );
  bladeL.position.set(-0.01, 0.03, 0);
  bladeL.rotation.z = -0.45;
  bladeL.scale.set(1, 1, 0.2);
  motion.add(named(bladeL, 'BladeL'));
  const bladeR = lathe(
    [
      [0.001, 0],
      [0.016, 0.008],
      [0.007, 0.036],
      [0.001, 0.05],
    ],
    matLeaf,
    10,
  );
  bladeR.position.set(0.012, 0.034, 0);
  bladeR.rotation.z = 0.5;
  bladeR.scale.set(1, 1, 0.2);
  motion.add(named(bladeR, 'BladeR'));
  const canopy = cone(0.018, 0.03, matLeaf, 8);
  canopy.position.set(0, 0.058, 0);
  motion.add(named(canopy, 'Canopy'));
  motion.add(grabAssist(0.08));
  root.add(motion);
  return markFeedback(root);
}
