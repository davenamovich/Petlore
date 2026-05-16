import {
  KIDS_SONG_TYPES,
  THEMES,
  VOICE_PRESETS,
  KIDS_BOUNDARIES_OPEN,
  KIDS_BOUNDARIES_CLOSE,
  tempoForAge,
  NamedSongParams,
} from '../data/kidsPresets';

// Relative base — works with Vite proxy in dev (/api → localhost:4000)
// and directly in production (Express serves the built frontend)
const API = '';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LyricsValidation = {
  valid: boolean;
  issues: string[];
  nameCount: number;
  lineCount: number;
};

export type LyricsResponse = {
  lyrics: string;
  validation: LyricsValidation;
  modelUsed: string;
  attemptsUsed: number;
  source: 'ai' | 'template';
  index?: number;
  error?: string;
};

export type KidsSongRequest = {
  songTypeId: string;
  params: NamedSongParams;
  themeId?: string;
  voiceId?: string;
  bpmOverride?: number;
  customLyrics?: string;
  lyricsMode?: 'ai' | 'template';
};

export type KidsSongStatus = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  mp3_url?: string;
  wav_url?: string;
  duration?: number;
  error?: string;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Reads the JWT that App.tsx stores on login.
// KidsStudio works even without auth (lyrics use template fallback).

function getToken(): string | null {
  return localStorage.getItem('ss_token');
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(opts.headers as Record<string, string> || {}),
    },
  });
}

// ─── Template fallback ────────────────────────────────────────────────────────

function getTemplateLyrics(params: NamedSongParams & { songTypeId: string }): string {
  const songType = KIDS_SONG_TYPES.find(t => t.id === params.songTypeId);
  if (!songType) throw new Error(`Unknown song type: ${params.songTypeId}`);
  return songType.lyricsTemplate(params);
}

function countOccurrences(text: string, name: string): number {
  if (!name) return 0;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(`\\b${safe}\\b`, 'gi')) || []).length;
}

// ─── Lyrics generation ────────────────────────────────────────────────────────

export async function generateLyricsVariations(
  params: NamedSongParams & { songTypeId: string },
  count = 3
): Promise<{ variations: LyricsResponse[]; costEstimateUsd: number }> {
  const res = await apiFetch('/api/kids/lyrics/variations', {
    method: 'POST',
    body: JSON.stringify({ ...params, count }),
  });

  // 402 = no AI key — fall back to template
  if (res.status === 402) {
    const template = getTemplateLyrics(params);
    const v: LyricsResponse = {
      lyrics: template,
      validation: {
        valid: true,
        issues: [],
        nameCount: countOccurrences(template, params.name),
        lineCount: template.split('\n').filter(l => l.trim() && !l.trim().startsWith('[')).length,
      },
      modelUsed: 'template',
      attemptsUsed: 0,
      source: 'template',
    };
    return { variations: Array.from({ length: count }, (_, i) => ({ ...v, index: i })), costEstimateUsd: 0 };
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Network / server error — still fall back to template rather than crashing the UI
    console.warn('[lyrics/variations] server error, falling back to template:', err.error || res.statusText);
    const template = getTemplateLyrics(params);
    const v: LyricsResponse = {
      lyrics: template,
      validation: { valid: true, issues: [], nameCount: countOccurrences(template, params.name), lineCount: 0 },
      modelUsed: 'template',
      attemptsUsed: 0,
      source: 'template',
    };
    return { variations: Array.from({ length: count }, (_, i) => ({ ...v, index: i })), costEstimateUsd: 0 };
  }

  const data = await res.json();
  return { variations: data.variations, costEstimateUsd: data.cost_estimate_usd ?? 0 };
}

export async function validateEditedLyrics(lyrics: string, name: string): Promise<LyricsValidation> {
  const res = await apiFetch('/api/kids/lyrics/validate', {
    method: 'POST',
    body: JSON.stringify({ lyrics, name }),
  });
  if (!res.ok) throw new Error('Validation request failed');
  return res.json();
}

// ─── Style prompt ─────────────────────────────────────────────────────────────

export function buildStylePrompt(req: KidsSongRequest): string {
  const songType = KIDS_SONG_TYPES.find(t => t.id === req.songTypeId);
  if (!songType) throw new Error(`Unknown song type: ${req.songTypeId}`);
  const theme = req.themeId ? THEMES.find(t => t.id === req.themeId) : null;
  const voice = req.voiceId ? VOICE_PRESETS.find(v => v.id === req.voiceId) : null;
  return `${KIDS_BOUNDARIES_OPEN} ${songType.styleTags}${voice ? `, ${voice.tag}` : ''}${theme?.tag || ''}. ${KIDS_BOUNDARIES_CLOSE}`;
}

// ─── Music generation (RunPod via /api/kids/generate) ────────────────────────

async function startMusicGeneration(req: KidsSongRequest, lyrics: string): Promise<string> {
  const songType = KIDS_SONG_TYPES.find(t => t.id === req.songTypeId)!;
  const bpm = req.bpmOverride ?? (req.params.age ? tempoForAge(req.params.age) : songType.defaultBPM);

  const res = await apiFetch('/api/kids/generate', {
    method: 'POST',
    body: JSON.stringify({
      child_name: req.params.name,
      song_type: req.songTypeId,
      age: req.params.age,
      interests: req.params.interests,
      pet_name: req.params.petName,
      voice: req.voiceId || 'warm_female',
      bpm,
      lyrics,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Music generation failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.id; // job id to poll
}

async function pollSong(
  id: string,
  onProgress?: (s: KidsSongStatus) => void,
  timeoutMs = 5 * 60 * 1000
): Promise<KidsSongStatus> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));

    const res = await apiFetch(`/api/kids/songs/${id}`);
    if (!res.ok) throw new Error('Status poll failed');
    const song: KidsSongStatus = await res.json();

    onProgress?.(song);

    if (song.status === 'done') return song;
    if (song.status === 'failed') throw new Error(song.error || 'Music generation failed');
  }

  throw new Error('Music generation timed out after 5 minutes');
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

export async function fullKidsSongPipeline(
  req: KidsSongRequest,
  onProgress?: (msg: string) => void
): Promise<{
  songId: string;
  mp3Url: string;
  wavUrl: string;
  lyrics: string;
  lyricsSource: 'ai' | 'template';
}> {
  // Step 1: Resolve lyrics
  let lyrics: string;
  let lyricsSource: 'ai' | 'template' = 'template';

  if (req.customLyrics) {
    onProgress?.('Using your lyrics...');
    lyrics = req.customLyrics;
  } else if (req.lyricsMode === 'template') {
    onProgress?.('Building template lyrics...');
    lyrics = getTemplateLyrics({ ...req.params, songTypeId: req.songTypeId });
  } else {
    onProgress?.(`Writing lyrics for ${req.params.name}...`);
    try {
      const { variations } = await generateLyricsVariations(
        { ...req.params, songTypeId: req.songTypeId },
        1
      );
      lyrics = variations[0].lyrics;
      lyricsSource = variations[0].source;
    } catch {
      lyrics = getTemplateLyrics({ ...req.params, songTypeId: req.songTypeId });
    }
  }

  // Step 2: Generate music via RunPod
  onProgress?.('Sending to music engine...');
  const jobId = await startMusicGeneration(req, lyrics);

  onProgress?.('Generating music (this takes ~30–60 seconds)...');
  const result = await pollSong(jobId, s => {
    onProgress?.(`Music engine: ${s.status}...`);
  });

  onProgress?.('Done!');

  return {
    songId: result.id,
    mp3Url: result.mp3_url || '',
    wavUrl: result.wav_url || '',
    lyrics,
    lyricsSource,
  };
}

// ─── Suggested voice intro text ───────────────────────────────────────────────

export function suggestedIntros(name: string, occasion?: string): string[] {
  const base = [
    `A special song made just for ${name}.`,
    `This song is for you, ${name}. With love.`,
    `${name}, this one's yours.`,
  ];
  if (occasion === 'sleep') return [`Goodnight ${name}. Time for a special song.`, `Sweet dreams, ${name}.`, ...base];
  if (occasion === 'celebration') return [`Happy birthday ${name}! Here's your very own song.`, ...base];
  return base;
}

// generateVoiceIntro kept as stub — can wire ElevenLabs later
export async function generateVoiceIntro(_opts: {
  text: string;
  voiceId: string;
  provider?: 'elevenlabs' | 'grok';
}): Promise<{ audioBase64: string; durationMs: number }> {
  throw new Error('Voice intros not yet enabled in Song Sprout v1');
}
