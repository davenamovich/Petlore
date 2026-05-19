// ─────────────────────────────────────────────────────────────────────────────
// PETLORE PODCAST AGENCY — Scrapers Package
// Tinyfish.ai + Agent-Reach integrations for Reddit & trend sourcing
// ─────────────────────────────────────────────────────────────────────────────

import type { ScrapeResult, ContentPlatform } from '@petlore/types';

// ─── TINYFISH.AI INTEGRATION ─────────────────────────────────────────────────

export type TinyfishConfig = {
  apiKey: string;
  baseUrl?: string; // default: https://api.tinyfish.ai
};

export type TinyfishEnrichResult = {
  url: string;
  title: string;
  text: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  readingTimeSeconds: number;
  images: string[];
};

/**
 * Enrich a URL using Tinyfish.ai — extract text, summarize, pull key points.
 * Used to clean noisy scraped content and surface clip-worthy angles.
 */
export async function tinyfishEnrich(
  url: string,
  config: TinyfishConfig
): Promise<TinyfishEnrichResult> {
  const res = await fetch(`${config.baseUrl ?? 'https://api.tinyfish.ai'}/v1/enrich`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Tinyfish enrich failed: ${res.status}`);
  return res.json();
}

/**
 * Summarize a raw block of text via Tinyfish.
 */
export async function tinyfishSummarize(
  text: string,
  config: TinyfishConfig
): Promise<string> {
  const res = await fetch(`${config.baseUrl ?? 'https://api.tinyfish.ai'}/v1/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Tinyfish summarize failed: ${res.status}`);
  const data = await res.json();
  return data.summary;
}

// ─── AGENT-REACH INTEGRATION ──────────────────────────────────────────────────

export type AgentReachConfig = {
  apiKey: string;
  baseUrl?: string; // default: https://api.agent-reach.ai
};

export type RedditScrapeOptions = {
  subreddit?: string;       // e.g. "dogs", "cats", "petadvice"
  query?: string;           // search query
  sort?: 'hot' | 'top' | 'new' | 'rising';
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year';
  limit?: number;           // default 20
  minScore?: number;        // minimum upvotes
  includeComments?: boolean;
  maxComments?: number;     // default 10
};

export type RedditPost = {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  score: number;
  numComments: number;
  body?: string;
  topComments: RedditComment[];
  createdAt: string;
  permalink: string;
};

export type RedditComment = {
  author: string;
  body: string;
  score: number;
};

/**
 * Scrape Reddit posts via Agent-Reach.
 */
export async function scrapeReddit(
  options: RedditScrapeOptions,
  config: AgentReachConfig
): Promise<RedditPost[]> {
  const res = await fetch(`${config.baseUrl ?? 'https://api.agent-reach.ai'}/v1/reddit/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error(`Agent-Reach Reddit scrape failed: ${res.status}`);
  return res.json();
}

/**
 * Search viral posts across platforms via Agent-Reach.
 */
export async function searchViralPosts(
  query: string,
  platforms: ContentPlatform[],
  config: AgentReachConfig
): Promise<RedditPost[]> {
  const res = await fetch(`${config.baseUrl ?? 'https://api.agent-reach.ai'}/v1/viral/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ query, platforms }),
  });
  if (!res.ok) throw new Error(`Agent-Reach viral search failed: ${res.status}`);
  return res.json();
}

// ─── SCORING & NORMALIZATION ──────────────────────────────────────────────────

/** Score a Reddit post for podcast clip potential (0–10). */
export function scoreClipPotential(post: RedditPost): number {
  let score = 0;

  // Virality signals
  if (post.score > 10000) score += 3;
  else if (post.score > 1000) score += 2;
  else if (post.score > 100) score += 1;

  // Comment engagement
  if (post.numComments > 500) score += 2;
  else if (post.numComments > 100) score += 1;

  // Emotional trigger keywords
  const emotionWords = [
    'unpopular opinion', 'controversial', 'hot take', 'fight me',
    'am i wrong', 'aita', 'why does', 'nobody talks about',
    'confession', 'just realized', 'life changing', 'cursed',
    'chaotic', 'unhinged', 'based', 'wild', 'ngl',
  ];
  const titleLower = post.title.toLowerCase();
  const hitCount = emotionWords.filter(w => titleLower.includes(w)).length;
  score += Math.min(hitCount * 2, 4);

  // Top comment bonus
  if (post.topComments.length > 0 && post.topComments[0].score > 500) score += 1;

  return Math.min(score, 10);
}

/** Detect the dominant emotional trigger in a post. */
export function detectEmotionalTrigger(post: RedditPost): string {
  const title = (post.title + ' ' + (post.body ?? '')).toLowerCase();

  if (/controversial|unpopular|fight|debate|wrong/.test(title)) return 'controversy';
  if (/funny|lol|lmao|hilarious|cursed|unhinged/.test(title)) return 'humor';
  if (/wholesome|heartwarming|love|sweet|rescued|adoption/.test(title)) return 'heartwarming';
  if (/confession|nobody knows|secret|truth/.test(title)) return 'confession';
  if (/help|advice|what do i do|am i overreacting/.test(title)) return 'relatable_struggle';
  if (/wild|crazy|insane|unbelievable/.test(title)) return 'shock';
  return 'general_interest';
}

/** Convert a Reddit post + Tinyfish enrichment into a Petlore ScrapeResult. */
export function toScrapeResult(
  post: RedditPost,
  enrichment?: TinyfishEnrichResult
): ScrapeResult {
  return {
    source: 'reddit',
    url: `https://reddit.com${post.permalink}`,
    title: post.title,
    summary: enrichment?.summary ?? post.body?.slice(0, 300) ?? post.title,
    topComments: post.topComments.slice(0, 5).map(c => c.body),
    viralAngle: enrichment?.keyPoints?.[0] ?? post.title,
    emotionalTrigger: detectEmotionalTrigger(post),
    clipPotentialScore: scoreClipPotential(post),
  };
}

// ─── PRESET SUBREDDIT TARGETS BY SHOW FORMAT ─────────────────────────────────

export const SUBREDDITS_BY_FORMAT: Record<string, string[]> = {
  comedy:           ['funny', 'mildlyinfuriating', 'tifu', 'unpopularopinion'],
  gossip:           ['relationships', 'relationship_advice', 'amitheasshole', 'drama'],
  motivational:     ['getmotivated', 'selfimprovement', 'todayilearned'],
  pet_advice:       ['dogs', 'cats', 'petadvice', 'AskVet', 'aww'],
  neighborhood_news:['neighbors', 'mildlyinfuriating', 'legaladvice', 'hoa'],
  reddit_reaction:  ['bestof', 'subredditdrama', 'OutOfTheLoop', 'TrueOffMyChest'],
  sports_takes:     ['sports', 'nba', 'nfl', 'soccer', 'hotTakes'],
  relationship_advice: ['relationships', 'relationship_advice', 'amitheasshole', 'dating_advice'],
  true_crime_parody:['UnresolvedMysteries', 'TrueCrime', 'mildlyinfuriating'],
  business_parody:  ['antiwork', 'WorkReform', 'LinkedInLunatics', 'recruitinghell'],
  bedtime:          ['aww', 'wholesome', 'HumansBeingBros', 'MadeMeSmile'],
  kids_family:      ['aww', 'Parenting', 'funny', 'wholesomememes'],
};
