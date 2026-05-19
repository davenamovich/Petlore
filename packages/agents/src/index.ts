// ─────────────────────────────────────────────────────────────────────────────
// PETLORE PODCAST AGENCY — Agent System
// 8 specialized agents that run the pet media empire
// ─────────────────────────────────────────────────────────────────────────────

import type { PetProfile, CharacterBible, PodcastShow, Episode, Clip, ScrapeResult } from '@petlore/types';

// ─── AGENT DEFINITIONS ───────────────────────────────────────────────────────

/**
 * AGENT 1: Pet Character Agent
 * Turns uploaded pet photos into cartoon anchor identities.
 * Input: PetProfile + photo description
 * Output: CharacterBible + cartoon visual prompt
 */
export type PetCharacterAgentInput = {
  petProfile: PetProfile;
  photoDescription?: string;
  preferredStyle?: string;
};

export type PetCharacterAgentOutput = {
  characterBible: Omit<CharacterBible, 'id' | 'createdAt'>;
  cartoonPrompt: string;
  showConceptSuggestions: string[];
};

export async function runPetCharacterAgent(
  input: PetCharacterAgentInput,
  callLLM: (system: string, user: string) => Promise<string>
): Promise<PetCharacterAgentOutput> {
  const { CHARACTER_CREATION_SYSTEM, CHARACTER_CARTOON_VISUAL_PROMPT } = await import('@petlore/prompts');
  const { petProfile } = input;

  const userMessage = `
Pet Name: ${petProfile.name}
Species: ${petProfile.species}
Breed: ${petProfile.breed || 'Unknown'}
Personality traits: ${petProfile.personality.join(', ')}
Photo description: ${input.photoDescription || 'Not provided'}
Preferred visual style: ${input.preferredStyle || 'cartoon, expressive, podcast-ready'}
  `.trim();

  const raw = await callLLM(CHARACTER_CREATION_SYSTEM, userMessage);
  const bible = JSON.parse(raw);

  const cartoonPrompt = CHARACTER_CARTOON_VISUAL_PROMPT(
    petProfile.name,
    petProfile.species,
    petProfile.breed || petProfile.species,
    bible.visualStyle
  );

  return {
    characterBible: { ...bible, petId: petProfile.id },
    cartoonPrompt,
    showConceptSuggestions: [
      `${petProfile.name}'s Takes — A ${petProfile.species} reacts to the internet`,
      `The ${petProfile.name} Report — ${petProfile.species}-hosted daily news`,
      `${petProfile.name} Knows Best — Advice from a very confident ${petProfile.species}`,
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 2: Research Agent
 * Scrapes Reddit, forums, and trend sources for podcast topics.
 * Input: show format + keyword targets
 * Output: ranked ScrapeResults
 */
export type ResearchAgentInput = {
  show: PodcastShow;
  keywords?: string[];
  subreddits?: string[];
  userUrls?: string[];
};

export type ResearchAgentOutput = {
  topics: ScrapeResult[];
  recommendedForNextEpisode: ScrapeResult[];
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 3: Podcast Writer Agent
 * Turns scraped topics into episode outlines and scripts.
 */
export type PodcastWriterAgentInput = {
  show: PodcastShow;
  characterBible: CharacterBible;
  topics: ScrapeResult[];
  episodeLength: 'mini_5' | 'comedy_10' | 'full_20' | 'weekly_recurring';
};

export type PodcastWriterAgentOutput = {
  episode: Omit<Episode, 'id' | 'audioUrl' | 'createdAt'>;
  clipSuggestionCount: number;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 4: Clip Agent
 * Turns long episodes into 5-10 short JSON clips.
 */
export type ClipAgentInput = {
  episode: Episode;
  characterBible: CharacterBible;
  maxClips?: number; // default 8
};

export type ClipAgentOutput = {
  clips: Omit<Clip, 'id' | 'createdAt'>[];
  suggestedPostOrder: string[]; // clip titles in recommended posting sequence
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 5: Voice Agent
 * Creates voice direction and audio prompts for TTS or voice generation.
 */
export type VoiceAgentInput = {
  characterBible: CharacterBible;
  scriptText: string;
  emotion?: 'excited' | 'skeptical' | 'outraged' | 'delighted' | 'conspiratorial';
};

export type VoiceAgentOutput = {
  voicePrompt: string;
  ttsInstructions: string;
  elevenlabsSettings?: {
    stability: number;
    similarityBoost: number;
    style: number;
    speakerBoost: boolean;
  };
  audioDirectionNotes: string;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 6: Video Agent
 * Creates cartoon video prompts and scene JSON for animation tools.
 */
export type VideoAgentInput = {
  clip: Clip;
  characterBible: CharacterBible;
  style?: 'podcast_studio' | 'tiktok_reaction' | 'reddit_overlay' | 'meme_format';
};

export type VideoAgentOutput = {
  sceneJson: Record<string, unknown>;
  imagePrompts: string[];
  animationNotes: string;
  exportSettings: {
    resolution: string;
    fps: number;
    aspectRatio: string;
    format: 'mp4' | 'gif' | 'webm';
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 7: Promotion Agent
 * Creates captions, hashtags, post schedules, and promotion plans.
 */
export type PromotionAgentInput = {
  clip: Clip;
  characterBible: CharacterBible;
  platforms: ('tiktok' | 'instagram' | 'youtube' | 'twitter')[];
};

export type PromotionAgentOutput = {
  byPlatform: Record<string, {
    caption: string;
    hashtags: string[];
    pinnedComment?: string;
    postTime: string;
  }>;
  weeklySchedule: Array<{
    day: string;
    clipTitle: string;
    platform: string;
    time: string;
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 8: Showrunner Agent
 * Maintains character consistency across all content over time.
 * This is the long-running state agent — it knows the full history of the show.
 */
export type ShowrunnerAgentInput = {
  show: PodcastShow;
  characterBible: CharacterBible;
  episodeHistory: Episode[];
  newTopics: ScrapeResult[];
};

export type ShowrunnerAgentOutput = {
  characterNotes: string; // What to remember about this character
  episodeSuggestions: string[];
  arcDevelopment: string; // How the show is evolving
  warnings: string[]; // Any character inconsistencies to fix
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGENT 9: Vet Newsletter Agent
 * Creates recurring clinic newsletters for veterinary practices.
 */
export type VetNewsletterAgentInput = {
  clinicName: string;
  city: string;
  theme: string;
  month: string;
  featuredPet?: string;
  clinicPromo?: string;
};

export type VetNewsletterAgentOutput = {
  newsletterJson: Record<string, unknown>;
  subjectLine: string;
  previewText: string;
  estimatedOpenRate: string;
};

// ─── AGENT REGISTRY ──────────────────────────────────────────────────────────

export const AGENT_REGISTRY = {
  PetCharacterAgent: {
    name: 'Pet Character Agent',
    description: 'Turns uploaded pet photos into cartoon anchor identities with full character bibles',
    version: '1.0.0',
  },
  ResearchAgent: {
    name: 'Research Agent',
    description: 'Scrapes Reddit, forums, and trend sources for podcast-ready topics',
    version: '1.0.0',
  },
  PodcastWriterAgent: {
    name: 'Podcast Writer Agent',
    description: 'Writes full podcast episodes in the pet host\'s voice',
    version: '1.0.0',
  },
  ClipAgent: {
    name: 'Clip Agent',
    description: 'Cuts long episodes into 5-10 viral short-form clips with JSON scene data',
    version: '1.0.0',
  },
  VoiceAgent: {
    name: 'Voice Agent',
    description: 'Creates voice direction and audio prompts for pet host TTS',
    version: '1.0.0',
  },
  VideoAgent: {
    name: 'Video Agent',
    description: 'Creates cartoon video prompts and scene JSON for animation',
    version: '1.0.0',
  },
  PromotionAgent: {
    name: 'Promotion Agent',
    description: 'Creates captions, hashtags, pinned comments, and post schedules',
    version: '1.0.0',
  },
  ShowrunnerAgent: {
    name: 'Showrunner Agent',
    description: 'Maintains character consistency and guides show arc development over time',
    version: '1.0.0',
  },
  VetNewsletterAgent: {
    name: 'Vet Newsletter Agent',
    description: 'Creates automated recurring newsletters for veterinary clinics',
    version: '1.0.0',
  },
} as const;
