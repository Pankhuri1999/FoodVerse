import { createSystem, Object3D } from '@iwsdk/core';
import { getCreatureDef } from './creature-catalog.js';
import { ComfortSettings, Creature } from './kitchen-components.js';

export class CreatureVisualSystem extends createSystem({
  creatures: { required: [Creature] },
  comfort: { required: [ComfortSettings] },
}) {
  update(_delta: number, time: number): void {
    const comfort = this.queries.comfort.entities.values().next().value;
    if (comfort?.getValue(ComfortSettings, 'paused')) return;
    if (comfort?.getValue(ComfortSettings, 'reducedMotion')) return;
    for (const entity of this.queries.creatures.entities) {
      if (!entity.getValue(Creature, 'hatched')) continue;
      const object = entity.object3D;
      if (!object) continue;
      const id = entity.getValue(Creature, 'id') ?? '';
      const idle = getCreatureDef(id)?.idle;
      const spiral = entity.getValue(Creature, 'spiral') ?? false;
      if (idle === 'flap') this.animateDragon(object, time, spiral);
      else if (idle === 'sway') this.animateGuardian(object, time, spiral);
      else if (idle === 'flow') this.animateCurrent(object, time, spiral);
    }
  }

  private animateDragon(object: Object3D, time: number, spiral: boolean): void {
    const flap = Math.sin(time * 8) * 0.45;
    const wingL = object.getObjectByName('WingL');
    const wingR = object.getObjectByName('WingR');
    if (wingL) wingL.rotation.z = 0.35 + flap;
    if (wingR) wingR.rotation.z = -0.35 - flap;
    const tail = object.getObjectByName('Tail');
    if (tail && spiral) tail.rotation.z = Math.sin(time * 3.4) * 0.55;
    const spark = object.getObjectByName('TailSpark');
    if (spark) spark.scale.setScalar(0.85 + 0.35 * Math.sin(time * 11));
    const sparkA = object.getObjectByName('TailSparkA');
    const sparkB = object.getObjectByName('TailSparkB');
    if (sparkA) sparkA.position.y = 0.004 + Math.sin(time * 9) * 0.008;
    if (sparkB) sparkB.position.y = -0.01 + Math.cos(time * 10) * 0.008;
  }

  private animateGuardian(object: Object3D, time: number, spiral: boolean): void {
    const motion = object.getObjectByName('Motion');
    if (motion) motion.rotation.z = Math.sin(time * 1.6) * (spiral ? 0.22 : 0.12);
    const crown = object.getObjectByName('CrystalCrown');
    if (crown) crown.scale.setScalar(0.95 + 0.08 * Math.sin(time * 3.2));
    const leafL = object.getObjectByName('LeafL');
    const leafR = object.getObjectByName('LeafR');
    if (leafL) leafL.rotation.z = 0.08 + Math.sin(time * 2.1) * 0.12;
    if (leafR) leafR.rotation.z = -0.08 - Math.sin(time * 2.1 + 0.4) * 0.12;
    const aura = object.getObjectByName('Aura');
    if (aura) aura.scale.setScalar(0.92 + 0.1 * Math.sin(time * 2.4));
  }

  private animateCurrent(object: Object3D, time: number, spiral: boolean): void {
    const motion = object.getObjectByName('Motion');
    if (motion) motion.rotation.y = Math.sin(time * 2.2) * (spiral ? 0.38 : 0.18);
    for (let i = 0; i < 5; i += 1) {
      const segment = object.getObjectByName(`Segment${i}`);
      if (!segment) continue;
      segment.position.x = Math.sin(time * 5 + i * 0.7) * 0.012;
      segment.position.y = 0.04 + Math.sin(time * 4 + i * 0.55) * 0.006;
    }
    const head = object.getObjectByName('Head');
    if (head) head.position.x = Math.sin(time * 5) * 0.01;
    const trail = object.getObjectByName('FrostTrail');
    if (trail) {
      trail.rotation.z = Math.sin(time * 3) * 0.2;
      for (const flake of trail.children) {
        flake.scale.setScalar(0.7 + 0.45 * (0.5 + 0.5 * Math.sin(time * 7 + flake.position.z * 20)));
      }
    }
    const aura = object.getObjectByName('Aura');
    if (aura) aura.scale.setScalar(0.9 + 0.14 * Math.sin(time * 3.6));
  }
}
