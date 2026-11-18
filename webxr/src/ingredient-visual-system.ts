import { createSystem, Grabbed, Object3D, Vector3 } from '@iwsdk/core';
import { getIngredientDef } from './ingredient-catalog.js';
import { ComfortSettings, GravityCore, Ingredient, QuantumMixer } from './kitchen-components.js';

export class IngredientVisualSystem extends createSystem({
  items: { required: [Ingredient] },
  mixer: { required: [QuantumMixer] },
  comfort: { required: [ComfortSettings] },
  gravity: { required: [GravityCore] },
}) {
  private sparkPos = new Vector3();

  update(_delta: number, time: number): void {
    const comfort = this.queries.comfort.entities.values().next().value;
    if (comfort?.getValue(ComfortSettings, 'paused')) return;
    const reduced = comfort?.getValue(ComfortSettings, 'reducedMotion') ?? false;
    const mixer = this.queries.mixer.entities.values().next().value;
    const stirring = mixer?.getValue(QuantumMixer, 'stirring') ?? false;
    const transforming = (mixer?.getValue(QuantumMixer, 'phase') ?? '') === 'transforming';
    const drifting =
      (this.queries.gravity.entities.values().next().value?.getValue(GravityCore, 'mode') ??
        'normal') !== 'normal';
    for (const entity of this.queries.items.entities) {
      const object = entity.object3D;
      if (!object) continue;
      if (entity.getValue(Ingredient, 'consumed')) {
        object.visible = false;
        continue;
      }
      const def = getIngredientDef(entity.getValue(Ingredient, 'id') ?? '');
      const held = entity.hasComponent(Grabbed);
      const heated = entity.getValue(Ingredient, 'heated') ?? false;
      const inMixer = entity.getValue(Ingredient, 'inMixer') ?? false;
      const loose = entity.getValue(Ingredient, 'loose') ?? false;
      const motion = object.getObjectByName('Motion');
      if (motion && def) {
        if (!loose && !held && !inMixer) {
          motion.position.y = 0;
          motion.rotation.y = 0;
        } else if (!reduced && !drifting) {
          const mixSpin = inMixer && (stirring || transforming) ? 4 : inMixer ? 1.2 : 1;
          const damp = held ? 0.25 : inMixer ? 0.45 : 1;
          motion.position.y = Math.sin(time * def.idle.bobSpeed + entity.index) * def.idle.bob * damp;
          motion.rotation.y = time * def.idle.spin * damp * mixSpin;
        }
      }
      const core = object.getObjectByName('EnergyCore');
      if (core) {
        const pulse = 1 + 0.12 * Math.sin(time * 2.4 + entity.index);
        core.scale.setScalar(held ? pulse * 1.08 : pulse);
      }
      this.updateSparks(object, !reduced && def?.heat === 'sparks' && heated, time);
    }
  }

  private updateSparks(object: Object3D, active: boolean, time: number): void {
    const sparks = object.getObjectByName('HeatSparks');
    if (!sparks) return;
    sparks.visible = active;
    if (!active) return;
    for (const spark of sparks.children) {
      const orbit = spark.userData.orbit as
        | { radius: number; speed: number; phase: number; height: number }
        | undefined;
      if (!orbit) continue;
      const angle = time * orbit.speed + orbit.phase;
      this.sparkPos.set(
        Math.cos(angle) * orbit.radius,
        orbit.height + Math.sin(time * 6 + orbit.phase) * 0.01,
        Math.sin(angle) * orbit.radius,
      );
      spark.position.copy(this.sparkPos);
    }
  }
}
