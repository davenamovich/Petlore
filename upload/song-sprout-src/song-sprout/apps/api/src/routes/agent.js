/**
 * Agent API — /api/v1/
 *
 * Authenticated with an API key (header: X-API-Key or Bearer token).
 * Designed for:
 *   - AI agents that generate songs autonomously (free tier)
 *   - Daycare / school integrations (bulk tier)
 *   - Third-party developers
 *
 * Endpoints:
 *   GET  /api/v1/song-types          List available song types (public)
 *   POST /api/v1/songs               Request a song generation
 *   GET  /api/v1/songs/:id           Poll job status
 *   GET  /api/v1/songs               List songs for this API key
 */

import express from 'express';
import { getDb } from '../db.js';
import { generateLyrics } from '../services/lyricsGenerator.js';
import { SONG_TYPE_BRIEFS } from '../services/lyricsGenerator.js';
import { queueInference } from '../services/inference.js';

const router = express.Router();

// ─── API key middleware ───────────────────────────────────────────────────────
function requireApiKey(req, res, next) {
  const key =
    req.headers['x-api-key'] ||
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

  if (!key) {
    return res.status(401).json({ error: 'API key required. Pass X-API-Key header.' });
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM api_keys WHERE key = ? AND active = 1').get(key);
  if (!row) {
    return res.status(403).json({ error: 'Invalid or inactive API key.' });
  }

  req.apiKey = row;
  next();
}

// ─── GET /api/v1/song-types ──────────────────────────────────────────────────
// Public — no auth needed
router.get('/song-types', (_req, res) => {
  const types = Object.entries(SONG_TYPE_BRIEFS).map(([id, brief]) => ({
    id,
    description: brief.description,
    mood: brief.mood,
    requires_age: !!brief.requiresAge,
    requires_pet_name: !!brief.requiresPetName,
  }));
  res.json({ song_types: types });
});

// ─── POST /api/v1/songs ──────────────────────────────────────────────────────
/**
 * Body:
 * {
 *   child_name: string        required
 *   song_type: string         required (see /song-types)
 *   age?: number
 *   interests?: string[]
 *   pet_name?: string
 *   voice?: string            warm_female | bright_female | soft_male | kid_choir | cartoon_friendly
 *   bpm?: number
 *   webhook_url?: string      optional — POST result here when done
 * }
 *
 * Response: { job_id, status: "queued", poll_url }
 */
router.post('/songs', requireApiKey, async (req, res) => {
  const { child_name, song_type, age, interests, pet_name, voice, bpm, webhook_url } = req.body;

  if (!child_name || typeof child_name !== 'string') {
    return res.status(400).json({ error: 'child_name is required' });
  }
  if (!song_type || !SONG_TYPE_BRIEFS[song_type]) {
    return res.status(400).json({
      error: `song_type must be one of: ${Object.keys(SONG_TYPE_BRIEFS).join(', ')}`,
    });
  }

  const db = getDb();

  // Check rate limit (10 songs/hour per API key on free tier)
  if (req.apiKey.tier === 'free') {
    const recentCount = db.prepare(
      "SELECT COUNT(*) as n FROM agent_jobs WHERE api_key_id = ? AND created_at > datetime('now', '-1 hour')"
    ).get(req.apiKey.id)?.n || 0;
    if (recentCount >= 10) {
      return res.status(429).json({
        error: 'Rate limit: 10 songs/hour on free tier. Upgrade for higher limits.',
        upgrade_url: 'https://songsprout.com/pricing',
      });
    }
  }

  // Generate lyrics first (fast, cheap)
  let lyrics, validation;
  try {
    const result = await generateLyrics(
      { name: child_name, age, interests: interests || [], petName: pet_name, songTypeId: song_type },
      process.env.ANTHROPIC_API_KEY
    );
    lyrics = result.lyrics;
    validation = result.validation;
  } catch (err) {
    return res.status(500).json({ error: `Lyrics generation failed: ${err.message}` });
  }

  // Queue inference job
  const jobId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO agent_jobs (id, api_key_id, child_name, song_type, age, interests, pet_name, voice, bpm, lyrics, webhook_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', datetime('now'))
  `).run(jobId, req.apiKey.id, child_name, song_type, age || null, JSON.stringify(interests || []), pet_name || null, voice || 'warm_female', bpm || null, lyrics, webhook_url || null);

  // Fire inference asynchronously
  queueInference(jobId, lyrics, song_type, { voice, bpm, child_name }).catch(err => {
    console.error(`[agent] Inference failed for job ${jobId}:`, err.message);
    db.prepare("UPDATE agent_jobs SET status = 'failed', error = ? WHERE id = ?").run(err.message, jobId);
  });

  res.status(202).json({
    job_id: jobId,
    status: 'queued',
    lyrics_preview: lyrics.split('\n').slice(0, 6).join('\n'),
    validation_issues: validation?.issues || [],
    poll_url: `/api/v1/songs/${jobId}`,
  });
});

// ─── GET /api/v1/songs/:id ───────────────────────────────────────────────────
router.get('/songs/:id', requireApiKey, (req, res) => {
  const db = getDb();
  const job = db.prepare('SELECT * FROM agent_jobs WHERE id = ? AND api_key_id = ?')
    .get(req.params.id, req.apiKey.id);

  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    job_id: job.id,
    status: job.status,
    child_name: job.child_name,
    song_type: job.song_type,
    mp3_url: job.mp3_url || null,
    wav_url: job.wav_url || null,
    duration: job.duration || null,
    lyrics: job.lyrics,
    error: job.error || null,
    created_at: job.created_at,
    completed_at: job.completed_at || null,
  });
});

// ─── GET /api/v1/songs ───────────────────────────────────────────────────────
router.get('/songs', requireApiKey, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  const jobs = db.prepare(
    'SELECT * FROM agent_jobs WHERE api_key_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(req.apiKey.id, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as n FROM agent_jobs WHERE api_key_id = ?').get(req.apiKey.id)?.n || 0;

  res.json({ songs: jobs, total, limit, offset });
});

export default router;
