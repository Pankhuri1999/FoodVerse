import {
  Color,
  createSceneMaterial,
  createScenePrimitiveObject,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from '@iwsdk/core';

export type KitMaterial = Parameters<typeof createScenePrimitiveObject>[1];

export const matGraphite = createSceneMaterial({
  id: 'cabin-graphite',
  model: 'physical',
  roughness: 0.5,
  metalness: 0.12,
  clearcoat: 0.18,
  clearcoatRoughness: 0.35,
  envMapIntensity: 1.15,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 11,
      bands: [
        { frequency: [5, 5], amplitude: 0.65 },
        { frequency: [22, 22], amplitude: 0.35 },
      ],
      ramp: [
        { at: 0, color: '#1f2227' },
        { at: 1, color: '#3a3f46' },
      ],
    },
  },
});

export const matTitanium = createSceneMaterial({
  id: 'cabin-titanium',
  model: 'physical',
  baseColor: '#8b929c',
  roughness: 0.28,
  metalness: 0.72,
  clearcoat: 0.18,
  clearcoatRoughness: 0.3,
  envMapIntensity: 1.8,
});

export const matNavy = createSceneMaterial({
  id: 'cabin-navy',
  model: 'standard',
  baseColor: '#141821',
  roughness: 0.78,
});

export const matGold = createSceneMaterial({
  id: 'cabin-gold',
  model: 'physical',
  baseColor: '#e0b45a',
  roughness: 0.28,
  metalness: 0.58,
  emissive: '#c4983a',
  emissiveIntensity: 0.12,
  envMapIntensity: 1.75,
});

export const matCyan = createSceneMaterial({
  id: 'cabin-cyan-trim',
  model: 'standard',
  baseColor: '#3aa8c4',
  roughness: 0.35,
});

export const matGlass = createSceneMaterial({
  id: 'cabin-glass',
  model: 'physical',
  baseColor: '#9eb4c8',
  roughness: 0.05,
  metalness: 0.04,
  transmission: 0.78,
  thickness: 0.05,
  opacity: 0.22,
  ior: 1.45,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  envMapIntensity: 2.2,
  side: 'double',
});

export const matHullInner = createSceneMaterial({
  id: 'cabin-hull-inner',
  model: 'physical',
  baseColor: '#1c1410',
  roughness: 0.52,
  metalness: 0.22,
  clearcoat: 0.14,
  clearcoatRoughness: 0.46,
  envMapIntensity: 0.85,
});

export const matChocolateHull = createSceneMaterial({
  id: 'cabin-chocolate',
  model: 'physical',
  baseColor: '#4a2c18',
  roughness: 0.4,
  metalness: 0.1,
  clearcoat: 0.28,
  clearcoatRoughness: 0.32,
  envMapIntensity: 1.05,
});

export const matMintGlow = createSceneMaterial({
  id: 'cabin-mint-glow',
  model: 'standard',
  baseColor: '#7ec8b0',
  roughness: 0.38,
  emissive: '#4aa888',
  emissiveIntensity: 0.55,
});

export const matSkylight = createSceneMaterial({
  id: 'cabin-skylight',
  model: 'physical',
  baseColor: '#8aa0b8',
  roughness: 0.06,
  metalness: 0.02,
  transmission: 0.92,
  thickness: 0.04,
  opacity: 0.08,
  ior: 1.45,
  clearcoat: 0.8,
  clearcoatRoughness: 0.06,
  side: 'double',
});

export const matSteel = createSceneMaterial({
  id: 'cabin-steel',
  model: 'physical',
  roughness: 0.22,
  metalness: 0.88,
  clearcoat: 0.12,
  clearcoatRoughness: 0.38,
  envMapIntensity: 1.9,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 64],
      seed: 3,
      bands: [
        { frequency: [70, 3], amplitude: 0.8 },
        { frequency: [140, 8], amplitude: 0.2 },
      ],
      ramp: [
        { at: 0, color: '#8e979f' },
        { at: 1, color: '#d2dae2' },
      ],
    },
  },
});

export const matWood = createSceneMaterial({
  id: 'cabin-wood',
  model: 'physical',
  roughness: 0.62,
  metalness: 0.04,
  clearcoat: 0.18,
  clearcoatRoughness: 0.45,
  envMapIntensity: 0.7,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 512],
      seed: 7,
      bands: [
        { frequency: [2, 40], amplitude: 0.75 },
        { frequency: [6, 90], amplitude: 0.25 },
      ],
      ramp: [
        { at: 0, color: '#3d2616' },
        { at: 0.48, color: '#6a4328' },
        { at: 1, color: '#8a5a34' },
      ],
    },
    bump: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 256],
      seed: 8,
      bands: [
        { frequency: [4, 48], amplitude: 0.7 },
        { frequency: [12, 96], amplitude: 0.3 },
      ],
      scale: 0.16,
    },
  },
});

export const matCeramic = createSceneMaterial({
  id: 'cabin-ceramic',
  model: 'physical',
  roughness: 0.22,
  metalness: 0.02,
  clearcoat: 0.7,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.1,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 19,
      bands: [
        { frequency: [8, 8], amplitude: 0.55 },
        { frequency: [36, 36], amplitude: 0.45 },
      ],
      ramp: [
        { at: 0, color: '#e4d6c4' },
        { at: 1, color: '#f6eee2' },
      ],
    },
  },
});

export const matCeramicGlaze = createSceneMaterial({
  id: 'cabin-ceramic-glaze',
  model: 'physical',
  baseColor: '#f7f0e6',
  roughness: 0.08,
  metalness: 0.02,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  envMapIntensity: 1.4,
});

export const matWarmSteel = createSceneMaterial({
  id: 'cabin-warm-steel',
  model: 'physical',
  baseColor: '#9aa09a',
  roughness: 0.34,
  metalness: 0.72,
  envMapIntensity: 1.5,
});

export const matRubber = createSceneMaterial({
  id: 'cabin-rubber',
  model: 'standard',
  baseColor: '#1a1c1e',
  roughness: 0.92,
});

export const matCarbon = createSceneMaterial({
  id: 'cabin-carbon',
  model: 'physical',
  roughness: 0.38,
  metalness: 0.22,
  clearcoat: 0.45,
  clearcoatRoughness: 0.28,
  envMapIntensity: 1.05,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 128],
      seed: 27,
      bands: [
        { frequency: [18, 4], amplitude: 0.55 },
        { frequency: [48, 12], amplitude: 0.45 },
      ],
      ramp: [
        { at: 0, color: '#0c0e12' },
        { at: 1, color: '#2a3038' },
      ],
    },
  },
});

export const matAnodized = createSceneMaterial({
  id: 'cabin-anodized',
  model: 'physical',
  baseColor: '#1a1614',
  roughness: 0.3,
  metalness: 0.52,
  clearcoat: 0.4,
  clearcoatRoughness: 0.24,
  envMapIntensity: 1.55,
});

export const matScreen = createSceneMaterial({
  id: 'cabin-screen',
  model: 'standard',
  baseColor: '#143848',
  roughness: 0.18,
  emissive: '#4ecfe4',
  emissiveIntensity: 0.62,
});

export const matScreenAmber = createSceneMaterial({
  id: 'cabin-screen-amber',
  model: 'standard',
  baseColor: '#3a2a12',
  roughness: 0.2,
  emissive: '#e0a040',
  emissiveIntensity: 0.52,
});

export const matNeonCyan = createSceneMaterial({
  id: 'cabin-neon-cyan',
  model: 'standard',
  baseColor: '#3ec8e0',
  roughness: 0.32,
  emissive: '#3ec8e0',
  emissiveIntensity: 0.82,
});

export const matNeonMagenta = createSceneMaterial({
  id: 'cabin-neon-magenta',
  model: 'standard',
  baseColor: '#c45ae0',
  roughness: 0.28,
  emissive: '#d060f0',
  emissiveIntensity: 1.05,
});

export const matWarmCove = createSceneMaterial({
  id: 'cabin-warm-cove',
  model: 'standard',
  baseColor: '#f0c48a',
  roughness: 0.42,
  emissive: '#f0b070',
  emissiveIntensity: 0.9,
});

export const matCookie = createSceneMaterial({
  id: 'kingdom-cookie',
  model: 'standard',
  roughness: 0.68,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 14,
      bands: [
        { frequency: [6, 6], amplitude: 0.55 },
        { frequency: [28, 28], amplitude: 0.45 },
      ],
      ramp: [
        { at: 0, color: '#8a5428' },
        { at: 0.45, color: '#c48a48' },
        { at: 1, color: '#e0b070' },
      ],
    },
    bump: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 15,
      bands: [
        { frequency: [18, 18], amplitude: 0.7 },
        { frequency: [48, 48], amplitude: 0.3 },
      ],
      scale: 0.22,
    },
  },
});

export const matIce = createSceneMaterial({
  id: 'kingdom-ice',
  model: 'physical',
  baseColor: '#9ec8e6',
  roughness: 0.18,
  metalness: 0.12,
  clearcoat: 0.6,
  clearcoatRoughness: 0.12,
});

export const matSoil = createSceneMaterial({
  id: 'kingdom-soil',
  model: 'standard',
  baseColor: '#4a3828',
  roughness: 0.9,
});

export const matWater = createSceneMaterial({
  id: 'kingdom-water',
  model: 'physical',
  baseColor: '#2a5a88',
  roughness: 0.22,
  metalness: 0.08,
});

export const matGrove = createSceneMaterial({
  id: 'kingdom-grove',
  model: 'standard',
  baseColor: '#3d7a48',
  roughness: 0.7,
});

const matGrabAssist = createSceneMaterial({
  id: 'kit-grab-assist',
  model: 'standard',
  baseColor: '#3ec8e0',
  roughness: 1,
  opacity: 0.01,
  side: 'double',
});

export function named(node: Object3D, name: string): Object3D {
  node.name = name;
  return node;
}

export function grabAssist(radius = 0.08): Object3D {
  const node = sphere(radius, matGrabAssist, 8);
  node.castShadow = false;
  node.visible = false;
  return named(node, 'GrabAssist');
}

export function box(
  size: [number, number, number],
  material: KitMaterial,
  radius = 0.012,
): Object3D {
  return createScenePrimitiveObject(
    {
      geometry: {
        type: 'roundedBox',
        size,
        radius,
        segments: 4,
      },
    },
    material,
  );
}

export function lathe(
  profile: Array<[number, number]>,
  material: KitMaterial,
  segments = 48,
): Object3D {
  return createScenePrimitiveObject(
    {
      geometry: {
        type: 'lathe',
        profile,
        segments,
      },
    },
    material,
  );
}

export function cone(
  radius: number,
  height: number,
  material: KitMaterial,
  segments = 10,
): Object3D {
  return createScenePrimitiveObject(
    {
      geometry: { type: 'cone', radius, height, segments },
    },
    material,
  );
}

export function cylinder(
  radius: number,
  height: number,
  material: KitMaterial,
  segments = 20,
): Object3D {
  return createScenePrimitiveObject(
    {
      geometry: { type: 'cylinder', radius, height, segments },
    },
    material,
  );
}

export function sphere(radius: number, material: KitMaterial, segments = 16): Object3D {
  return createScenePrimitiveObject(
    {
      geometry: { type: 'sphere', radius, segments },
    },
    material,
  );
}

export function torus(
  radius: number,
  tube: number,
  material: KitMaterial,
  radial = 10,
  tubular = 36,
): Object3D {
  return createScenePrimitiveObject(
    {
      geometry: {
        type: 'torus',
        radius,
        tube,
        radialSegments: radial,
        tubularSegments: tubular,
      },
    },
    material,
  );
}

export function extrude(
  points: Array<[number, number]>,
  depth: number,
  material: KitMaterial,
  bevel?: { size: number; thickness: number },
): Object3D {
  return createScenePrimitiveObject(
    {
      geometry: {
        type: 'extrude',
        points,
        depth,
        bevel: bevel
          ? { enabled: true, size: bevel.size, thickness: bevel.thickness, segments: 1 }
          : { enabled: false, size: 0, thickness: 0 },
      },
    },
    material,
  );
}

export function markFeedback(object: Object3D): Object3D {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const source = Array.isArray(child.material) ? child.material : [child.material];
    const clones = source.map((material) => material.clone());
    child.material = Array.isArray(child.material) ? clones : clones[0];
    const lit = clones[0] as MeshStandardMaterial;
    child.userData.feedback = {
      emissive: 'emissive' in lit ? lit.emissive.clone() : new Color(0, 0, 0),
      intensity: 'emissiveIntensity' in lit ? lit.emissiveIntensity : 0,
    };
  });
  return object;
}

export function planetMesh(
  radius: number,
  color: string,
  roughness: number,
  emissive = '#000000',
  emit = 0,
): Mesh {
  const material = new MeshStandardMaterial({
    color: new Color(color),
    roughness,
    metalness: 0.18,
    emissive: new Color(emissive),
    emissiveIntensity: emit,
    envMapIntensity: 1.15,
  });
  const mesh = new Mesh(new SphereGeometry(radius, 36, 26), material);
  mesh.castShadow = false;
  return mesh;
}

export function group(name: string, children: Object3D[]): Group {
  const root = new Group();
  root.name = name;
  for (const child of children) {
    root.add(child);
  }
  return root;
}
