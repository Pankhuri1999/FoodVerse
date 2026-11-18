import {
  Color,
  createSystem,
  Entity,
  Grabbed,
  Group,
  Hovered,
  Mesh,
  MeshStandardMaterial,
  Pressed,
  UIKit,
  UIKitMLAsset,
  Vector3,
} from '@iwsdk/core';
import { gravityHint } from './copy.js';
import { playImpact } from './kitchen-audio.js';
import { getIngredientDef } from './ingredient-catalog.js';
import {
  ComfortSettings,
  GravityCore,
  Ingredient,
  Mission,
  QuantumMixer,
  StabilizerControl,
} from './kitchen-components.js';

const REACH = { x: 1.05, yMin: 0.52, yMax: 1.52, zMin: -1.38, zMax: 0.18 };
const TABLE_Y = 0.84;
const EVENT_SECONDS = 12;
const STAB_CYAN = new Color('#3ec8e0');
const DECK_IDS = [
  'cabin-hull',
  'cook-station',
  'quantum-mixer',
  'heat-control',
  'cool-control',
  'gravity-control',
  'stir-well',
  'ingredient-left',
  'ingredient-right',
  'cookie-kingdom',
  'discovery-archive',
  'ember-dragon',
  'grove-guardian',
  'mint-current',
  'build-cookie',
  'build-chocolate',
  'build-leaf',
  'mission-hud',
  'cook-guide',
  'window-sun',
  'cove-fill',
  'key-light',
  'galley-warm',
  'starboard-fill',
];

function damp(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * delta));
}

export class GravitySystem extends createSystem({
  gravity: { required: [GravityCore] },
  items: { required: [Ingredient] },
  held: { required: [Ingredient, Grabbed] },
  mixer: { required: [QuantumMixer] },
  stab: { required: [StabilizerControl] },
  poke: { required: [StabilizerControl, Pressed] },
  hover: { required: [StabilizerControl, Hovered] },
  mission: { required: [Mission] },
  comfort: { required: [ComfortSettings] },
}) {
  private scratch = new Vector3();
  private lastStabPressed = false;
  private statusEl: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private lastStatus = '';
  private deck: Group | undefined;
  private targetRoll = 0;
  private targetPitch = 0;
  private shelfHomes = new Map<
    Entity,
    { position: Vector3; rotation: Vector3 }
  >();

  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('mission-hud');
    this.statusEl = panel?.getElementById('gravity-status') ?? undefined;
    const button = panel?.getElementById('stabilize-button');
    const onStab = () => this.pulseStabilizer();
    button?.addEventListener('click', onStab);
    this.cleanupFuncs.push(() => button?.removeEventListener('click', onStab));
    this.ensureDeck();
    this.shelfItems();
  }

  update(delta: number): void {
    const core = this.core();
    const comfort = this.queries.comfort.entities.values().next().value;
    if (!core) return;
    if (comfort?.getValue(ComfortSettings, 'paused')) return;
    const reduced = comfort?.getValue(ComfortSettings, 'reducedMotion') ?? false;

    const stabDown = this.queries.poke.entities.size > 0;
    if (stabDown && !this.lastStabPressed) this.pulseStabilizer();
    this.lastStabPressed = stabDown;
    if (this.input.keyboard.getKeyDown('KeyG')) this.pulseStabilizer();

    this.scheduleAsteroid(core, reduced, delta);
    this.consumeHit(core, reduced);
    this.maybeStartShift(core, reduced);
    this.updateTilt(delta, core, reduced);

    let stabilizeT = core.getValue(GravityCore, 'stabilizeT') ?? 0;
    if (stabilizeT > 0) {
      stabilizeT = Math.max(0, stabilizeT - delta);
      core.setValue(GravityCore, 'stabilizeT', stabilizeT);
      core.setValue(GravityCore, 'stabilizer', stabilizeT > 0);
    }
    for (const entity of this.queries.stab.entities) {
      entity.setValue(StabilizerControl, 'active', (core.getValue(GravityCore, 'stabilizer') ?? false));
    }

    let eventT = core.getValue(GravityCore, 'eventT') ?? 0;
    const eventMode = core.getValue(GravityCore, 'eventMode') || 'zero-g';
    if (eventT > 0 && !(core.getValue(GravityCore, 'stabilizer') ?? false) && !reduced) {
      eventT = Math.max(0, eventT - delta);
      core.setValue(GravityCore, 'eventT', eventT);
      if (eventT <= 0) {
        core.setValue(GravityCore, 'mode', 'normal');
        core.setValue(GravityCore, 'gx', 0);
        core.setValue(GravityCore, 'gy', 0);
        core.setValue(GravityCore, 'gz', 0);
        this.targetRoll = 0;
        this.targetPitch = 0;
      } else {
        core.setValue(GravityCore, 'mode', eventMode);
      }
    } else if (reduced || core.getValue(GravityCore, 'stabilizer')) {
      core.setValue(GravityCore, 'mode', 'normal');
      core.setValue(GravityCore, 'gx', 0);
      core.setValue(GravityCore, 'gy', 0);
      core.setValue(GravityCore, 'gz', 0);
      this.targetRoll = 0;
      this.targetPitch = 0;
    }

    this.shelfItems();
    if (!reduced || (core.getValue(GravityCore, 'stabilizer') ?? false)) {
      this.driftItems(delta, core);
    }
    this.refreshStatus(core, reduced);
  }

  private ensureDeck(): void {
    if (this.deck) return;
    const deck = new Group();
    deck.name = 'ShipDeck';
    deck.position.set(0, 1.05, -0.2);
    this.world.scene.add(deck);
    for (const id of DECK_IDS) {
      const object = this.world.getSceneObject(id);
      if (object) deck.attach(object);
    }
    this.deck = deck;
    this.shelfItems();
  }

  private isParked(entity: Entity): boolean {
    return (
      !(entity.getValue(Ingredient, 'loose') ?? false) &&
      !(entity.getValue(Ingredient, 'inMixer') ?? false) &&
      !entity.hasComponent(Grabbed) &&
      !(entity.getValue(Ingredient, 'consumed') ?? false)
    );
  }

  private shelfItems(): void {
    const deck = this.deck;
    if (!deck) return;
    for (const entity of this.queries.items.entities) {
      if (!this.isParked(entity)) continue;
      const object = entity.object3D;
      if (!object) continue;
      if (object.parent !== deck) deck.attach(object);
      let home = this.shelfHomes.get(entity);
      if (!home) {
        home = {
          position: object.position.clone(),
          rotation: new Vector3(object.rotation.x, object.rotation.y, object.rotation.z),
        };
        this.shelfHomes.set(entity, home);
      }
      object.position.copy(home.position);
      object.rotation.set(home.rotation.x, home.rotation.y, home.rotation.z);
    }
  }

  private scheduleAsteroid(core: Entity, reduced: boolean, delta: number): void {
    if (reduced) return;
    if (core.getValue(GravityCore, 'incoming') ?? false) return;
    if ((core.getValue(GravityCore, 'eventT') ?? 0) > 0) return;
    if (core.getValue(GravityCore, 'stabilizer') ?? false) return;
    let next = core.getValue(GravityCore, 'nextImpactT') ?? 7;
    next -= delta;
    if (next > 0) {
      core.setValue(GravityCore, 'nextImpactT', next);
      return;
    }
    const sides = ['port', 'starboard', 'bow'] as const;
    const side = sides[Math.floor(Math.random() * sides.length)] ?? 'port';
    core.setValue(GravityCore, 'impactSide', side);
    core.setValue(GravityCore, 'incoming', true);
    core.setValue(GravityCore, 'hit', false);
    core.setValue(GravityCore, 'nextImpactT', 16 + Math.random() * 8);
    const mission = this.queries.mission.entities.values().next().value;
    mission?.setValue(Mission, 'notice', 'Asteroid inbound. Brace, then catch loose food.');
    mission?.setValue(Mission, 'noticeT', 4);
  }

  private consumeHit(core: Entity, reduced: boolean): void {
    if (!(core.getValue(GravityCore, 'hit') ?? false)) return;
    core.setValue(GravityCore, 'hit', false);
    core.setValue(GravityCore, 'incoming', false);
    if (reduced) return;
    const side = core.getValue(GravityCore, 'impactSide') || 'port';
    playImpact();
    if (side === 'starboard') {
      this.beginPull(
        core,
        'list',
        0.55,
        0.16,
        0.04,
        0,
        -0.22,
        'ASTEROID HIT. Ship lists starboard. Catch the food or poke Stabilizer (G).',
      );
    } else if (side === 'bow') {
      this.beginPull(
        core,
        'zero-g',
        0.06,
        0.28,
        -0.18,
        0.12,
        0,
        'ASTEROID HIT. Zero-G jolt. Catch floating food or poke Stabilizer (G).',
      );
    } else {
      this.beginPull(
        core,
        'list',
        -0.55,
        0.16,
        0.04,
        0,
        0.22,
        'ASTEROID HIT. Ship lists to port. Catch the food or poke Stabilizer (G).',
      );
    }
  }

  private maybeStartShift(core: Entity, reduced: boolean): void {
    const stage = this.queries.mission.entities.values().next().value?.getValue(Mission, 'stage') ?? '';
    const mixer = this.queries.mixer.entities.values().next().value;
    const hot = mixer?.getValue(QuantumMixer, 'temperature') === 'hot';
    const cold = mixer?.getValue(QuantumMixer, 'temperature') === 'cold';
    const cooking = mixer?.getValue(QuantumMixer, 'cooking') ?? false;
    const ember = stage === 'cook-ember' || stage === 'collect-ember';
    const mint = stage === 'cook-mint' || stage === 'collect-mint';
    if (ember && (hot || cooking) && !(core.getValue(GravityCore, 'fired') ?? false)) {
      this.beginPull(
        core,
        'zero-g',
        0.05,
        0.22,
        0,
        0.06,
        0,
        'GRAVITY SHIFT. Zero-G. Catch food or poke Stabilizer (G).',
      );
      core.setValue(GravityCore, 'fired', true);
    }
    if (mint && (cold || cooking) && !(core.getValue(GravityCore, 'reversed') ?? false)) {
      this.beginPull(
        core,
        'reverse',
        0,
        0.48,
        0,
        -0.04,
        0.08,
        'GRAVITY REVERSAL. Food lifts. Catch it or poke Stabilizer (G).',
      );
      core.setValue(GravityCore, 'reversed', true);
    }
  }

  private beginPull(
    core: Entity,
    mode: string,
    gx: number,
    gy: number,
    gz: number,
    pitch: number,
    roll: number,
    notice: string,
  ): void {
    const reduced =
      this.queries.comfort.entities.values().next().value?.getValue(ComfortSettings, 'reducedMotion') ??
      false;
    if (reduced) return;
    core.setValue(GravityCore, 'eventMode', mode);
    core.setValue(GravityCore, 'eventT', EVENT_SECONDS);
    core.setValue(GravityCore, 'mode', mode);
    core.setValue(GravityCore, 'gx', gx);
    core.setValue(GravityCore, 'gy', gy);
    core.setValue(GravityCore, 'gz', gz);
    this.targetPitch = pitch;
    this.targetRoll = roll;
    let i = 0;
    for (const entity of this.queries.items.entities) {
      if (entity.getValue(Ingredient, 'consumed')) continue;
      if (entity.hasComponent(Grabbed)) continue;
      if (!(entity.getValue(Ingredient, 'loose') ?? false)) continue;
      const phy = getIngredientDef(entity.getValue(Ingredient, 'id') ?? '')?.physics;
      const mass = Math.max(0.2, phy?.mass ?? 1);
      const kick = 0.55 / mass;
      entity.setValue(Ingredient, 'driftX', gx * kick + ((i % 2) * 2 - 1) * 0.08);
      entity.setValue(Ingredient, 'driftY', gy * kick * 0.65 + 0.04);
      entity.setValue(Ingredient, 'driftZ', gz * kick + ((i % 3) - 1) * 0.05);
      i += 1;
    }
    const mission = this.queries.mission.entities.values().next().value;
    mission?.setValue(Mission, 'notice', notice);
    mission?.setValue(Mission, 'noticeT', 8);
  }

  private updateTilt(delta: number, core: Entity, reduced: boolean): void {
    const deck = this.deck;
    if (!deck) return;
    if (reduced) {
      deck.rotation.x = 0;
      deck.rotation.z = 0;
      return;
    }
    if (core.getValue(GravityCore, 'stabilizer')) {
      this.targetRoll = 0;
      this.targetPitch = 0;
    }
    deck.rotation.z = damp(deck.rotation.z, this.targetRoll, 3.2, delta);
    deck.rotation.x = damp(deck.rotation.x, this.targetPitch, 3.2, delta);
  }

  private driftItems(delta: number, core: Entity): void {
    const cooking = this.queries.mixer.entities.values().next().value?.getValue(QuantumMixer, 'cooking') ?? false;
    const stabilize = core.getValue(GravityCore, 'stabilizer') ?? false;
    const gx = core.getValue(GravityCore, 'gx') ?? 0;
    const gy = core.getValue(GravityCore, 'gy') ?? 0;
    const gz = core.getValue(GravityCore, 'gz') ?? 0;
    for (const entity of this.queries.items.entities) {
      if (entity.getValue(Ingredient, 'consumed')) continue;
      if (entity.hasComponent(Grabbed)) continue;
      if (!(entity.getValue(Ingredient, 'loose') ?? false)) continue;
      if (cooking && (entity.getValue(Ingredient, 'inMixer') ?? false)) continue;
      const object = entity.object3D;
      if (!object) continue;
      const phy = getIngredientDef(entity.getValue(Ingredient, 'id') ?? '')?.physics;
      const mass = Math.max(0.18, phy?.mass ?? 1);
      const buoy = phy?.buoyancy ?? 0.5;
      const drag = phy?.drag ?? 0.4;
      const sticky = phy?.sticky ?? 0;
      object.getWorldPosition(this.scratch);
      let vx = entity.getValue(Ingredient, 'driftX') ?? 0;
      let vy = entity.getValue(Ingredient, 'driftY') ?? 0;
      let vz = entity.getValue(Ingredient, 'driftZ') ?? 0;
      if (stabilize) {
        vy += (TABLE_Y - this.scratch.y) * 2.4 * delta;
        vx *= 0.9;
        vz *= 0.9;
      } else {
        vx += (gx * buoy) / mass * delta;
        vy += (gy * buoy) / mass * delta;
        vz += (gz * buoy) / mass * delta;
      }
      const cling = 1 - sticky * 0.7;
      this.scratch.x += vx * cling * delta;
      this.scratch.y += vy * cling * delta;
      this.scratch.z += vz * cling * delta;
      if (this.scratch.x > REACH.x || this.scratch.x < -REACH.x) vx *= -0.55;
      if (this.scratch.y > REACH.yMax || this.scratch.y < REACH.yMin) vy *= -0.55;
      if (this.scratch.z > REACH.zMax || this.scratch.z < REACH.zMin) vz *= -0.55;
      this.scratch.x = Math.min(REACH.x, Math.max(-REACH.x, this.scratch.x));
      this.scratch.y = Math.min(REACH.yMax, Math.max(REACH.yMin, this.scratch.y));
      this.scratch.z = Math.min(REACH.zMax, Math.max(REACH.zMin, this.scratch.z));
      object.position.copy(this.scratch);
      if (object.parent) object.parent.worldToLocal(object.position);
      object.rotation.z += vx * 1.8 * delta;
      object.rotation.x += vz * 1.4 * delta;
      const dampV = stabilize ? 0.86 : 0.997 - drag * 0.01;
      entity.setValue(Ingredient, 'driftX', vx * dampV);
      entity.setValue(Ingredient, 'driftY', vy * dampV);
      entity.setValue(Ingredient, 'driftZ', vz * dampV);
    }
  }

  private pulseStabilizer(): void {
    const core = this.core();
    if (!core) return;
    core.setValue(GravityCore, 'stabilizer', true);
    core.setValue(GravityCore, 'stabilizeT', 6);
    core.setValue(GravityCore, 'mode', 'normal');
    core.setValue(GravityCore, 'gx', 0);
    core.setValue(GravityCore, 'gy', 0);
    core.setValue(GravityCore, 'gz', 0);
    this.targetRoll = 0;
    this.targetPitch = 0;
  }

  private refreshStatus(core: Entity, reduced: boolean): void {
    const stab = core.getValue(GravityCore, 'stabilizer') ?? false;
    this.tintStabilizer(stab);
    const mode = core.getValue(GravityCore, 'mode') ?? 'normal';
    const incoming = core.getValue(GravityCore, 'incoming') ?? false;
    const text = gravityHint({ reduced, stabilizer: stab, incoming, mode });
    if (text === this.lastStatus) return;
    this.lastStatus = text;
    if (!this.statusEl) return;
    const target =
      this.statusEl instanceof UIKit.Text
        ? this.statusEl
        : this.statusEl.children.find((child): child is UIKit.Text => child instanceof UIKit.Text);
    target?.setProperties({ text });
  }

  private tintStabilizer(active: boolean): void {
    for (const entity of this.queries.stab.entities) {
      const knob = entity.object3D?.getObjectByName('StabKnob');
      if (!knob) continue;
      knob.position.y = active ? 0.048 : 0.04;
      knob.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (!('emissiveIntensity' in material)) continue;
          const lit = material as MeshStandardMaterial;
          lit.emissive.copy(STAB_CYAN);
          lit.emissiveIntensity = active ? 1.35 : 0.4;
        }
      });
    }
  }

  private core(): Entity | undefined {
    return this.queries.gravity.entities.values().next().value;
  }
}
