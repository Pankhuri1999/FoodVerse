import {
  Color,
  createSystem,
  Entity,
  Grabbed,
  GrabSystem,
  Hovered,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OneHandGrabbable,
  PokeInteractable,
  RayInteractable,
  Vector3,
} from '@iwsdk/core';
import { CreatureId, getCreatureDef } from './creature-catalog.js';
import { playChord } from './kitchen-audio.js';
import { ComfortSettings, CookieKingdom, Creature, Mission } from './kitchen-components.js';

const HOVER = new Color('#3ec8e0');
const HELD = new Color('#e0b24a');
const ICE = new Color('#9ec8e6');
const FROST = new Color('#a8e0f0');
const GOLD = new Color('#e0b24a');
const GREEN = new Color('#4a9a58');
const MINT = new Color('#7ec8b0');
const COOKIE = new Color('#c48a48');
const CHOCOLATE = new Color('#5a3018');
const DELIVER_RADIUS = 0.22;
const TARGETS = ['IceGate', 'BarrenSoil', 'WaterPath'] as const;

export class DeliverySystem extends createSystem({
  creatures: { required: [Creature] },
  held: { required: [Creature, Grabbed] },
  hover: { required: [Creature, Hovered], excluded: [Grabbed] },
  kingdom: { required: [CookieKingdom] },
  mission: { required: [Mission] },
  comfort: { required: [ComfortSettings] },
}) {
  private creaturePos = new Vector3();
  private targetPos = new Vector3();
  private motePos = new Vector3();
  private accepted = new Set<Entity>();

  init(): void {
    this.cleanupFuncs.push(
      this.queries.hover.subscribe('qualify', (entity) => {
        if (!(entity.getValue(Creature, 'hatched') ?? false)) return;
        if (entity.getValue(Creature, 'delivered')) return;
        this.tint(entity.object3D, HOVER, 0.35);
      }),
      this.queries.hover.subscribe('disqualify', (entity) => {
        if (!entity.hasComponent(Grabbed)) this.tint(entity.object3D, null, 0);
      }),
      this.queries.held.subscribe('qualify', (entity) => {
        if (!(entity.getValue(Creature, 'hatched') ?? false) || entity.getValue(Creature, 'delivered')) {
          this.world.getSystem(GrabSystem)?.forceRelease(entity);
          return;
        }
        this.accepted.add(entity);
        this.tint(entity.object3D, HELD, 0.55);
      }),
      this.queries.held.subscribe('disqualify', (entity) => {
        if (!this.accepted.delete(entity)) return;
        this.tint(entity.object3D, null, 0);
        this.tryDeliver(entity);
      }),
    );
  }

  update(_delta: number, time: number): void {
    this.ensureDocked();
    const comfort = this.queries.comfort.entities.values().next().value;
    const paused = comfort?.getValue(ComfortSettings, 'paused') ?? false;
    const reduced = comfort?.getValue(ComfortSettings, 'reducedMotion') ?? false;
    this.updateKingdom(paused ? 0 : time, reduced);
  }

  private tryDeliver(entity: Entity): void {
    if (!(entity.getValue(Creature, 'hatched') ?? false)) return;
    if (entity.getValue(Creature, 'delivered')) return;
    const def = getCreatureDef(entity.getValue(Creature, 'id') ?? '');
    const kingdom = this.kingdomEntity();
    const kingdomObject = kingdom?.object3D;
    const creatureObject = entity.object3D;
    if (!def || !kingdom || !kingdomObject || !creatureObject) return;

    creatureObject.getWorldPosition(this.creaturePos);
    const nearest = this.nearestTarget(kingdomObject, this.creaturePos);
    if (!nearest) return;

    if (nearest.name !== def.deliveryTarget) {
      const mission = this.missionEntity();
      if (mission) {
        mission.setValue(Mission, 'notice', `${def.label} must be released on ${this.labelFor(def.deliveryTarget)}.`);
        mission.setValue(Mission, 'noticeT', 2.6);
      }
      playChord([196, 233, 247], 0.28, 0.06);
      return;
    }

    this.landCreature(entity, def.id, kingdom, kingdomObject);
  }

  private landCreature(
    entity: Entity,
    creatureId: CreatureId,
    kingdom: Entity,
    kingdomObject: Object3D,
  ): void {
    const def = getCreatureDef(creatureId);
    if (!def) return;
    entity.setValue(Creature, 'delivered', true);
    kingdom.setValue(CookieKingdom, def.kingdomFlag, true);
    const restored =
      Number(kingdom.getValue(CookieKingdom, 'ice')) +
      Number(kingdom.getValue(CookieKingdom, 'grove')) +
      Number(kingdom.getValue(CookieKingdom, 'water'));
    kingdom.setValue(CookieKingdom, 'restored', restored);
    const feast =
      restored >= 3 &&
      (kingdom.getValue(CookieKingdom, 'wafer') ?? false) &&
      (kingdom.getValue(CookieKingdom, 'cocoa') ?? false) &&
      (kingdom.getValue(CookieKingdom, 'foliage') ?? false);
    kingdom.setValue(CookieKingdom, 'feast', feast);
    playChord(def.landChord, 0.7, 0.09);
    if (feast) playChord([392, 523, 659, 784], 1.1, 0.1);
    this.stripGrab(entity);
    this.dock(entity, kingdomObject, def.deliveryTarget);
  }

  private ensureDocked(): void {
    const kingdom = this.kingdomEntity();
    const kingdomObject = kingdom?.object3D;
    if (!kingdom || !kingdomObject) return;
    for (const entity of this.queries.creatures.entities) {
      if (!entity.getValue(Creature, 'delivered')) continue;
      const def = getCreatureDef(entity.getValue(Creature, 'id') ?? '');
      if (!def) continue;
      this.stripGrab(entity);
      if (entity.object3D?.parent !== kingdomObject) {
        this.dock(entity, kingdomObject, def.deliveryTarget);
      }
    }
  }

  private dock(entity: Entity, kingdomObject: Object3D, targetName: string): void {
    const object = entity.object3D;
    const target = kingdomObject.getObjectByName(targetName);
    if (!object || !target) return;
    target.getWorldPosition(this.targetPos);
    this.targetPos.y += 0.08;
    kingdomObject.attach(object);
    kingdomObject.worldToLocal(this.targetPos);
    object.position.copy(this.targetPos);
    object.rotation.set(0, 0, 0);
    object.visible = true;
    object.scale.setScalar(0.85);
  }

  private nearestTarget(
    kingdomObject: Object3D,
    from: Vector3,
  ): { name: string; distance: number } | undefined {
    let best: { name: string; distance: number } | undefined;
    for (const name of TARGETS) {
      const target = kingdomObject.getObjectByName(name);
      if (!target) continue;
      target.getWorldPosition(this.targetPos);
      const distance = from.distanceTo(this.targetPos);
      if (distance > DELIVER_RADIUS) continue;
      if (!best || distance < best.distance) best = { name, distance };
    }
    return best;
  }

  private labelFor(target: string): string {
    if (target === 'IceGate') return 'Ice Gate';
    if (target === 'BarrenSoil') return 'Barren Soil';
    if (target === 'WaterPath') return 'Water Path';
    return target;
  }

  private updateKingdom(time: number, reduced: boolean): void {
    const kingdom = this.kingdomEntity();
    const object = kingdom?.object3D;
    if (!kingdom || !object) return;

    const globe = object.getObjectByName('Globe');
    if (globe && !reduced) globe.rotation.y = time * 0.08;

    const ice = kingdom.getValue(CookieKingdom, 'ice') ?? false;
    const grove = kingdom.getValue(CookieKingdom, 'grove') ?? false;
    const water = kingdom.getValue(CookieKingdom, 'water') ?? false;
    const wafer = kingdom.getValue(CookieKingdom, 'wafer') ?? false;
    const cocoa = kingdom.getValue(CookieKingdom, 'cocoa') ?? false;
    const foliage = kingdom.getValue(CookieKingdom, 'foliage') ?? false;
    const feast =
      kingdom.getValue(CookieKingdom, 'feast') ??
      (ice && grove && water && wafer && cocoa && foliage);
    const ready = (id: string) =>
      [...this.queries.creatures.entities].some(
        (entity) =>
          entity.getValue(Creature, 'id') === id &&
          (entity.getValue(Creature, 'hatched') ?? false) &&
          !(entity.getValue(Creature, 'delivered') ?? false),
      );

    const gate = object.getObjectByName('IceGate');
    if (gate) {
      gate.rotation.y = ice ? 1.15 : 0;
      gate.position.set(ice ? -0.13 : -0.09, ice ? 0.37 : 0.39, 0.06);
      gate.scale.set(1, ice ? 0.42 : 1, ice ? 0.7 : 1);
      this.setEmissive(gate, ICE, ice ? 0.12 : 0.45);
    }
    const puddle = object.getObjectByName('IcePuddle');
    if (puddle) puddle.visible = ice;

    const grown = object.getObjectByName('GrownCanopy');
    if (grown) {
      grown.visible = grove || foliage;
      if (grove || foliage) {
        const lush = foliage ? 1.12 : 0.92;
        grown.scale.setScalar(reduced ? lush : lush + 0.06 * Math.sin(time * 2.2));
      }
    }
    const hint = object.getObjectByName('CanopyHint');
    if (hint) hint.visible = !grove;
    const trunk = object.getObjectByName('GroveHint');
    if (trunk) trunk.scale.set(1, grove ? 1.35 : 1, 1);

    const frost = object.getObjectByName('FrozenCrossing');
    if (frost) {
      frost.visible = water;
      if (water) {
        frost.scale.set(1, 1, reduced ? 1 : 1 + 0.04 * Math.sin(time * 3));
        this.setEmissive(frost, FROST, reduced ? 0.45 : 0.45 + 0.2 * Math.sin(time * 4));
      }
    }

    const river = object.getObjectByName('ChocolateRiver');
    if (river) {
      river.scale.set(cocoa ? 1.25 : 0.85, cocoa ? 1.4 : 0.7, cocoa ? 1.2 : 0.9);
      this.setEmissive(river, cocoa ? CHOCOLATE : COOKIE, cocoa ? 0.35 : 0.04);
    }
    for (const name of ['ChocolateRiverBend', 'ChocolateRiverPool']) {
      const part = object.getObjectByName(name);
      if (part) this.setEmissive(part, cocoa ? CHOCOLATE : COOKIE, cocoa ? 0.32 : 0.04);
    }

    const bridge = object.getObjectByName('CookieBridge');
    if (bridge) {
      bridge.position.y = water ? 0.378 : 0.372;
      bridge.scale.set(1, wafer ? 1 : 0.45, 1);
      this.setEmissive(
        bridge,
        GOLD,
        wafer ? (reduced ? 0.5 : 0.55 + 0.2 * Math.sin(time * 2.4)) : 0.05,
      );
    }
    for (const plankName of ['BridgePlankA', 'BridgePlankB', 'BridgeRailL', 'BridgeRailR']) {
      const plank = object.getObjectByName(plankName);
      if (!plank) continue;
      plank.scale.setScalar(wafer ? 1 : 0.35);
      this.setEmissive(plank, COOKIE, wafer ? 0.28 : 0.04);
    }

    const central = object.getObjectByName('CentralKingdom');
    if (central) {
      this.setEmissive(central, feast ? GOLD : COOKIE, feast ? 0.55 : 0.08);
    }

    const halo = object.getObjectByName('RestoredHalo');
    if (halo) {
      halo.visible = feast;
      if (feast) {
        if (!reduced) halo.rotation.z += 0.01;
        halo.scale.setScalar(reduced ? 1 : 1 + 0.05 * Math.sin(time * 2));
        this.setEmissive(halo, GOLD, reduced ? 0.7 : 0.7 + 0.3 * Math.sin(time * 3));
      }
    }
    const citizens = object.getObjectByName('Citizens');
    if (citizens) {
      citizens.visible = feast;
      if (feast && !reduced) {
        citizens.children.forEach((child, i) => {
          child.position.y = 0.385 + Math.sin(time * 3 + i) * 0.006;
        });
      }
    }
    const motes = object.getObjectByName('RestoredMotes');
    if (motes) {
      motes.visible = feast && !reduced;
      if (feast && !reduced) this.orbit(motes, time);
    }

    this.pulsePad(object.getObjectByName('PadIce'), ready('ember-dragon') && !ice, GOLD, time, reduced);
    this.pulsePad(object.getObjectByName('PadSoil'), ready('grove-guardian') && !grove, GREEN, time, reduced);
    this.pulsePad(object.getObjectByName('PadWater'), ready('mint-current') && !water, MINT, time, reduced);
  }

  private pulsePad(
    pad: Object3D | undefined,
    active: boolean,
    color: Color,
    time: number,
    reduced: boolean,
  ): void {
    if (!pad) return;
    pad.visible = active;
    if (!active) return;
    pad.scale.setScalar(reduced ? 1 : 1 + 0.08 * Math.sin(time * 4));
    this.setEmissive(pad, color, reduced ? 0.7 : 0.55 + 0.35 * Math.sin(time * 5));
  }

  private orbit(root: Object3D, time: number): void {
    for (const child of root.children) {
      const orbit = child.userData.orbit as
        | { radius: number; speed: number; phase: number; height: number }
        | undefined;
      if (!orbit) continue;
      const angle = time * orbit.speed + orbit.phase;
      this.motePos.set(
        Math.cos(angle) * orbit.radius,
        orbit.height + Math.sin(time * 2 + orbit.phase) * 0.02,
        Math.sin(angle) * orbit.radius,
      );
      child.position.copy(this.motePos);
    }
  }

  private stripGrab(entity: Entity): void {
    if (entity.hasComponent(OneHandGrabbable)) entity.removeComponent(OneHandGrabbable);
    if (entity.hasComponent(RayInteractable)) entity.removeComponent(RayInteractable);
    if (entity.hasComponent(PokeInteractable)) entity.removeComponent(PokeInteractable);
  }

  private kingdomEntity(): Entity | undefined {
    return this.queries.kingdom.entities.values().next().value;
  }

  private missionEntity(): Entity | undefined {
    return this.queries.mission.entities.values().next().value;
  }

  private tint(object: Object3D | undefined, color: Color | null, intensity: number): void {
    if (!object) return;
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const feedback = child.userData.feedback as
        | { emissive: Color; intensity: number }
        | undefined;
      if (!feedback) return;
      const live = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of live) {
        if (!('emissive' in material) || !('emissiveIntensity' in material)) continue;
        const lit = material as MeshStandardMaterial;
        if (color) {
          lit.emissive.copy(color);
          lit.emissiveIntensity = intensity;
        } else {
          lit.emissive.copy(feedback.emissive);
          lit.emissiveIntensity = feedback.intensity;
        }
        lit.needsUpdate = true;
      }
    });
  }

  private setEmissive(object: Object3D, color: Color, intensity: number): void {
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!('emissiveIntensity' in material)) continue;
        const lit = material as MeshStandardMaterial;
        lit.emissive.copy(color);
        lit.emissiveIntensity = intensity;
      }
    });
  }
}
