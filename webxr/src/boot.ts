import { BOOT_HINT } from './copy.js';

type Vec3Like = {
  x?: number;
  y?: number;
  z?: number;
  set: (x: number, y: number, z: number) => void;
};
type QuatLike = { set: (x: number, y: number, z: number, w: number) => void };

type IwerController = {
  connected?: boolean;
  position?: Vec3Like;
  quaternion?: QuatLike;
  updateButtonValue?: (id: string, value: number) => void;
  updateAxes?: (id: string, x: number, y: number) => void;
  getAxes?: (id?: string) => { x: number; y: number };
};

type TransformHandle = {
  visible: boolean;
  position: { x: number; y: number; z: number };
};

type IwerPreviewDevice = {
  primaryInputMode: 'controller' | 'hand';
  position?: Vec3Like;
  quaternion?: QuatLike;
  hands?: {
    left?: { position?: Vec3Like };
    right?: { position?: Vec3Like };
  };
  controllers?: {
    left?: IwerController;
    right?: IwerController;
  };
  sem?: {
    boundingBoxesVisible: boolean;
    planesVisible: boolean;
    meshesVisible: boolean;
  };
  devui?: {
    devUICanvas?: HTMLCanvasElement;
    devUIContainer?: HTMLDivElement;
    applyDefaultPose?: (pose: {
      headset: { position: number[]; quaternion: number[] };
      controllers?: Record<string, { position: number[]; quaternion: number[] }>;
      hands?: Record<string, { position: number[]; quaternion: number[] }>;
    }) => void;
  };
  grantOfferedSession?: () => void;
  activeSession?: unknown;
};

const HEAD = { x: 0, y: 1.26, z: 0.52 };
const PITCH = -0.42;
const HEAD_QUAT = [
  Math.sin(PITCH / 2),
  0,
  0,
  Math.cos(PITCH / 2),
] as const;
const CTRL_PITCH = -0.58;
const CTRL_QUAT = [
  Math.sin(CTRL_PITCH / 2),
  0,
  0,
  Math.cos(CTRL_PITCH / 2),
] as const;
const LEFT_CTRL = { x: -0.3, y: 0.9, z: -0.36 };
const RIGHT_CTRL = { x: 0.3, y: 0.9, z: -0.36 };

const STICK_SPEED = 0.95;
const STICK_DEADZONE = 0.08;
const LOCAL_REACH = {
  minX: -0.92,
  maxX: 0.92,
  minY: -0.88,
  maxY: 0.28,
  minZ: -1.48,
  maxZ: 0.28,
};
const WORLD_REACH = {
  minX: -0.85,
  maxX: 0.85,
  minY: 0.52,
  maxY: 1.38,
  minZ: -1.2,
  maxZ: 0.22,
};

const keyAxes = {
  left: { x: 0, y: 0, lift: 0 },
  right: { x: 0, y: 0, lift: 0 },
};
const padAxes = {
  left: { x: 0, y: 0, lift: 0 },
  right: { x: 0, y: 0, lift: 0 },
};

function iwerDevice(): IwerPreviewDevice | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { IWER_DEVICE?: IwerPreviewDevice }).IWER_DEVICE;
}

function transformHandles(): Map<string, TransformHandle> | undefined {
  return (
    window as Window & {
      transformHandles?: Map<string, TransformHandle>;
    }
  ).transformHandles;
}

function poseOf(
  pos: { x: number; y: number; z: number },
  quat: readonly [number, number, number, number],
): { position: number[]; quaternion: number[] } {
  return {
    position: [pos.x, pos.y, pos.z],
    quaternion: [...quat],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampAxis(value: number): number {
  return clamp(value, -1, 1);
}

/** Keep the Meta Touch L/R pads, hide only the RGB gizmos that cover the kitchen. */
function styleIwerControllerUi(device: IwerPreviewDevice): void {
  const canvas = device.devui?.devUICanvas;
  if (canvas) canvas.style.display = 'none';

  const root = device.devui?.devUIContainer?.shadowRoot;
  if (root) {
    root.getElementById('foodiverse-hide-inspectors')?.remove();
    if (!root.getElementById('foodiverse-controller-ui')) {
      const style = document.createElement('style');
      style.id = 'foodiverse-controller-ui';
      style.textContent = `
        div[style*="bottom: 8px"] {
          z-index: 8;
          pointer-events: auto;
        }
      `;
      root.appendChild(style);
    }
    for (const span of root.querySelectorAll('span')) {
      const label = span.textContent?.trim();
      if (label !== 'Pos' && label !== 'Rot') continue;
      const row = span.parentElement;
      if (row instanceof HTMLElement) row.style.display = 'none';
    }
  }

  transformHandles()?.forEach((handle) => {
    handle.visible = false;
  });
}

function seatAtMixer(device: IwerPreviewDevice): void {
  device.position?.set(HEAD.x, HEAD.y, HEAD.z);
  device.quaternion?.set(HEAD_QUAT[0], HEAD_QUAT[1], HEAD_QUAT[2], HEAD_QUAT[3]);
  device.hands?.left?.position?.set(LEFT_CTRL.x, LEFT_CTRL.y, LEFT_CTRL.z);
  device.hands?.right?.position?.set(RIGHT_CTRL.x, RIGHT_CTRL.y, RIGHT_CTRL.z);
  const left = device.controllers?.left;
  const right = device.controllers?.right;
  if (left) left.connected = true;
  if (right) right.connected = true;
  left?.position?.set(LEFT_CTRL.x, LEFT_CTRL.y, LEFT_CTRL.z);
  right?.position?.set(RIGHT_CTRL.x, RIGHT_CTRL.y, RIGHT_CTRL.z);
  left?.quaternion?.set(CTRL_QUAT[0], CTRL_QUAT[1], CTRL_QUAT[2], CTRL_QUAT[3]);
  right?.quaternion?.set(CTRL_QUAT[0], CTRL_QUAT[1], CTRL_QUAT[2], CTRL_QUAT[3]);
  device.devui?.applyDefaultPose?.({
    headset: poseOf(HEAD, HEAD_QUAT),
    controllers: {
      left: poseOf(LEFT_CTRL, CTRL_QUAT),
      right: poseOf(RIGHT_CTRL, CTRL_QUAT),
    },
    hands: {
      left: poseOf(LEFT_CTRL, CTRL_QUAT),
      right: poseOf(RIGHT_CTRL, CTRL_QUAT),
    },
  });
}

function pressController(
  hand: 'left' | 'right',
  button: string,
  value: number,
): void {
  iwerDevice()?.controllers?.[hand]?.updateButtonValue?.(button, value);
}

function nudgePos(
  pos: { x?: number; y?: number; z?: number; set?: (x: number, y: number, z: number) => void },
  dx: number,
  dy: number,
  dz: number,
  bounds: typeof LOCAL_REACH,
): void {
  const x = clamp((pos.x ?? 0) + dx, bounds.minX, bounds.maxX);
  const y = clamp((pos.y ?? 0) + dy, bounds.minY, bounds.maxY);
  const z = clamp((pos.z ?? 0) + dz, bounds.minZ, bounds.maxZ);
  if (typeof pos.set === 'function') pos.set(x, y, z);
  else {
    pos.x = x;
    pos.y = y;
    pos.z = z;
  }
}

function moveController(
  hand: 'left' | 'right',
  ax: number,
  ay: number,
  lift: number,
  dt: number,
): void {
  const dx = Math.abs(ax) > STICK_DEADZONE ? ax * STICK_SPEED * dt : 0;
  const dz = Math.abs(ay) > STICK_DEADZONE ? ay * STICK_SPEED * dt : 0;
  const dy = Math.abs(lift) > STICK_DEADZONE ? lift * STICK_SPEED * dt : 0;
  if (dx === 0 && dy === 0 && dz === 0) return;
  const handle = transformHandles()?.get(hand);
  if (handle?.position) {
    nudgePos(handle.position, dx, dy, dz, LOCAL_REACH);
    return;
  }
  const world = iwerDevice()?.controllers?.[hand]?.position;
  if (world) nudgePos(world, dx, dy, dz, WORLD_REACH);
}

function bindPadStick(well: HTMLElement, hand: 'left' | 'right'): void {
  const knob = well.querySelector<HTMLElement>('.stick-knob');
  if (!knob) return;
  const max = 28;
  const apply = (clientX: number, clientY: number) => {
    const rect = well.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let lx = clientX - cx;
    let ly = clientY - cy;
    const dist = Math.hypot(lx, ly);
    if (dist > max) {
      lx = (lx / dist) * max;
      ly = (ly / dist) * max;
    }
    knob.style.transform = `translate(${lx}px, ${ly}px)`;
    const nx = clampAxis(lx / max);
    const ny = clampAxis(ly / max);
    padAxes[hand].x = nx;
    padAxes[hand].y = ny;
    iwerDevice()?.controllers?.[hand]?.updateAxes?.('thumbstick', nx, ny);
  };
  const clear = () => {
    knob.style.transform = 'translate(0, 0)';
    padAxes[hand].x = 0;
    padAxes[hand].y = 0;
    iwerDevice()?.controllers?.[hand]?.updateAxes?.('thumbstick', 0, 0);
  };
  well.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    well.setPointerCapture(event.pointerId);
    apply(event.clientX, event.clientY);
  });
  well.addEventListener('pointermove', (event) => {
    if (!well.hasPointerCapture(event.pointerId)) return;
    apply(event.clientX, event.clientY);
  });
  const end = (event: PointerEvent) => {
    if (well.hasPointerCapture(event.pointerId)) {
      well.releasePointerCapture(event.pointerId);
    }
    clear();
  };
  well.addEventListener('pointerup', end);
  well.addEventListener('pointercancel', end);
}

function ensureGrabPads(device: IwerPreviewDevice): void {
  let host = document.getElementById('foodiverse-pads');
  if (!host) {
    host = document.createElement('div');
    host.id = 'foodiverse-pads';
    host.innerHTML = `
      <div class="pad pad-left">
        <p class="pad-kicker">Left Touch</p>
        <div class="stick-well" data-hand="left" aria-label="Left stick">
          <span class="stick-knob"></span>
        </div>
        <div class="pad-lift">
          <button type="button" data-hand="left" data-lift="1">Up</button>
          <button type="button" data-hand="left" data-lift="-1">Down</button>
        </div>
        <button type="button" data-hand="left" data-btn="trigger">Trigger · Grab</button>
        <button type="button" data-hand="left" data-btn="squeeze">Grip</button>
        <p class="pad-keys">IJKL move · Q grab · U/O up/down</p>
      </div>
      <div class="pad pad-right">
        <p class="pad-kicker">Right Touch</p>
        <div class="stick-well" data-hand="right" aria-label="Right stick">
          <span class="stick-knob"></span>
        </div>
        <div class="pad-lift">
          <button type="button" data-hand="right" data-lift="1">Up</button>
          <button type="button" data-hand="right" data-lift="-1">Down</button>
        </div>
        <button type="button" data-hand="right" data-btn="trigger">Trigger · Grab</button>
        <button type="button" data-hand="right" data-btn="squeeze">Grip</button>
        <p class="pad-keys">Arrows move · click grab · PgUp/Dn</p>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
      #foodiverse-pads {
        position: fixed;
        left: 12px;
        right: 12px;
        top: 56px;
        z-index: 24;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
        font-family: system-ui, "Segoe UI", "Noto Sans", Arial, sans-serif;
      }
      #foodiverse-pads[hidden] { display: none; }
      #foodiverse-pads .pad {
        pointer-events: auto;
        width: 168px;
        padding: 8px 8px 6px;
        border-radius: 14px;
        background: rgba(18, 12, 10, 0.9);
        border: 1px solid rgba(111, 211, 232, 0.42);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(12px);
      }
      #foodiverse-pads .pad-kicker {
        margin: 0 0 8px;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #e8c35a;
        font-weight: 700;
      }
      #foodiverse-pads .stick-well {
        position: relative;
        width: 84px;
        height: 84px;
        margin: 0 auto 8px;
        border-radius: 50%;
        background: radial-gradient(circle at 50% 40%, #2a333c, #10161c);
        border: 1px solid rgba(94, 212, 232, 0.45);
        box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.45);
        touch-action: none;
        cursor: grab;
      }
      #foodiverse-pads .stick-knob {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 28px;
        height: 28px;
        margin: -14px 0 0 -14px;
        border-radius: 50%;
        background: #5ed4e8;
        box-shadow: 0 0 10px rgba(94, 212, 232, 0.7);
        pointer-events: none;
      }
      #foodiverse-pads .pad-lift {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin: 0 0 6px;
      }
      #foodiverse-pads button {
        display: block;
        width: 100%;
        margin: 0 0 6px;
        padding: 9px 8px;
        border-radius: 10px;
        border: 1px solid rgba(94, 212, 232, 0.55);
        background: #17343c;
        color: #e8f7fb;
        font-size: 13px;
        font-weight: 650;
        cursor: pointer;
      }
      #foodiverse-pads .pad-lift button { margin: 0; padding: 7px 6px; font-size: 12px; }
      #foodiverse-pads button[data-btn="trigger"] {
        background: #5ed4e8;
        color: #071018;
        border-color: #5ed4e8;
      }
      #foodiverse-pads button.is-held,
      #foodiverse-pads button:active {
        filter: brightness(1.12);
      }
      #foodiverse-pads .pad-keys {
        margin: 2px 0 0;
        font-size: 11px;
        color: #9aa4b2;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(host);

    host.querySelectorAll<HTMLElement>('.stick-well').forEach((well) => {
      const hand = well.dataset.hand;
      if (hand === 'left' || hand === 'right') bindPadStick(well, hand);
    });

    const setHeld = (button: HTMLButtonElement, held: boolean) => {
      const hand = button.dataset.hand;
      if (hand !== 'left' && hand !== 'right') return;
      button.classList.toggle('is-held', held);
      const lift = button.dataset.lift;
      if (lift) {
        padAxes[hand].lift = held ? Number(lift) : 0;
        return;
      }
      const btn = button.dataset.btn;
      if (!btn) return;
      pressController(hand, btn, held ? 1 : 0);
    };

    host.addEventListener('pointerdown', (event) => {
      const button = (event.target as HTMLElement | null)?.closest('button');
      if (!(button instanceof HTMLButtonElement)) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setHeld(button, true);
    });
    const release = (event: PointerEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button');
      if (!(button instanceof HTMLButtonElement)) return;
      setHeld(button, false);
    };
    host.addEventListener('pointerup', release);
    host.addEventListener('pointercancel', release);
    host.addEventListener('lostpointercapture', release);
  }
  host.hidden = !device.activeSession;
}

let keysBound = false;

function bindDesktopControllerKeys(): void {
  if (keysBound) return;
  keysBound = true;

  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable);

  const isHud = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest('#desk-hud') ||
        target.closest('#foodiverse-pads') ||
        target.closest('button'),
    );

  const isSceneCanvas = (target: EventTarget | null) =>
    target instanceof HTMLCanvasElement &&
    Boolean(target.closest('#scene-container'));

  const refreshKeyAxes = () => {
    iwerDevice()?.controllers?.left?.updateAxes?.(
      'thumbstick',
      clampAxis(keyAxes.left.x + padAxes.left.x),
      clampAxis(keyAxes.left.y + padAxes.left.y),
    );
    iwerDevice()?.controllers?.right?.updateAxes?.(
      'thumbstick',
      clampAxis(keyAxes.right.x + padAxes.right.x),
      clampAxis(keyAxes.right.y + padAxes.right.y),
    );
  };

  const setKey = (event: KeyboardEvent, down: boolean) => {
    if (isTyping(event.target)) return;
    const on = down ? 1 : 0;
    switch (event.code) {
      case 'KeyJ':
        keyAxes.left.x = -on;
        break;
      case 'KeyL':
        keyAxes.left.x = on;
        break;
      case 'KeyI':
        keyAxes.left.y = -on;
        break;
      case 'KeyK':
        keyAxes.left.y = on;
        break;
      case 'KeyU':
        keyAxes.left.lift = on;
        break;
      case 'KeyO':
        keyAxes.left.lift = -on;
        break;
      case 'ArrowLeft':
        keyAxes.right.x = -on;
        break;
      case 'ArrowRight':
        keyAxes.right.x = on;
        break;
      case 'ArrowUp':
        keyAxes.right.y = -on;
        break;
      case 'ArrowDown':
        keyAxes.right.y = on;
        break;
      case 'PageUp':
        keyAxes.right.lift = on;
        break;
      case 'PageDown':
        keyAxes.right.lift = -on;
        break;
      default:
        return;
    }
    event.preventDefault();
    refreshKeyAxes();
  };

  window.addEventListener('keydown', (event) => {
    if (!iwerDevice()?.activeSession || isTyping(event.target)) return;
    if (!event.repeat) {
      if (event.code === 'KeyQ') pressController('left', 'trigger', 1);
      if (event.code === 'KeyE') pressController('left', 'squeeze', 1);
    }
    setKey(event, true);
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'KeyQ') pressController('left', 'trigger', 0);
    if (event.code === 'KeyE') pressController('left', 'squeeze', 0);
    setKey(event, false);
  });
  window.addEventListener('mousedown', (event) => {
    if (!iwerDevice()?.activeSession || isHud(event.target) || !isSceneCanvas(event.target)) {
      return;
    }
    if (event.button === 0) pressController('right', 'trigger', 1);
    if (event.button === 2) {
      event.preventDefault();
      pressController('right', 'squeeze', 1);
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) pressController('right', 'trigger', 0);
    if (event.button === 2) pressController('right', 'squeeze', 0);
  });
  window.addEventListener('blur', () => {
    keyAxes.left.x = keyAxes.left.y = keyAxes.left.lift = 0;
    keyAxes.right.x = keyAxes.right.y = keyAxes.right.lift = 0;
    pressController('left', 'trigger', 0);
    pressController('left', 'squeeze', 0);
    pressController('right', 'trigger', 0);
    pressController('right', 'squeeze', 0);
  });
  window.addEventListener('contextmenu', (event) => {
    if (iwerDevice()?.activeSession && isSceneCanvas(event.target)) event.preventDefault();
  });
}

let driveStarted = false;
let lastDrive = 0;

function startControllerDrive(): void {
  if (driveStarted) return;
  driveStarted = true;
  const tick = (time: number) => {
    const dt = lastDrive ? Math.min((time - lastDrive) / 1000, 0.05) : 0.016;
    lastDrive = time;
    const device = iwerDevice();
    if (device?.activeSession && device.primaryInputMode === 'controller') {
      (['left', 'right'] as const).forEach((hand) => {
        const gp = device.controllers?.[hand]?.getAxes?.('thumbstick') ?? {
          x: 0,
          y: 0,
        };
        const localX = keyAxes[hand].x + padAxes[hand].x;
        const localY = keyAxes[hand].y + padAxes[hand].y;
        const usingPad = Math.abs(localX) > STICK_DEADZONE || Math.abs(localY) > STICK_DEADZONE;
        const ax = clampAxis(usingPad ? localX : gp.x);
        const ay = clampAxis(usingPad ? localY : gp.y);
        const lift = clampAxis(keyAxes[hand].lift + padAxes[hand].lift);
        moveController(hand, ax, ay, lift, dt);
      });
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

/** Desktop WebXR preview: Meta Touch controllers, seated gaze at the mixer. */
export function prepareIwerPreview(): void {
  const device = iwerDevice();
  if (!device) return;
  device.primaryInputMode = 'controller';
  if (device.sem) {
    device.sem.boundingBoxesVisible = false;
    device.sem.planesVisible = false;
    device.sem.meshesVisible = false;
  }
  styleIwerControllerUi(device);
  ensureGrabPads(device);
  bindDesktopControllerKeys();
  startControllerDrive();
}

export function isIwerPreview(): boolean {
  return iwerDevice() != null;
}

let guardStarted = false;
let grantPatched = false;
let wasInXr = false;

/** Keep applying the kitchen view if IWER resets pose or input mode. */
export function startIwerPreviewGuard(): void {
  if (guardStarted || typeof window === 'undefined') return;
  guardStarted = true;
  prepareIwerPreview();
  window.setInterval(() => {
    const device = iwerDevice();
    if (!device) return;
    if (!grantPatched && typeof device.grantOfferedSession === 'function') {
      const original = device.grantOfferedSession.bind(device);
      device.grantOfferedSession = () => {
        prepareIwerPreview();
        original();
        window.requestAnimationFrame(() => {
          prepareIwerPreview();
          seatAtMixer(device);
        });
        window.setTimeout(() => {
          prepareIwerPreview();
          seatAtMixer(device);
        }, 80);
        window.setTimeout(() => {
          prepareIwerPreview();
          seatAtMixer(device);
        }, 240);
      };
      grantPatched = true;
    }
    styleIwerControllerUi(device);
    ensureGrabPads(device);
    const inXr = Boolean(device.activeSession);
    if (inXr && !wasInXr) {
      prepareIwerPreview();
      seatAtMixer(device);
    }
    wasInXr = inXr;
    if (inXr && device.primaryInputMode !== 'controller') {
      device.primaryInputMode = 'controller';
      seatAtMixer(device);
    }
  }, 250);
}

export function showBootError(message: string): void {
  const host =
    document.getElementById('scene-container') ?? document.body;
  host.replaceChildren();
  const box = document.createElement('div');
  box.style.cssText =
    'font-family:system-ui,"Segoe UI","Noto Sans","Helvetica Neue",Arial,sans-serif;color:#f4f1ea;padding:24px;max-width:40rem;line-height:1.5';
  const title = document.createElement('h1');
  title.textContent = 'FOODIVERSE could not start';
  title.style.fontSize = '20px';
  const body = document.createElement('p');
  body.textContent = message;
  const hint = document.createElement('p');
  hint.textContent = BOOT_HINT;
  hint.style.opacity = '0.8';
  box.append(title, body, hint);
  host.append(box);
}

export function launchInstalledPwaXr(world: {
  launchXR: () => Promise<unknown> | unknown;
}): void {
  const nav = navigator as Navigator & {
    xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
  };
  if (!('getDigitalGoodsService' in window) || !nav.xr?.isSessionSupported) return;
  nav.xr
    .isSessionSupported('immersive-vr')
    .then((supported) => {
      if (supported) return world.launchXR();
    })
    .catch(() => {
      // Installed-PWA auto-enter is best-effort. The Enter VR button remains.
    });
}
