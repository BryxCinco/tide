import { File, Paths } from 'expo-file-system';
import { createAudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { useSettingsStore } from '../store/settingsStore';

export type SoundName =
  | 'tap'
  | 'timerStart'
  | 'timerPause'
  | 'timerStop'
  | 'timerComplete'
  | 'typing'
  | 'notification'
  | 'success'
  | 'error';

interface ToneSegment {
  /** Hz */
  frequency: number;
  /** seconds */
  duration: number;
  /** seconds of silence before this segment starts, measured from the end of the previous one. */
  delay?: number;
  type?: 'sine' | 'triangle' | 'square' | 'sawtooth';
}

interface SoundRecipe {
  segments: ToneSegment[];
  /** overall peak volume, 0-1 */
  gain: number;
}

/**
 * No audio asset files ship with the app — nothing in this repo can author real .mp3s, and
 * fetching them from a third-party sound-effects site would mean baking an external URL
 * into the client for something as core as "does this button make a sound." Instead every
 * sound is a tiny synthesized melody (1-3 sine tones with a soft attack/decay envelope),
 * described declaratively so the web (real-time Web Audio oscillators, see `playWeb`) and
 * native (pre-rendered WAV, see `playNative`) renderers both play the exact same notes from
 * one source of truth instead of two hand-tuned copies that could drift apart.
 */
const RECIPES: Record<SoundName, SoundRecipe> = {
  tap: { gain: 0.16, segments: [{ frequency: 1500, duration: 0.03 }] },
  timerStart: {
    gain: 0.35,
    segments: [
      { frequency: 523.25, duration: 0.12 }, // C5
      { frequency: 659.25, duration: 0.2, delay: 0.02 }, // E5 — a little rising "go" chime
    ],
  },
  timerPause: { gain: 0.25, segments: [{ frequency: 400, duration: 0.1 }] },
  timerStop: { gain: 0.28, segments: [{ frequency: 349.23, duration: 0.28 }] }, // F4
  timerComplete: {
    gain: 0.45,
    segments: [
      { frequency: 523.25, duration: 0.14 }, // C5
      { frequency: 659.25, duration: 0.14, delay: 0.03 }, // E5
      { frequency: 783.99, duration: 0.4, delay: 0.03 }, // G5 — the most prominent sound, 3-note ascent
    ],
  },
  typing: { gain: 0.08, segments: [{ frequency: 1800, duration: 0.015 }] },
  notification: {
    gain: 0.32,
    segments: [
      { frequency: 587.33, duration: 0.14 }, // D5
      { frequency: 783.99, duration: 0.3, delay: 0.05 }, // G5
    ],
  },
  success: {
    gain: 0.35,
    segments: [
      { frequency: 659.25, duration: 0.1 }, // E5
      { frequency: 987.77, duration: 0.28, delay: 0.02 }, // B5
    ],
  },
  error: {
    gain: 0.28,
    segments: [
      { frequency: 349.23, duration: 0.12 }, // F4
      { frequency: 293.66, duration: 0.2, delay: 0.02 }, // D4 — descending interval reads as "negative"
    ],
  },
};

function isEnabled(): boolean {
  return useSettingsStore.getState().settings.soundEffects;
}

const TYPING_THROTTLE_MS = 80;
let lastTypingSoundAt = 0;

/** Typing has its own sub-toggle (Preferences -> Typing Sounds) nested under the master
 * Sound Effects switch, and its own throttle — a tick on every keystroke would otherwise
 * fire far more often than any other sound in this app, on a fast typist's burst. */
function shouldPlayTyping(): boolean {
  if (!useSettingsStore.getState().settings.typingSounds) return false;
  const now = Date.now();
  if (now - lastTypingSoundAt < TYPING_THROTTLE_MS) return false;
  lastTypingSoundAt = now;
  return true;
}

// ---------------------------------------------------------------------------
// Web: real-time synthesis via the Web Audio API — no asset loading or file
// generation needed at all, and the only platform this session could
// actually verify by running the app.
// ---------------------------------------------------------------------------

let webAudioContext: AudioContext | null = null;

function getWebAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!webAudioContext) webAudioContext = new AudioContextCtor();
  return webAudioContext;
}

function playWeb(recipe: SoundRecipe): void {
  const ctx = getWebAudioContext();
  if (!ctx) return;

  // A freshly-created AudioContext starts suspended until a user gesture resumes it —
  // every call site here already fires from a press/toast handler, so in practice this
  // resolves immediately and the sound is never noticeably delayed by it.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  let cursor = ctx.currentTime;
  for (const segment of recipe.segments) {
    cursor += segment.delay ?? 0;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = segment.type ?? 'sine';
    oscillator.frequency.setValueAtTime(segment.frequency, cursor);

    // Quick linear attack then an exponential decay, rather than a flat on/off gain —
    // switching a raw tone on/off produces an audible click at each edge.
    const attackEnd = cursor + Math.min(0.01, segment.duration / 4);
    gainNode.gain.setValueAtTime(0, cursor);
    gainNode.gain.linearRampToValueAtTime(recipe.gain, attackEnd);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, cursor + segment.duration);

    oscillator.connect(gainNode).connect(ctx.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + segment.duration + 0.02);

    cursor += segment.duration;
  }
}

// ---------------------------------------------------------------------------
// Native: expo-audio has no oscillator/synth API, so each recipe is
// pre-rendered once into a real (tiny, ~1-30KB) WAV file in the cache
// directory — the same Paths.cache/File pattern utils/exportData.ts already
// uses — and cached by name. Playback creates a fresh player against that
// cached file each time and releases it afterward, which sidesteps any
// uncertainty around a shared player's seek/replay semantics for sounds this
// short and this infrequent.
// ---------------------------------------------------------------------------

const SAMPLE_RATE = 22050;
const nativeFileCache = new Map<SoundName, string>();

function renderPcmSamples(recipe: SoundRecipe): Int16Array {
  const totalSeconds = recipe.segments.reduce((sum, seg) => sum + (seg.delay ?? 0) + seg.duration, 0);
  const samples = new Int16Array(Math.ceil(totalSeconds * SAMPLE_RATE));

  let cursor = 0;
  for (const segment of recipe.segments) {
    cursor += Math.round((segment.delay ?? 0) * SAMPLE_RATE);
    const segmentSamples = Math.round(segment.duration * SAMPLE_RATE);
    const peak = recipe.gain * 32767;

    for (let i = 0; i < segmentSamples; i++) {
      const t = i / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.01);
      const decay = Math.exp((-3 * Math.max(0, t - 0.01)) / segment.duration);
      const value = Math.sin(2 * Math.PI * segment.frequency * t) * peak * attack * decay;
      const index = cursor + i;
      if (index < samples.length) samples[index] = value;
    }
    cursor += segmentSamples;
  }

  return samples;
}

/** Plain 16-bit PCM mono WAV — the simplest container that needs no encoder library,
 * just a 44-byte header in front of the raw samples. */
function encodeWav(samples: Int16Array): Uint8Array {
  const blockAlign = 2;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }

  return new Uint8Array(buffer);
}

function getNativeSoundUri(name: SoundName): string | null {
  const cached = nativeFileCache.get(name);
  if (cached) return cached;

  try {
    const wavBytes = encodeWav(renderPcmSamples(RECIPES[name]));
    const file = new File(Paths.cache, `tide-sound-${name}.wav`);
    file.create({ overwrite: true });
    file.write(wavBytes);
    nativeFileCache.set(name, file.uri);
    return file.uri;
  } catch {
    return null;
  }
}

function playNative(name: SoundName, recipe: SoundRecipe): void {
  try {
    const uri = getNativeSoundUri(name);
    if (!uri) return;

    const player = createAudioPlayer(uri);
    player.play();

    const totalMs = recipe.segments.reduce((sum, seg) => sum + ((seg.delay ?? 0) + seg.duration) * 1000, 0);
    setTimeout(() => {
      try {
        player.release();
      } catch {
        // Already released, or the app moved on — nothing to clean up.
      }
    }, totalMs + 200);
  } catch {
    // Silent fail — a missed sound effect should never surface as an app error.
  }
}

// ---------------------------------------------------------------------------

/**
 * Plays a short synthesized UI sound if Sound Effects is on (Profile -> Preferences).
 * Reads the live setting on every call — via `useSettingsStore.getState()`, not a flag
 * some `init()`/`setEnabled()` call pushed in earlier — so there's nothing to keep in
 * sync: flip the toggle and the very next sound already respects it.
 */
export const soundManager = {
  play(name: SoundName): void {
    if (!isEnabled()) return;
    if (name === 'typing' && !shouldPlayTyping()) return;
    const recipe = RECIPES[name];

    if (Platform.OS === 'web') {
      playWeb(recipe);
    } else {
      playNative(name, recipe);
    }
  },
};
