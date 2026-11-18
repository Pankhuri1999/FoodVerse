import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { box, cylinder, markFeedback, named, torus } from './kitchen-kit.js';

const matBase = createSceneMaterial({
  id: 'heat-base',
  model: 'physical',
  baseColor: '#2a2d33',
  roughness: 0.42,
  metalness: 0.38,
});

const matRing = createSceneMaterial({
  id: 'heat-ring',
  model: 'physical',
  baseColor: '#8b929c',
  roughness: 0.32,
  metalness: 0.72,
});

const matKnob = createSceneMaterial({
  id: 'heat-knob',
  model: 'physical',
  baseColor: '#c24a22',
  roughness: 0.28,
  metalness: 0.18,
  emissive: '#e06020',
  emissiveIntensity: 0.28,
  clearcoat: 0.35,
  clearcoatRoughness: 0.3,
});

const matCap = createSceneMaterial({
  id: 'heat-cap',
  model: 'physical',
  baseColor: '#1c1614',
  roughness: 0.45,
  metalness: 0.2,
});

const matMark = createSceneMaterial({
  id: 'heat-mark',
  model: 'standard',
  baseColor: '#f4d080',
  roughness: 0.35,
  emissive: '#f0a040',
  emissiveIntensity: 0.55,
});

export function createHeatControl(): Object3D {
  const root = new Group();
  root.name = 'HeatControl';

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
  root.add(named(markFeedback(knob), 'HeatKnob'));

  const cap = cylinder(0.014, 0.006, matCap, 20);
  cap.position.set(0, 0.054, 0);
  root.add(named(cap, 'Cap'));

  const mark = box([0.004, 0.004, 0.012], matMark, 0.001);
  mark.position.set(0, 0.058, 0.006);
  root.add(named(mark, 'Indicator'));

  return root;
}
