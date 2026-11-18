import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { box, cylinder, markFeedback, named, torus } from './kitchen-kit.js';

const matBase = createSceneMaterial({
  id: 'stab-base',
  model: 'physical',
  baseColor: '#2a2d33',
  roughness: 0.42,
  metalness: 0.38,
});

const matRing = createSceneMaterial({
  id: 'stab-ring',
  model: 'physical',
  baseColor: '#8b929c',
  roughness: 0.32,
  metalness: 0.72,
});

const matKnob = createSceneMaterial({
  id: 'stab-knob',
  model: 'physical',
  baseColor: '#2a7a88',
  roughness: 0.28,
  metalness: 0.22,
  emissive: '#3aa8c4',
  emissiveIntensity: 0.4,
  clearcoat: 0.3,
  clearcoatRoughness: 0.28,
});

const matCap = createSceneMaterial({
  id: 'stab-cap',
  model: 'physical',
  baseColor: '#14181c',
  roughness: 0.45,
  metalness: 0.2,
});

const matMark = createSceneMaterial({
  id: 'stab-mark',
  model: 'standard',
  baseColor: '#c8f4ff',
  roughness: 0.3,
  emissive: '#7ad4e8',
  emissiveIntensity: 0.6,
});

export function createGravityControl(): Object3D {
  const root = new Group();
  root.name = 'Stabilizer';

  const plate = box([0.09, 0.01, 0.09], matBase, 0.008);
  plate.position.set(0, 0.005, 0);
  root.add(named(plate, 'Plate'));

  const collar = cylinder(0.024, 0.016, matRing, 24);
  collar.position.set(0, 0.018, 0);
  root.add(named(collar, 'Collar'));

  const grip = torus(0.017, 0.003, matCap, 8, 20);
  grip.position.set(0, 0.036, 0);
  grip.rotation.x = Math.PI / 2;
  root.add(named(grip, 'Grip'));

  const knob = cylinder(0.016, 0.026, matKnob, 24);
  knob.position.set(0, 0.038, 0);
  root.add(named(markFeedback(knob), 'StabKnob'));

  const cap = cylinder(0.014, 0.006, matCap, 20);
  cap.position.set(0, 0.054, 0);
  root.add(named(cap, 'Cap'));

  const mark = box([0.004, 0.004, 0.012], matMark, 0.001);
  mark.position.set(0, 0.058, 0.006);
  root.add(named(mark, 'Indicator'));

  return root;
}
