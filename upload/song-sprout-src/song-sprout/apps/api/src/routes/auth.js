import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { randomUUID } from 'crypto';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'song-sprout-dev-secret';

// POST /api/auth/setup — create or retrieve user, return JWT
router.post('/setup', (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters' });
  }

  const db = getDb();
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  let user = db.prepare('SELECT * FROM users WHERE username = ?').get(clean);

  if (!user) {
    const id = randomUUID();
    db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(id, clean);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username, isAdmin: !!user.is_admin } });
});

// GET /api/auth/me — verify JWT, return user
router.get('/me', (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, username: user.username, isAdmin: !!user.is_admin } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
