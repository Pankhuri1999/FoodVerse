import { createSceneMaterial, Group, Object3D } from '@iwsdk/core';
import {
  box,
  cylinder,
  lathe,
  matGold,
  matGraphite,
  matNeonCyan,
  matNeonMagenta,
  matSteel,
  matTitanium,
  matWarmSteel,
  named,
  sphere,
  torus,
} from './kitchen-kit.js';

const matBlade = createSceneMaterial({
  id: 'mixer-blade',
  model: 'physical',
  baseColor: '#c8d0da',
  roughness: 0.18,
  metalness: 0.9,
});

const matVialGlass = createSceneMaterial({
  id: 'mixer-vial-glass',
  model: 'physical',
  baseColor: '#9ad4ec',
  roughness: 0.06,
  metalness: 0.02,
  transmission: 0.8,
  thickness: 0.02,
  opacity: 0.35,
  ior: 1.42,
  side: 'double',
});

const matVialFruit = createSceneMaterial({
  id: 'mixer-vial-fruit',
  model: 'standard',
  baseColor: '#d45a28',
  roughness: 0.4,
  emissive: '#c43a12',
  emissiveIntensity: 0.45,
});

const matVialMint = createSceneMaterial({
  id: 'mixer-vial-mint',
  model: 'standard',
  baseColor: '#4aa888',
  roughness: 0.4,
  emissive: '#2f6e62',
  emissiveIntensity: 0.4,
});

const matVialSugar = createSceneMaterial({
  id: 'mixer-vial-sugar',
  model: 'standard',
  baseColor: '#f2e6c8',
  roughness: 0.35,
  emissive: '#e0d0a0',
  emissiveIntensity: 0.25,
});

const matChassisGlass = createSceneMaterial({
  id: 'mixer-chassis-glass',
  model: 'physical',
  baseColor: '#6aa8d0',
  roughness: 0.06,
  metalness: 0.04,
  transmission: 0.7,
  thickness: 0.03,
  opacity: 0.22,
  ior: 1.4,
  side: 'double',
});

const matBowl = createSceneMaterial({
  id: 'mixer-bowl-glass',
  model: 'physical',
  baseColor: '#9ad4ec',
  roughness: 0.05,
  metalness: 0.02,
  transmission: 0.88,
  thickness: 0.045,
  opacity: 0.28,
  ior: 1.42,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
  envMapIntensity: 1.8,
  side: 'double',
});

const matCyanRing = createSceneMaterial({
  id: 'mixer-ring-cyan',
  model: 'standard',
  baseColor: '#3aa8c4',
  roughness: 0.25,
  metalness: 0.2,
  emissive: '#3ec8e0',
  emissiveIntensity: 0.55,
});

const matVioletRing = createSceneMaterial({
  id: 'mixer-ring-violet',
  model: 'standard',
  baseColor: '#6a4ad0',
  roughness: 0.25,
  metalness: 0.2,
  emissive: '#8a62e8',
  emissiveIntensity: 0.5,
});

const matWell = createSceneMaterial({
  id: 'mixer-well',
  model: 'physical',
  baseColor: '#1a2430',
  roughness: 0.35,
  metalness: 0.55,
});

const matHeatGlow = createSceneMaterial({
  id: 'mixer-heat-glow',
  model: 'standard',
  baseColor: '#ff6a20',
  roughness: 0.45,
  emissive: '#ff4a10',
  emissiveIntensity: 0.8,
  opacity: 0.22,
  side: 'double',
});

const matCoolGlow = createSceneMaterial({
  id: 'mixer-cool-glow',
  model: 'standard',
  baseColor: '#7ec8e8',
  roughness: 0.4,
  emissive: '#4aa8d0',
  emissiveIntensity: 0.75,
  opacity: 0.2,
  side: 'double',
});

const matParticle = createSceneMaterial({
  id: 'mixer-particle',
  model: 'standard',
  baseColor: '#ffd080',
  roughness: 0.4,
  emissive: '#ffb040',
  emissiveIntensity: 1.4,
});

const matGroveMote = createSceneMaterial({
  id: 'mixer-grove-mote',
  model: 'standard',
  baseColor: '#78c888',
  roughness: 0.4,
  emissive: '#4a9a58',
  emissiveIntensity: 1.3,
});

const matFrostMote = createSceneMaterial({
  id: 'mixer-frost-mote',
  model: 'standard',
  baseColor: '#e8fff4',
  roughness: 0.25,
  emissive: '#8ee8c8',
  emissiveIntensity: 1.5,
});

const matGauge = createSceneMaterial({
  id: 'mixer-gauge',
  model: 'standard',
  baseColor: '#1c2228',
  roughness: 0.5,
});

const matTempFill = createSceneMaterial({
  id: 'mixer-temp-fill',
  model: 'standard',
  baseColor: '#d45a28',
  roughness: 0.35,
  emissive: '#e05018',
  emissiveIntensity: 0.6,
});

const matStirFill = createSceneMaterial({
  id: 'mixer-stir-fill',
  model: 'standard',
  baseColor: '#3ec8e0',
  roughness: 0.35,
  emissive: '#3ec8e0',
  emissiveIntensity: 0.5,
});

const matReady = createSceneMaterial({
  id: 'mixer-ready',
  model: 'standard',
  baseColor: '#e0b24a',
  roughness: 0.3,
  emissive: '#e0b24a',
  emissiveIntensity: 0.2,
});

/** Quantum Mixer. Origin on the deck; bowl rim sits at seated arm height. */
export function createQuantumMixer(): Object3D {
  const root = new Group();
  root.name = 'Mixer';

  const pedestal = lathe(
    [
      [0.001, 0],
      [0.16, 0],
      [0.17, 0.03],
      [0.14, 0.42],
      [0.18, 0.46],
      [0.2, 0.5],
    ],
    matWarmSteel,
    48,
  );
  root.add(named(pedestal, 'Pedestal'));

  const housing = box([0.42, 0.16, 0.42], matGraphite, 0.04);
  housing.position.set(0, 0.58, 0);
  root.add(named(housing, 'Housing'));
  const houseScreen = box([0.18, 0.07, 0.012], matGauge, 0.004);
  houseScreen.position.set(0.12, 0.6, 0.21);
  root.add(named(houseScreen, 'HousingScreen'));

  const chassis = box([0.38, 0.34, 0.08], matChassisGlass, 0.012);
  chassis.position.set(0, 0.74, -0.2);
  chassis.castShadow = false;
  root.add(named(chassis, 'ChassisGlass'));
  const neonL = box([0.012, 0.32, 0.012], matNeonMagenta, 0.004);
  neonL.position.set(-0.2, 0.74, -0.2);
  root.add(named(neonL, 'NeonLeft'));
  const neonR = box([0.012, 0.32, 0.012], matNeonCyan, 0.004);
  neonR.position.set(0.2, 0.74, -0.2);
  root.add(named(neonR, 'NeonRight'));
  const screen = box([0.16, 0.09, 0.02], matGauge, 0.006);
  screen.position.set(0, 0.58, 0.22);
  root.add(named(screen, 'MixerScreen'));
  const screenRing = torus(0.028, 0.004, matNeonCyan, 8, 20);
  screenRing.position.set(-0.04, 0.58, 0.235);
  screenRing.rotation.y = Math.PI / 2;
  screenRing.castShadow = false;
  root.add(named(screenRing, 'MixerScreenRing'));

  const blades = new Group();
  blades.name = 'MixerBlades';
  blades.position.set(0, 0.705, 0);
  const hub = cylinder(0.018, 0.02, matBlade, 10);
  blades.add(named(hub, 'BladeHub'));
  for (let i = 0; i < 3; i += 1) {
    const vane = box([0.09, 0.004, 0.018], matSteel, 0.002);
    vane.position.set(0.04, 0, 0);
    const arm = new Group();
    arm.rotation.y = (i * Math.PI * 2) / 3;
    arm.add(vane);
    blades.add(named(arm, `Blade${i}`));
  }
  root.add(blades);

  const addVial = (name: string, x: number, z: number, fillMat: typeof matVialFruit) => {
    const tube = cylinder(0.018, 0.08, matVialGlass, 12);
    tube.position.set(x, 0.72, z);
    tube.castShadow = false;
    root.add(named(tube, `${name}Glass`));
    const fill = cylinder(0.012, 0.05, fillMat, 10);
    fill.position.set(x, 0.71, z);
    root.add(named(fill, name));
  };
  addVial('VialFruit', -0.28, 0.02, matVialFruit);
  addVial('VialMint', 0.28, 0.02, matVialMint);
  addVial('VialSugar', 0.28, -0.08, matVialSugar);

  const collar = lathe(
    [
      [0.12, 0],
      [0.19, 0],
      [0.2, 0.03],
      [0.18, 0.05],
    ],
    matGold,
    36,
  );
  collar.position.set(0, 0.66, 0);
  root.add(named(collar, 'Collar'));

  const well = lathe(
    [
      [0.001, 0],
      [0.11, 0],
      [0.12, 0.02],
    ],
    matWell,
    28,
  );
  well.position.set(0, 0.68, 0);
  root.add(named(well, 'Well'));

  const bowl = lathe(
    [
      [0.001, 0.02],
      [0.08, 0.01],
      [0.16, 0.04],
      [0.18, 0.12],
      [0.165, 0.16],
    ],
    matBowl,
    56,
  );
  bowl.position.set(0, 0.66, 0);
  bowl.castShadow = false;
  root.add(named(bowl, 'Bowl'));

  const cyan = torus(0.168, 0.006, matCyanRing, 8, 40);
  cyan.position.set(0, 0.72, 0);
  cyan.rotation.x = Math.PI / 2;
  cyan.castShadow = false;
  root.add(named(cyan, 'EnergyRingCyan'));

  const violet = torus(0.142, 0.005, matVioletRing, 8, 40);
  violet.position.set(0, 0.785, 0);
  violet.rotation.x = Math.PI / 2;
  violet.castShadow = false;
  root.add(named(violet, 'EnergyRingViolet'));

  const rim = torus(0.175, 0.004, matCyanRing, 8, 36);
  rim.position.set(0, 0.835, 0);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = false;
  root.add(named(rim, 'RimLight'));

  const handle = box([0.04, 0.12, 0.04], matTitanium, 0.01);
  handle.position.set(0.22, 0.78, 0);
  root.add(named(handle, 'Handle'));

  const contents = new Group();
  contents.name = 'Contents';
  root.add(contents);

  const heatGlow = sphere(0.16, matHeatGlow, 20);
  heatGlow.position.set(0, 0.76, 0);
  heatGlow.castShadow = false;
  heatGlow.visible = false;
  root.add(named(heatGlow, 'BowlHeatGlow'));

  const coolGlow = sphere(0.16, matCoolGlow, 20);
  coolGlow.position.set(0, 0.76, 0);
  coolGlow.castShadow = false;
  coolGlow.visible = false;
  root.add(named(coolGlow, 'BowlCoolGlow'));

  const ready = torus(0.178, 0.005, matReady, 8, 36);
  ready.position.set(0, 0.86, 0);
  ready.rotation.x = Math.PI / 2;
  ready.castShadow = false;
  ready.visible = false;
  root.add(named(ready, 'ReadyHalo'));

  const particles = new Group();
  particles.name = 'MixParticles';
  particles.visible = false;
  for (let i = 0; i < 6; i += 1) {
    const mote = sphere(0.004, matParticle, 8);
    mote.castShadow = false;
    mote.userData.orbit = {
      radius: 0.06 + (i % 4) * 0.015,
      speed: 1.6 + i * 0.2,
      phase: i * 0.5,
      height: 0.74,
    };
    particles.add(named(mote, `Mote${i}`));
  }
  root.add(particles);

  const groveMotes = new Group();
  groveMotes.name = 'GroveMotes';
  groveMotes.visible = false;
  for (let i = 0; i < 4; i += 1) {
    const mote = sphere(0.005, matGroveMote, 8);
    mote.castShadow = false;
    mote.userData.orbit = {
      radius: 0.05 + (i % 3) * 0.018,
      speed: 1.1 + i * 0.12,
      phase: i * 0.7,
      height: 0.75,
    };
    groveMotes.add(named(mote, `GroveMote${i}`));
  }
  root.add(groveMotes);

  const frostMotes = new Group();
  frostMotes.name = 'FrostMotes';
  frostMotes.visible = false;
  for (let i = 0; i < 4; i += 1) {
    const mote = sphere(0.004, matFrostMote, 8);
    mote.castShadow = false;
    mote.userData.orbit = {
      radius: 0.055 + (i % 4) * 0.012,
      speed: 1.8 + i * 0.16,
      phase: i * 0.6,
      height: 0.73,
    };
    frostMotes.add(named(mote, `FrostMote${i}`));
  }
  root.add(frostMotes);

  const tempTrack = box([0.012, 0.08, 0.012], matGauge, 0.002);
  tempTrack.position.set(-0.21, 0.78, 0.02);
  root.add(named(tempTrack, 'TempTrack'));
  const tempFill = cylinder(0.005, 0.07, matTempFill, 10);
  tempFill.position.set(-0.21, 0.755, 0.02);
  tempFill.scale.set(1, 0.08, 1);
  root.add(named(tempFill, 'TempFill'));

  const stirTrack = box([0.12, 0.01, 0.012], matGauge, 0.002);
  stirTrack.position.set(0, 0.9, 0.02);
  root.add(named(stirTrack, 'StirTrack'));
  const stirFill = box([0.11, 0.008, 0.01], matStirFill, 0.002);
  stirFill.position.set(-0.055, 0.9, 0.028);
  stirFill.scale.set(0.04, 1, 1);
  root.add(named(stirFill, 'StirFill'));

  return root;
}
