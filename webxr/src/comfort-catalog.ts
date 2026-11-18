export type ComfortPrefs = {
  pinchEase: number;
  grabReach: number;
  volume: number;
  reducedMotion: boolean;
  tutorialSeen: boolean;
};

const KEY = 'foodiverse.webxr.comfort.v1';

export const PINCH_EASE_MIN = 0;
export const PINCH_EASE_MAX = 1;
export const GRAB_REACH_MIN = 0.05;
export const GRAB_REACH_MAX = 0.14;
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 1;

export const TUTORIAL_STEPS = [
  'You stay seated. Everything is within arm’s reach. Look around with your head — you do not walk.',
  'Press Enter VR. Look down at the mixer. On a computer, keep Controllers on and hold Trigger to grab. On a headset, squeeze the real trigger.',
  'Look down at the mixer table. Six ingredients rest on the dishes beside the bowl. Pinch to pick them up.',
  'Asteroids can tilt the ship. Catch loose food, or press the Stabilizer. Stir to 45% to hatch Ember Dragon.',
  'Carry Ember Dragon to the Ice Gate, then place the cookie wafer on Cookie Bridge.',
  'Next, cook Grove Bloom and plant the leaf bundle. Then cook Mint Current, lay chocolate on the water path, and freeze the crossing. Pause saves your progress.',
] as const;

export function defaultComfort(): ComfortPrefs {
  return {
    pinchEase: 0.5,
    grabReach: 0.08,
    volume: 0.7,
    reducedMotion: false,
    tutorialSeen: false,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function loadComfort(): ComfortPrefs {
  const data = defaultComfort();
  if (typeof localStorage === 'undefined') return data;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return data;
    const parsed = JSON.parse(raw) as Partial<ComfortPrefs>;
    if (typeof parsed.pinchEase === 'number') data.pinchEase = clamp(parsed.pinchEase, PINCH_EASE_MIN, PINCH_EASE_MAX);
    if (typeof parsed.grabReach === 'number') data.grabReach = clamp(parsed.grabReach, GRAB_REACH_MIN, GRAB_REACH_MAX);
    if (typeof parsed.volume === 'number') data.volume = clamp(parsed.volume, VOLUME_MIN, VOLUME_MAX);
    data.reducedMotion = parsed.reducedMotion === true;
    data.tutorialSeen = parsed.tutorialSeen === true;
  } catch {
    return defaultComfort();
  }
  return data;
}

export function writeComfort(data: ComfortPrefs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private XR browsers may block storage.
  }
}

/** Lower ease = firmer pinch (higher strength required). Higher ease = easier pinch. */
export function pinchCommit(ease: number): number {
  return 0.82 - clamp(ease, 0, 1) * 0.42;
}

export function pinchLabel(ease: number): string {
  if (ease >= 0.75) return 'easy';
  if (ease <= 0.25) return 'firm';
  return 'balanced';
}

export function reachLabel(reach: number): string {
  if (reach >= 0.11) return 'long';
  if (reach <= 0.06) return 'short';
  return 'medium';
}
