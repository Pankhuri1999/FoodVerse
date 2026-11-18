import {
  createSystem,
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import { isIwerPreview, prepareIwerPreview } from './boot.js';
import { handsHint, XR_FAIL_HINT } from './copy.js';
import { cookGuide, MissionFacts, planetItems, planetLine } from './mission-catalog.js';
import { CookieKingdom, Creature, Mission } from './kitchen-components.js';

export class DeskOverlaySystem extends createSystem({
  mission: { required: [Mission] },
  kingdom: { required: [CookieKingdom] },
  creatures: { required: [Creature] },
}) {
  private recipeEl: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private stepEls: Array<ReturnType<UIKitMLAsset['getElementById']> | undefined> = [];
  private handsEl: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private lastKey = '';
  private htmlRoot: HTMLElement | null = null;
  private htmlRecipe: HTMLElement | null = null;
  private htmlSteps: HTMLElement | null = null;
  private htmlHands: HTMLElement | null = null;
  private archiveEl: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private htmlArchive: HTMLElement | null = null;

  init(): void {
    this.htmlRoot = document.getElementById('desk-hud');
    this.htmlRecipe = document.getElementById('desk-recipe');
    this.htmlSteps = document.getElementById('desk-steps');
    this.htmlHands = document.getElementById('desk-hands');
    this.htmlArchive = document.getElementById('desk-planet');
    const htmlEnter = document.getElementById('desk-enter-xr');
    const onEnter = () => {
      prepareIwerPreview();
      void Promise.resolve(this.world.launchXR()).then(() => {
        prepareIwerPreview();
      }).catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        if (this.htmlHands) {
          this.htmlHands.textContent = detail ? `${XR_FAIL_HINT} ${detail}` : XR_FAIL_HINT;
        }
        const help = document.getElementById('desk-panel-help');
        const helpBtn = this.htmlRoot?.querySelector<HTMLButtonElement>('[data-panel="help"]');
        help?.classList.add('is-open');
        helpBtn?.setAttribute('aria-expanded', 'true');
      });
    };
    htmlEnter?.addEventListener('click', onEnter);
    this.cleanupFuncs.push(() => htmlEnter?.removeEventListener('click', onEnter));
    this.bindHudToggles();
    this.bindFold('mission-hud', 'mission-toggle', 'mission-root', 'mission-body', 380, 110);
    this.bindFold('cook-guide', 'guide-toggle', 'guide-root', 'guide-body', 360, 96);

    const panel = this.world.getSceneObject<UIKitMLAsset>('cook-guide');
    this.recipeEl = panel?.getElementById('guide-recipe') ?? undefined;
    this.handsEl = panel?.getElementById('guide-hands') ?? undefined;
    this.archiveEl = panel?.getElementById('guide-archive') ?? undefined;
    this.stepEls = [
      panel?.getElementById('guide-step-1') ?? undefined,
      panel?.getElementById('guide-step-2') ?? undefined,
      panel?.getElementById('guide-step-3') ?? undefined,
      panel?.getElementById('guide-step-4') ?? undefined,
    ];
    const xrButton = panel?.getElementById('guide-xr-button');
    xrButton?.addEventListener('click', onEnter);
    this.cleanupFuncs.push(() => xrButton?.removeEventListener('click', onEnter));

    this.cleanupFuncs.push(
      this.visibilityState.subscribe((state) => {
        const immersive = state !== VisibilityState.NonImmersive;
        if (this.htmlRoot) this.htmlRoot.hidden = immersive && !isIwerPreview();
        this.lastKey = '';
      }),
    );
  }

  update(): void {
    const mission = this.queries.mission.entities.values().next().value;
    const kingdom = this.queries.kingdom.entities.values().next().value;
    const stage = mission?.getValue(Mission, 'stage') ?? 'collect-ember';
    const immersive = this.visibilityState.value !== VisibilityState.NonImmersive;
    const ice = kingdom?.getValue(CookieKingdom, 'ice') ?? false;
    const grove = kingdom?.getValue(CookieKingdom, 'grove') ?? false;
    const water = kingdom?.getValue(CookieKingdom, 'water') ?? false;
    const wafer = kingdom?.getValue(CookieKingdom, 'wafer') ?? false;
    const cocoa = kingdom?.getValue(CookieKingdom, 'cocoa') ?? false;
    const foliage = kingdom?.getValue(CookieKingdom, 'foliage') ?? false;
    const hatched = (id: string) =>
      [...this.queries.creatures.entities].some(
        (entity) => entity.getValue(Creature, 'id') === id && entity.getValue(Creature, 'hatched'),
      );
    const emberHatched = hatched('ember-dragon');
    const groveHatched = hatched('grove-guardian');
    const mintHatched = hatched('mint-current');
    const key = `${stage}|${immersive ? 'xr' : '2d'}|${ice}|${grove}|${water}|${wafer}|${cocoa}|${foliage}|${emberHatched}|${groveHatched}|${mintHatched}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const guide = cookGuide(stage, immersive);
    this.setText(this.recipeEl, guide.recipe);
    guide.steps.forEach((step, i) => {
      this.setText(this.stepEls[i], `${i + 1}. ${step}`);
    });
    const hands = handsHint(immersive);
    this.setText(this.handsEl, hands);
    if (this.htmlRecipe) this.htmlRecipe.textContent = guide.recipe;
    if (this.htmlSteps) {
      this.htmlSteps.replaceChildren();
      for (const step of guide.steps) {
        const li = document.createElement('li');
        li.textContent = step;
        this.htmlSteps.append(li);
      }
    }
    if (this.htmlHands) this.htmlHands.textContent = hands;
    const facts: MissionFacts = {
      emberCollected: emberHatched || ice,
      emberHatched,
      ice,
      groveCollected: groveHatched || grove,
      groveHatched,
      grove,
      mintCollected: mintHatched || water,
      mintHatched,
      water,
      wafer,
      cocoa,
      foliage,
    };
    this.setText(this.archiveEl, planetLine(facts));
    if (this.htmlArchive) {
      this.htmlArchive.replaceChildren();
      for (const item of planetItems(facts)) {
        const li = document.createElement('li');
        li.className = item.found ? 'is-found' : 'is-locked';
        li.textContent = item.found ? item.label : `${item.label} — locked`;
        this.htmlArchive.append(li);
      }
    }
    if (this.htmlRoot) this.htmlRoot.hidden = immersive && !isIwerPreview();
  }

  private bindFold(
    assetId: string,
    toggleId: string,
    rootId: string,
    bodyId: string,
    openWidth: number,
    shutWidth: number,
  ): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>(assetId);
    const toggle = panel?.getElementById(toggleId);
    const root = panel?.getElementById(rootId);
    const body = panel?.getElementById(bodyId);
    let open = false;
    const apply = () => {
      body?.setProperties({ display: open ? 'flex' : 'none' });
      root?.setProperties({ width: open ? openWidth : shutWidth });
    };
    apply();
    const onToggle = () => {
      open = !open;
      apply();
    };
    toggle?.addEventListener('click', onToggle);
    this.cleanupFuncs.push(() => toggle?.removeEventListener('click', onToggle));
  }

  private bindHudToggles(): void {
    if (!this.htmlRoot) return;
    const buttons = [...this.htmlRoot.querySelectorAll<HTMLButtonElement>('.desk-toggle')];
    const panels = [...this.htmlRoot.querySelectorAll<HTMLElement>('.desk-panel')];
    const closeAll = () => {
      for (const button of buttons) button.setAttribute('aria-expanded', 'false');
      for (const panel of panels) panel.classList.remove('is-open');
    };
    const onToggle = (event: Event) => {
      const button = event.currentTarget;
      if (!(button instanceof HTMLButtonElement)) return;
      const panelId = `desk-panel-${button.dataset.panel ?? ''}`;
      const panel = document.getElementById(panelId);
      const open = button.getAttribute('aria-expanded') === 'true';
      closeAll();
      if (!open && panel) {
        button.setAttribute('aria-expanded', 'true');
        panel.classList.add('is-open');
      }
    };
    for (const button of buttons) button.addEventListener('click', onToggle);
    this.cleanupFuncs.push(() => {
      for (const button of buttons) button.removeEventListener('click', onToggle);
    });
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
