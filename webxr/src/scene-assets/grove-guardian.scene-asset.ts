import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { cone, cylinder, grabAssist, markFeedback, named, sphere } from './kitchen-kit.js';

const matLeaf = createSceneMaterial({
  id: 'grove-leaf',
  model: 'standard',
  baseColor: '#4a9a58',
  roughness: 0.62,
  emissive: '#2a6a34',
  emissiveIntensity: 0.28,
});

const matCrown = createSceneMaterial({
  id: 'grove-crown',
  model: 'physical',
  baseColor: '#dce8a8',
  roughness: 0.18,
  metalness: 0.12,
  emissive: '#c8d878',
  emissiveIntensity: 0.55,
  clearcoat: 0.6,
  clearcoatRoughness: 0.12,
});

const matBark = createSceneMaterial({
  id: 'grove-bark',
  model: 'standard',
  baseColor: '#4a3828',
  roughness: 0.82,
});

const matEye = createSceneMaterial({
  id: 'grove-eye',
  model: 'standard',
  baseColor: '#f4fff4',
  roughness: 0.3,
});

const matGlow = createSceneMaterial({
  id: 'grove-glow',
  model: 'standard',
  baseColor: '#78c888',
  roughness: 0.5,
  emissive: '#4a9a58',
  emissiveIntensity: 0.3,
  opacity: 0.14,
  side: 'double',
});

export function createGroveGuardian(): Object3D {
  const root = new Group();
  root.name = 'GroveGuardian';
  const motion = new Group();
  motion.name = 'Motion';
  root.add(motion);
  root.add(grabAssist());

  const glow = sphere(0.11, matGlow, 16);
  glow.position.set(0, 0.05, 0);
  glow.castShadow = false;
  motion.add(named(glow, 'Aura'));

  const body = sphere(0.046, matLeaf, 20);
  body.scale.set(0.95, 1.2, 0.85);
  body.position.set(0, 0.05, 0);
  motion.add(named(markFeedback(body), 'Body'));

  const lobeL = sphere(0.024, matLeaf, 14);
  lobeL.position.set(-0.042, 0.048, 0);
  lobeL.scale.set(0.8, 1.15, 0.7);
  motion.add(named(lobeL, 'LeafL'));
  const lobeR = sphere(0.024, matLeaf, 14);
  lobeR.position.set(0.042, 0.048, 0);
  lobeR.scale.set(0.8, 1.15, 0.7);
  motion.add(named(lobeR, 'LeafR'));
  const lobeF = sphere(0.02, matLeaf, 12);
  lobeF.position.set(0, 0.07, 0.028);
  lobeF.scale.set(0.9, 0.7, 0.55);
  motion.add(named(lobeF, 'LeafF'));
  const lobeB = sphere(0.02, matLeaf, 12);
  lobeB.position.set(0, 0.06, -0.03);
  lobeB.scale.set(0.85, 0.75, 0.55);
  motion.add(named(lobeB, 'LeafB'));

  const crown = cone(0.03, 0.05, matCrown, 5);
  crown.position.set(0, 0.12, 0);
  motion.add(named(crown, 'CrystalCrown'));

  const eyeL = sphere(0.006, matEye, 8);
  eyeL.position.set(-0.012, 0.062, 0.038);
  motion.add(named(eyeL, 'EyeL'));
  const eyeR = sphere(0.006, matEye, 8);
  eyeR.position.set(0.012, 0.062, 0.038);
  motion.add(named(eyeR, 'EyeR'));

  const smile = cylinder(0.012, 0.004, matBark, 12);
  smile.position.set(0, 0.04, 0.042);
  smile.rotation.x = Math.PI / 2;
  smile.scale.set(1.4, 1, 0.45);
  motion.add(named(smile, 'BarkSmile'));

  const rootL = cone(0.01, 0.04, matBark, 6);
  rootL.position.set(-0.016, 0.002, 0.008);
  rootL.rotation.z = 0.45;
  rootL.rotation.x = Math.PI;
  motion.add(named(rootL, 'RootL'));
  const rootR = cone(0.01, 0.04, matBark, 6);
  rootR.position.set(0.016, 0.002, 0.008);
  rootR.rotation.z = -0.45;
  rootR.rotation.x = Math.PI;
  motion.add(named(rootR, 'RootR'));

  return root;
}
