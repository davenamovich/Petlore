// ─────────────────────────────────────────────────────────────────────────────
// PETLORE WORKER — Background Jobs
// Queue-based processing for all AI generation and media pipeline tasks
// ─────────────────────────────────────────────────────────────────────────────

export type JobName =
  | 'scrape.reddit'
  | 'scrape.tinyfish'
  | 'generate.character_bible'
  | 'generate.cartoon_avatar'
  | 'generate.episode_script'
  | 'generate.clip_json'
  | 'generate.animal_podcast_script'   // → feeds animal-podcast SKILL.md Stage 2
  | 'generate.audio_episode'
  | 'generate.video_clip'              // → Seedance 2.0 via animal-podcast Stage 4
  | 'generate.thumbnail'
  | 'generate.newsletter'
  | 'promote.schedule_post'
  | 'promote.caption_gen'
  | 'maintain.showrunner_check';       // → character consistency pass

export type JobPayload = {
  jobId: string;
  name: JobName;
  entityId: string;
  entityType: string;
  data: Record<string, unknown>;
  priority: 1 | 2 | 3;  // 1 = highest
  retries: number;
  createdAt: string;
};

// ─── JOB DEFINITIONS ─────────────────────────────────────────────────────────

export const JOB_DEFINITIONS: Record<JobName, {
  description: string;
  estimatedSeconds: number;
  dependencies: JobName[];
}> = {
  'scrape.reddit': {
    description: 'Scrape Reddit for podcast topic candidates using Agent-Reach',
    estimatedSeconds: 15,
    dependencies: [],
  },
  'scrape.tinyfish': {
    description: 'Enrich URLs using Tinyfish.ai — extract text, summarize, clean',
    estimatedSeconds: 10,
    dependencies: ['scrape.reddit'],
  },
  'generate.character_bible': {
    description: 'Generate pet character bible via Character Agent + LLM',
    estimatedSeconds: 30,
    dependencies: [],
  },
  'generate.cartoon_avatar': {
    description: 'Generate cartoon host image via Seedream 4.5',
    estimatedSeconds: 45,
    dependencies: ['generate.character_bible'],
  },
  'generate.episode_script': {
    description: 'Generate full episode script via Podcast Writer Agent',
    estimatedSeconds: 60,
    dependencies: ['generate.character_bible', 'scrape.tinyfish'],
  },
  'generate.clip_json': {
    description: 'Extract 5–10 short-form clip JSONs from episode via Clip Agent',
    estimatedSeconds: 30,
    dependencies: ['generate.episode_script'],
  },
  'generate.animal_podcast_script': {
    description: 'Convert Clip JSON → animal-podcast SKILL.md script format',
    estimatedSeconds: 10,
    dependencies: ['generate.clip_json'],
  },
  'generate.audio_episode': {
    description: 'Generate audio episode via TTS / ElevenLabs Voice Agent',
    estimatedSeconds: 120,
    dependencies: ['generate.episode_script'],
  },
  'generate.video_clip': {
    description: 'Generate Seedance 2.0 animated video clip via animal-podcast Stage 4',
    estimatedSeconds: 180,
    dependencies: ['generate.animal_podcast_script', 'generate.cartoon_avatar'],
  },
  'generate.thumbnail': {
    description: 'Generate clip thumbnail with text overlay via Seedream',
    estimatedSeconds: 30,
    dependencies: ['generate.clip_json'],
  },
  'generate.newsletter': {
    description: 'Generate vet clinic newsletter via Vet Newsletter Agent',
    estimatedSeconds: 45,
    dependencies: [],
  },
  'promote.schedule_post': {
    description: 'Schedule social media post via Promotion Agent',
    estimatedSeconds: 5,
    dependencies: ['generate.video_clip', 'promote.caption_gen'],
  },
  'promote.caption_gen': {
    description: 'Generate platform-specific captions and hashtags',
    estimatedSeconds: 15,
    dependencies: ['generate.clip_json'],
  },
  'maintain.showrunner_check': {
    description: 'Showrunner Agent consistency pass — runs after every 3 episodes',
    estimatedSeconds: 30,
    dependencies: [],
  },
};

// ─── EPISODE PIPELINE ────────────────────────────────────────────────────────

/**
 * Full episode generation pipeline.
 * Order: scrape → enrich → write → clip → script → audio/video → promote
 */
export const EPISODE_PIPELINE_ORDER: JobName[] = [
  'scrape.reddit',
  'scrape.tinyfish',
  'generate.episode_script',
  'generate.clip_json',
  'generate.animal_podcast_script',
  'generate.thumbnail',
  'generate.audio_episode',
  'generate.video_clip',
  'promote.caption_gen',
  'promote.schedule_post',
];
