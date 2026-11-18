import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  createSceneMaterial,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Points,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
} from '@iwsdk/core';
import { named, sphere } from './kitchen-kit.js';

type OrbitSpec = {
  name: string;
  radius: number;
  size: number;
  speed: number;
  spin: number;
  phase: number;
  tilt: number;
  material: ReturnType<typeof createSceneMaterial>;
  atm?: string;
  clouds?: boolean;
  ring?: boolean;
  moon?: boolean;
};

const matMercury = createSceneMaterial({
  id: 'planet-mercury',
  model: 'standard',
  roughness: 0.94,
  metalness: 0.12,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 61,
      bands: [
        { frequency: [6, 6], amplitude: 0.55 },
        { frequency: [28, 28], amplitude: 0.45 },
      ],
      ramp: [
        { at: 0, color: '#3a342e' },
        { at: 0.45, color: '#7a6c5c' },
        { at: 1, color: '#c4b19a' },
      ],
    },
  },
});

const matVenus = createSceneMaterial({
  id: 'planet-venus',
  model: 'standard',
  roughness: 0.42,
  metalness: 0.04,
  emissive: '#c49a48',
  emissiveIntensity: 0.12,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 62,
      bands: [
        { frequency: [3, 12], amplitude: 0.65 },
        { frequency: [14, 40], amplitude: 0.35 },
      ],
      ramp: [
        { at: 0, color: '#b88840' },
        { at: 0.5, color: '#e0c078' },
        { at: 1, color: '#f4e4b0' },
      ],
    },
  },
});

const matGarden = createSceneMaterial({
  id: 'planet-garden',
  model: 'standard',
  roughness: 0.48,
  metalness: 0.06,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [512, 256],
      seed: 63,
      bands: [
        { frequency: [3, 5], amplitude: 0.6 },
        { frequency: [11, 18], amplitude: 0.4 },
      ],
      ramp: [
        { at: 0, color: '#0b3a72' },
        { at: 0.28, color: '#1a7a9a' },
        { at: 0.42, color: '#d2c08a' },
        { at: 0.62, color: '#2f8a48' },
        { at: 0.82, color: '#1e5a32' },
        { at: 1, color: '#f2f6fa' },
      ],
    },
  },
});

const matClouds = createSceneMaterial({
  id: 'planet-clouds',
  model: 'standard',
  roughness: 1,
  opacity: 0.28,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 64,
      bands: [
        { frequency: [4, 8], amplitude: 0.7 },
        { frequency: [18, 28], amplitude: 0.3 },
      ],
      ramp: [
        { at: 0, color: '#6a7a88' },
        { at: 0.55, color: '#d8e4f0' },
        { at: 1, color: '#ffffff' },
      ],
    },
  },
});

const matCoral = createSceneMaterial({
  id: 'planet-coral',
  model: 'standard',
  roughness: 0.78,
  metalness: 0.08,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 65,
      bands: [
        { frequency: [5, 8], amplitude: 0.6 },
        { frequency: [20, 24], amplitude: 0.4 },
      ],
      ramp: [
        { at: 0, color: '#4a2014' },
        { at: 0.4, color: '#a04828' },
        { at: 0.75, color: '#d47848' },
        { at: 1, color: '#e8c09a' },
      ],
    },
  },
});

const matGiant = createSceneMaterial({
  id: 'planet-giant',
  model: 'standard',
  roughness: 0.36,
  metalness: 0.04,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 128],
      seed: 66,
      bands: [
        { frequency: [2, 28], amplitude: 0.75 },
        { frequency: [6, 64], amplitude: 0.25 },
      ],
      ramp: [
        { at: 0, color: '#2a1c48' },
        { at: 0.3, color: '#6a4a28' },
        { at: 0.55, color: '#c4a078' },
        { at: 0.78, color: '#8a6aaa' },
        { at: 1, color: '#f0d8b0' },
      ],
    },
  },
});

const matIce = createSceneMaterial({
  id: 'planet-ice',
  model: 'physical',
  roughness: 0.22,
  metalness: 0.08,
  clearcoat: 0.45,
  clearcoatRoughness: 0.2,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [256, 256],
      seed: 67,
      bands: [
        { frequency: [4, 6], amplitude: 0.55 },
        { frequency: [16, 22], amplitude: 0.45 },
      ],
      ramp: [
        { at: 0, color: '#3a5878' },
        { at: 0.45, color: '#8ab0c8' },
        { at: 1, color: '#e8f4fa' },
      ],
    },
  },
});

const matMoon = createSceneMaterial({
  id: 'planet-moon',
  model: 'standard',
  roughness: 0.92,
  metalness: 0.06,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 128],
      seed: 68,
      bands: [{ frequency: [8, 8], amplitude: 1 }],
      ramp: [
        { at: 0, color: '#6a6660' },
        { at: 1, color: '#d8d2c8' },
      ],
    },
  },
});

const matRock = createSceneMaterial({
  id: 'space-asteroid',
  model: 'standard',
  roughness: 0.96,
  metalness: 0.08,
  textures: {
    albedo: {
      type: 'procedural',
      algorithm: 'periodic-fbm-v1',
      resolution: [128, 128],
      seed: 69,
      bands: [
        { frequency: [5, 5], amplitude: 0.6 },
        { frequency: [18, 18], amplitude: 0.4 },
      ],
      ramp: [
        { at: 0, color: '#2e2a26' },
        { at: 1, color: '#8a8074' },
      ],
    },
  },
});

const ORBITS: OrbitSpec[] = [
  {
    name: 'Mercury',
    radius: 2.15,
    size: 0.18,
    speed: 0.32,
    spin: 1.1,
    phase: 0.4,
    tilt: 0.06,
    material: matMercury,
  },
  {
    name: 'Venus',
    radius: 3.05,
    size: 0.34,
    speed: 0.2,
    spin: 0.14,
    phase: 1.8,
    tilt: 0.1,
    material: matVenus,
    atm: '#f0d090',
  },
  {
    name: 'GardenWorld',
    radius: 4.25,
    size: 0.42,
    speed: 0.13,
    spin: 0.62,
    phase: 0.35,
    tilt: 0.16,
    material: matGarden,
    atm: '#7ec8ff',
    clouds: true,
    moon: true,
  },
  {
    name: 'CoralWorld',
    radius: 5.45,
    size: 0.3,
    speed: 0.1,
    spin: 0.52,
    phase: 2.6,
    tilt: 0.2,
    material: matCoral,
    atm: '#e09060',
  },
  {
    name: 'VioletGiant',
    radius: 7.7,
    size: 1.05,
    speed: 0.052,
    spin: 1.05,
    phase: 3.4,
    tilt: 0.24,
    material: matGiant,
    atm: '#c8b090',
    ring: true,
  },
  {
    name: 'IceWorld',
    radius: 9.8,
    size: 0.26,
    speed: 0.034,
    spin: 0.4,
    phase: 4.1,
    tilt: 0.14,
    material: matIce,
    atm: '#b8d8f0',
  },
];

function atmosphere(radius: number, color: string): Mesh {
  const mesh = new Mesh(
    new SphereGeometry(radius, 24, 16),
    new MeshBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity: 0.18,
      side: BackSide,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.iwsdkPreviewBounds = 'exclude';
  return mesh;
}

function starfield(count: number, inner: number, outer: number, size: number, band = false): Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const u = Math.random();
    const v = band ? 0.5 + (Math.random() - 0.5) * 0.22 : Math.random();
    const theta = Math.PI * 2 * u;
    const phi = Math.acos(2 * Math.min(1, Math.max(0, v)) - 1);
    const r = inner + Math.random() * (outer - inner);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * (band ? 0.28 : 1);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const cool = Math.random();
    const bright = 0.5 + Math.random() * 0.5;
    if (cool > 0.9) {
      colors[i * 3] = 1 * bright;
      colors[i * 3 + 1] = 0.78 * bright;
      colors[i * 3 + 2] = 0.55 * bright;
    } else if (cool < 0.12) {
      colors[i * 3] = 0.62 * bright;
      colors[i * 3 + 1] = 0.78 * bright;
      colors[i * 3 + 2] = 1 * bright;
    } else {
      colors[i * 3] = bright;
      colors[i * 3 + 1] = bright;
      colors[i * 3 + 2] = 0.96 * bright;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    sizeAttenuation: true,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.userData.iwsdkPreviewBounds = 'exclude';
  return points;
}

function nebula(count: number): Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 8;
    const r = 28 + Math.random() * 22;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r - 8;
    const tint = Math.random();
    const dim = 0.12 + Math.random() * 0.18;
    if (tint > 0.55) {
      colors[i * 3] = 0.45 * dim;
      colors[i * 3 + 1] = 0.22 * dim;
      colors[i * 3 + 2] = 0.7 * dim;
    } else {
      colors[i * 3] = 0.2 * dim;
      colors[i * 3 + 1] = 0.45 * dim;
      colors[i * 3 + 2] = 0.55 * dim;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const points = new Points(
    geometry,
    new PointsMaterial({
      size: 2.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
      blending: AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  points.userData.iwsdkPreviewBounds = 'exclude';
  return points;
}

/** Black solar system outside the cockpit: lit worlds, belts, and drifting stars. */
export function createSpaceVista(): Object3D {
  const root = new Group();
  root.name = 'SpaceVista';

  const stars = starfield(2200, 24, 78, 0.14);
  stars.name = 'Starfield';
  root.add(stars);

  const farStars = starfield(900, 58, 96, 0.07);
  farStars.name = 'FarStars';
  root.add(farStars);

  const band = starfield(500, 36, 70, 0.2, true);
  band.name = 'MilkyWay';
  root.add(band);

  const haze = nebula(180);
  haze.name = 'Nebula';
  root.add(haze);

  const system = new Group();
  system.name = 'SolarSystem';
  system.position.set(0.35, 1.48, -11.2);
  system.rotation.x = 0.22;
  system.rotation.z = -0.06;
  root.add(system);

  const sun = new Mesh(
    new SphereGeometry(1.55, 32, 24),
    new MeshBasicMaterial({ color: new Color('#ffe29a') }),
  );
  sun.name = 'Sun';
  sun.castShadow = false;
  system.add(sun);
  const corona = new Mesh(
    new SphereGeometry(2.05, 24, 16),
    new MeshBasicMaterial({
      color: new Color('#ffb040'),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  corona.name = 'SunCorona';
  corona.castShadow = false;
  corona.userData.iwsdkPreviewBounds = 'exclude';
  system.add(corona);
  const halo = new Mesh(
    new SphereGeometry(2.7, 20, 14),
    new MeshBasicMaterial({
      color: new Color('#ff8a30'),
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  halo.name = 'SunHalo';
  halo.castShadow = false;
  halo.userData.iwsdkPreviewBounds = 'exclude';
  system.add(halo);

  const sunLight = new PointLight(new Color('#ffd8a8'), 28, 26, 2);
  sunLight.name = 'SunLight';
  system.add(sunLight);

  for (const spec of ORBITS) {
    const orbit = new Group();
    orbit.name = `${spec.name}Orbit`;
    orbit.rotation.x = spec.tilt;
    orbit.userData.spaceOrbit = {
      speed: spec.speed,
      spin: spec.spin,
      phase: spec.phase,
    };
    const planet = sphere(spec.size, spec.material, 36);
    planet.name = spec.name;
    planet.position.set(spec.radius, 0, 0);
    planet.castShadow = false;
    orbit.add(planet);

    if (spec.atm) {
      const atm = atmosphere(spec.size * 1.12, spec.atm);
      atm.name = `${spec.name}Atm`;
      atm.position.copy(planet.position);
      orbit.add(atm);
    }

    if (spec.clouds) {
      const clouds = sphere(spec.size * 1.04, matClouds, 28);
      clouds.name = `${spec.name}Clouds`;
      clouds.position.copy(planet.position);
      clouds.castShadow = false;
      orbit.add(clouds);
    }

    if (spec.ring) {
      const ring = new Mesh(
        new RingGeometry(spec.size * 1.35, spec.size * 2.15, 64),
        new MeshStandardMaterial({
          color: new Color('#d4c4a0'),
          emissive: new Color('#8a7048'),
          emissiveIntensity: 0.12,
          roughness: 0.55,
          metalness: 0.15,
          transparent: true,
          opacity: 0.82,
          side: DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = Math.PI / 2.35;
      ring.position.copy(planet.position);
      ring.name = 'GiantRing';
      ring.userData.iwsdkPreviewBounds = 'exclude';
      orbit.add(named(ring, 'GiantRing'));
    }

    if (spec.moon) {
      const moon = sphere(0.1, matMoon, 16);
      moon.name = 'GardenMoon';
      moon.position.set(spec.radius + 0.72, 0.1, 0.16);
      moon.castShadow = false;
      orbit.add(moon);
    }

    system.add(orbit);
  }

  const belt = new Group();
  belt.name = 'AsteroidBelt';
  belt.userData.spaceOrbit = { speed: 0.07, spin: 0.4, phase: 0.2 };
  for (let i = 0; i < 18; i += 1) {
    const rock = sphere(0.05 + (i % 4) * 0.018, matRock, 8);
    const angle = (i / 18) * Math.PI * 2;
    const radius = 6.35 + (i % 5) * 0.12;
    rock.position.set(Math.cos(angle) * radius, (i % 3) * 0.05 - 0.05, Math.sin(angle) * radius);
    rock.scale.set(1.4, 0.55 + (i % 3) * 0.2, 0.9);
    rock.castShadow = false;
    belt.add(named(rock, `BeltRock${i}`));
  }
  system.add(belt);

  const rocks = new Group();
  rocks.name = 'Asteroids';
  for (let i = 0; i < 3; i += 1) {
    const rock = sphere(0.22 + i * 0.05, matRock, 8);
    rock.scale.set(1.3, 0.62 + i * 0.12, 0.9);
    rock.name = `Asteroid${i}`;
    rock.visible = false;
    rock.castShadow = false;
    rock.userData.iwsdkPreviewBounds = 'exclude';
    rocks.add(rock);
  }
  root.add(rocks);

  const meteor = new Mesh(
    new SphereGeometry(0.06, 6, 5),
    new MeshBasicMaterial({
      color: new Color('#fff4d8'),
      transparent: true,
      opacity: 0.95,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  meteor.name = 'Meteor';
  meteor.visible = false;
  meteor.castShadow = false;
  meteor.userData.iwsdkPreviewBounds = 'exclude';
  root.add(meteor);
  const trail = new Mesh(
    new SphereGeometry(0.04, 6, 5),
    new MeshBasicMaterial({
      color: new Color('#ffc070'),
      transparent: true,
      opacity: 0.45,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  trail.name = 'MeteorTrail';
  trail.visible = false;
  trail.castShadow = false;
  root.add(trail);

  return root;
}
