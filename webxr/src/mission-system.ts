import {
  createSystem,
  Entity,
  Grabbed,
  GrabSystem,
  Object3D,
  OneHandGrabbable,
  PokeInteractable,
  RayInteractable,
  UIKit,
  UIKitMLAsset,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { CreatureId } from './creature-catalog.js';
import { playChord } from './kitchen-audio.js';
import {
  BuildPiece,
  CookieKingdom,
  Creature,
  GravityCore,
  Ingredient,
  Mission,
  QuantumMixer,
} from './kitchen-components.js';
import { stageLine } from './copy.js';
import {
  archiveLine,
  deriveMissionStage,
  kingdomLine,
  MISSION_STAGE_COUNT,
  MissionFacts,
  pairCollected,
  stageById,
} from './mission-catalog.js';
import {
  clearRunKeepJournal,
  emptyMissionSave,
  loadMissionSave,
  MissionSave,
  writeMissionSave,
} from './mission-save.js';
import { EMBER_SPARK, GROVE_BLOOM, MINT_CURRENT } from './recipe-catalog.js';

type Pose = { parent: Object3D | null; position: Vector3; rotation: Vector3 };

export class MissionSystem extends createSystem({
  mission: { required: [Mission] },
  mixer: { required: [QuantumMixer] },
  items: { required: [Ingredient] },
  creatures: { required: [Creature] },
  kingdom: { required: [CookieKingdom] },
  gravity: { required: [GravityCore] },
  pieces: { required: [BuildPiece] },
}) {
  private stageLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private objectiveLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private kingdomLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private archiveLabel: ReturnType<UIKitMLAsset['getElementById']> | undefined;
  private homes = new Map<Entity, Pose>();
  private lastStage = '';
  private lastSave = '';
  private everRestored = false;

  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('mission-hud');
    this.stageLabel = panel?.getElementById('stage-title') ?? undefined;
    this.objectiveLabel = panel?.getElementById('objective') ?? undefined;
    this.kingdomLabel = panel?.getElementById('kingdom-status') ?? undefined;
    this.archiveLabel = panel?.getElementById('archive-status') ?? undefined;
    const restart = panel?.getElementById('restart-button');
    const onRestart = () => this.restartMission();
    restart?.addEventListener('click', onRestart);
    this.cleanupFuncs.push(() => restart?.removeEventListener('click', onRestart));

    for (const entity of [
      ...this.queries.items.entities,
      ...this.queries.creatures.entities,
      ...this.queries.pieces.entities,
    ]) {
      const object = entity.object3D;
      if (!object) continue;
      this.homes.set(entity, {
        parent: object.parent,
        position: object.position.clone(),
        rotation: new Vector3(object.rotation.x, object.rotation.y, object.rotation.z),
      });
    }
    this.applySave(loadMissionSave());
  }

  update(delta: number): void {
    if (this.input.keyboard.getKeyDown('KeyR')) this.restartMission();

    const mission = this.missionEntity();
    if (!mission) return;
    const noticeT = mission.getValue(Mission, 'noticeT') ?? 0;
    if (noticeT > 0) {
      const next = Math.max(0, noticeT - delta);
      mission.setValue(Mission, 'noticeT', next);
      if (next <= 0) mission.setValue(Mission, 'notice', '');
    }

    const facts = this.facts();
    const stage = deriveMissionStage(facts);
    const changed = stage.id !== this.lastStage;
    mission.setValue(Mission, 'stage', stage.id);
    mission.setValue(Mission, 'index', stage.index);
    mission.setValue(Mission, 'allowedRecipe', stage.allowedRecipe);
    mission.setValue(Mission, 'target', stage.target);
    mission.setValue(Mission, 'restored', stage.id === 'restored');
    const kingdom = this.kingdomEntity();
    if (kingdom) {
      kingdom.setValue(
        CookieKingdom,
        'feast',
        facts.ice && facts.grove && facts.water && facts.wafer && facts.cocoa && facts.foliage,
      );
      kingdom.setValue(
        CookieKingdom,
        'restored',
        Number(facts.ice) + Number(facts.grove) + Number(facts.water),
      );
    }
    if (stage.id === 'restored') this.everRestored = true;
    if (changed) {
      if (this.lastStage) playChord([440, 554, 659], 0.28, 0.055);
      this.lastStage = stage.id;
      this.persist();
    }
    this.refreshHud(mission, facts);
  }

  private facts(): MissionFacts {
    const present = new Set<string>();
    for (const entity of this.queries.items.entities) {
      const id = entity.getValue(Ingredient, 'id') ?? '';
      const ready =
        (entity.getValue(Ingredient, 'inMixer') ?? false) ||
        (entity.getValue(Ingredient, 'consumed') ?? false);
      if (id && ready) present.add(id);
    }
    const hatched = (id: CreatureId) =>
      [...this.queries.creatures.entities].some(
        (entity) => entity.getValue(Creature, 'id') === id && entity.getValue(Creature, 'hatched'),
      );
    const kingdom = this.kingdomEntity();
    return {
      emberCollected: pairCollected(EMBER_SPARK.ingredients, present),
      emberHatched: hatched('ember-dragon'),
      ice: kingdom?.getValue(CookieKingdom, 'ice') ?? false,
      groveCollected: pairCollected(GROVE_BLOOM.ingredients, present),
      groveHatched: hatched('grove-guardian'),
      grove: kingdom?.getValue(CookieKingdom, 'grove') ?? false,
      mintCollected: pairCollected(MINT_CURRENT.ingredients, present),
      mintHatched: hatched('mint-current'),
      water: kingdom?.getValue(CookieKingdom, 'water') ?? false,
      wafer: kingdom?.getValue(CookieKingdom, 'wafer') ?? false,
      cocoa: kingdom?.getValue(CookieKingdom, 'cocoa') ?? false,
      foliage: kingdom?.getValue(CookieKingdom, 'foliage') ?? false,
    };
  }

  private persist(): void {
    const payload = this.snapshot();
    const encoded = JSON.stringify(payload);
    if (encoded === this.lastSave) return;
    this.lastSave = encoded;
    writeMissionSave(payload);
  }

  private snapshot(): MissionSave {
    const data = emptyMissionSave();
    data.everRestored = this.everRestored;
    const kingdom = this.kingdomEntity();
    data.ice = kingdom?.getValue(CookieKingdom, 'ice') ?? false;
    data.grove = kingdom?.getValue(CookieKingdom, 'grove') ?? false;
    data.water = kingdom?.getValue(CookieKingdom, 'water') ?? false;
    data.wafer = kingdom?.getValue(CookieKingdom, 'wafer') ?? false;
    data.cocoa = kingdom?.getValue(CookieKingdom, 'cocoa') ?? false;
    data.foliage = kingdom?.getValue(CookieKingdom, 'foliage') ?? false;
    for (const entity of this.queries.creatures.entities) {
      const id = entity.getValue(Creature, 'id') as CreatureId;
      if (!data.creatures[id]) continue;
      data.creatures[id] = {
        hatched: entity.getValue(Creature, 'hatched') ?? false,
        delivered: entity.getValue(Creature, 'delivered') ?? false,
      };
    }
    for (const entity of this.queries.items.entities) {
      const id = entity.getValue(Ingredient, 'id') as keyof MissionSave['consumed'];
      if (!(id in data.consumed)) continue;
      data.consumed[id] = entity.getValue(Ingredient, 'consumed') ?? false;
    }
    return data;
  }

  private applySave(save: MissionSave): void {
    this.everRestored = save.everRestored;
    const kingdom = this.kingdomEntity();
    if (kingdom) {
      kingdom.setValue(CookieKingdom, 'ice', save.ice);
      kingdom.setValue(CookieKingdom, 'grove', save.grove);
      kingdom.setValue(CookieKingdom, 'water', save.water);
      kingdom.setValue(CookieKingdom, 'wafer', save.wafer);
      kingdom.setValue(CookieKingdom, 'cocoa', save.cocoa);
      kingdom.setValue(CookieKingdom, 'foliage', save.foliage);
      kingdom.setValue(
        CookieKingdom,
        'feast',
        save.ice && save.grove && save.water && save.wafer && save.cocoa && save.foliage,
      );
      kingdom.setValue(
        CookieKingdom,
        'restored',
        Number(save.ice) + Number(save.grove) + Number(save.water),
      );
    }
    for (const entity of this.queries.creatures.entities) {
      const id = entity.getValue(Creature, 'id') as CreatureId;
      const row = save.creatures[id];
      if (!row) continue;
      entity.setValue(Creature, 'hatched', row.hatched);
      entity.setValue(Creature, 'delivered', row.delivered);
      entity.setValue(Creature, 'spiral', false);
      const object = entity.object3D;
      if (!object) continue;
      if (row.hatched) {
        object.visible = true;
        object.scale.setScalar(row.delivered ? 0.85 : 1);
        if (row.delivered) this.stripGrab(entity);
      } else {
        this.stripGrab(entity);
        this.resetPose(entity);
        object.visible = false;
        object.scale.setScalar(0.001);
      }
    }
    for (const entity of this.queries.items.entities) {
      const id = entity.getValue(Ingredient, 'id') as keyof MissionSave['consumed'];
      const consumed = Boolean(save.consumed[id]);
      entity.setValue(Ingredient, 'consumed', consumed);
      entity.setValue(Ingredient, 'inMixer', false);
      entity.setValue(Ingredient, 'heated', false);
      entity.setValue(Ingredient, 'loose', false);
      entity.setValue(Ingredient, 'driftX', 0);
      entity.setValue(Ingredient, 'driftY', 0);
      entity.setValue(Ingredient, 'driftZ', 0);
      const object = entity.object3D;
      if (!object) continue;
      this.resetPose(entity);
      object.visible = !consumed;
    }
    this.resetMixer();
    this.resetGravity();
    this.applyBuildPieces(save);
    this.lastSave = JSON.stringify(save);
    this.lastStage = deriveMissionStage(this.facts()).id;
  }

  private restartMission(): void {
    const grab = this.world.getSystem(GrabSystem);
    for (const entity of [
      ...this.queries.items.entities,
      ...this.queries.creatures.entities,
      ...this.queries.pieces.entities,
    ]) {
      if (entity.hasComponent(Grabbed)) grab?.forceRelease(entity);
    }
    this.applySave(clearRunKeepJournal(this.everRestored));
    this.lastStage = '';
    playChord([330, 392, 440], 0.32, 0.05);
  }

  private resetPose(entity: Entity): void {
    const object = entity.object3D;
    const home = this.homes.get(entity);
    if (!object || !home) return;
    const parent = home.parent ?? this.world.activeLevel.value?.object3D ?? this.scene;
    parent.attach(object);
    object.position.copy(home.position);
    object.rotation.set(home.rotation.x, home.rotation.y, home.rotation.z);
    object.scale.setScalar(1);
  }

  private stripGrab(entity: Entity): void {
    if (entity.hasComponent(OneHandGrabbable)) entity.removeComponent(OneHandGrabbable);
    if (entity.hasComponent(RayInteractable)) entity.removeComponent(RayInteractable);
    if (entity.hasComponent(PokeInteractable)) entity.removeComponent(PokeInteractable);
  }

  private resetMixer(): void {
    const mixer = this.queries.mixer.entities.values().next().value;
    if (!mixer) return;
    mixer.setValue(QuantumMixer, 'armed', false);
    mixer.setValue(QuantumMixer, 'cooking', false);
    mixer.setValue(QuantumMixer, 'count', 0);
    mixer.setValue(QuantumMixer, 'temperature', 'neutral');
    mixer.setValue(QuantumMixer, 'stir', 0);
    mixer.setValue(QuantumMixer, 'stirring', false);
    mixer.setValue(QuantumMixer, 'phase', 'idle');
    mixer.setValue(QuantumMixer, 'transformT', 0);
    mixer.setValue(QuantumMixer, 'pendingRecipe', '');
    const contents = mixer.object3D?.getObjectByName('Contents');
    if (contents) contents.scale.setScalar(1);
  }

  private refreshHud(mission: Entity, facts: MissionFacts): void {
    const stage = stageById(mission.getValue(Mission, 'stage') ?? '');
    const desktop = this.visibilityState.value === VisibilityState.NonImmersive;
    const notice = mission.getValue(Mission, 'notice') ?? '';
    const objective = notice || (desktop ? stage.desktopObjective : stage.xrObjective);
    this.setText(this.stageLabel, stageLine(stage.index, MISSION_STAGE_COUNT, stage.title));
    this.setText(this.objectiveLabel, objective);
    this.setText(this.kingdomLabel, kingdomLine(facts));
    this.setText(this.archiveLabel, archiveLine(facts));
    this.refreshArchive(facts);
  }

  private refreshArchive(facts: MissionFacts): void {
    const object = this.scene.getObjectByName('DiscoveryArchive');
    if (!object) return;
    const show = (name: string, on: boolean) => {
      const node = object.getObjectByName(name);
      if (node) node.visible = on;
    };
    show('RecipeEmber', facts.emberHatched);
    show('RecipeGrove', facts.groveHatched);
    show('RecipeMint', facts.mintHatched);
    show('Ing-cosmic-fruit', facts.emberCollected || facts.emberHatched);
    show('Ing-star-pepper', facts.emberCollected || facts.emberHatched);
    show('Ing-space-leaves', facts.groveCollected || facts.groveHatched);
    show('Ing-crystal-sugar', facts.groveCollected || facts.groveHatched);
    show('Ing-chocolate', facts.mintCollected || facts.mintHatched);
    show('Ing-mint-crystal', facts.mintCollected || facts.mintHatched);
  }

  private resetGravity(): void {
    for (const entity of this.queries.gravity.entities) {
      entity.setValue(GravityCore, 'mode', 'normal');
      entity.setValue(GravityCore, 'eventMode', 'zero-g');
      entity.setValue(GravityCore, 'eventT', 0);
      entity.setValue(GravityCore, 'fired', false);
      entity.setValue(GravityCore, 'reversed', false);
      entity.setValue(GravityCore, 'stabilizer', false);
      entity.setValue(GravityCore, 'stabilizeT', 0);
    }
  }

  private applyBuildPieces(save: MissionSave): void {
    const root = this.kingdomEntity()?.object3D;
    const sockets: Record<string, string> = {
      cookie: 'CookieBridge',
      chocolate: 'WaterPath',
      leaf: 'BarrenSoil',
    };
    const placed: Record<string, boolean> = {
      cookie: save.wafer,
      chocolate: save.cocoa,
      leaf: save.foliage,
    };
    for (const entity of this.queries.pieces.entities) {
      const kind = entity.getValue(BuildPiece, 'kind') ?? '';
      const done = placed[kind] === true;
      entity.setValue(BuildPiece, 'placed', done);
      const object = entity.object3D;
      if (!object) continue;
      if (!done || !root) {
        this.resetPose(entity);
        continue;
      }
      const socket = root.getObjectByName(sockets[kind] ?? '');
      if (!socket) {
        this.resetPose(entity);
        continue;
      }
      root.attach(object);
      socket.getWorldPosition(object.position);
      root.worldToLocal(object.position);
      object.position.y += 0.03;
    }
  }

  private missionEntity(): Entity | undefined {
    return this.queries.mission.entities.values().next().value;
  }

  private kingdomEntity(): Entity | undefined {
    return this.queries.kingdom.entities.values().next().value;
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
