import {
  createSystem,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  PointsMaterial,
  Vector3,
} from '@iwsdk/core';
import { ComfortSettings, GravityCore } from './kitchen-components.js';

type OrbitData = {
  speed: number;
  spin: number;
  phase: number;
};

type Strike = {
  from: [number, number, number];
  to: [number, number, number];
};

const STRIKES: Record<string, Strike> = {
  port: { from: [-11, 2.4, -9], to: [-2.55, 1.35, -3.15] },
  starboard: { from: [11, 2.4, -9], to: [2.55, 1.35, -3.15] },
  bow: { from: [0.4, 2.6, -22], to: [0.1, 1.5, -3.55] },
};

export class SpaceVistaSystem extends createSystem({
  comfort: { required: [ComfortSettings] },
  gravity: { required: [GravityCore] },
}) {
  private vista: Object3D | undefined;
  private flying = false;
  private flyT = 0;
  private flyDur = 3.2;
  private rock: Object3D | undefined;
  private from = new Vector3();
  private to = new Vector3();
  private meteorT = 0;
  private meteorWait = 7;
  private meteorFrom = new Vector3(8, 3.2, -18);
  private meteorTo = new Vector3(-9, 0.6, -8);

  init(): void {
    this.vista = this.world.getSceneObject('space-vista');
  }

  update(delta: number, time: number): void {
    const vista = this.vista;
    if (!vista) return;
    const comfort = this.queries.comfort.entities.values().next().value;
    const paused = comfort?.getValue(ComfortSettings, 'paused') ?? false;
    const reduced = comfort?.getValue(ComfortSettings, 'reducedMotion') ?? false;
    if (paused) return;

    this.spinField(vista.getObjectByName('Starfield'), time, 0.0048, reduced);
    this.spinField(vista.getObjectByName('FarStars'), time, -0.0026, reduced);
    this.spinField(vista.getObjectByName('MilkyWay'), time, 0.0018, reduced);
    this.spinField(vista.getObjectByName('Nebula'), time, -0.0032, reduced);
    this.twinkle(vista.getObjectByName('Starfield'), time, reduced);

    const system = vista.getObjectByName('SolarSystem');
    if (system instanceof Group) {
      const sun = system.getObjectByName('Sun');
      if (sun && !reduced) sun.rotation.y = time * 0.12;
      const corona = system.getObjectByName('SunCorona');
      const halo = system.getObjectByName('SunHalo');
      if (!reduced) {
        const pulse = 1 + Math.sin(time * 1.35) * 0.045;
        if (corona) corona.scale.setScalar(pulse);
        if (halo) halo.scale.setScalar(1.02 + Math.sin(time * 0.9) * 0.03);
        if (corona instanceof Mesh && corona.material instanceof MeshBasicMaterial) {
          corona.material.opacity = 0.16 + Math.sin(time * 1.35) * 0.05;
        }
      }
      for (const child of system.children) {
        const orbit = child.userData.spaceOrbit as OrbitData | undefined;
        if (!orbit) continue;
        const angle = orbit.phase + (reduced ? 0 : time * orbit.speed);
        child.rotation.y = angle;
        const planet = child.children[0];
        if (planet && !reduced) planet.rotation.y = time * orbit.spin;
        const name = planet?.name ?? '';
        const atm = child.getObjectByName(`${name}Atm`);
        const clouds = child.getObjectByName(`${name}Clouds`);
        if (atm && planet) atm.position.copy(planet.position);
        if (clouds && planet) {
          clouds.position.copy(planet.position);
          if (!reduced) clouds.rotation.y = time * (orbit.spin * 1.35);
        }
        const ring = child.getObjectByName('GiantRing');
        if (ring && planet) {
          ring.position.copy(planet.position);
          if (!reduced) ring.rotation.z = time * 0.16;
        }
        const moon = child.getObjectByName('GardenMoon');
        if (moon && planet && !reduced) {
          const around = time * 0.85;
          moon.position.set(
            planet.position.x + Math.cos(around) * 0.72,
            0.1 + Math.sin(around * 0.5) * 0.05,
            planet.position.z + Math.sin(around) * 0.72,
          );
        }
      }
    }

    this.updateMeteors(vista, delta, time, reduced);
    this.updateAsteroids(vista, delta, reduced);
  }

  private spinField(node: Object3D | undefined, time: number, speed: number, reduced: boolean): void {
    if (!node || reduced) return;
    node.rotation.y = time * speed;
  }

  private twinkle(node: Object3D | undefined, time: number, reduced: boolean): void {
    if (!(node instanceof Points) || reduced) return;
    const material = node.material;
    if (!(material instanceof PointsMaterial)) return;
    material.opacity = 0.78 + Math.sin(time * 2.1) * 0.14;
    material.size = 0.13 + Math.sin(time * 1.4) * 0.025;
  }

  private updateMeteors(vista: Object3D, delta: number, time: number, reduced: boolean): void {
    const meteor = vista.getObjectByName('Meteor');
    const trail = vista.getObjectByName('MeteorTrail');
    if (!meteor || !trail) return;
    if (reduced) {
      meteor.visible = false;
      trail.visible = false;
      return;
    }
    this.meteorWait -= delta;
    if (this.meteorWait <= 0 && this.meteorT <= 0) {
      this.meteorT = 0.001;
      const side = Math.sin(time) > 0 ? 1 : -1;
      this.meteorFrom.set(side * 10, 2.4 + Math.sin(time * 0.3) * 1.2, -20);
      this.meteorTo.set(-side * 11, 0.4, -7);
      this.meteorWait = 9 + (time % 5);
    }
    if (this.meteorT <= 0) {
      meteor.visible = false;
      trail.visible = false;
      return;
    }
    this.meteorT += delta / 1.15;
    const t = Math.min(1, this.meteorT);
    meteor.visible = true;
    trail.visible = true;
    meteor.position.lerpVectors(this.meteorFrom, this.meteorTo, t);
    trail.position.lerpVectors(this.meteorFrom, this.meteorTo, Math.max(0, t - 0.08));
    trail.scale.setScalar(1.8);
    if (t < 1) return;
    this.meteorT = 0;
    meteor.visible = false;
    trail.visible = false;
  }

  private updateAsteroids(vista: Object3D, delta: number, reduced: boolean): void {
    const core = this.queries.gravity.entities.values().next().value;
    if (!core) return;
    const rocks = vista.getObjectByName('Asteroids');
    if (!rocks) return;

    if (reduced) {
      for (const child of rocks.children) child.visible = false;
      this.flying = false;
      return;
    }

    if (!this.flying && (core.getValue(GravityCore, 'incoming') ?? false)) {
      const side = core.getValue(GravityCore, 'impactSide') || 'port';
      const path = STRIKES[side] ?? STRIKES.port;
      this.rock = rocks.children[side === 'bow' ? 2 : side === 'starboard' ? 1 : 0];
      this.from.set(...path.from);
      this.to.set(...path.to);
      this.flyT = 0;
      this.flyDur = 2.8;
      this.flying = true;
      if (this.rock) {
        this.rock.visible = true;
        this.rock.position.copy(this.from);
      }
    }

    if (!this.flying || !this.rock) return;
    this.flyT += delta / this.flyDur;
    const t = Math.min(1, this.flyT);
    this.rock.position.lerpVectors(this.from, this.to, t);
    this.rock.rotation.x += delta * 2.4;
    this.rock.rotation.y += delta * 1.7;
    if (t < 1) return;
    this.rock.visible = false;
    this.flying = false;
    core.setValue(GravityCore, 'hit', true);
    core.setValue(GravityCore, 'incoming', false);
  }
}
