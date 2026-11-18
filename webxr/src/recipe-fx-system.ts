import {
  Color,
  createSystem,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OneHandGrabbable,
  PokeInteractable,
  RayInteractable,
  Vector3,
} from '@iwsdk/core';
import { getCreatureDef } from './creature-catalog.js';
import { ComfortSettings, CoolControl, Creature, HeatControl, QuantumMixer, StirWell } from './kitchen-components.js';
import { RECIPES } from './recipe-catalog.js';

const ORANGE = new Color('#ff6a20');
const CYAN = new Color('#3ec8e0');
const GOLD = new Color('#e0b24a');
const GREEN = new Color('#4a9a58');
const MINT = new Color('#7ec8b0');

export class RecipeFxSystem extends createSystem({
  mixer: { required: [QuantumMixer] },
  heat: { required: [HeatControl] },
  cool: { required: [CoolControl] },
  well: { required: [StirWell] },
  creatures: { required: [Creature] },
  comfort: { required: [ComfortSettings] },
}) {
  private motePos = new Vector3();
  private hatchedGrab = new Set<string>();

  update(delta: number, time: number): void {
    const mixer = this.queries.mixer.entities.values().next().value;
    const object = mixer?.object3D;
    if (!mixer || !object) return;
    const comfort = this.queries.comfort.entities.values().next().value;
    if (comfort?.getValue(ComfortSettings, 'paused')) return;
    const reduced = comfort?.getValue(ComfortSettings, 'reducedMotion') ?? false;
    const amp = reduced ? 0 : 1;

    const temp = mixer.getValue(QuantumMixer, 'temperature') ?? 'neutral';
    const hot = temp === 'hot';
    const cold = temp === 'cold';
    const stirring = mixer.getValue(QuantumMixer, 'stirring') ?? false;
    const stir = mixer.getValue(QuantumMixer, 'stir') ?? 0;
    const phase = mixer.getValue(QuantumMixer, 'phase') ?? 'idle';
    const transformT = mixer.getValue(QuantumMixer, 'transformT') ?? 0;
    const armed = mixer.getValue(QuantumMixer, 'armed') ?? false;
    const pending = mixer.getValue(QuantumMixer, 'pendingRecipe') ?? '';
    const mixing = stirring || phase === 'transforming';
    const recipeId = pending;
    const accent = this.accentFor(recipeId);

    const glow = object.getObjectByName('BowlHeatGlow');
    if (glow) {
      const showHeat = hot || (phase === 'transforming' && recipeId === 'ember-spark');
      glow.visible = showHeat;
      const pulse = hot ? 0.9 + 0.25 * amp * Math.sin(time * 6) : 0;
      glow.scale.setScalar(phase === 'transforming' && recipeId === 'ember-spark' ? 1 + transformT * 0.6 : 1);
      this.setEmissive(glow, ORANGE, showHeat ? (phase === 'transforming' ? 1.4 : pulse) : 0);
    }

    const coolGlow = object.getObjectByName('BowlCoolGlow');
    if (coolGlow) {
      const showCool = cold || (phase === 'transforming' && recipeId === 'mint-current');
      coolGlow.visible = showCool;
      const pulse = cold ? 0.85 + 0.22 * amp * Math.sin(time * 5) : 0;
      coolGlow.scale.setScalar(phase === 'transforming' && recipeId === 'mint-current' ? 1 + transformT * 0.55 : 1);
      this.setEmissive(coolGlow, CYAN, showCool ? (phase === 'transforming' ? 1.3 : pulse) : 0);
    }

    const ready = object.getObjectByName('ReadyHalo');
    if (ready) {
      const show = (armed && stir >= 0.3) || phase === 'transforming';
      ready.visible = show;
      this.setEmissive(ready, accent, show ? 0.8 + 0.5 * amp * Math.sin(time * 5) : 0.15);
      if (!reduced) ready.rotation.y += delta * 1.4;
    }

    const energized = mixing || hot || cold;
    this.spinRing(object.getObjectByName('EnergyRingCyan'), mixing ? 1.4 : energized ? 0.9 : 0.35, delta * (mixing ? 1.6 : 0.7));
    this.spinRing(object.getObjectByName('EnergyRingViolet'), mixing ? 1.2 : energized ? 0.8 : 0.3, -delta * (mixing ? 1.3 : 0.55));
    this.spinRing(object.getObjectByName('RimLight'), energized ? 1.1 : 0.4, delta * 0.4);
    const blades = object.getObjectByName('MixerBlades');
    if (blades && !reduced) {
      blades.rotation.y += delta * (mixing ? 14 : energized ? 3.2 : 0.4);
    }

    const contents = object.getObjectByName('Contents');
    if (contents) {
      const speed = phase === 'transforming' ? 3.2 : stirring ? 2.2 : 0.25;
      contents.rotation.y += delta * speed;
      const shrink = phase === 'transforming' ? Math.max(0.05, 1 - transformT) : 1;
      contents.scale.setScalar(shrink);
    }

    const emberMix = mixing && recipeId === 'ember-spark';
    const groveMix = mixing && recipeId === 'grove-bloom';
    const mintMix = mixing && recipeId === 'mint-current';
    this.toggleOrbit(object.getObjectByName('MixParticles'), !reduced && (emberMix || (mixing && !recipeId)), time, phase === 'transforming' ? 1.6 : 1);
    this.toggleOrbit(object.getObjectByName('GroveMotes'), !reduced && groveMix, time, phase === 'transforming' ? 1.4 : 0.9);
    this.toggleOrbit(object.getObjectByName('FrostMotes'), !reduced && mintMix, time, phase === 'transforming' ? 1.8 : 1.1);

    const tempFill = object.getObjectByName('TempFill');
    if (tempFill) {
      tempFill.scale.set(1, hot || cold ? 1 : 0.08, 1);
      this.setEmissive(tempFill, cold ? CYAN : ORANGE, hot || cold ? 0.8 : 0.15);
    }

    const stirFill = object.getObjectByName('StirFill');
    if (stirFill) {
      const amount = Math.max(0.04, Math.min(1, stir / 0.45));
      stirFill.scale.set(amount, 1, 1);
      stirFill.position.x = -0.055 * (1 - amount);
      this.setEmissive(stirFill, accent, armed ? 0.7 : 0.25);
    }

    this.tintHeatKnob(hot);
    this.tintCoolKnob(cold);
    this.tintStirWell(armed);
    this.updateCreatures(time, phase, transformT, pending);
  }

  private accentFor(recipeId: string): Color {
    if (recipeId === 'grove-bloom') return GREEN;
    if (recipeId === 'mint-current') return MINT;
    return GOLD;
  }

  private tintHeatKnob(hot: boolean): void {
    for (const entity of this.queries.heat.entities) {
      const knob = entity.object3D?.getObjectByName('HeatKnob');
      if (!knob) continue;
      this.setEmissive(knob, ORANGE, hot ? 1.3 : 0.3);
      knob.position.y = hot ? 0.048 : 0.04;
    }
  }

  private tintCoolKnob(cold: boolean): void {
    for (const entity of this.queries.cool.entities) {
      const knob = entity.object3D?.getObjectByName('CoolKnob');
      if (!knob) continue;
      this.setEmissive(knob, CYAN, cold ? 1.25 : 0.28);
      knob.position.y = cold ? 0.048 : 0.04;
    }
  }

  private tintStirWell(armed: boolean): void {
    for (const entity of this.queries.well.entities) {
      const disc = entity.object3D?.getObjectByName('WellDisc');
      if (!disc) continue;
      this.setEmissive(disc, CYAN, armed ? 0.45 : 0.08);
    }
  }

  private updateCreatures(time: number, phase: string, transformT: number, pendingRecipe: string): void {
    const emergingId = RECIPES.find((recipe) => recipe.id === pendingRecipe)?.creatureId;
    for (const entity of this.queries.creatures.entities) {
      const object = entity.object3D;
      if (!object) continue;
      const id = entity.getValue(Creature, 'id') ?? '';
      const hatched = entity.getValue(Creature, 'hatched') ?? false;
      const delivered = entity.getValue(Creature, 'delivered') ?? false;
      const emerging = phase === 'transforming' && transformT > 0.4 && emergingId === id;
      if (!hatched && !emerging) {
        this.hatchedGrab.delete(id);
        object.visible = false;
        object.scale.setScalar(0.001);
        continue;
      }
      object.visible = true;
      if (!delivered) {
        const scale = hatched ? 1 : Math.max(0.001, (transformT - 0.4) / 0.6);
        object.scale.setScalar(scale);
      }
      if (hatched && !delivered && id && !entity.hasComponent(OneHandGrabbable)) {
        entity.addComponent(OneHandGrabbable, { translate: true, rotate: true });
        if (!entity.hasComponent(RayInteractable)) entity.addComponent(RayInteractable);
        if (!entity.hasComponent(PokeInteractable)) entity.addComponent(PokeInteractable);
        this.hatchedGrab.add(id);
      }
      const motion = object.getObjectByName('Motion');
      const def = getCreatureDef(id);
      if (motion && hatched) {
        const bob = def?.idle === 'flow' ? 0.012 : 0.008;
        const speed = def?.idle === 'sway' ? 2.4 : 4;
        motion.position.y = Math.sin(time * speed) * bob;
      }
    }
  }

  private toggleOrbit(root: Object3D | undefined, visible: boolean, time: number, boost: number): void {
    if (!root) return;
    root.visible = visible;
    if (visible) this.orbitParticles(root, time, boost);
  }

  private orbitParticles(root: Object3D, time: number, boost: number): void {
    for (const child of root.children) {
      const orbit = child.userData.orbit as
        | { radius: number; speed: number; phase: number; height: number }
        | undefined;
      if (!orbit) continue;
      const angle = time * orbit.speed * boost + orbit.phase;
      this.motePos.set(
        Math.cos(angle) * orbit.radius,
        orbit.height + Math.sin(time * 5 + orbit.phase) * 0.02,
        Math.sin(angle) * orbit.radius,
      );
      child.position.copy(this.motePos);
    }
  }

  private spinRing(object: Object3D | undefined, intensity: number, spin: number): void {
    if (!object) return;
    object.rotation.y += spin;
    this.setEmissive(object, undefined, intensity);
  }

  private setEmissive(object: Object3D, color: Color | undefined, intensity: number): void {
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!('emissiveIntensity' in material)) continue;
        const lit = material as MeshStandardMaterial;
        if (color) lit.emissive.copy(color);
        lit.emissiveIntensity = intensity;
      }
    });
  }
}
