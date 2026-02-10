type SoundEvent =
  | 'levelUp'
  | 'goldEarned'
  | 'combatHit'
  | 'combatMiss'
  | 'questComplete'
  | 'notification'
  | 'buttonClick'
  | 'error';

const VOLUME_KEY = 'roc_sound_volume';
const MUTE_KEY = 'roc_sound_muted';

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getVolume(): number {
  const stored = localStorage.getItem(VOLUME_KEY);
  return stored != null ? parseFloat(stored) : 0.3;
}

function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === 'true';
}

export function setVolume(v: number) {
  localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, v))));
}

export function setMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, String(muted));
}

export function getMuted(): boolean {
  return isMuted();
}

export function getStoredVolume(): number {
  return getVolume();
}

// Oscillator-based sound definitions
interface ToneStep {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<SoundEvent, ToneStep[]> = {
  levelUp: [
    { freq: 523, duration: 0.1, type: 'sine' },
    { freq: 659, duration: 0.1, type: 'sine' },
    { freq: 784, duration: 0.15, type: 'sine' },
    { freq: 1047, duration: 0.3, type: 'sine', gain: 0.8 },
  ],
  goldEarned: [
    { freq: 880, duration: 0.06, type: 'sine', gain: 0.4 },
    { freq: 1108, duration: 0.08, type: 'sine', gain: 0.3 },
  ],
  combatHit: [
    { freq: 200, duration: 0.05, type: 'sawtooth', gain: 0.5 },
    { freq: 120, duration: 0.1, type: 'square', gain: 0.3 },
  ],
  combatMiss: [
    { freq: 300, duration: 0.08, type: 'sine', gain: 0.2 },
    { freq: 200, duration: 0.12, type: 'sine', gain: 0.1 },
  ],
  questComplete: [
    { freq: 440, duration: 0.12, type: 'sine' },
    { freq: 554, duration: 0.12, type: 'sine' },
    { freq: 659, duration: 0.12, type: 'sine' },
    { freq: 880, duration: 0.25, type: 'sine', gain: 0.6 },
  ],
  notification: [
    { freq: 660, duration: 0.08, type: 'sine', gain: 0.25 },
    { freq: 880, duration: 0.1, type: 'sine', gain: 0.2 },
  ],
  buttonClick: [
    { freq: 600, duration: 0.03, type: 'sine', gain: 0.1 },
  ],
  error: [
    { freq: 200, duration: 0.15, type: 'square', gain: 0.3 },
    { freq: 150, duration: 0.2, type: 'square', gain: 0.2 },
  ],
};

export function playSound(event: SoundEvent) {
  if (isMuted()) return;

  try {
    const ctx = getContext();
    const volume = getVolume();
    const steps = SOUNDS[event];
    if (!steps) return;

    let offset = ctx.currentTime;

    for (const step of steps) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = step.type;
      osc.frequency.value = step.freq;

      const stepGain = (step.gain ?? 0.4) * volume;
      gainNode.gain.setValueAtTime(stepGain, offset);
      gainNode.gain.exponentialRampToValueAtTime(0.001, offset + step.duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(offset);
      osc.stop(offset + step.duration + 0.05);

      offset += step.duration;
    }
  } catch {
    // AudioContext may not be available
  }
}
