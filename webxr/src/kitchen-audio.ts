let context: AudioContext | undefined;
let master = 0.7;

function audio(): AudioContext | undefined {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return undefined;
  if (!context) context = new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function setMasterVolume(volume: number): void {
  master = Math.min(1, Math.max(0, volume));
}

export function getMasterVolume(): number {
  return master;
}

export function playImpact(): void {
  playChord([72, 96, 128], 0.55, 0.14);
}

export function playChord(frequencies: readonly number[], duration = 0.5, volume = 0.07): void {
  const ac = audio();
  if (!ac) return;
  const gainLevel = volume * master;
  if (gainLevel <= 0.0001) return;
  const now = ac.currentTime;
  for (const frequency of frequencies) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
}
