import { Group, Object3D } from '@iwsdk/core';
import {
  box,
  cylinder,
  lathe,
  matAnodized,
  matCarbon,
  matChocolateHull,
  matGold,
  matMintGlow,
  matNeonCyan,
  matScreen,
  matSteel,
  matTitanium,
  matWarmCove,
  matWood,
  named,
  torus,
} from './kitchen-kit.js';

function dropPad(
  name: string,
  mat: Parameters<typeof torus>[2],
  x: number,
  z: number,
): Object3D {
  const ring = torus(0.046, 0.005, mat, 10, 24);
  ring.position.set(x, 0.776, z);
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = false;
  return named(ring, name);
}

/** Galley island. Origin at deck center of the work surface. */
export function createCookStation(): Object3D {
  const root = new Group();
  root.name = 'Workstation';

  const slab = box([1.72, 0.05, 0.74], matWood, 0.018);
  slab.position.set(0, 0.745, 0);
  root.add(named(slab, 'Counter'));

  const goldInlay = box([1.18, 0.006, 0.42], matGold, 0.008);
  goldInlay.position.set(0, 0.772, 0.02);
  root.add(named(goldInlay, 'GoldInlay'));

  const bevel = box([1.7, 0.018, 0.72], matChocolateHull, 0.01);
  bevel.position.set(0, 0.712, 0);
  root.add(named(bevel, 'CounterBevel'));

  const inlay = box([0.52, 0.008, 0.26], matAnodized, 0.006);
  inlay.position.set(-0.42, 0.776, 0.08);
  root.add(named(inlay, 'PrepInlay'));

  const holo = box([0.36, 0.006, 0.2], matScreen, 0.004);
  holo.position.set(0.4, 0.774, 0.1);
  holo.castShadow = false;
  root.add(named(holo, 'HoloRest'));

  const apron = box([1.7, 0.16, 0.06], matChocolateHull, 0.012);
  apron.position.set(0, 0.64, 0.34);
  root.add(named(apron, 'TechApron'));

  const underGlow = box([1.5, 0.012, 0.02], matWarmCove, 0.004);
  underGlow.position.set(0, 0.555, 0.36);
  underGlow.castShadow = false;
  root.add(named(underGlow, 'UnderGlow'));

  const face = box([1.66, 0.5, 0.05], matAnodized, 0.01);
  face.position.set(0, 0.33, 0.32);
  root.add(named(face, 'CabinetFace'));

  const drawer = box([0.7, 0.12, 0.04], matCarbon, 0.008);
  drawer.position.set(-0.38, 0.46, 0.35);
  root.add(named(drawer, 'Drawer'));
  const pull = box([0.16, 0.01, 0.014], matGold, 0.003);
  pull.position.set(-0.38, 0.46, 0.38);
  root.add(named(pull, 'DrawerPull'));

  const faceScreen = box([0.42, 0.16, 0.02], matScreen, 0.004);
  faceScreen.position.set(0.42, 0.42, 0.36);
  faceScreen.castShadow = false;
  root.add(named(faceScreen, 'IslandScreen'));

  const kick = box([1.62, 0.08, 0.52], matCarbon, 0.008);
  kick.position.set(0, 0.04, 0.02);
  root.add(named(kick, 'ToeKick'));

  const leftLeg = box([0.07, 0.62, 0.56], matTitanium, 0.014);
  leftLeg.position.set(-0.76, 0.35, 0);
  root.add(named(leftLeg, 'LegL'));

  const rightLeg = box([0.07, 0.62, 0.56], matTitanium, 0.014);
  rightLeg.position.set(0.76, 0.35, 0);
  root.add(named(rightLeg, 'LegR'));

  const well = lathe(
    [
      [0.16, 0],
      [0.22, 0],
      [0.22, 0.01],
      [0.18, 0.014],
    ],
    matGold,
    36,
  );
  well.position.set(0, 0.77, 0.05);
  root.add(named(well, 'MixerWell'));

  const wellRing = torus(0.2, 0.008, matWarmCove, 12, 32);
  wellRing.position.set(0, 0.786, 0.05);
  wellRing.rotation.x = Math.PI / 2;
  wellRing.castShadow = false;
  root.add(named(wellRing, 'MixerHalo'));

  const bowlHint = cylinder(0.09, 0.004, matSteel, 24);
  bowlHint.position.set(0, 0.778, 0.05);
  bowlHint.castShadow = false;
  root.add(named(bowlHint, 'BowlRest'));

  root.add(dropPad('PlaceMix', matGold, 0, 0.05));
  root.add(dropPad('PlaceHeat', matWarmCove, -0.28, 0.16));
  root.add(dropPad('PlaceCool', matMintGlow, 0.28, 0.16));
  root.add(dropPad('PlacePrep', matNeonCyan, 0, -0.18));

  const jarL = cylinder(0.028, 0.05, matGold, 14);
  jarL.position.set(-0.62, 0.8, 0.22);
  root.add(named(jarL, 'JarGold'));
  const jarR = cylinder(0.028, 0.05, matMintGlow, 14);
  jarR.position.set(0.62, 0.8, 0.22);
  jarR.castShadow = false;
  root.add(named(jarR, 'JarMint'));

  const edgeL = box([0.012, 0.02, 0.7], matNeonCyan, 0.003);
  edgeL.position.set(-0.84, 0.772, 0);
  edgeL.castShadow = false;
  root.add(named(edgeL, 'EdgeL'));
  const edgeR = box([0.012, 0.02, 0.7], matMintGlow, 0.003);
  edgeR.position.set(0.84, 0.772, 0);
  edgeR.castShadow = false;
  root.add(named(edgeR, 'EdgeR'));
  const edgeFront = box([1.68, 0.016, 0.012], matWarmCove, 0.003);
  edgeFront.position.set(0, 0.772, 0.36);
  edgeFront.castShadow = false;
  root.add(named(edgeFront, 'EdgeFront'));

  return root;
}
