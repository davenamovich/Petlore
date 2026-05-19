// ─────────────────────────────────────────────────────────────────────────────
// PETLORE — Clip JSON Builder
// Constructs the standard ClipJsonScene format from episode content
// ─────────────────────────────────────────────────────────────────────────────

import type { ClipJsonScene, CharacterBible, ScrapeResult } from '@petlore/types';
import { v4 as uuidv4 } from 'uuid';

export type ClipBuildInput = {
  showTitle: string;
  petHost: string;
  episodeTitle: string;
  bible: CharacterBible;
  topic: ScrapeResult;
  hook: string;
  setup: string;
  petTake: string;
  punchline: string;
  callToAction?: string;
  durationSeconds?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
};

/**
 * Build a fully-structured ClipJsonScene from clip content.
 * This is the canonical output format consumed by the video agent
 * and the animal-podcast skill adapter.
 */
export function buildClipJson(input: ClipBuildInput): ClipJsonScene {
  const {
    showTitle, petHost, episodeTitle, bible, topic,
    hook, setup, petTake, punchline,
    callToAction = `Follow ${petHost} for more takes 🎙️`,
    durationSeconds = 30,
    aspectRatio = '9:16',
  } = input;

  const clipId = uuidv4();

  return {
    clip_id: clipId,
    show_title: showTitle,
    pet_host: petHost,
    episode_title: episodeTitle,
    duration_seconds: durationSeconds,
    aspect_ratio: aspectRatio,
    clip_type: 'animated_podcast_clip',
    topic_source: {
      platform: topic.source,
      source_url: topic.url,
      summary: topic.summary,
    },
    hook,
    setup,
    pet_take: petTake,
    punchline,
    call_to_action: callToAction,
    visual_style: `${bible.visualStyle} — cartoon podcast studio, animated pet host behind a mic`,
    character_action: `${petHost} reacts with exaggerated expression, floating text overlays`,
    scene_direction: 'Talking-head with reaction zooms, Reddit overlay cards, waveform bottom bar',
    camera: 'Medium close-up on host, occasional cut to floating comment cards',
    audio_direction: `${bible.voiceStyle} — lofi podcast bed music, light SFX on punchlines`,
    caption: `${hook} 🐾 #${petHost.replace(/\s+/g, '')}`,
    hashtags: [
      `#${petHost.replace(/\s+/g, '')}`,
      `#${showTitle.replace(/\s+/g, '')}`,
      '#PetPodcast',
      '#PetloreNetwork',
      '#CartoonPet',
      '#PodcastClip',
      '#PetsOfTikTok',
      '#FunnyPets',
    ],
    thumbnail_text: hook.split(' ').slice(0, 4).join(' ').toUpperCase(),
  };
}

// ─── CARTOON STYLE PRESETS ───────────────────────────────────────────────────

export const CARTOON_STYLES = {
  pixar_3d: 'Pixar-style 3D render, expressive face, warm studio lighting',
  flat_2d: 'Flat 2D cartoon, bold outlines, vibrant solid colors, comic panel style',
  lofi_sketch: 'Lo-fi sketch style, hand-drawn feel, muted colors with neon accents',
  kawaii: 'Kawaii chibi style, huge eyes, pastel colors, bouncy proportions',
  tiktok_react: 'TikTok reaction style, split-screen, text overlays, meme aesthetic',
  glitch_art: 'Glitch aesthetic, neon dark background, distorted text effects',
} as const;

export type CartoonStyle = keyof typeof CARTOON_STYLES;

// ─── IMAGE PROMPT BUILDER ────────────────────────────────────────────────────

/**
 * Build a Seedream/DALL-E image generation prompt for the pet host character.
 */
export function buildCharacterImagePrompt(
  petName: string,
  species: string,
  breed: string,
  style: CartoonStyle,
  expression: 'excited' | 'judging' | 'outraged' | 'delighted' | 'conspiratorial' | 'deadpan'
): string {
  const styleDesc = CARTOON_STYLES[style];
  const expressionMap = {
    excited: 'eyes wide, leaning forward, ears perked, paws up',
    judging: 'one eyebrow raised, slow blink, slight smirk',
    outraged: 'jaw dropped, pointing paw, wide eyes',
    delighted: 'huge grin, tail wagging (implied), sparkling eyes',
    conspiratorial: 'leaning in, whispering, one eye squinting',
    deadpan: 'flat expression, dead eyes, completely unbothered',
  };

  return `A ${styleDesc} portrait of ${petName}, an anthropomorphic ${breed} ${species},
sitting behind a podcast microphone in a cozy recording studio.
Expression: ${expressionMap[expression]}.
Wearing casual but stylish podcast host attire.
The character is clearly opinionated and has PERSONALITY.
Studio has neon "ON AIR" sign, soundproofing panels, and a laptop showing Reddit.
Square 1:1 format, white background fallback.
DO NOT make this generic — this character has a distinct personality.`;
}

// ─── AUDIO DIRECTION BUILDER ─────────────────────────────────────────────────

export function buildAudioDirection(
  bible: CharacterBible,
  mood: 'excited' | 'serious' | 'comedic' | 'conspiratorial'
): string {
  const moodNotes = {
    excited: 'fast pace, rising pitch on punchlines, light laugh track bed',
    serious: 'measured tempo, slight reverb, minimal music, let silence work',
    comedic: 'comedic timing, pause before punchline, rimshot optional, upbeat',
    conspiratorial: 'hushed tone, slow buildup, dramatic sting on reveal',
  };

  return `Voice: ${bible.voiceStyle}.
Pace & tone: ${moodNotes[mood]}.
Music bed: lofi podcast instrumental, -15dB under voice.
SFX: subtle mic pop filter on start, occasional paper shuffle between segments.
Mix: voice at -3dB, music at -18dB, SFX at -12dB.`;
}
