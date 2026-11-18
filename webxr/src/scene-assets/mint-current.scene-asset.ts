import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import { grabAssist, markFeedback, named, sphere } from './kitchen-kit.js';

const matMint = createSceneMaterial({
  id: 'mint-body',
  model: 'physical',
  baseColor: '#7ec8b0',
  roughness: 0.28,
  metalness: 0.08,
  emissive: '#4aa888',
  emissiveIntensity: 0.45,
  clearcoat: 0.4,
  clearcoatRoughness: 0.15,
});

const matDeep = createSceneMaterial({
  id: 'mint-deep',
  model: 'standard',
  baseColor: '#4a8870',
  roughness: 0.35,
  emissive: '#2a6850',
  emissiveIntensity: 0.3,
});

const matFrost = createSceneMaterial({
  id: 'mint-frost',
  model: 'physical',
  baseColor: '#e8fff4',
  roughness: 0.16,
  metalness: 0.05,
  emissive: '#c8f4e0',
  emissiveIntensity: 0.7,
  clearcoat: 0.7,
  clearcoatRoughness: 0.08,
});

const matEye = createSceneMaterial({
  id: 'mint-eye',
  model: 'standard',
  baseColor: '#f8fff8',
  roughness: 0.25,
});

const matGlow = createSceneMaterial({
  id: 'mint-glow',
  model: 'standard',
  baseColor: '#8ee8c8',
  roughness: 0.5,
  emissive: '#6ad0b0',
  emissiveIntensity: 0.28,
  opacity: 0.14,
  side: 'double',
});

export function createMintCurrent(): Object3D {
  const root = new Group();
  root.name = 'MintCurrent';
  const motion = new Group();
  motion.name = 'Motion';
  root.add(motion);
  root.add(grabAssist());

  const glow = sphere(0.12, matGlow, 16);
  glow.position.set(0, 0.04, 0);
  glow.castShadow = false;
  motion.add(named(glow, 'Aura'));

  const sizes = [0.028, 0.024, 0.02, 0.016, 0.012];
  const mats = [matMint, matDeep, matMint, matDeep, matMint];
  for (let i = 0; i < sizes.length; i += 1) {
    const segment = sphere(sizes[i], mats[i], 18);
    segment.position.set(0, 0.04, 0.05 - i * 0.028);
    segment.scale.set(1, 0.75, 1.15);
    motion.add(named(segment, `Segment${i}`));
  }

  const head = sphere(0.03, matMint, 16);
  head.position.set(0, 0.045, 0.078);
  motion.add(named(markFeedback(head), 'Head'));

  const eye = sphere(0.006, matEye, 8);
  eye.position.set(0.01, 0.052, 0.1);
  motion.add(named(eye, 'Eye'));

  const trail = new Group();
  trail.name = 'FrostTrail';
  for (let i = 0; i < 5; i += 1) {
    const flake = sphere(0.008 - i * 0.001, matFrost, 8);
    flake.castShadow = false;
    flake.position.set((i % 2 === 0 ? 0.01 : -0.01), 0.02, -0.04 - i * 0.018);
    trail.add(named(flake, `Frost${i}`));
  }
  motion.add(trail);

  return root;
}
