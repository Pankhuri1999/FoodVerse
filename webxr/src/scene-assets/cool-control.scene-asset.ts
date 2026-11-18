import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { box, cylinder, markFeedback, named, torus } from './kitchen-kit.js';

const matBase = createSceneMaterial({
  id: 'cool-base',
  model: 'physical',
  baseColor: '#2a2d33',
  roughness: 0.42,
  metalness: 0.38,
});

const matRing = createSceneMaterial({
  id: 'cool-ring',
  model: 'physical',
  baseColor: '#8b929c',
  roughness: 0.32,
  metalness: 0.72,
});

const matKnob = createSceneMaterial({
  id: 'cool-knob',
  model: 'physical',
  baseColor: '#4aa8a8',
  roughness: 0.26,
  metalness: 0.16,
  emissive: '#3a98a8',
  emissiveIntensity: 0.28,
  clearcoat: 0.4,
  clearcoatRoughness: 0.22,
});

const matCap = createSceneMaterial({
  id: 'cool-cap',
  model: 'physical',
  baseColor: '#14181c',
  roughness: 0.45,
  metalness: 0.2,
});

const matMark = createSceneMaterial({
  id: 'cool-mark',
  model: 'standard',
  baseColor: '#c8f4f0',
  roughness: 0.32,
  emissive: '#8ee0e0',
  emissiveIntensity: 0.5,
});

export function createCoolControl(): Object3D {
  const root = new Group();
  root.name = 'CoolControl';

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
  root.add(named(markFeedback(knob), 'CoolKnob'));

  const cap = cylinder(0.014, 0.006, matCap, 20);
  cap.position.set(0, 0.054, 0);
  root.add(named(cap, 'Cap'));

  const mark = box([0.004, 0.004, 0.012], matMark, 0.001);
  mark.position.set(0, 0.058, 0.006);
  root.add(named(mark, 'Indicator'));

  return root;
}
