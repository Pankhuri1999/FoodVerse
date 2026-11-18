import { Group, Object3D } from '@iwsdk/core';
import {
  box,
  cylinder,
  matAnodized,
  matCarbon,
  matGlass,
  matGraphite,
  matGold,
  matHullInner,
  matMintGlow,
  matNeonCyan,
  matScreen,
  matScreenAmber,
  matSkylight,
  matSteel,
  matTitanium,
  matWarmCove,
  named,
} from './kitchen-kit.js';

function framedPane(
  root: Object3D,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  axis: 'z' | 'x',
): void {
  const glass = box(size, matGlass, 0.01);
  glass.position.set(...position);
  glass.castShadow = false;
  root.add(named(glass, `${name}Glass`));

  const [w, h, d] = size;
  const thick = 0.07;
  const lip = axis === 'z' ? 0.05 : 0.05;
  const inward = axis === 'z' ? (position[2] > 0 ? -lip : lip) : 0;
  const sideIn = axis === 'x' ? (position[0] > 0 ? -lip : lip) : 0;

  const frameZ = axis === 'z' ? position[2] + inward : position[2];
  const frameX = axis === 'x' ? position[0] + sideIn : position[0];

  const top = box(
    axis === 'z' ? [w + 0.1, thick, 0.08] : [0.08, thick, d + 0.1],
    matTitanium,
    0.012,
  );
  top.position.set(frameX, position[1] + h / 2 + thick / 2 - 0.01, frameZ);
  root.add(named(top, `${name}Head`));

  const bot = box(
    axis === 'z' ? [w + 0.1, thick, 0.08] : [0.08, thick, d + 0.1],
    matTitanium,
    0.012,
  );
  bot.position.set(frameX, position[1] - h / 2 - thick / 2 + 0.01, frameZ);
  root.add(named(bot, `${name}Sill`));

  const left = box(
    axis === 'z' ? [thick, h + 0.04, 0.08] : [0.08, h + 0.04, thick],
    matTitanium,
    0.01,
  );
  if (axis === 'z') left.position.set(position[0] - w / 2, position[1], frameZ);
  else left.position.set(frameX, position[1], position[2] - d / 2);
  root.add(named(left, `${name}PostL`));

  const right = box(
    axis === 'z' ? [thick, h + 0.04, 0.08] : [0.08, h + 0.04, thick],
    matTitanium,
    0.01,
  );
  if (axis === 'z') right.position.set(position[0] + w / 2, position[1], frameZ);
  else right.position.set(frameX, position[1], position[2] + d / 2);
  root.add(named(right, `${name}PostR`));

  const bezel = box(
    axis === 'z' ? [w + 0.04, 0.018, 0.03] : [0.03, 0.018, d + 0.04],
    matNeonCyan,
    0.004,
  );
  bezel.position.set(frameX, position[1] - h / 2 + 0.04, frameZ + (axis === 'z' ? inward * 0.4 : 0));
  if (axis === 'x') bezel.position.x = frameX;
  bezel.castShadow = false;
  root.add(named(bezel, `${name}Bezel`));
}

/** High-tech panoramic cockpit around the seated galley. Origin at deck. */
export function createCabinHull(): Object3D {
  const root = new Group();
  root.name = 'Hull';

  const deck = box([5.05, 0.06, 4.85], matAnodized, 0.02);
  deck.position.set(0, 0.03, -1.15);
  root.add(named(deck, 'Deck'));

  const grate = box([2.8, 0.012, 1.9], matCarbon, 0.006);
  grate.position.set(0, 0.066, -0.95);
  root.add(named(grate, 'DeckGrate'));

  for (let i = 0; i < 5; i += 1) {
    const strip = box([2.7, 0.004, 0.018], matSteel, 0.002);
    strip.position.set(0, 0.074, -0.25 - i * 0.38);
    root.add(named(strip, `DeckRib${i}`));
  }

  const pathL = box([0.03, 0.008, 3.2], matNeonCyan, 0.004);
  pathL.position.set(-0.95, 0.078, -0.95);
  pathL.castShadow = false;
  root.add(named(pathL, 'FloorPathL'));
  const pathR = box([0.03, 0.008, 3.2], matNeonCyan, 0.004);
  pathR.position.set(0.95, 0.078, -0.95);
  pathR.castShadow = false;
  root.add(named(pathR, 'FloorPathR'));

  const ceiling = box([5.0, 0.07, 4.8], matCarbon, 0.02);
  ceiling.position.set(0, 2.38, -1.18);
  root.add(named(ceiling, 'CeilingPlate'));

  const fasciaFwd = box([5.0, 0.1, 0.12], matHullInner, 0.02);
  fasciaFwd.position.set(0, 2.3, -3.52);
  root.add(named(fasciaFwd, 'CeilingFasciaFwd'));
  const fasciaPort = box([0.12, 0.1, 4.7], matHullInner, 0.02);
  fasciaPort.position.set(-2.46, 2.3, -1.18);
  root.add(named(fasciaPort, 'CeilingFasciaPort'));
  const fasciaStbd = box([0.12, 0.1, 4.7], matHullInner, 0.02);
  fasciaStbd.position.set(2.46, 2.3, -1.18);
  root.add(named(fasciaStbd, 'CeilingFasciaStbd'));

  const skylight = box([1.6, 0.03, 1.4], matSkylight, 0.01);
  skylight.position.set(0, 2.43, -1.15);
  skylight.castShadow = false;
  root.add(named(skylight, 'Skylight'));
  const skyFrame = box([1.78, 0.04, 1.56], matTitanium, 0.012);
  skyFrame.position.set(0, 2.41, -1.15);
  root.add(named(skyFrame, 'SkylightFrame'));

  for (let i = 0; i < 3; i += 1) {
    const beam = box([0.07, 0.06, 4.4], matSteel, 0.01);
    beam.position.set(-1.2 + i * 1.2, 2.32, -1.18);
    root.add(named(beam, `CeilingBeam${i}`));
  }

  const conduit = box([3.6, 0.04, 0.08], matTitanium, 0.01);
  conduit.position.set(0, 2.28, -2.55);
  root.add(named(conduit, 'CableTray'));

  const kneeFwd = box([4.95, 0.7, 0.16], matHullInner, 0.03);
  kneeFwd.position.set(0, 0.38, -3.4);
  root.add(named(kneeFwd, 'KneeFwd'));
  const kneePort = box([0.16, 0.7, 4.55], matHullInner, 0.03);
  kneePort.position.set(-2.44, 0.38, -1.15);
  root.add(named(kneePort, 'KneePort'));
  const kneeStbd = box([0.16, 0.7, 4.55], matHullInner, 0.03);
  kneeStbd.position.set(2.44, 0.38, -1.15);
  root.add(named(kneeStbd, 'KneeStbd'));

  const headerFwd = box([4.95, 0.28, 0.16], matHullInner, 0.025);
  headerFwd.position.set(0, 2.18, -3.4);
  root.add(named(headerFwd, 'HeaderFwd'));
  const headerPort = box([0.16, 0.28, 4.55], matHullInner, 0.025);
  headerPort.position.set(-2.44, 2.18, -1.15);
  root.add(named(headerPort, 'HeaderPort'));
  const headerStbd = box([0.16, 0.28, 4.55], matHullInner, 0.025);
  headerStbd.position.set(2.44, 2.18, -1.15);
  root.add(named(headerStbd, 'HeaderStbd'));

  const cornerLF = box([0.22, 2.28, 0.22], matCarbon, 0.04);
  cornerLF.position.set(-2.42, 1.16, -3.38);
  root.add(named(cornerLF, 'CornerPortFwd'));
  const cornerRF = box([0.22, 2.28, 0.22], matCarbon, 0.04);
  cornerRF.position.set(2.42, 1.16, -3.38);
  root.add(named(cornerRF, 'CornerStbdFwd'));
  const cornerLA = box([0.22, 2.28, 0.22], matCarbon, 0.04);
  cornerLA.position.set(-2.42, 1.16, 1.08);
  root.add(named(cornerLA, 'CornerPortAft'));
  const cornerRA = box([0.22, 2.28, 0.22], matCarbon, 0.04);
  cornerRA.position.set(2.42, 1.16, 1.08);
  root.add(named(cornerRA, 'CornerStbdAft'));

  const ribPort = box([0.14, 2.28, 0.14], matTitanium, 0.03);
  ribPort.position.set(-2.42, 1.16, -1.15);
  root.add(named(ribPort, 'RibPortMid'));
  const ribStbd = box([0.14, 2.28, 0.14], matTitanium, 0.03);
  ribStbd.position.set(2.42, 1.16, -1.15);
  root.add(named(ribStbd, 'RibStbdMid'));
  for (const [name, x, z] of [
    ['RingPortFwd', -2.42, -3.38],
    ['RingStbdFwd', 2.42, -3.38],
    ['RingPortMid', -2.42, -1.15],
    ['RingStbdMid', 2.42, -1.15],
  ] as const) {
    const collar = cylinder(0.11, 0.04, matNeonCyan, 12);
    collar.position.set(x, 1.85, z);
    collar.castShadow = false;
    root.add(named(collar, name));
  }

  framedPane(root, 'WindowFwdL', [1.42, 1.32, 0.03], [-1.52, 1.4, -3.52], 'z');
  framedPane(root, 'WindowFwdC', [1.42, 1.32, 0.03], [0, 1.4, -3.52], 'z');
  framedPane(root, 'WindowFwdR', [1.42, 1.32, 0.03], [1.52, 1.4, -3.52], 'z');
  const mullionL = box([0.1, 1.38, 0.1], matCarbon, 0.02);
  mullionL.position.set(-0.76, 1.4, -3.42);
  root.add(named(mullionL, 'MullionFwdL'));
  const mullionR = box([0.1, 1.38, 0.1], matCarbon, 0.02);
  mullionR.position.set(0.76, 1.4, -3.42);
  root.add(named(mullionR, 'MullionFwdR'));

  framedPane(root, 'WindowPortA', [0.03, 1.32, 1.7], [-2.54, 1.4, -2.32], 'x');
  framedPane(root, 'WindowPortB', [0.03, 1.32, 1.7], [-2.54, 1.4, 0.02], 'x');
  framedPane(root, 'WindowStbdA', [0.03, 1.32, 1.7], [2.54, 1.4, -2.32], 'x');
  framedPane(root, 'WindowStbdB', [0.03, 1.32, 1.7], [2.54, 1.4, 0.02], 'x');

  const overhead = box([2.2, 0.08, 0.42], matCarbon, 0.016);
  overhead.position.set(0, 2.12, -2.35);
  root.add(named(overhead, 'OverheadConsole'));
  const ohScreens: Array<[number, typeof matScreen]> = [
    [-0.62, matScreen],
    [0, matScreenAmber],
    [0.62, matScreen],
  ];
  for (let i = 0; i < ohScreens.length; i += 1) {
    const [x, mat] = ohScreens[i];
    const screen = box([0.52, 0.18, 0.02], mat, 0.006);
    screen.position.set(x, 2.02, -2.18);
    screen.rotation.x = -0.45;
    screen.castShadow = false;
    root.add(named(screen, `OverheadScreen${i}`));
  }

  const aft = box([5.0, 2.28, 0.14], matCarbon, 0.02);
  aft.position.set(0, 1.16, 1.28);
  root.add(named(aft, 'AftBulkhead'));
  const hatch = box([0.7, 1.5, 0.04], matAnodized, 0.012);
  hatch.position.set(0, 0.9, 1.2);
  root.add(named(hatch, 'AirlockHatch'));
  const hatchRing = box([0.78, 1.58, 0.03], matTitanium, 0.008);
  hatchRing.position.set(0, 0.9, 1.18);
  root.add(named(hatchRing, 'AirlockRing'));
  const hatchWin = box([0.22, 0.22, 0.02], matGlass, 0.006);
  hatchWin.position.set(0, 1.35, 1.16);
  hatchWin.castShadow = false;
  root.add(named(hatchWin, 'AirlockWindow'));
  const aftScreenL = box([0.7, 0.38, 0.02], matScreen, 0.006);
  aftScreenL.position.set(-1.35, 1.55, 1.2);
  aftScreenL.castShadow = false;
  root.add(named(aftScreenL, 'AftScreenL'));
  const aftScreenR = box([0.7, 0.38, 0.02], matScreenAmber, 0.006);
  aftScreenR.position.set(1.35, 1.55, 1.2);
  aftScreenR.castShadow = false;
  root.add(named(aftScreenR, 'AftScreenR'));

  const sillHud = box([1.15, 0.08, 0.16], matAnodized, 0.01);
  sillHud.position.set(0, 0.78, -3.28);
  root.add(named(sillHud, 'BowHudShelf'));
  const hudL = box([0.42, 0.12, 0.02], matScreen, 0.004);
  hudL.position.set(-0.28, 0.86, -3.2);
  hudL.rotation.x = -0.35;
  hudL.castShadow = false;
  root.add(named(hudL, 'BowHudL'));
  const hudR = box([0.42, 0.12, 0.02], matScreenAmber, 0.004);
  hudR.position.set(0.28, 0.86, -3.2);
  hudR.rotation.x = -0.35;
  hudR.castShadow = false;
  root.add(named(hudR, 'BowHudR'));

  const portConsole = box([0.32, 0.1, 1.35], matCarbon, 0.016);
  portConsole.position.set(-1.22, 0.78, -1.55);
  root.add(named(portConsole, 'PortConsole'));
  const portScreen = box([0.26, 0.16, 0.02], matScreen, 0.004);
  portScreen.position.set(-1.22, 0.92, -1.55);
  portScreen.rotation.x = -0.5;
  portScreen.castShadow = false;
  root.add(named(portScreen, 'PortScreen'));

  const stbdConsole = box([0.32, 0.1, 1.35], matCarbon, 0.016);
  stbdConsole.position.set(1.22, 0.78, -1.55);
  root.add(named(stbdConsole, 'StbdConsole'));
  const stbdScreen = box([0.26, 0.16, 0.02], matScreenAmber, 0.004);
  stbdScreen.position.set(1.22, 0.92, -1.55);
  stbdScreen.rotation.x = -0.5;
  stbdScreen.castShadow = false;
  root.add(named(stbdScreen, 'StbdScreen'));

  const cove = box([4.2, 0.025, 0.05], matWarmCove, 0.008);
  cove.position.set(0, 2.2, -3.26);
  root.add(named(cove, 'CoveLight'));
  const covePort = box([0.04, 0.025, 3.8], matNeonCyan, 0.008);
  covePort.position.set(-2.32, 2.2, -1.2);
  root.add(named(covePort, 'CovePort'));
  const coveStbd = box([0.04, 0.025, 3.8], matMintGlow, 0.008);
  coveStbd.position.set(2.32, 2.2, -1.2);
  root.add(named(coveStbd, 'CoveStbd'));

  const rail = box([1.6, 0.025, 0.035], matTitanium, 0.008);
  rail.position.set(0, 1.08, -0.22);
  root.add(named(rail, 'ForwardRail'));
  const railPostL = cylinder(0.016, 0.32, matTitanium, 10);
  railPostL.position.set(-0.72, 0.9, -0.22);
  root.add(named(railPostL, 'RailPostL'));
  const railPostR = cylinder(0.016, 0.32, matTitanium, 10);
  railPostR.position.set(0.72, 0.9, -0.22);
  root.add(named(railPostR, 'RailPostR'));

  const seat = box([0.48, 0.08, 0.46], matCarbon, 0.02);
  seat.position.set(0, 0.44, 0.62);
  root.add(named(seat, 'PilotSeat'));
  const seatPiping = box([0.5, 0.012, 0.02], matGold, 0.004);
  seatPiping.position.set(0, 0.49, 0.4);
  root.add(named(seatPiping, 'SeatPiping'));
  const seatBack = box([0.48, 0.52, 0.08], matCarbon, 0.02);
  seatBack.position.set(0, 0.74, 0.82);
  root.add(named(seatBack, 'PilotSeatBack'));
  const headrest = box([0.32, 0.12, 0.08], matGraphite, 0.02);
  headrest.position.set(0, 1.04, 0.82);
  root.add(named(headrest, 'Headrest'));

  const ohLamp = cylinder(0.05, 0.04, matScreenAmber, 12);
  ohLamp.position.set(0, 2.18, -0.9);
  ohLamp.castShadow = false;
  root.add(named(ohLamp, 'CabinLamp'));

  return root;
}
