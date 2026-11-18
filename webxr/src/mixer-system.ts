import { createSystem, Entity, Grabbed, Object3D, Vector3 } from '@iwsdk/core';
import { MIXER_BOWL } from './ingredient-catalog.js';
import { ComfortSettings, Ingredient, QuantumMixer } from './kitchen-components.js';

export class MixerSystem extends createSystem({
  items: { required: [Ingredient] },
  held: { required: [Ingredient, Grabbed] },
  mixer: { required: [QuantumMixer] },
  comfort: { required: [ComfortSettings] },
}) {
  private local = new Vector3();
  private worldPos = new Vector3();

  init(): void {
    this.cleanupFuncs.push(
      this.queries.held.subscribe('qualify', (entity) => {
        if (this.mixerEntity()?.getValue(QuantumMixer, 'cooking')) return;
        if (entity.getValue(Ingredient, 'inMixer')) this.leaveMixer(entity);
      }),
    );
  }

  update(): void {
    const mixer = this.mixerEntity();
    const mixerObject = mixer?.object3D;
    if (!mixer || !mixerObject) return;

    const paused =
      this.queries.comfort.entities.values().next().value?.getValue(ComfortSettings, 'paused') ?? false;
    if (paused) return;
    const cooking = mixer.getValue(QuantumMixer, 'cooking') ?? false;
    for (const entity of this.queries.items.entities) {
      if (entity.getValue(Ingredient, 'consumed')) continue;
      const held = entity.hasComponent(Grabbed);
      const inside = this.insideBowl(mixerObject, entity.object3D);
      const inMixer = entity.getValue(Ingredient, 'inMixer') ?? false;
      if (!cooking && !held && inside && !inMixer) {
        this.enterMixer(entity);
      } else if (!cooking && inMixer && (held || !inside)) {
        this.leaveMixer(entity);
      }
    }

    const occupants = this.occupants();
    mixer.setValue(QuantumMixer, 'count', occupants.length);
  }

  private mixerEntity(): Entity | undefined {
    return this.queries.mixer.entities.values().next().value;
  }

  private occupants(): Entity[] {
    return [...this.queries.items.entities].filter((item) => item.getValue(Ingredient, 'inMixer'));
  }

  private insideBowl(mixerObject: Object3D, object: Object3D | undefined): boolean {
    if (!object) return false;
    object.getWorldPosition(this.worldPos);
    this.local.copy(this.worldPos);
    mixerObject.worldToLocal(this.local);
    const radial = this.local.x * this.local.x + this.local.z * this.local.z;
    return (
      radial <= MIXER_BOWL.radius * MIXER_BOWL.radius &&
      this.local.y >= MIXER_BOWL.yMin &&
      this.local.y <= MIXER_BOWL.yMax
    );
  }

  private enterMixer(entity: Entity): void {
    const object = entity.object3D;
    const mixerObject = this.mixerEntity()?.object3D;
    const contents = mixerObject?.getObjectByName('Contents');
    if (!object || !contents) return;
    contents.attach(object);
    const parked = this.occupants().length;
    const angle = parked * 1.8;
    object.position.set(Math.cos(angle) * 0.045, MIXER_BOWL.localY - 0.02, Math.sin(angle) * 0.045);
    object.scale.setScalar(0.92);
    entity.setValue(Ingredient, 'inMixer', true);
  }

  private leaveMixer(entity: Entity): void {
    const object = entity.object3D;
    if (object && object.parent?.name === 'Contents') {
      const level = this.world.activeLevel.value?.object3D ?? this.scene;
      level.attach(object);
      object.scale.setScalar(1);
    }
    entity.setValue(Ingredient, 'inMixer', false);
    entity.setValue(Ingredient, 'heated', false);
  }
}
