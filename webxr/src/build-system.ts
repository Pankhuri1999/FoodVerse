import {
  createSystem,
  Entity,
  Grabbed,
  Object3D,
  Vector3,
} from '@iwsdk/core';
import { playChord } from './kitchen-audio.js';
import { BuildPiece, ComfortSettings, CookieKingdom } from './kitchen-components.js';

const SNAP = 0.16;

const SOCKETS: Record<string, string> = {
  cookie: 'CookieBridge',
  chocolate: 'WaterPath',
  leaf: 'BarrenSoil',
};

export class BuildSystem extends createSystem({
  pieces: { required: [BuildPiece] },
  held: { required: [BuildPiece, Grabbed] },
  kingdom: { required: [CookieKingdom] },
  comfort: { required: [ComfortSettings] },
}) {
  private piecePos = new Vector3();
  private socketPos = new Vector3();

  update(): void {
    const comfort = this.queries.comfort.entities.values().next().value;
    if (comfort?.getValue(ComfortSettings, 'paused')) return;
    const kingdom = this.queries.kingdom.entities.values().next().value;
    const root = kingdom?.object3D;
    if (!kingdom || !root) return;
    for (const entity of this.queries.pieces.entities) {
      if (entity.getValue(BuildPiece, 'placed')) continue;
      if (entity.hasComponent(Grabbed)) continue;
      this.trySnap(entity, kingdom, root);
    }
  }

  private trySnap(entity: Entity, kingdom: Entity, root: Object3D): void {
    const kind = entity.getValue(BuildPiece, 'kind') ?? '';
    const socketName = SOCKETS[kind];
    const socket = socketName ? root.getObjectByName(socketName) : undefined;
    const object = entity.object3D;
    if (!socket || !object) return;
    object.getWorldPosition(this.piecePos);
    socket.getWorldPosition(this.socketPos);
    if (this.piecePos.distanceTo(this.socketPos) > SNAP) return;
    root.attach(object);
    object.position.copy(this.socketPos);
    root.worldToLocal(object.position);
    object.position.y += 0.03;
    object.scale.setScalar(1);
    entity.setValue(BuildPiece, 'placed', true);
    if (kind === 'cookie') kingdom.setValue(CookieKingdom, 'wafer', true);
    if (kind === 'chocolate') kingdom.setValue(CookieKingdom, 'cocoa', true);
    if (kind === 'leaf') kingdom.setValue(CookieKingdom, 'foliage', true);
    playChord([392, 494, 587], 0.22, 0.05);
  }
}
