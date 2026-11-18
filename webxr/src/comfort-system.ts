import {
  createSystem,
  Entity,
  Grabbed,
  GrabSystem,
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import {
  GRAB_REACH_MAX,
  GRAB_REACH_MIN,
  loadComfort,
  pinchCommit,
  pinchLabel,
  PINCH_EASE_MAX,
  PINCH_EASE_MIN,
  reachLabel,
  TUTORIAL_STEPS,
  VOLUME_MAX,
  VOLUME_MIN,
  writeComfort,
} from './comfort-catalog.js';
import { comfortLine, pauseHint, pinchHud } from './copy.js';
import { setMasterVolume } from './kitchen-audio.js';
import { ComfortSettings, Creature, Ingredient, Mission } from './kitchen-components.js';
import { pinchStrength } from './pinch-input.js';

export class ComfortSystem extends createSystem({
  comfort: { required: [ComfortSettings] },
  items: { required: [Ingredient] },
  creatures: { required: [Creature] },
  heldItems: { required: [Ingredient, Grabbed] },
  heldCreatures: { required: [Creature, Grabbed] },
  mission: { required: [Mission] },
}) {
  private tutorialLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private comfortLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private pauseLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private pinchLabelEl: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private lastHud = '';
  private lastHands = false;
  private lostNotice = 0;
  private frameAccum = 0;
  private frameCount = 0;
  private fps = 72;
  private autoPaused = false;

  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('mission-hud');
    this.tutorialLabel = panel?.getElementById('tutorial-text') ?? undefined;
    this.comfortLabel = panel?.getElementById('comfort-status') ?? undefined;
    this.pauseLabel = panel?.getElementById('pause-status') ?? undefined;
    this.pinchLabelEl = panel?.getElementById('pinch-status') ?? undefined;
    const prefs = loadComfort();
    const comfort = this.comfortEntity();
    if (comfort) {
      comfort.setValue(ComfortSettings, 'pinchEase', prefs.pinchEase);
      comfort.setValue(ComfortSettings, 'grabReach', prefs.grabReach);
      comfort.setValue(ComfortSettings, 'volume', prefs.volume);
      comfort.setValue(ComfortSettings, 'reducedMotion', prefs.reducedMotion);
      comfort.setValue(ComfortSettings, 'tutorialSeen', prefs.tutorialSeen);
      comfort.setValue(ComfortSettings, 'tutorialStep', prefs.tutorialSeen ? -1 : 0);
      comfort.setValue(ComfortSettings, 'paused', false);
    }
    setMasterVolume(prefs.volume);

    this.bind(panel, 'pause-button', () => this.togglePause());
    this.bind(panel, 'tutorial-button', () => this.replayTutorial());
    this.bind(panel, 'tutorial-next-button', () => this.nextTutorial());
    this.bind(panel, 'pinch-easier-button', () => this.nudgePinch(0.12));
    this.bind(panel, 'pinch-firmer-button', () => this.nudgePinch(-0.12));
    this.bind(panel, 'reach-plus-button', () => this.nudgeReach(0.015));
    this.bind(panel, 'reach-minus-button', () => this.nudgeReach(-0.015));
    this.bind(panel, 'volume-plus-button', () => this.nudgeVolume(0.1));
    this.bind(panel, 'volume-minus-button', () => this.nudgeVolume(-0.1));
    this.bind(panel, 'motion-button', () => this.toggleMotion());

    this.cleanupFuncs.push(
      this.visibilityState.subscribe((state) => {
        const comfortEntity = this.comfortEntity();
        if (!comfortEntity) return;
        if (state === VisibilityState.Hidden || state === VisibilityState.VisibleBlurred) {
          if (!(comfortEntity.getValue(ComfortSettings, 'paused') ?? false)) {
            comfortEntity.setValue(ComfortSettings, 'paused', true);
            this.autoPaused = true;
            this.releaseHeld();
          }
        } else if (this.autoPaused && state === VisibilityState.Visible) {
          comfortEntity.setValue(ComfortSettings, 'paused', false);
          this.autoPaused = false;
        }
      }),
    );
  }

  update(delta: number): void {
    this.frameAccum += delta;
    this.frameCount += 1;
    if (this.frameAccum >= 0.5) {
      this.fps = Math.round(this.frameCount / this.frameAccum);
      this.frameAccum = 0;
      this.frameCount = 0;
    }

    const comfort = this.comfortEntity();
    if (!comfort) return;

    if (this.input.keyboard.getKeyDown('KeyP')) this.togglePause();
    if (this.input.keyboard.getKeyDown('KeyM')) this.toggleMotion();
    if (this.input.keyboard.getKeyDown('BracketLeft')) this.nudgePinch(0.12);
    if (this.input.keyboard.getKeyDown('BracketRight')) this.nudgePinch(-0.12);
    if (this.input.keyboard.getKeyDown('Minus')) this.nudgeReach(-0.015);
    if (this.input.keyboard.getKeyDown('Equal')) this.nudgeReach(0.015);
    if (this.input.keyboard.getKeyDown('Digit9')) this.nudgeVolume(-0.1);
    if (this.input.keyboard.getKeyDown('Digit0')) this.nudgeVolume(0.1);

    if (comfort.getValue(ComfortSettings, 'paused')) this.releaseHeld();
    this.applyGrabReach(comfort.getValue(ComfortSettings, 'grabReach') ?? 0.08);
    this.updateTracking(delta);
    this.refreshHud(comfort, delta);
  }

  private bind(
    panel: UIKitMLAsset | undefined,
    id: string,
    handler: () => void,
  ): void {
    const button = panel?.getElementById(id);
    button?.addEventListener('click', handler);
    this.cleanupFuncs.push(() => button?.removeEventListener('click', handler));
  }

  private togglePause(): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    const next = !(comfort.getValue(ComfortSettings, 'paused') ?? false);
    comfort.setValue(ComfortSettings, 'paused', next);
    this.autoPaused = false;
    if (next) this.releaseHeld();
  }

  private toggleMotion(): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    const next = !(comfort.getValue(ComfortSettings, 'reducedMotion') ?? false);
    comfort.setValue(ComfortSettings, 'reducedMotion', next);
    this.persist();
  }

  private replayTutorial(): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    comfort.setValue(ComfortSettings, 'tutorialStep', 0);
    comfort.setValue(ComfortSettings, 'tutorialSeen', false);
    this.persist();
  }

  private nextTutorial(): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    const step = comfort.getValue(ComfortSettings, 'tutorialStep') ?? -1;
    if (step < 0) {
      this.replayTutorial();
      return;
    }
    if (step >= TUTORIAL_STEPS.length - 1) {
      comfort.setValue(ComfortSettings, 'tutorialStep', -1);
      comfort.setValue(ComfortSettings, 'tutorialSeen', true);
    } else {
      comfort.setValue(ComfortSettings, 'tutorialStep', step + 1);
    }
    this.persist();
  }

  private nudgePinch(delta: number): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    const next = Math.min(PINCH_EASE_MAX, Math.max(PINCH_EASE_MIN, (comfort.getValue(ComfortSettings, 'pinchEase') ?? 0.5) + delta));
    comfort.setValue(ComfortSettings, 'pinchEase', next);
    this.persist();
  }

  private nudgeReach(delta: number): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    const next = Math.min(GRAB_REACH_MAX, Math.max(GRAB_REACH_MIN, (comfort.getValue(ComfortSettings, 'grabReach') ?? 0.08) + delta));
    comfort.setValue(ComfortSettings, 'grabReach', next);
    this.persist();
  }

  private nudgeVolume(delta: number): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    const next = Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, (comfort.getValue(ComfortSettings, 'volume') ?? 0.7) + delta));
    comfort.setValue(ComfortSettings, 'volume', next);
    setMasterVolume(next);
    this.persist();
  }

  private persist(): void {
    const comfort = this.comfortEntity();
    if (!comfort) return;
    writeComfort({
      pinchEase: comfort.getValue(ComfortSettings, 'pinchEase') ?? 0.5,
      grabReach: comfort.getValue(ComfortSettings, 'grabReach') ?? 0.08,
      volume: comfort.getValue(ComfortSettings, 'volume') ?? 0.7,
      reducedMotion: comfort.getValue(ComfortSettings, 'reducedMotion') ?? false,
      tutorialSeen: comfort.getValue(ComfortSettings, 'tutorialSeen') ?? false,
    });
  }

  private applyGrabReach(reach: number): void {
    for (const entity of this.queries.items.entities) {
      const assist = entity.object3D?.getObjectByName('GrabAssist');
      if (!assist) continue;
      assist.scale.setScalar(reach / 0.08);
    }
    for (const entity of this.queries.creatures.entities) {
      const assist = entity.object3D?.getObjectByName('GrabAssist');
      if (!assist) continue;
      assist.scale.setScalar(reach / 0.08);
    }
  }

  private updateTracking(delta: number): void {
    const vis = this.visibilityState.value;
    const hands =
      this.input.xr.isPrimary('hand', 'left') || this.input.xr.isPrimary('hand', 'right');
    if (vis === VisibilityState.Visible && this.lastHands && !hands) {
      this.lostNotice = 4;
      this.releaseHeld();
    }
    if (hands) this.lostNotice = Math.max(0, this.lostNotice - delta * 2);
    this.lastHands = hands;
    if (this.lostNotice > 0) this.lostNotice = Math.max(0, this.lostNotice - delta);
  }

  private releaseHeld(): void {
    const grab = this.world.getSystem(GrabSystem);
    if (!grab) return;
    for (const entity of [...this.queries.heldItems.entities, ...this.queries.heldCreatures.entities]) {
      grab.forceRelease(entity);
    }
  }

  private refreshHud(comfort: Entity, _delta: number): void {
    const paused = comfort.getValue(ComfortSettings, 'paused') ?? false;
    const reduced = comfort.getValue(ComfortSettings, 'reducedMotion') ?? false;
    const ease = comfort.getValue(ComfortSettings, 'pinchEase') ?? 0.5;
    const reach = comfort.getValue(ComfortSettings, 'grabReach') ?? 0.08;
    const volume = comfort.getValue(ComfortSettings, 'volume') ?? 0.7;
    const step = comfort.getValue(ComfortSettings, 'tutorialStep') ?? -1;
    const commit = pinchCommit(ease);
    const left = pinchStrength(this.input, 'left');
    const right = pinchStrength(this.input, 'right');
    const vis = this.visibilityState.value;

    const pauseText = pauseHint({
      paused,
      lostHands: this.lostNotice > 0,
      immersive: vis === VisibilityState.Visible,
    });
    this.setText(this.pauseLabel, pauseText);

        const tutorial =
      step >= 0 && step < TUTORIAL_STEPS.length
        ? `Hint ${step + 1} of ${TUTORIAL_STEPS.length}: ${TUTORIAL_STEPS[step]}`
        : '';
    this.setText(this.tutorialLabel, tutorial);

    const fpsNote = this.fps > 0 && this.fps < 55 ? ` · ${this.fps} fps` : '';
    const hud = comfortLine({
      pinch: pinchLabel(ease),
      reach: reachLabel(reach),
      volume,
      reduced,
      fpsNote,
    });
    if (hud !== this.lastHud) {
      this.lastHud = hud;
      this.setText(this.comfortLabel, hud);
    }
    this.setText(this.pinchLabelEl, pinchHud(left, right, commit));
  }

  private comfortEntity(): Entity | undefined {
    return this.queries.comfort.entities.values().next().value;
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
