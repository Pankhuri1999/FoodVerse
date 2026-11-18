import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { cone, cylinder, grabAssist, markFeedback, named, sphere } from './kitchen-kit.js';

const matBody = createSceneMaterial({
  id: 'dragon-body',
  model: 'standard',
  baseColor: '#e07028',
  roughness: 0.38,
  metalness: 0.12,
  emissive: '#c04010',
  emissiveIntensity: 0.7,
});

const matWing = createSceneMaterial({
  id: 'dragon-wing',
  model: 'standard',
  baseColor: '#f0a040',
  roughness: 0.42,
  emissive: '#d06818',
  emissiveIntensity: 0.45,
});

const matHorn = createSceneMaterial({
  id: 'dragon-horn',
  model: 'physical',
  baseColor: '#f0d090',
  roughness: 0.28,
  metalness: 0.25,
  emissive: '#e0a040',
  emissiveIntensity: 0.35,
});

const matSnout = createSceneMaterial({
  id: 'dragon-snout',
  model: 'standard',
  baseColor: '#ff8a3a',
  roughness: 0.35,
  emissive: '#ff6a20',
  emissiveIntensity: 0.55,
});

const matEye = createSceneMaterial({
  id: 'dragon-eye',
  model: 'standard',
  baseColor: '#1a1420',
  roughness: 0.25,
});

const matSpark = createSceneMaterial({
  id: 'dragon-spark',
  model: 'standard',
  baseColor: '#ffd080',
  roughness: 0.3,
  emissive: '#ffb040',
  emissiveIntensity: 1.8,
});

const matGlow = createSceneMaterial({
  id: 'dragon-glow',
  model: 'standard',
  baseColor: '#ff7a30',
  roughness: 0.5,
  emissive: '#ff5a18',
  emissiveIntensity: 0.4,
  opacity: 0.16,
  side: 'double',
});

export function createEmberDragon(): Object3D {
  const root = new Group();
  root.name = 'EmberDragon';

  const motion = new Group();
  motion.name = 'Motion';
  root.add(motion);
  root.add(grabAssist());

  const glow = sphere(0.11, matGlow, 16);
  glow.position.set(0, 0.05, 0);
  glow.castShadow = false;
  motion.add(named(glow, 'Aura'));

  const body = sphere(0.042, matBody, 20);
  body.scale.set(0.9, 1.15, 0.85);
  body.position.set(0, 0.04, 0);
  motion.add(named(markFeedback(body), 'Body'));

  const head = sphere(0.026, matBody, 16);
  head.position.set(0, 0.092, 0.018);
  motion.add(named(head, 'Head'));

  const snout = cone(0.012, 0.03, matSnout, 10);
  snout.position.set(0, 0.088, 0.042);
  snout.rotation.x = Math.PI / 2;
  motion.add(named(snout, 'Snout'));

  const eyeL = sphere(0.005, matEye, 8);
  eyeL.position.set(-0.01, 0.1, 0.036);
  motion.add(named(eyeL, 'EyeL'));
  const eyeR = sphere(0.005, matEye, 8);
  eyeR.position.set(0.01, 0.1, 0.036);
  motion.add(named(eyeR, 'EyeR'));

  const hornL = cone(0.006, 0.028, matHorn, 8);
  hornL.position.set(-0.012, 0.118, 0.01);
  hornL.rotation.z = 0.25;
  motion.add(named(hornL, 'HornL'));
  const hornR = cone(0.006, 0.028, matHorn, 8);
  hornR.position.set(0.012, 0.118, 0.01);
  hornR.rotation.z = -0.25;
  motion.add(named(hornR, 'HornR'));

  const neck = cylinder(0.012, 0.03, matBody, 10);
  neck.position.set(0, 0.07, 0.01);
  neck.rotation.x = 0.4;
  motion.add(named(neck, 'Neck'));

  const belly = sphere(0.028, matSnout, 14);
  belly.position.set(0, 0.028, 0.008);
  belly.scale.set(0.85, 0.7, 1.05);
  motion.add(named(belly, 'Belly'));

  const wingL = cone(0.028, 0.07, matWing, 8);
  wingL.position.set(-0.055, 0.055, -0.004);
  wingL.rotation.z = 1.25;
  wingL.scale.set(0.35, 1, 1);
  motion.add(named(wingL, 'WingL'));
  const wingR = cone(0.028, 0.07, matWing, 8);
  wingR.position.set(0.055, 0.055, -0.004);
  wingR.rotation.z = -1.25;
  wingR.scale.set(0.35, 1, 1);
  motion.add(named(wingR, 'WingR'));

  const tail = cylinder(0.008, 0.07, matBody, 8);
  tail.position.set(0, 0.02, -0.055);
  tail.rotation.x = 1.05;
  motion.add(named(tail, 'Tail'));

  const tip = sphere(0.01, matSpark, 10);
  tip.position.set(0, -0.006, -0.09);
  tip.castShadow = false;
  motion.add(named(tip, 'TailSpark'));

  const sparkA = sphere(0.004, matSpark, 8);
  sparkA.position.set(0.01, 0.004, -0.1);
  sparkA.castShadow = false;
  motion.add(named(sparkA, 'TailSparkA'));
  const sparkB = sphere(0.003, matSpark, 8);
  sparkB.position.set(-0.008, -0.01, -0.108);
  sparkB.castShadow = false;
  motion.add(named(sparkB, 'TailSparkB'));

  return root;
}
