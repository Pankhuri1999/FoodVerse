/** Player-facing English written for a global audience: short sentences, no toolkit jargon. */

export const XR_FAIL_HINT =
  'Could not start VR. Open this page in Google Chrome, Microsoft Edge, or Meta Quest Browser using a secure HTTPS connection.';

export const BOOT_HINT =
  'Open this page in Google Chrome, Microsoft Edge, or Meta Quest Browser. Use a secure HTTPS connection. On a computer, Enter VR starts a preview — it is not a physical headset.';

export function handsHint(immersive: boolean): string {
  if (immersive) {
    return 'Look down at the mixer. Drag a Left or Right stick to move that Touch controller. Hold Trigger to grab. IJKL moves the left controller, arrow keys move the right. Drop food in the bowl. Stir with S. If food floats, grab it again or press G.';
  }
  return 'This is a seated kitchen. Press Enter VR. On a computer, keep the top bar on Controllers. Drag the sticks to move the Touch controllers, then hold Trigger to grab. On a Meta headset, use the real sticks and triggers. Catch drifting food, or press the Stabilizer (G).';
}

export function inputModeHint(args: {
  immersive: boolean;
  preview: boolean;
  hands: boolean;
}): string {
  if (!args.immersive) {
    return 'Computer view. Click and drag food, or press Enter VR to use hands.';
  }
  if (args.preview && args.hands) {
    return 'Desktop VR preview is on hands. Switch the top bar to Controllers, then hold Trigger to grab.';
  }
  if (args.preview) {
    return 'Desktop VR preview — Meta Touch controllers. Drag a stick to move a controller, then hold Trigger to grab. This is not a physical headset.';
  }
  if (args.hands) {
    return 'Hand tracking is on. Pinch to pick up. Open your hand to drop.';
  }
  return 'VR is running. Hold both hands in view to pick up food.';
}

export function gravityHint(args: {
  reduced: boolean;
  stabilizer: boolean;
  incoming: boolean;
  mode: string;
}): string {
  if (args.reduced) {
    return 'Reduced motion is on. The ship will not tilt, and food will not drift.';
  }
  if (args.stabilizer) {
    return 'Stabilizer on. The ship is leveling and food is settling. Catch anything still loose.';
  }
  if (args.incoming) {
    return 'Asteroid incoming. Loose food will drift — pinch to catch it.';
  }
  if (args.mode === 'zero-g') {
    return 'Zero gravity. Food is floating. Pinch to catch it, or press the Stabilizer.';
  }
  if (args.mode === 'reverse') {
    return 'Gravity is reversed. Food is lifting. Pinch to catch it, or press the Stabilizer.';
  }
  if (args.mode === 'list') {
    return 'The ship is listing. Food is sliding. Pinch to catch it, or press the Stabilizer.';
  }
  return 'You stay seated. Asteroids can tilt the ship. Catch loose food, or press the Stabilizer.';
}

export function comfortLine(args: {
  pinch: string;
  reach: string;
  volume: number;
  reduced: boolean;
  fpsNote: string;
}): string {
  const motion = args.reduced ? 'reduced motion' : 'full motion';
  return `Seated play · Pinch ${args.pinch} · Reach ${args.reach} · Volume ${Math.round(args.volume * 100)}% · ${motion}${args.fpsNote}`;
}

export function pauseHint(args: {
  paused: boolean;
  lostHands: boolean;
  immersive: boolean;
}): string {
  if (args.paused) return 'Paused. Your progress is saved. Resume when you are ready.';
  if (args.lostHands) {
    return args.immersive
      ? 'Hand tracking lost. Keep both hands in view. Held items were returned to the counter.'
      : 'The headset lost focus. Gameplay is paused. Look back to continue.';
  }
  return 'Seated play. You do not walk. Look with your head. There is no camera shake.';
}

export function pinchHud(left: number, right: number, commit: number): string {
  return `Pinch  L ${Math.round(left * 100)}%   R ${Math.round(right * 100)}%   threshold ${Math.round(commit * 100)}%`;
}

export function stageLine(index: number, total: number, title: string): string {
  return `Step ${index} of ${total} — ${title}`;
}

export function temperatureLine(temp: string): string {
  if (temp === 'hot') return 'Temperature: heat';
  if (temp === 'cold') return 'Temperature: cold';
  return 'Temperature: idle';
}

export function stirLine(stir: number, need = 45): string {
  return `Stir: ${Math.min(100, Math.floor(stir * 100))}%  (need ${need}%)`;
}
