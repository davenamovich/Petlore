import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '4000');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Audio files
const audioDir = path.resolve(process.env.AUDIO_DIR || './public/audio');
fs.mkdirSync(audioDir, { recursive: true });
app.use('/audio', express.static(audioDir));

// Routes
import kidsRoutes from './routes/kids.js';
import lyricsRoutes from './routes/lyrics.js';
import agentRoutes from './routes/agent.js';
import authRoutes from './routes/auth.js';

app.use('/api/auth', authRoutes);
app.use('/api/kids', kidsRoutes);
app.use('/api/kids/lyrics', lyricsRoutes);
app.use('/api/v1', agentRoutes);     // Agent API — API-key authenticated

// Health check
app.get('/api/health', async (_req, res) => {
  const runpodOk = !!(process.env.RUNPOD_API_KEY && process.env.RUNPOD_ENDPOINT_ID);
  let ollamaOk = false;
  try {
    const r = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}/api/tags`, { signal: AbortSignal.timeout(2000) });
    ollamaOk = r.ok;
  } catch {}

  res.json({
    status: 'ok',
    inference: runpodOk ? 'runpod' : 'local',
    runpod: runpodOk,
    ollama: ollamaOk,
  });
});

// Serve built frontend (production)
// __dirname = apps/api/dist  →  ../public = apps/api/public (Vite output)
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌱 Song Sprout API running on port ${PORT}`);
  console.log(`   Inference: ${process.env.RUNPOD_ENDPOINT_ID ? 'RunPod' : 'local ACE-Step'}`);
  console.log(`   Lyrics: ${process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'ollama' ? 'Anthropic' : 'Ollama'}\n`);
});
