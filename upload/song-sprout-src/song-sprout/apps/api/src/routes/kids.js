/**
 * Kids song routes — /api/kids/
 * Thin wrapper that re-uses the copied kidsProcessing logic
 * but points at the new db and inference service.
 */
import express from 'express';
import { getDb } from '../db.js';
import { queueInference } from '../services/inference.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET /api/kids/songs — list songs (optionally filter by child name)
router.get('/songs', (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { child_name } = req.query;

  const songs = child_name
    ? db.prepare('SELECT * FROM kids_songs WHERE child_name = ? ORDER BY created_at DESC LIMIT ?').all(child_name, limit)
    : db.prepare('SELECT * FROM kids_songs ORDER BY created_at DESC LIMIT ?').all(limit);

  const total = db.prepare('SELECT COUNT(*) as n FROM kids_songs').get()?.n || 0;
  res.json({ songs, total });
});

// POST /api/kids/generate — generate a kids song (full pipeline)
router.post('/generate', async (req, res) => {
  const { child_name, song_type, age, interests, pet_name, voice, bpm, lyrics } = req.body;

  if (!child_name || !song_type || !lyrics) {
    return res.status(400).json({ error: 'child_name, song_type, and lyrics are required' });
  }

  const db = getDb();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO kids_songs (id, child_name, song_type, voice, lyrics, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, child_name, song_type, voice || 'warm_female', lyrics);

  // Kick off inference (non-blocking)
  queueInference(id, lyrics, song_type, { voice, bpm, child_name })
    .then(audioUrl => {
      db.prepare('UPDATE kids_songs SET mp3_url = ? WHERE id = ?').run(audioUrl, id);
    })
    .catch(err => {
      console.error('[kids/generate] inference failed:', err.message);
    });

  res.json({ id, status: 'queued', poll_url: `/api/kids/songs/${id}` });
});

// GET /api/kids/songs/:id — poll a single song
router.get('/songs/:id', (req, res) => {
  const db = getDb();
  const song = db.prepare('SELECT * FROM kids_songs WHERE id = ?').get(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(song);
});

// GET /api/kids/credits — placeholder until Stripe is wired
router.get('/credits', (_req, res) => {
  res.json({ credits: null, message: 'Credits not yet implemented' });
});

export default router;
