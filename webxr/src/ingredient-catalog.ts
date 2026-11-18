import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import {
  box,
  cylinder,
  extrude,
  lathe,
  markFeedback,
  named,
  sphere,
  torus,
} from './scene-assets/kitchen-kit.js';

export const MIXER_BOWL = {
  localY: 0.76,
  radius: 0.155,
  yMin: 0.62,
  yMax: 0.94,
} as const;

export type IngredientId =
  | 'cosmic-fruit'
  | 'star-pepper'
  | 'space-leaves'
  | 'crystal-sugar'
  | 'chocolate'
  | 'mint-crystal';

export type HeatEffect = 'none' | 'sparks';

export type IngredientPhysics = {
  mass: number;
  drag: number;
  buoyancy: number;
  sticky: number;
};

export type IngredientDef = {
  id: IngredientId;
  label: string;
  idle: { bob: number; bobSpeed: number; spin: number };
  heat: HeatEffect;
  physics: IngredientPhysics;
  createVisual: () => Object3D;
};

const matFruitSkin = createSceneMaterial({
  id: 'ing-fruit-skin',
  model: 'physical',
  roughness: 0.38,
  metalness: 0.04,
  emissive: '#c43a12',
  emissiveIntensity: 0.22,
  clearcoat: 0.45,
  clearcoatRoughness: 0.28,
  transmission: 0.12,
  thickness: 0.04,
  opacity: 0.94,
  ior: 1.4,
  side: 'double',
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 21,
      bands: [
        { frequency: [5, 5], amplitude: 0.55 },
        { frequency: [22, 22], amplitude: 0.45 },
      ],
      ramp: [
        { at: 0, color: '#9a2a12' },
        { at: 0.45, color: '#d45a32' },
        { at: 1, color: '#f08a48' },
      ],
    },
  },
});

const matFruitCore = createSceneMaterial({
  id: 'ing-fruit-core',
  model: 'standard',
  baseColor: '#ffd27a',
  roughness: 0.22,
  metalness: 0.12,
  emissive: '#ffb040',
  emissiveIntensity: 1.55,
});

const matFruitGlow = createSceneMaterial({
  id: 'ing-fruit-glow',
  model: 'standard',
  baseColor: '#ff8a3a',
  roughness: 0.4,
  emissive: '#ff6a20',
  emissiveIntensity: 0.55,
  opacity: 0.18,
  side: 'double',
});

const matFruitGold = createSceneMaterial({
  id: 'ing-fruit-gold',
  model: 'physical',
  baseColor: '#e0b45a',
  roughness: 0.28,
  metalness: 0.7,
  emissive: '#c4983a',
  emissiveIntensity: 0.35,
  envMapIntensity: 1.6,
});

const matFruitStem = createSceneMaterial({
  id: 'ing-fruit-stem',
  model: 'standard',
  baseColor: '#3d5a38',
  roughness: 0.7,
});

const matPepperBody = createSceneMaterial({
  id: 'ing-pepper-body',
  model: 'physical',
  baseColor: '#e06a22',
  roughness: 0.34,
  metalness: 0.12,
  emissive: '#c04010',
  emissiveIntensity: 0.38,
  clearcoat: 0.3,
  clearcoatRoughness: 0.25,
});

const matPepperInner = createSceneMaterial({
  id: 'ing-pepper-inner',
  model: 'standard',
  baseColor: '#c43018',
  roughness: 0.3,
  emissive: '#ff4a18',
  emissiveIntensity: 0.7,
});

const matPepperTip = createSceneMaterial({
  id: 'ing-pepper-tip',
  model: 'physical',
  baseColor: '#f0a040',
  roughness: 0.28,
  metalness: 0.35,
  emissive: '#e07820',
  emissiveIntensity: 0.55,
});

const matSpark = createSceneMaterial({
  id: 'ing-pepper-spark',
  model: 'standard',
  baseColor: '#ffd080',
  roughness: 0.35,
  emissive: '#ffb040',
  emissiveIntensity: 1.8,
});

const matLeaf = createSceneMaterial({
  id: 'ing-leaf',
  model: 'physical',
  roughness: 0.62,
  metalness: 0.02,
  clearcoat: 0.22,
  clearcoatRoughness: 0.45,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 256],
      seed: 31,
      bands: [
        { frequency: [3, 18], amplitude: 0.7 },
        { frequency: [10, 48], amplitude: 0.3 },
      ],
      ramp: [
        { at: 0, color: '#1e4a28' },
        { at: 0.5, color: '#3d7a48' },
        { at: 1, color: '#6aaa58' },
      ],
    },
  },
});
const matLeafStem = createSceneMaterial({
  id: 'ing-leaf-stem',
  model: 'standard',
  baseColor: '#3a4a28',
  roughness: 0.82,
});
const matSugar = createSceneMaterial({
  id: 'ing-sugar',
  model: 'physical',
  baseColor: '#eef4fa',
  roughness: 0.12,
  metalness: 0.04,
  clearcoat: 0.85,
  clearcoatRoughness: 0.08,
  transmission: 0.22,
  thickness: 0.02,
  opacity: 0.92,
  ior: 1.5,
  envMapIntensity: 1.4,
});
const matSugarCore = createSceneMaterial({
  id: 'ing-sugar-core',
  model: 'standard',
  baseColor: '#f8fbff',
  roughness: 0.2,
  emissive: '#dce8f4',
  emissiveIntensity: 0.35,
});
const matChoc = createSceneMaterial({
  id: 'ing-choc',
  model: 'physical',
  roughness: 0.32,
  metalness: 0.08,
  clearcoat: 0.55,
  clearcoatRoughness: 0.22,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 128],
      seed: 41,
      bands: [
        { frequency: [8, 8], amplitude: 0.6 },
        { frequency: [24, 24], amplitude: 0.4 },
      ],
      ramp: [
        { at: 0, color: '#2a1810' },
        { at: 1, color: '#6a4430' },
      ],
    },
  },
});
const matChocFoil = createSceneMaterial({
  id: 'ing-choc-foil',
  model: 'physical',
  baseColor: '#c4a05a',
  roughness: 0.22,
  metalness: 0.78,
  envMapIntensity: 1.6,
});
const matMint = createSceneMaterial({
  id: 'ing-mint',
  model: 'physical',
  baseColor: '#7ec8b0',
  roughness: 0.16,
  metalness: 0.06,
  clearcoat: 0.7,
  clearcoatRoughness: 0.1,
  transmission: 0.18,
  thickness: 0.02,
  opacity: 0.9,
  ior: 1.48,
  emissive: '#4aa888',
  emissiveIntensity: 0.18,
});
const matMintInner = createSceneMaterial({
  id: 'ing-mint-inner',
  model: 'standard',
  baseColor: '#c8f4e4',
  roughness: 0.2,
  emissive: '#8ee8c8',
  emissiveIntensity: 0.55,
});

const matGrabAssist = createSceneMaterial({
  id: 'ing-grab-assist',
  model: 'standard',
  baseColor: '#3ec8e0',
  roughness: 1,
  opacity: 0.09,
  emissive: '#3ec8e0',
  emissiveIntensity: 0.28,
  side: 'double',
});

function identRing(mat: Parameters<typeof torus>[2]): Object3D {
  const ring = torus(0.042, 0.004, mat, 10, 22);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.003;
  ring.castShadow = false;
  return named(ring, 'IdentRing');
}

function motionRoot(
  name: string,
  children: Object3D[],
  ringMat: Parameters<typeof torus>[2],
): Object3D {
  const root = new Group();
  root.name = name;
  const motion = new Group();
  motion.name = 'Motion';
  for (const child of children) motion.add(child);
  motion.add(identRing(ringMat));
  root.add(motion);
  const assist = sphere(0.07, matGrabAssist, 8);
  assist.castShadow = false;
  assist.visible = true;
  assist.position.set(0, 0.03, 0);
  root.add(named(assist, 'GrabAssist'));
  return root;
}

function starPoints(outer: number, inner: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points;
}

function createCosmicFruitVisual(): Object3D {
  const body = lathe(
    [
      [0.001, 0],
      [0.022, 0.01],
      [0.036, 0.028],
      [0.032, 0.05],
      [0.012, 0.062],
      [0.001, 0.066],
    ],
    matFruitSkin,
    36,
  );
  named(markFeedback(body), 'FruitBody');

  const glow = sphere(0.042, matFruitGlow, 20);
  glow.position.set(0, 0.03, 0);
  glow.name = 'FruitGlow';
  glow.castShadow = false;

  const core = sphere(0.012, matFruitCore, 16);
  core.position.set(0, 0.03, 0);
  core.name = 'EnergyCore';
  core.castShadow = false;

  const goldBand = torus(0.028, 0.0024, matFruitGold, 8, 24);
  goldBand.position.set(0, 0.03, 0);
  goldBand.rotation.x = Math.PI / 2;
  named(goldBand, 'GoldBand');

  const fleckA = sphere(0.0045, matFruitGold, 10);
  fleckA.position.set(0.02, 0.04, 0.016);
  named(fleckA, 'GoldFleckA');
  const fleckB = sphere(0.0036, matFruitGold, 10);
  fleckB.position.set(-0.018, 0.022, 0.02);
  named(fleckB, 'GoldFleckB');

  const stem = lathe(
    [
      [0.001, 0],
      [0.004, 0.002],
      [0.003, 0.014],
    ],
    matFruitStem,
    8,
  );
  stem.position.set(0, 0.064, 0);
  named(stem, 'Stem');

  const leaf = lathe(
    [
      [0.001, 0],
      [0.01, 0.004],
      [0.004, 0.02],
      [0.001, 0.026],
    ],
    matFruitStem,
    10,
  );
  leaf.position.set(0.01, 0.07, 0);
  leaf.rotation.z = -0.7;
  leaf.scale.set(1, 1, 0.22);
  named(leaf, 'Leaf');

  return motionRoot('CosmicFruit', [glow, body, core, goldBand, fleckA, fleckB, stem, leaf], matFruitGold);
}

function createStarPepperVisual(): Object3D {
  const chili = lathe(
    [
      [0.001, 0],
      [0.012, 0.006],
      [0.016, 0.024],
      [0.012, 0.046],
      [0.005, 0.06],
      [0.001, 0.066],
    ],
    matPepperBody,
    22,
  );
  named(chili, 'PepperBody');

  const body = extrude(starPoints(0.038, 0.016), 0.012, matPepperBody, {
    size: 0.0025,
    thickness: 0.002,
  });
  body.position.set(0, 0.05, -0.006);
  named(markFeedback(body), 'PepperStar');

  const inner = extrude(starPoints(0.022, 0.009), 0.014, matPepperInner, {
    size: 0.0015,
    thickness: 0.0012,
  });
  inner.position.set(0, 0.05, -0.004);
  named(inner, 'PepperInner');

  const core = sphere(0.008, matPepperTip, 12);
  core.position.set(0, 0.05, 0.008);
  core.name = 'EnergyCore';
  core.castShadow = false;

  const sparks = new Group();
  sparks.name = 'HeatSparks';
  sparks.visible = false;
  for (let i = 0; i < 4; i += 1) {
    const spark = sphere(i % 2 === 0 ? 0.0028 : 0.0022, matSpark, 8);
    spark.castShadow = false;
    spark.userData.orbit = {
      radius: 0.042 + (i % 3) * 0.006,
      speed: 2.4 + i * 0.35,
      phase: i * 0.8,
      height: 0.05,
    };
    sparks.add(named(spark, `Spark${i}`));
  }

  return motionRoot('StarPepper', [chili, body, inner, core, sparks], matPepperTip);
}

function createSpaceLeavesVisual(): Object3D {
  const stem = cylinder(0.003, 0.05, matLeafStem, 8);
  stem.position.set(0, 0.025, 0);
  named(stem, 'Stem');

  const blades: Object3D[] = [stem];
  const offsets: Array<[number, number, number]> = [
    [-0.012, 0.028, 0.004],
    [0.012, 0.032, -0.002],
    [0, 0.04, 0.01],
  ];
  const tilts = [-0.55, 0.6, 0.15];
  for (let i = 0; i < offsets.length; i += 1) {
    const blade = lathe(
      [
        [0.001, 0],
        [0.016, 0.008],
        [0.01, 0.03],
        [0.001, 0.048],
      ],
      matLeaf,
      12,
    );
    blade.position.set(...offsets[i]);
    blade.rotation.z = tilts[i];
    blade.scale.set(1, 1, 0.18);
    blades.push(named(i === 0 ? markFeedback(blade) : blade, `Blade${i}`));
  }
  return motionRoot('SpaceLeaves', blades, matLeaf);
}

function createCrystalSugarVisual(): Object3D {
  const main = lathe(
    [
      [0.001, 0],
      [0.018, 0.01],
      [0.012, 0.034],
      [0.001, 0.062],
    ],
    matSugar,
    6,
  );
  named(markFeedback(main), 'CrystalA');
  const side = lathe(
    [
      [0.001, 0],
      [0.01, 0.006],
      [0.001, 0.038],
    ],
    matSugar,
    6,
  );
  side.position.set(0.014, 0.004, 0.006);
  side.rotation.z = 0.35;
  named(side, 'CrystalB');
  const sideB = lathe(
    [
      [0.001, 0],
      [0.008, 0.005],
      [0.001, 0.028],
    ],
    matSugar,
    6,
  );
  sideB.position.set(-0.012, 0.002, -0.006);
  sideB.rotation.z = -0.4;
  named(sideB, 'CrystalC');
  const core = sphere(0.006, matSugarCore, 10);
  core.position.set(0, 0.02, 0);
  core.castShadow = false;
  named(core, 'SugarCore');
  return motionRoot('CrystalSugar', [main, side, sideB, core], matSugarCore);
}

function createChocolateVisual(): Object3D {
  const bar = box([0.056, 0.014, 0.036], matChoc, 0.003);
  named(markFeedback(bar), 'Bar');
  const squares: Object3D[] = [bar];
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const square = box([0.014, 0.005, 0.013], matChoc, 0.002);
      square.position.set(-0.018 + col * 0.018, 0.01, -0.008 + row * 0.016);
      squares.push(named(square, `Square${row}${col}`));
    }
  }
  const foil = box([0.06, 0.004, 0.008], matChocFoil, 0.001);
  foil.position.set(0, 0.002, 0.02);
  squares.push(named(foil, 'Foil'));
  return motionRoot('Chocolate', squares, matChocFoil);
}

function createMintCrystalVisual(): Object3D {
  const main = lathe(
    [
      [0.001, 0],
      [0.016, 0.008],
      [0.01, 0.032],
      [0.001, 0.06],
    ],
    matMint,
    6,
  );
  named(markFeedback(main), 'MintA');
  const shard = lathe(
    [
      [0.001, 0],
      [0.009, 0.006],
      [0.001, 0.036],
    ],
    matMint,
    6,
  );
  shard.position.set(0.012, 0.004, 0.004);
  shard.rotation.z = 0.45;
  named(shard, 'MintB');
  const shardB = lathe(
    [
      [0.001, 0],
      [0.007, 0.004],
      [0.001, 0.026],
    ],
    matMint,
    6,
  );
  shardB.position.set(-0.01, 0.002, -0.006);
  shardB.rotation.z = -0.5;
  named(shardB, 'MintC');
  const inner = sphere(0.006, matMintInner, 10);
  inner.position.set(0, 0.018, 0);
  inner.castShadow = false;
  named(inner, 'MintCore');
  return motionRoot('MintCrystal', [main, shard, shardB, inner], matMintInner);
}

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  'cosmic-fruit': {
    id: 'cosmic-fruit',
    label: 'Cosmic Fruit',
    idle: { bob: 0.014, bobSpeed: 1.7, spin: 0.42 },
    heat: 'none',
    physics: { mass: 0.7, drag: 0.35, buoyancy: 0.9, sticky: 0.1 },
    createVisual: createCosmicFruitVisual,
  },
  'star-pepper': {
    id: 'star-pepper',
    label: 'Star Pepper',
    idle: { bob: 0.012, bobSpeed: 2.2, spin: 0.85 },
    heat: 'sparks',
    physics: { mass: 0.55, drag: 0.3, buoyancy: 0.55, sticky: 0.05 },
    createVisual: createStarPepperVisual,
  },
  'space-leaves': {
    id: 'space-leaves',
    label: 'Space Leaves',
    idle: { bob: 0.011, bobSpeed: 1.5, spin: 0.32 },
    heat: 'none',
    physics: { mass: 0.22, drag: 0.92, buoyancy: 1.15, sticky: 0.04 },
    createVisual: createSpaceLeavesVisual,
  },
  'crystal-sugar': {
    id: 'crystal-sugar',
    label: 'Crystal Sugar',
    idle: { bob: 0.01, bobSpeed: 1.9, spin: 0.5 },
    heat: 'none',
    physics: { mass: 1.25, drag: 0.18, buoyancy: 0.12, sticky: 0 },
    createVisual: createCrystalSugarVisual,
  },
  chocolate: {
    id: 'chocolate',
    label: 'Chocolate',
    idle: { bob: 0.008, bobSpeed: 1.2, spin: 0.18 },
    heat: 'none',
    physics: { mass: 0.95, drag: 0.72, buoyancy: 0.22, sticky: 0.88 },
    createVisual: createChocolateVisual,
  },
  'mint-crystal': {
    id: 'mint-crystal',
    label: 'Mint Crystal',
    idle: { bob: 0.011, bobSpeed: 1.8, spin: 0.55 },
    heat: 'none',
    physics: { mass: 0.8, drag: 0.28, buoyancy: 0.42, sticky: 0.12 },
    createVisual: createMintCrystalVisual,
  },
};

export function getIngredientDef(id: string | undefined): IngredientDef | undefined {
  if (!id) return undefined;
  return INGREDIENTS[id as IngredientId];
}

export function mixerContentsReady(ids: Iterable<string>): boolean {
  const set = new Set(ids);
  return set.has('cosmic-fruit') && set.has('star-pepper');
}
