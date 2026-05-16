/**
 * Lyrics routes — /api/kids/lyrics/
 * Re-exports from the copied lyricsGenerator service.
 */
import express from 'express';
import { generateLyrics, generateVariations, validateLyrics, SONG_TYPE_BRIEFS } from '../services/lyricsGenerator.js';

const router = express.Router();

// GET /api/kids/lyrics/songtypes
router.get('/songtypes', (_req, res) => {
  res.json({ songTypes: Object.keys(SONG_TYPE_BRIEFS) });
});

// POST /api/kids/lyrics/generate
router.post('/generate', async (req, res) => {
  const { name, age, interests, petName, songTypeId } = req.body;
  if (!name || !songTypeId) return res.status(400).json({ error: 'name and songTypeId required' });

  const apiKey = process.env.ANTHROPIC_API_KEY || null;
  if (!apiKey) return res.status(402).json({ error: 'no_ai_key', fallback_available: true });

  try {
    const result = await generateLyrics({ name, age, interests, petName, songTypeId }, apiKey);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kids/lyrics/variations
router.post('/variations', async (req, res) => {
  const { name, age, interests, petName, songTypeId, count = 3 } = req.body;
  if (!name || !songTypeId) return res.status(400).json({ error: 'name and songTypeId required' });

  const apiKey = process.env.ANTHROPIC_API_KEY || null;
  if (!apiKey) {
    return res.status(402).json({ error: 'no_ai_key', fallback_available: true });
  }

  try {
    const variations = await generateVariations(
      { name, age, interests, petName, songTypeId },
      apiKey,
      Math.min(count, 5)
    );
    const successful = variations.filter(v => v.lyrics && !v.error);
    if (successful.length === 0) {
      return res.status(402).json({ error: 'no_ai_key', fallback_available: true });
    }
    res.json({ variations: variations.map((v, i) => ({ index: i, ...v })), cost_estimate_usd: variations.length * 0.003 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kids/lyrics/validate
router.post('/validate', (req, res) => {
  const { lyrics, name } = req.body;
  if (!lyrics || !name) return res.status(400).json({ error: 'lyrics and name required' });
  const result = validateLyrics(lyrics, name);
  res.json(result);
});

export default router;
