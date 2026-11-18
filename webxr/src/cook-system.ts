import {
  createSystem,
  Entity,
  Grabbed,
  Hovered,
  Pressed,
  UIKit,
  UIKitMLAsset,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { stirLine, temperatureLine } from './copy.js';
import { getCreatureDef } from './creature-catalog.js';
import { getIngredientDef, MIXER_BOWL } from './ingredient-catalog.js';
import { playChord } from './kitchen-audio.js';
import {
  ComfortSettings,
  CoolControl,
  Creature,
  GravityCore,
  HeatControl,
  Ingredient,
  Mission,
  QuantumMixer,
  StirWell,
} from './kitchen-components.js';
import { handIsPinching } from './pinch-input.js';
import {
  contentsMatch,
  recipeById,
  recipeForContents,
  RecipeDef,
  temperatureMet,
} from './recipe-catalog.js';

const STIR_METERS = 1;
const KEYBOARD_STIR = 0.55;
const TRANSFORM_SECONDS = 1.55;

export class CookSystem extends createSystem({
  mixer: { required: [QuantumMixer] },
  items: { required: [Ingredient] },
  held: { required: [Ingredient, Grabbed] },
  heat: { required: [HeatControl] },
  cool: { required: [CoolControl] },
  well: { required: [StirWell] },
  creatures: { required: [Creature] },
  mission: { required: [Mission] },
  comfort: { required: [ComfortSettings] },
  gravity: { required: [GravityCore] },
}) {
  private lastHeatPressed = false;
  private lastCoolPressed = false;
  private lastTip = new Vector3();
  private tipScratch = new Vector3();
  private hasLastTip = false;
  private bowlWorld = new Vector3();
  private tipWorld = new Vector3();
  private mixerLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private tempLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private stirLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private pendingSpiral = false;

  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('mission-hud');
    this.mixerLabel = panel?.getElementById('mixer-status') ?? undefined;
    this.tempLabel = panel?.getElementById('temp-status') ?? undefined;
    this.stirLabel = panel?.getElementById('stir-progress') ?? undefined;
    const heatButton = panel?.getElementById('heat-button');
    const coolButton = panel?.getElementById('cool-button');
    const onHeat = () => this.setTemperature('hot');
    const onCool = () => this.setTemperature('cold');
    heatButton?.addEventListener('click', onHeat);
    coolButton?.addEventListener('click', onCool);
    this.cleanupFuncs.push(
      () => heatButton?.removeEventListener('click', onHeat),
      () => coolButton?.removeEventListener('click', onCool),
    );
  }

  update(delta: number): void {
    const mixer = this.mixerEntity();
    if (!mixer) return;
    const paused = this.comfortEntity()?.getValue(ComfortSettings, 'paused') ?? false;
    if (paused) {
      this.refreshHud(mixer, this.contentIds(), recipeForContents(this.contentIds(), this.allowedRecipe()));
      return;
    }

    const heatDown = this.controlPressed(this.queries.heat.entities);
    if (heatDown && !this.lastHeatPressed) this.setTemperature('hot');
    this.lastHeatPressed = heatDown;
    const coolDown = this.controlPressed(this.queries.cool.entities);
    if (coolDown && !this.lastCoolPressed) this.setTemperature('cold');
    this.lastCoolPressed = coolDown;
    if (this.input.keyboard.getKeyDown('KeyH')) this.setTemperature('hot');
    if (this.input.keyboard.getKeyDown('KeyC')) this.setTemperature('cold');

    const ids = this.contentIds();
    const allowed = this.allowedRecipe();
    const candidate = recipeForContents(ids, allowed);
    const temp = mixer.getValue(QuantumMixer, 'temperature') ?? 'neutral';
    const phase = mixer.getValue(QuantumMixer, 'phase') ?? 'idle';

    if (phase === 'transforming') {
      this.advanceTransform(mixer, delta);
      this.syncTempKnobs(temp);
      this.refreshHud(mixer, ids, candidate);
      return;
    }

    mixer.setValue(QuantumMixer, 'pendingRecipe', candidate?.id ?? '');
    if (!candidate) {
      mixer.setValue(QuantumMixer, 'stir', 0);
      mixer.setValue(QuantumMixer, 'stirring', false);
      mixer.setValue(QuantumMixer, 'armed', false);
      mixer.setValue(QuantumMixer, 'phase', 'idle');
      this.hasLastTip = false;
    }

    const hot = temp === 'hot';
    for (const entity of this.queries.items.entities) {
      const inMixer = entity.getValue(Ingredient, 'inMixer') ?? false;
      entity.setValue(Ingredient, 'heated', inMixer && hot);
    }

    const tempOk = candidate ? temperatureMet(candidate, temp) : false;
    const canStir = Boolean(candidate && tempOk && this.queries.held.entities.size === 0);
    mixer.setValue(QuantumMixer, 'armed', Boolean(candidate && tempOk));
    const stirring = canStir && this.isStirring();
    mixer.setValue(QuantumMixer, 'stirring', stirring);
    mixer.setValue(
      QuantumMixer,
      'phase',
      candidate ? (tempOk ? (stirring ? 'mixing' : 'ready') : 'need-temp') : 'idle',
    );

    const well = this.queries.well.entities.values().next().value;
    well?.setValue(StirWell, 'armed', canStir);

    if (stirring) {
      let next = mixer.getValue(QuantumMixer, 'stir') ?? 0;
      const desktop = this.visibilityState.value === VisibilityState.NonImmersive;
      const wellHover = [...this.queries.well.entities].some(
        (entity) => entity.hasComponent(Hovered) || entity.hasComponent(Pressed),
      );
      if (this.input.keyboard.getKeyPressed('KeyS') || (desktop && wellHover)) {
        next += KEYBOARD_STIR * delta;
      } else {
        next += this.handStirDelta();
      }
      mixer.setValue(QuantumMixer, 'stir', Math.min(1, next));
    } else {
      this.hasLastTip = false;
    }

    const stir = mixer.getValue(QuantumMixer, 'stir') ?? 0;
    const recipe = recipeForContents(ids, allowed);
    if (recipe && temperatureMet(recipe, temp) && stir >= recipe.minStir) {
      this.beginTransform(mixer, recipe);
    }

    this.syncTempKnobs(temp);
    this.refreshHud(mixer, ids, candidate);
  }

  private mixerEntity(): Entity | undefined {
    return this.queries.mixer.entities.values().next().value;
  }

  private contentIds(): string[] {
    return [...this.queries.items.entities]
      .filter((item) => item.getValue(Ingredient, 'inMixer'))
      .map((item) => item.getValue(Ingredient, 'id') ?? '');
  }

  private setTemperature(next: 'hot' | 'cold'): void {
    const mixer = this.mixerEntity();
    if (!mixer) return;
    const phase = mixer.getValue(QuantumMixer, 'phase') ?? 'idle';
    if (phase === 'transforming') return;
    const current = mixer.getValue(QuantumMixer, 'temperature') ?? 'neutral';
    mixer.setValue(QuantumMixer, 'temperature', current === next ? 'neutral' : next);
  }

  private controlPressed(entities: Set<Entity>): boolean {
    for (const entity of entities) {
      if (entity.hasComponent(Pressed)) return true;
    }
    return false;
  }

  private isStirring(): boolean {
    if (this.input.keyboard.getKeyPressed('KeyS')) return true;
    for (const entity of this.queries.well.entities) {
      if (entity.hasComponent(Hovered) || entity.hasComponent(Pressed)) return true;
    }
    return this.handOverBowl() && !this.handPinching();
  }

  private handPinching(): boolean {
    const ease = this.comfortEntity()?.getValue(ComfortSettings, 'pinchEase') ?? 0.5;
    return handIsPinching(this.input, ease);
  }

  private handOverBowl(): boolean {
    const mixerObject = this.mixerEntity()?.object3D;
    if (!mixerObject) return false;
    this.bowlWorld.set(0, MIXER_BOWL.localY, 0);
    mixerObject.localToWorld(this.bowlWorld);
    return this.eachTip((tip) => {
      const dx = tip.x - this.bowlWorld.x;
      const dy = tip.y - this.bowlWorld.y;
      const dz = tip.z - this.bowlWorld.z;
      return dx * dx + dz * dz <= 0.18 * 0.18 && Math.abs(dy) < 0.16;
    });
  }

  private eachTip(test: (tip: Vector3) => boolean): boolean {
    for (const side of ['left', 'right'] as const) {
      this.player.indexTipSpaces[side].getWorldPosition(this.tipWorld);
      if (test(this.tipWorld)) return true;
    }
    return false;
  }

  private handStirDelta(): number {
    const mixerObject = this.mixerEntity()?.object3D;
    if (!mixerObject) return 0;
    this.bowlWorld.set(0, MIXER_BOWL.localY, 0);
    mixerObject.localToWorld(this.bowlWorld);
    let found = false;
    let bestDist = Infinity;
    const ease = this.comfortEntity()?.getValue(ComfortSettings, 'pinchEase') ?? 0.5;
    const commit = ease;
    for (const side of ['left', 'right'] as const) {
      if (handIsPinching(this.input, commit) && this.input.xr.getSelectState(side).active) continue;
      this.player.indexTipSpaces[side].getWorldPosition(this.tipWorld);
      const dx = this.tipWorld.x - this.bowlWorld.x;
      const dy = this.tipWorld.y - this.bowlWorld.y;
      const dz = this.tipWorld.z - this.bowlWorld.z;
      if (dx * dx + dz * dz > 0.18 * 0.18 || Math.abs(dy) > 0.16) continue;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < bestDist) {
        bestDist = dist;
        this.tipScratch.copy(this.tipWorld);
        found = true;
      }
    }
    if (!found) {
      this.hasLastTip = false;
      return 0;
    }
    if (!this.hasLastTip) {
      this.lastTip.copy(this.tipScratch);
      this.hasLastTip = true;
      return 0;
    }
    const travel = this.tipScratch.distanceTo(this.lastTip);
    this.lastTip.copy(this.tipScratch);
    return travel / STIR_METERS;
  }

  private beginTransform(mixer: Entity, recipe: RecipeDef): void {
    mixer.setValue(QuantumMixer, 'cooking', true);
    mixer.setValue(QuantumMixer, 'stirring', false);
    mixer.setValue(QuantumMixer, 'phase', 'transforming');
    mixer.setValue(QuantumMixer, 'transformT', 0);
    mixer.setValue(QuantumMixer, 'pendingRecipe', recipe.id);
    const gravity = this.queries.gravity.entities.values().next().value;
    this.pendingSpiral = (gravity?.getValue(GravityCore, 'mode') ?? 'normal') !== 'normal';
  }

  private advanceTransform(mixer: Entity, delta: number): void {
    const next = Math.min(1, (mixer.getValue(QuantumMixer, 'transformT') ?? 0) + delta / TRANSFORM_SECONDS);
    mixer.setValue(QuantumMixer, 'transformT', next);
    if (next < 1) return;
    this.finishRecipe(mixer);
  }

  private finishRecipe(mixer: Entity): void {
    const recipeId = mixer.getValue(QuantumMixer, 'pendingRecipe') ?? '';
    const recipe = recipeById(recipeId);
    const ids = this.contentIds();
    const temp = mixer.getValue(QuantumMixer, 'temperature') ?? 'neutral';
    const resolved =
      recipe && contentsMatch(recipe, ids) && temperatureMet(recipe, temp) ? recipe : undefined;
    mixer.setValue(QuantumMixer, 'cooking', false);
    mixer.setValue(QuantumMixer, 'stirring', false);
    mixer.setValue(QuantumMixer, 'armed', false);
    if (!resolved) {
      this.pendingSpiral = false;
      mixer.setValue(QuantumMixer, 'phase', 'idle');
      mixer.setValue(QuantumMixer, 'pendingRecipe', '');
      mixer.setValue(QuantumMixer, 'transformT', 0);
      return;
    }
    for (const entity of this.queries.items.entities) {
      if (!entity.getValue(Ingredient, 'inMixer')) continue;
      const object = entity.object3D;
      if (object) {
        if (object.parent?.name === 'Contents') {
          const level = this.world.activeLevel.value?.object3D ?? this.scene;
          level.attach(object);
        }
        object.visible = false;
      }
      entity.setValue(Ingredient, 'inMixer', false);
      entity.setValue(Ingredient, 'heated', false);
      entity.setValue(Ingredient, 'consumed', true);
    }
    mixer.setValue(QuantumMixer, 'stir', 0);
    mixer.setValue(QuantumMixer, 'temperature', 'neutral');
    mixer.setValue(QuantumMixer, 'count', 0);
    mixer.setValue(QuantumMixer, 'phase', 'idle');
    mixer.setValue(QuantumMixer, 'transformT', 1);
    for (const creature of this.queries.creatures.entities) {
      if (creature.getValue(Creature, 'id') !== resolved.creatureId) continue;
      if (creature.getValue(Creature, 'hatched')) continue;
      creature.setValue(Creature, 'hatched', true);
      creature.setValue(Creature, 'recipeId', resolved.id);
      creature.setValue(Creature, 'delivered', false);
      creature.setValue(Creature, 'spiral', this.pendingSpiral);
      const def = getCreatureDef(resolved.creatureId);
      if (def) playChord(def.hatchChord, 0.55, 0.08);
    }
    mixer.setValue(QuantumMixer, 'pendingRecipe', '');
    this.pendingSpiral = false;
  }

  private syncTempKnobs(temp: string): void {
    for (const entity of this.queries.heat.entities) {
      entity.setValue(HeatControl, 'active', temp === 'hot');
    }
    for (const entity of this.queries.cool.entities) {
      entity.setValue(CoolControl, 'active', temp === 'cold');
    }
  }

  private refreshHud(mixer: Entity, ids: string[], candidate: RecipeDef | undefined): void {
    const stir = mixer.getValue(QuantumMixer, 'stir') ?? 0;
    const temp = mixer.getValue(QuantumMixer, 'temperature') ?? 'neutral';
    const phase = mixer.getValue(QuantumMixer, 'phase') ?? 'idle';
    const pending = mixer.getValue(QuantumMixer, 'pendingRecipe') ?? '';
    const desktop = this.visibilityState.value === VisibilityState.NonImmersive;
    let mixerText: string;
    if (phase === 'transforming') {
      mixerText = `${this.titleFor(pending)} is hatching.`;
    } else if (!candidate) {
      mixerText =
        ids.length === 0
          ? this.emptyPrompt()
          : `In the mixer: ${this.labelsFor(ids)}. That pair is not this step’s recipe.`;
    } else if (!temperatureMet(candidate, temp)) {
      mixerText = this.tempPrompt(candidate, desktop);
    } else if (stir < candidate.minStir) {
      const pct = Math.floor(stir * 100);
      mixerText = desktop
        ? `${candidate.name} is ready to stir (S, or pointer on the bowl): ${pct}% of 45%.`
        : `${candidate.name}: wave an open hand over the bowl. ${pct}% of 45%.`;
    } else {
      mixerText = `${candidate.name} is ready.`;
    }
    this.setText(this.mixerLabel, mixerText);
    this.setText(this.tempLabel, temperatureLine(temp));
    this.setText(this.stirLabel, stirLine(stir));
  }

  private titleFor(recipeId: string): string {
    if (recipeId === 'grove-bloom') return 'Grove Bloom';
    if (recipeId === 'mint-current') return 'Mint Current';
    if (recipeId === 'ember-spark') return 'Ember Spark';
    return 'Recipe';
  }

  private tempPrompt(recipe: RecipeDef, desktop: boolean): string {
    if (recipe.temperature === 'hot') {
      return desktop
        ? `${recipe.name} is in the bowl. Press Heat (H or the orange knob), then stir.`
        : `${recipe.name} is in the bowl. Press the orange Heat knob, then stir.`;
    }
    if (recipe.temperature === 'cold') {
      return desktop
        ? `${recipe.name} is in the bowl. Press Cool (C or the mint knob), then stir.`
        : `${recipe.name} is in the bowl. Press the mint Cool knob, then stir.`;
    }
    return `${recipe.name} is in the bowl. Stir to 45%.`;
  }

  private allowedRecipe(): string | undefined {
    const mission = this.queries.mission.entities.values().next().value;
    if (!mission) return undefined;
    return mission.getValue(Mission, 'allowedRecipe') ?? '';
  }

  private comfortEntity(): Entity | undefined {
    return this.queries.comfort.entities.values().next().value;
  }

  private emptyPrompt(): string {
    const allowed = this.allowedRecipe();
    if (allowed === 'grove-bloom') return 'The mixer is empty. Place Space Leaves and Crystal Sugar in the bowl.';
    if (allowed === 'mint-current') return 'The mixer is empty. Place Chocolate and Mint Crystal in the bowl.';
    if (allowed === 'ember-spark') return 'The mixer is empty. Place Cosmic Fruit and Star Pepper in the bowl.';
    return 'The mixer is idle. Carry the hatched creature to its place in the Cookie Kingdom.';
  }

  private labelsFor(ids: string[]): string {
    return ids.map((id) => getIngredientDef(id)?.label ?? id).join(', ');
  }

  private setText(
    element: ReturnType<UIKitMLAsset['getElementById']> | undefined,
    text: string,
  ): void {
    if (!element) return;
    const target =
      element instanceof UIKit.Text
        ? element
        : element.children.find((child): child is UIKit.Text => child instanceof UIKit.Text);
    target?.setProperties({ text });
  }
}
