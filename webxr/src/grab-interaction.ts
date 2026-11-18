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
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import { inputModeHint } from './copy.js';
import { Ingredient, QuantumMixer } from './kitchen-components.js';

const LOCKOUT = 0.32;
const HOVER = new Color('#3ec8e0');
const HELD = new Color('#e0b24a');

export class GrabInteractionSystem extends createSystem({
  items: { required: [Ingredient] },
  held: { required: [Ingredient, Grabbed] },
  hover: { required: [Ingredient, Hovered], excluded: [Grabbed] },
  mixer: { required: [QuantumMixer] },
}) {
  private accepted = new Set<Entity>();
  private inputLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private lastInputText = '';

  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('mission-hud');
    this.inputLabel = panel?.getElementById('input-mode') ?? undefined;

    this.cleanupFuncs.push(
      this.queries.hover.subscribe('qualify', (entity) => {
        this.tint(entity.object3D, HOVER, 0.35);
      }),
      this.queries.hover.subscribe('disqualify', (entity) => {
        if (!entity.hasComponent(Grabbed)) this.tint(entity.object3D, null, 0);
      }),
      this.queries.held.subscribe('qualify', (entity) => {
        const lockout = entity.getValue(Ingredient, 'lockout') ?? 0;
        const cooking = this.mixerCooking();
        if (
          (entity.getValue(Ingredient, 'consumed') ?? false) ||
          lockout > 0 ||
          (cooking && entity.getValue(Ingredient, 'inMixer'))
        ) {
          this.grab()?.forceRelease(entity);
          return;
        }
        this.accepted.add(entity);
        entity.setValue(Ingredient, 'loose', true);
        this.tint(entity.object3D, HELD, 0.7);
        entity.object3D?.scale.setScalar(1.06);
      }),
      this.queries.held.subscribe('disqualify', (entity) => {
        if (!this.accepted.delete(entity)) return;
        entity.setValue(Ingredient, 'lockout', LOCKOUT);
        if (!entity.getValue(Ingredient, 'inMixer')) {
          entity.object3D?.scale.setScalar(1);
          entity.setValue(Ingredient, 'driftX', ((entity.index % 2) * 2 - 1) * 0.03);
          entity.setValue(Ingredient, 'driftY', 0.1);
          entity.setValue(Ingredient, 'driftZ', ((entity.index % 3) - 1) * 0.02);
        }
        this.tint(entity.object3D, null, 0);
      }),
      this.visibilityState.subscribe((state) => {
        if (
          state === VisibilityState.Hidden ||
          state === VisibilityState.VisibleBlurred
        ) {
          this.releaseHeld();
        }
        this.refreshInputHud();
      }),
    );

    this.refreshInputHud();
  }

  update(delta: number): void {
    this.refreshInputHud();
    for (const entity of this.queries.items.entities) {
      const lockout = entity.getValue(Ingredient, 'lockout') ?? 0;
      if (lockout > 0) {
        entity.setValue(Ingredient, 'lockout', Math.max(0, lockout - delta));
      }
    }
    this.releaseIfTrackingLost();
  }

  private mixerCooking(): boolean {
    const mixer = this.queries.mixer.entities.values().next().value;
    return mixer?.getValue(QuantumMixer, 'cooking') ?? false;
  }

  private grab(): GrabSystem | undefined {
    return this.world.getSystem(GrabSystem);
  }

  private releaseHeld(): void {
    const grab = this.grab();
    if (!grab) return;
    for (const entity of this.queries.held.entities) {
      grab.forceRelease(entity);
    }
  }

  private releaseIfTrackingLost(): void {
    const vis = this.visibilityState.value;
    if (vis === VisibilityState.Hidden || vis === VisibilityState.VisibleBlurred) {
      this.releaseHeld();
      return;
    }
    if (vis !== VisibilityState.Visible) return;
    const grab = this.grab();
    if (!grab) return;
    for (const entity of this.queries.held.entities) {
      const hand = grab.getHolderHand(entity);
      if (!hand) continue;
      const tracked =
        this.input.xr.isPrimary('hand', hand) ||
        this.input.xr.isPrimary('controller', hand);
      if (!tracked) grab.forceRelease(entity);
    }
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

  private refreshInputHud(): void {
    if (!this.inputLabel) return;
    const vis = this.visibilityState.value;
    const iwer = typeof window !== 'undefined' && 'IWER_DEVICE' in window;
    const hands =
      this.input.xr.isPrimary('hand', 'left') ||
      this.input.xr.isPrimary('hand', 'right');
    const text = inputModeHint({
      immersive: vis !== VisibilityState.NonImmersive,
      preview: iwer,
      hands,
    });
    if (text === this.lastInputText) return;
    this.lastInputText = text;
    const target =
      this.inputLabel instanceof UIKit.Text
        ? this.inputLabel
        : this.inputLabel.children.find((child): child is UIKit.Text => child instanceof UIKit.Text);
    target?.setProperties({ text });
  }
}
