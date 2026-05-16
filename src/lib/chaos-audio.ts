// ─── CHAOS AUDIO ENGINE ─────────────────────────────────────────────────────
// Web Audio API beat synthesizer + TTS performer for demo hooks
// Generates genre-specific beats with synthesized instruments

import { MUSIC_GENRES } from './chaos-data';

export type GenreBeat = {
  bpm: number;
  kickPattern: number[];    // 1 = hit, 0 = rest (16th note grid per bar)
  snarePattern: number[];
  hihatPattern: number[];
  bassNotes: number[];      // MIDI note numbers per 16th step
  padChord: number[];       // MIDI notes for sustained pad
  key: string;
  swing: number;            // 0-1, how much swing/shuffle
  barCount: number;
};

// ─── GENRE BEAT DEFINITIONS ─────────────────────────────────────────────────

const GENRE_BEATS: Record<string, () => GenreBeat> = {
  drill_rap: () => ({
    bpm: 140,
    kickPattern:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hihatPattern: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bassNotes:    [36,0,0,36, 0,0,36,0, 36,0,0,36, 0,0,0,0],
    padChord:     [48, 51, 55],
    key: 'C minor',
    swing: 0,
    barCount: 4,
  }),

  lofi_jazz_podcast: () => ({
    bpm: 80,
    kickPattern:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
    bassNotes:    [36,0,0,0, 0,0,0,0, 39,0,0,0, 0,0,0,0],
    padChord:     [48, 52, 55],
    key: 'C major 7',
    swing: 0.3,
    barCount: 4,
  }),

  edm: () => ({
    bpm: 128,
    kickPattern:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bassNotes:    [36,0,36,0, 36,0,36,0, 36,0,36,0, 36,0,36,0],
    padChord:     [48, 51, 55],
    key: 'C minor',
    swing: 0,
    barCount: 4,
  }),

  emo_ballad: () => ({
    bpm: 90,
    kickPattern:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
    bassNotes:    [36,0,0,0, 0,0,0,0, 34,0,0,0, 0,0,0,0],
    padChord:     [48, 51, 55, 58],
    key: 'C minor',
    swing: 0,
    barCount: 4,
  }),

  mafia_jazz: () => ({
    bpm: 95,
    kickPattern:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    snarePattern: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0],
    bassNotes:    [36,0,0,0, 0,0,0,0, 39,0,0,0, 0,0,41,0],
    padChord:     [48, 51, 55],
    key: 'C minor',
    swing: 0.4,
    barCount: 4,
  }),

  hyperpop: () => ({
    bpm: 200,
    kickPattern:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hihatPattern: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bassNotes:    [36,0,36,0, 36,0,36,0, 36,0,36,0, 36,0,36,0],
    padChord:     [48, 52, 55],
    key: 'C major',
    swing: 0,
    barCount: 4,
  }),

  corporate_anthem: () => ({
    bpm: 110,
    kickPattern:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    bassNotes:    [36,0,0,0, 0,0,0,0, 41,0,0,0, 0,0,0,0],
    padChord:     [48, 52, 55, 60],
    key: 'C major',
    swing: 0,
    barCount: 4,
  }),

  country: () => ({
    bpm: 100,
    kickPattern:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bassNotes:    [36,0,36,0, 0,0,36,0, 36,0,36,0, 0,0,36,0],
    padChord:     [48, 55, 60],
    key: 'C major',
    swing: 0.2,
    barCount: 4,
  }),

  sea_shanty: () => ({
    bpm: 105,
    kickPattern:  [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    bassNotes:    [36,0,0,36, 0,0,0,0, 41,0,0,41, 0,0,0,0],
    padChord:     [48, 52, 55],
    key: 'C major',
    swing: 0.3,
    barCount: 4,
  }),

  phonk_trap: () => ({
    bpm: 130,
    kickPattern:  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    snarePattern: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,1],
    bassNotes:    [36,0,0,36, 0,0,36,0, 0,0,36,0, 0,0,0,0],
    padChord:     [48, 51, 55],
    key: 'C minor',
    swing: 0,
    barCount: 4,
  }),

  opera: () => ({
    bpm: 75,
    kickPattern:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snarePattern: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihatPattern: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    bassNotes:    [36,0,0,0, 0,0,0,0, 34,0,0,0, 0,0,0,0],
    padChord:     [48, 52, 55, 60, 64],
    key: 'C major',
    swing: 0,
    barCount: 4,
  }),

  death_metal: () => ({
    bpm: 180,
    kickPattern:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    bassNotes:    [24,0,24,0, 24,0,24,0, 24,0,24,0, 24,0,24,0],
    padChord:     [36, 39, 43],
    key: 'C minor',
    swing: 0,
    barCount: 4,
  }),

  gospel_choir: () => ({
    bpm: 100,
    kickPattern:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    hihatPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    bassNotes:    [36,0,0,0, 0,0,0,0, 41,0,0,0, 0,0,0,0],
    padChord:     [48, 52, 55, 60, 64],
    key: 'C major',
    swing: 0.2,
    barCount: 4,
  }),

  cinematic_hans_zimmer: () => ({
    bpm: 85,
    kickPattern:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snarePattern: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihatPattern: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    bassNotes:    [24,0,0,0, 0,0,0,0, 24,0,0,0, 0,0,0,0],
    padChord:     [36, 43, 48, 55, 60, 67],
    key: 'C minor epic',
    swing: 0,
    barCount: 4,
  }),

  custom: () => ({
    bpm: 120,
    kickPattern:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihatPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    bassNotes:    [36,0,0,0, 0,0,0,0, 36,0,0,0, 0,0,0,0],
    padChord:     [48, 52, 55],
    key: 'C major',
    swing: 0,
    barCount: 4,
  }),
};

// ─── AUDIO ENGINE ───────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

// MIDI note to frequency
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ─── SYNTHESIZER FUNCTIONS ──────────────────────────────────────────────────

function playKick(ctx: AudioContext, time: number, gain: number = 0.8) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);

  gainNode.gain.setValueAtTime(gain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(ctx: AudioContext, time: number, gain: number = 0.4) {
  // Noise component
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noiseGain.gain.setValueAtTime(gain, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

  noise.start(time);
  noise.stop(time + 0.15);

  // Body
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, time);
  oscGain.gain.setValueAtTime(gain * 0.5, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.start(time);
  osc.stop(time + 0.08);
}

function playHihat(ctx: AudioContext, time: number, gain: number = 0.15) {
  const bufferSize = ctx.sampleRate * 0.03;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;

  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(gain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  noise.start(time);
  noise.stop(time + 0.05);
}

function playBass(ctx: AudioContext, time: number, note: number, duration: number, gain: number = 0.35) {
  if (note === 0) return;
  const freq = midiToFreq(note);

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, time);
  filter.Q.value = 5;

  gainNode.gain.setValueAtTime(gain, time);
  gainNode.gain.setValueAtTime(gain, time + duration * 0.8);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.start(time);
  osc.stop(time + duration);
}

function playPad(ctx: AudioContext, time: number, notes: number[], duration: number, gain: number = 0.12) {
  notes.forEach(note => {
    const freq = midiToFreq(note);
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.3);
    gainNode.gain.setValueAtTime(gain, time + duration - 0.5);
    gainNode.gain.linearRampToValueAtTime(0, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  });
}

// ─── DEMO HOOK GENERATOR ────────────────────────────────────────────────────

export async function generateDemoAudio(
  genreId: string,
  hookDurationSec: number = 15,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const ctx = getAudioContext();
  const beatDef = (GENRE_BEATS[genreId] || GENRE_BEATS.custom)();

  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * hookDurationSec, sampleRate);

  const stepDuration = (60 / beatDef.bpm) / 4; // 16th note duration
  const stepsPerBar = 16;
  const totalSteps = Math.floor(hookDurationSec / stepDuration);
  const barsToPlay = Math.ceil(totalSteps / stepsPerBar);

  onProgress?.('Synthesizing beats...');

  // Schedule all bars
  for (let bar = 0; bar < barsToPlay; bar++) {
    const barStart = bar * stepsPerBar * stepDuration;

    for (let step = 0; step < stepsPerBar; step++) {
      const stepTime = barStart + step * stepDuration;

      if (stepTime >= hookDurationSec) break;

      // Apply swing
      let swingOffset = 0;
      if (step % 2 === 1 && beatDef.swing > 0) {
        swingOffset = stepDuration * beatDef.swing * 0.5;
      }

      const t = stepTime + swingOffset;

      // Kick
      if (beatDef.kickPattern[step]) {
        playKick(offlineCtx, t);
      }

      // Snare
      if (beatDef.snarePattern[step]) {
        playSnare(offlineCtx, t);
      }

      // Hi-hat
      if (beatDef.hihatPattern[step]) {
        playHihat(offlineCtx, t);
      }

      // Bass
      const bassNote = beatDef.bassNotes[step];
      if (bassNote) {
        playBass(offlineCtx, t, bassNote, stepDuration * 2);
      }
    }

    // Pad per bar
    if (bar % 2 === 0) {
      playPad(offlineCtx, barStart, beatDef.padChord, stepsPerBar * stepDuration * 2);
    }
  }

  onProgress?.('Rendering audio...');

  const renderedBuffer = await offlineCtx.startRendering();

  // Convert to WAV blob
  const wavBlob = audioBufferToWav(renderedBuffer);

  onProgress?.('Demo ready!');

  return wavBlob;
}

// ─── WAV ENCODER ────────────────────────────────────────────────────────────

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ─── TTS PERFORMER ──────────────────────────────────────────────────────────

export function performLyricsTTS(
  lyrics: string,
  onStart?: () => void,
  onEnd?: () => void,
  onWord?: (word: string) => void
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  // Extract the hook section for TTS
  const hookMatch = lyrics.match(/\[Hook\]([\s\S]*?)(?=\[|$)/i);
  const verseMatch = lyrics.match(/\[Verse 1\]([\s\S]*?)(?=\[|$)/i);
  const introMatch = lyrics.match(/\[Intro\]([\s\S]*?)(?=\[|$)/i);

  // Get text for TTS - prefer hook, then verse, then intro
  let ttsText = hookMatch?.[1] || verseMatch?.[1] || introMatch?.[1] || lyrics;
  ttsText = ttsText.replace(/\(.*?\)/g, '').trim(); // Remove parentheticals
  ttsText = ttsText.split('\n').filter(l => l.trim()).slice(0, 6).join('. '); // First 6 lines

  const utterance = new SpeechSynthesisUtterance(ttsText);
  utterance.rate = 1.1;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;

  // Try to find a fun voice
  const voices = window.speechSynthesis.getVoices();
  const funVoice = voices.find(v =>
    v.name.toLowerCase().includes('funny') ||
    v.name.toLowerCase().includes('whisper') ||
    v.name.toLowerCase().includes('ninja')
  ) || voices.find(v => v.lang.startsWith('en'));

  if (funVoice) utterance.voice = funVoice;

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onboundary = (e) => {
    if (e.name === 'word') {
      const text = ttsText.substring(e.charIndex, e.charIndex + e.charLength);
      onWord?.(text);
    }
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopTTS() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ─── COMBINED DEMO PLAYER ───────────────────────────────────────────────────

export type DemoPlayState = 'idle' | 'generating' | 'playing' | 'paused' | 'done';

export async function playDemoHook(
  genreId: string,
  lyrics: string,
  onStateChange: (state: DemoPlayState) => void,
  onProgress?: (msg: string) => void
): Promise<{ audioUrl: string; stop: () => void }> {
  onStateChange('generating');

  try {
    // Generate the beat
    const genre = MUSIC_GENRES.find(g => g.id === genreId);
    const hookDuration = genre?.bpm && genre.bpm > 150 ? 12 : 15;

    const wavBlob = await generateDemoAudio(genreId, hookDuration, onProgress);
    const audioUrl = URL.createObjectURL(wavBlob);

    // Create audio element
    const audio = new Audio(audioUrl);
    audio.volume = 0.7;

    // Start playback
    onStateChange('playing');

    // Start TTS after a short delay
    setTimeout(() => {
      performLyricsTTS(lyrics);
    }, 500);

    audio.onended = () => {
      onStateChange('done');
      stopTTS();
    };

    audio.onerror = () => {
      onStateChange('done');
    };

    await audio.play();

    return {
      audioUrl,
      stop: () => {
        audio.pause();
        audio.currentTime = 0;
        stopTTS();
        onStateChange('idle');
      },
    };
  } catch (err) {
    console.error('Demo playback error:', err);
    onStateChange('idle');
    throw err;
  }
}
