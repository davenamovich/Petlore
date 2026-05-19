// ─────────────────────────────────────────────────────────────────────────────
// PETLORE PODCAST AGENCY — Shared TypeScript Types
// "Turn your pet into the host of their own podcast."
// ─────────────────────────────────────────────────────────────────────────────

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export type PodcastFormat =
  | 'comedy'
  | 'gossip'
  | 'motivational'
  | 'pet_advice'
  | 'neighborhood_news'
  | 'reddit_reaction'
  | 'sports_takes'
  | 'relationship_advice'
  | 'true_crime_parody'
  | 'business_parody'
  | 'bedtime'
  | 'kids_family';

export type EpisodeLength =
  | 'mini_5'         // 5-minute mini episode
  | 'comedy_10'      // 10-minute comedy episode
  | 'full_20'        // 20-minute full podcast
  | 'weekly_recurring'
  | 'fake_interview'
  | 'advice_column'
  | 'reddit_reaction';

export type ClipType =
  | 'best_hook'
  | 'funniest_take'
  | 'emotional'
  | 'controversial_take'
  | 'comment_bait'
  | 'reaction'
  | 'cta'
  | 'sequel_teaser'
  | 'animated_podcast_clip';

export type ContentPlatform =
  | 'reddit'
  | 'twitter'
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'pet_forum'
  | 'local'
  | 'user_url'
  | 'tinyfish'
  | 'agent_reach';

export type AssetType =
  | 'cartoon_avatar'
  | 'podcast_clip_json'
  | 'audio_episode'
  | 'animated_clip'
  | 'thumbnail'
  | 'caption'
  | 'newsletter'
  | 'promo_post';

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export type Species = 'dog' | 'cat' | 'hamster' | 'rabbit' | 'bird' | 'reptile' | 'other';

// ─── CORE MODELS ─────────────────────────────────────────────────────────────

export type PetProfile = {
  id: string;
  userId: string;
  name: string;
  species: Species;
  breed?: string;
  photoUrl: string;
  cartoonImageUrl?: string;
  personality: string[];
  createdAt: string;
  updatedAt: string;
};

export type CharacterBible = {
  id: string;
  petId: string;
  hostName: string;
  visualStyle: string;
  voiceStyle: string;
  worldview: string;
  catchphrases: string[];
  recurringJokes: string[];
  cohostDynamic?: string;
  showPersona: string;
  emotionalTone: string;
  audienceRelationship: string; // how the character speaks to listeners
  signatureSegments: string[];  // e.g. "The Sniff Report", "Paw & Order"
  createdAt: string;
};

export type PodcastShow = {
  id: string;
  petId: string;
  characterBibleId: string;
  title: string;
  format: PodcastFormat;
  tagline: string;
  description: string;
  audience: string;
  recurringSegments: string[];
  coverImageUrl?: string;
  isPublic: boolean;
  episodeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Episode = {
  id: string;
  showId: string;
  title: string;
  length: EpisodeLength;
  intro: string;
  segmentList: EpisodeSegment[];
  hostMonologue: string;
  sponsorParody?: string;
  topicReactions: TopicReaction[];
  closingCta: string;
  clipSuggestions: string[];
  audioUrl?: string;
  scriptMarkdown?: string;
  status: JobStatus;
  createdAt: string;
};

export type EpisodeSegment = {
  name: string;
  duration: number; // seconds
  content: string;
  type: 'monologue' | 'interview' | 'reaction' | 'segment' | 'ad_break' | 'outro';
};

export type TopicReaction = {
  topic: string;
  sourceUrl?: string;
  hostReaction: string;
  audienceAngle: string;
  clipPotential: number; // 1-10
};

export type Clip = {
  id: string;
  episodeId: string;
  showTitle: string;
  petHost: string;
  episodeTitle: string;
  title: string;
  clipType: ClipType;
  durationSeconds: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  hook: string;
  setup: string;
  petTake: string;
  punchline: string;
  callToAction: string;
  visualStyle: string;
  characterAction: string;
  sceneDirection: string;
  camera: string;
  audioDirection: string;
  caption: string;
  hashtags: string[];
  thumbnailText: string;
  topicSource?: TopicSource;
  jsonScene: ClipJsonScene;
  status: JobStatus;
  createdAt: string;
};

export type ClipJsonScene = {
  clip_id: string;
  show_title: string;
  pet_host: string;
  episode_title: string;
  duration_seconds: number;
  aspect_ratio: string;
  clip_type: string;
  topic_source: {
    platform: string;
    source_url: string;
    summary: string;
  };
  hook: string;
  setup: string;
  pet_take: string;
  punchline: string;
  call_to_action: string;
  visual_style: string;
  character_action: string;
  scene_direction: string;
  camera: string;
  audio_direction: string;
  caption: string;
  hashtags: string[];
  thumbnail_text: string;
};

export type ContentSource = {
  id: string;
  platform: ContentPlatform;
  url: string;
  title: string;
  summary: string;
  rawText?: string;
  topComments: string[];
  viralAngle: string;
  emotionalTrigger: string;
  clipPotentialScore: number; // 0-10
  scrapedAt: string;
};

export type ScrapeJob = {
  id: string;
  showId: string;
  sources: string[]; // URLs or subreddits
  status: JobStatus;
  resultIds: string[]; // ContentSource IDs
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export type PromotionPlan = {
  id: string;
  clipId: string;
  platforms: ContentPlatform[];
  caption: string;
  hashtags: string[];
  pinnedComment?: string;
  postSchedule: PostScheduleItem[];
  createdAt: string;
};

export type PostScheduleItem = {
  platform: ContentPlatform;
  scheduledAt: string;
  status: 'pending' | 'posted' | 'failed';
  postUrl?: string;
};

export type GeneratedAsset = {
  id: string;
  entityId: string; // petId, episodeId, clipId, etc.
  entityType: 'pet' | 'show' | 'episode' | 'clip' | 'newsletter';
  assetType: AssetType;
  url: string;
  prompt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

// ─── VET NEWSLETTER SYSTEM ───────────────────────────────────────────────────

export type VetClinic = {
  id: string;
  name: string;
  city: string;
  state: string;
  email: string;
  phone?: string;
  website?: string;
  subscriberCount: number;
  newsletterName?: string;
  plan: 'starter' | 'growth' | 'agency';
  createdAt: string;
};

export type VetNewsletter = {
  id: string;
  clinicId: string;
  title: string;
  issueNumber: number;
  theme: string; // e.g. "flea season", "dental month"
  sections: NewsletterSection[];
  featuredPet?: string;
  sponsorNote?: string;
  callToAction: string;
  sentAt?: string;
  openRate?: number;
  clickRate?: number;
  status: JobStatus;
  createdAt: string;
};

export type NewsletterSection = {
  type:
    | 'pet_spotlight'
    | 'health_tip'
    | 'funny_story'
    | 'breed_fact'
    | 'seasonal_alert'
    | 'clinic_news'
    | 'podcast_clip'
    | 'local_pet_news';
  headline: string;
  body: string;
  imagePrompt?: string;
  cta?: string;
};

// ─── AGENT SYSTEM ────────────────────────────────────────────────────────────

export type AgentRun = {
  id: string;
  agentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: JobStatus;
  tokensUsed?: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
};

export type TopicSource = {
  platform: string;
  sourceUrl: string;
  summary: string;
};

// ─── SCRAPER OUTPUT ──────────────────────────────────────────────────────────

export type ScrapeResult = {
  source: ContentPlatform;
  url: string;
  title: string;
  summary: string;
  topComments: string[];
  viralAngle: string;
  emotionalTrigger: string;
  clipPotentialScore: number; // 0-10
};

// ─── DEMO / STATIC DATA ──────────────────────────────────────────────────────

export type DemoShow = {
  id: string;
  title: string;
  tagline: string;
  format: PodcastFormat;
  host: string;
  species: Species;
  emoji: string;
  description: string;
  color: string;
  sampleClipHook: string;
};
