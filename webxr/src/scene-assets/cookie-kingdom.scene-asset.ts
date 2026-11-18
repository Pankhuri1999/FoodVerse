import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import {
  box,
  cone,
  cylinder,
  lathe,
  matCookie,
  matGold,
  matGraphite,
  matGrove,
  matIce,
  matSoil,
  matTitanium,
  matWater,
  named,
  sphere,
  torus,
} from './kitchen-kit.js';

const matGrown = createSceneMaterial({
  id: 'kingdom-grown-canopy',
  model: 'standard',
  baseColor: '#4a9a58',
  roughness: 0.58,
  emissive: '#2a6a34',
  emissiveIntensity: 0.35,
});

const matFrostPath = createSceneMaterial({
  id: 'kingdom-frost-path',
  model: 'physical',
  baseColor: '#d8f4f8',
  roughness: 0.12,
  metalness: 0.08,
  emissive: '#a8e0f0',
  emissiveIntensity: 0.4,
  clearcoat: 0.7,
  clearcoatRoughness: 0.08,
});

const matPuddle = createSceneMaterial({
  id: 'kingdom-ice-puddle',
  model: 'physical',
  baseColor: '#c8e4f4',
  roughness: 0.08,
  metalness: 0.05,
  emissive: '#9ec8e6',
  emissiveIntensity: 0.25,
  clearcoat: 0.8,
  clearcoatRoughness: 0.06,
});

const matPad = createSceneMaterial({
  id: 'kingdom-pad',
  model: 'standard',
  baseColor: '#e0b24a',
  roughness: 0.4,
  emissive: '#e0b24a',
  emissiveIntensity: 0.35,
});

const matCitizen = createSceneMaterial({
  id: 'kingdom-citizen',
  model: 'standard',
  baseColor: '#d4a06a',
  roughness: 0.55,
  emissive: '#c49048',
  emissiveIntensity: 0.25,
});

const matHalo = createSceneMaterial({
  id: 'kingdom-halo',
  model: 'standard',
  baseColor: '#e0b24a',
  roughness: 0.3,
  emissive: '#e0b24a',
  emissiveIntensity: 0.55,
});

const matFrosting = createSceneMaterial({
  id: 'kingdom-frosting',
  model: 'standard',
  baseColor: '#f4dce8',
  roughness: 0.55,
});

const matChocolate = createSceneMaterial({
  id: 'kingdom-chocolate',
  model: 'physical',
  baseColor: '#5a3018',
  roughness: 0.28,
  metalness: 0.08,
  clearcoat: 0.55,
  clearcoatRoughness: 0.18,
});

const matLollipop = createSceneMaterial({
  id: 'kingdom-lollipop',
  model: 'standard',
  baseColor: '#e05070',
  roughness: 0.35,
  emissive: '#c03050',
  emissiveIntensity: 0.2,
});

const matCandyGreen = createSceneMaterial({
  id: 'kingdom-candy-green',
  model: 'standard',
  baseColor: '#5aaa58',
  roughness: 0.5,
});

const matWafer = createSceneMaterial({
  id: 'kingdom-wafer',
  model: 'standard',
  baseColor: '#d4a06a',
  roughness: 0.62,
});

/** Miniature Cookie Kingdom. Origin at the pedestal deck contact. */
export function createCookieKingdom(): Object3D {
  const root = new Group();
  root.name = 'Kingdom';

  const pedestal = lathe(
    [
      [0.001, 0],
      [0.16, 0],
      [0.15, 0.04],
      [0.12, 0.28],
      [0.18, 0.32],
    ],
    matTitanium,
    28,
  );
  root.add(named(pedestal, 'Pedestal'));

  const globe = new Group();
  globe.name = 'Globe';
  root.add(globe);

  const crust = lathe(
    [
      [0.001, 0],
      [0.172, 0],
      [0.168, 0.02],
    ],
    matCookie,
    28,
  );
  crust.position.set(0, 0.328, 0);
  globe.add(named(crust, 'CookieCrust'));

  const frosting = lathe(
    [
      [0.001, 0],
      [0.165, 0],
      [0.16, 0.018],
    ],
    matFrosting,
    24,
  );
  frosting.position.set(0, 0.338, 0);
  globe.add(named(frosting, 'FrostingGround'));

  const equator = torus(0.162, 0.006, matGold, 12, 32);
  equator.position.set(0, 0.346, 0);
  equator.rotation.x = Math.PI / 2;
  equator.castShadow = false;
  globe.add(named(equator, 'PlanetEquator'));

  const river = box([0.055, 0.01, 0.16], matChocolate, 0.008);
  river.position.set(0.05, 0.352, -0.02);
  globe.add(named(river, 'ChocolateRiver'));
  const riverBend = box([0.09, 0.01, 0.032], matChocolate, 0.008);
  riverBend.position.set(0.07, 0.353, 0.045);
  globe.add(named(riverBend, 'ChocolateRiverBend'));
  const riverPool = cylinder(0.026, 0.01, matChocolate, 16);
  riverPool.position.set(0.01, 0.351, 0.075);
  globe.add(named(riverPool, 'ChocolateRiverPool'));

  const pop = (name: string, x: number, z: number, colorMat = matLollipop) => {
    const stick = cylinder(0.003, 0.05, matTitanium, 6);
    stick.position.set(x, 0.385, z);
    globe.add(named(stick, `${name}Stick`));
    const candy = sphere(0.012, colorMat, 14);
    candy.position.set(x, 0.412, z);
    globe.add(named(candy, name));
  };
  pop('LollipopA', -0.12, -0.04);
  pop('LollipopB', 0.12, 0.02, matCandyGreen);

  const candyTree = cone(0.028, 0.055, matCandyGreen, 8);
  candyTree.position.set(-0.05, 0.4, 0.1);
  globe.add(named(candyTree, 'CandyPine'));
  const bushA = sphere(0.016, matCandyGreen, 10);
  bushA.position.set(-0.11, 0.368, 0.08);
  globe.add(named(bushA, 'MintBushA'));
  const bushB = sphere(0.013, matCandyGreen, 10);
  bushB.position.set(0.11, 0.366, -0.08);
  globe.add(named(bushB, 'MintBushB'));

  const central = new Group();
  central.name = 'CentralKingdom';
  const plaza = cylinder(0.12, 0.04, matCookie, 28);
  plaza.position.set(0, 0.34, 0);
  central.add(named(plaza, 'Plaza'));

  const keep = cylinder(0.042, 0.08, matCookie, 20);
  keep.position.set(0, 0.4, 0);
  central.add(named(keep, 'Keep'));

  const roof = lathe(
    [
      [0.001, 0],
      [0.055, 0],
      [0.001, 0.05],
    ],
    matGold,
    16,
  );
  roof.position.set(0, 0.45, 0);
  central.add(named(roof, 'KeepRoof'));
  globe.add(central);

  const ice = box([0.07, 0.08, 0.05], matIce, 0.012);
  ice.position.set(-0.09, 0.39, 0.06);
  globe.add(named(ice, 'IceGate'));

  const puddle = cylinder(0.045, 0.006, matPuddle, 18);
  puddle.position.set(-0.09, 0.362, 0.06);
  puddle.visible = false;
  globe.add(named(puddle, 'IcePuddle'));

  const padIce = torus(0.05, 0.004, matPad, 8, 24);
  padIce.position.set(-0.09, 0.365, 0.06);
  padIce.rotation.x = Math.PI / 2;
  padIce.castShadow = false;
  padIce.visible = false;
  globe.add(named(padIce, 'PadIce'));

  const soil = lathe(
    [
      [0.001, 0],
      [0.045, 0],
      [0.04, 0.02],
    ],
    matSoil,
    16,
  );
  soil.position.set(0.02, 0.36, 0.08);
  globe.add(named(soil, 'BarrenSoil'));

  const trunk = box([0.012, 0.05, 0.012], matGraphite, 0.004);
  trunk.position.set(0.02, 0.4, 0.08);
  globe.add(named(trunk, 'GroveHint'));

  const canopy = lathe(
    [
      [0.001, 0],
      [0.03, 0.01],
      [0.001, 0.04],
    ],
    matGrove,
    12,
  );
  canopy.position.set(0.02, 0.42, 0.08);
  globe.add(named(canopy, 'CanopyHint'));

  const grown = new Group();
  grown.name = 'GrownCanopy';
  grown.visible = false;
  const canopyA = lathe(
    [
      [0.001, 0],
      [0.048, 0.012],
      [0.001, 0.07],
    ],
    matGrown,
    14,
  );
  canopyA.position.set(0.02, 0.43, 0.08);
  grown.add(named(canopyA, 'GrownA'));
  const canopyB = lathe(
    [
      [0.001, 0],
      [0.032, 0.01],
      [0.001, 0.05],
    ],
    matGrown,
    12,
  );
  canopyB.position.set(-0.02, 0.4, 0.1);
  grown.add(named(canopyB, 'GrownB'));
  const canopyC = lathe(
    [
      [0.001, 0],
      [0.028, 0.008],
      [0.001, 0.045],
    ],
    matGrown,
    12,
  );
  canopyC.position.set(0.055, 0.4, 0.05);
  grown.add(named(canopyC, 'GrownC'));
  globe.add(grown);

  const padSoil = torus(0.05, 0.004, matPad, 8, 24);
  padSoil.position.set(0.02, 0.365, 0.08);
  padSoil.rotation.x = Math.PI / 2;
  padSoil.castShadow = false;
  padSoil.visible = false;
  globe.add(named(padSoil, 'PadSoil'));

  const water = lathe(
    [
      [0.001, 0],
      [0.05, 0],
      [0.048, 0.012],
    ],
    matWater,
    16,
  );
  water.position.set(0.08, 0.36, -0.05);
  globe.add(named(water, 'WaterPath'));

  const frost = box([0.11, 0.01, 0.045], matFrostPath, 0.006);
  frost.position.set(0.04, 0.378, -0.06);
  frost.visible = false;
  globe.add(named(frost, 'FrozenCrossing'));

  const padWater = torus(0.05, 0.004, matPad, 8, 24);
  padWater.position.set(0.08, 0.365, -0.05);
  padWater.rotation.x = Math.PI / 2;
  padWater.castShadow = false;
  padWater.visible = false;
  globe.add(named(padWater, 'PadWater'));

  const bridge = box([0.12, 0.016, 0.04], matWafer, 0.008);
  bridge.position.set(0, 0.378, -0.07);
  globe.add(named(bridge, 'CookieBridge'));
  const plankA = box([0.035, 0.006, 0.038], matCookie, 0.004);
  plankA.position.set(-0.03, 0.388, -0.07);
  globe.add(named(plankA, 'BridgePlankA'));
  const plankB = box([0.035, 0.006, 0.038], matCookie, 0.004);
  plankB.position.set(0.03, 0.388, -0.07);
  globe.add(named(plankB, 'BridgePlankB'));
  const railL = box([0.12, 0.02, 0.006], matCookie, 0.003);
  railL.position.set(0, 0.395, -0.088);
  globe.add(named(railL, 'BridgeRailL'));
  const railR = box([0.12, 0.02, 0.006], matCookie, 0.003);
  railR.position.set(0, 0.395, -0.052);
  globe.add(named(railR, 'BridgeRailR'));

  const halo = torus(0.12, 0.006, matHalo, 10, 28);
  halo.position.set(0, 0.48, 0);
  halo.rotation.x = Math.PI / 2;
  halo.castShadow = false;
  halo.visible = false;
  globe.add(named(halo, 'RestoredHalo'));

  const citizens = new Group();
  citizens.name = 'Citizens';
  citizens.visible = false;
  const spots: Array<[number, number, number]> = [
    [-0.05, 0.385, -0.02],
    [0.04, 0.385, 0.03],
    [0.06, 0.385, -0.04],
  ];
  spots.forEach((spot, i) => {
    const body = cone(0.01, 0.028, matCitizen, 8);
    body.position.set(spot[0], spot[1], spot[2]);
    citizens.add(named(body, `Citizen${i}`));
  });
  globe.add(citizens);

  const motes = new Group();
  motes.name = 'RestoredMotes';
  motes.visible = false;
  for (let i = 0; i < 5; i += 1) {
    const mote = sphere(0.004, matHalo, 8);
    mote.castShadow = false;
    mote.userData.orbit = {
      radius: 0.08 + (i % 4) * 0.02,
      speed: 0.7 + i * 0.08,
      phase: i * 0.6,
      height: 0.46,
    };
    motes.add(named(mote, `FeastMote${i}`));
  }
  globe.add(motes);

  return root;
}
