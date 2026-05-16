/**
 * Inference service — routes generation requests to:
 *   1. RunPod serverless (production)
 *   2. Local ACE-Step on port 8001 (dev fallback)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const ACESTEP_LOCAL_URL = process.env.ACESTEP_API_URL || 'http://localhost:8001';
const AUDIO_DIR = path.resolve(process.env.AUDIO_DIR || './public/audio');

const useRunPod = !!(RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID);

/**
 * Queue an inference job and update the agent_jobs table when done.
 */
export async function queueInference(jobId, lyrics, songTypeId, opts = {}) {
  const { voice = 'warm_female', bpm, child_name } = opts;
  const db = getDb();

  db.prepare("UPDATE agent_jobs SET status = 'running' WHERE id = ?").run(jobId);

  try {
    const audioUrl = useRunPod
      ? await runOnRunPod(lyrics, songTypeId, { voice, bpm })
      : await runOnLocal(lyrics, songTypeId, { voice, bpm });

    db.prepare(`
      UPDATE agent_jobs SET status = 'done', mp3_url = ?, completed_at = datetime('now') WHERE id = ?
    `).run(audioUrl, jobId);

    // Fire webhook if configured
    const job = db.prepare('SELECT webhook_url FROM agent_jobs WHERE id = ?').get(jobId);
    if (job?.webhook_url) {
      fetch(job.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, status: 'done', mp3_url: audioUrl }),
      }).catch(e => console.warn('[webhook]', e.message));
    }

    return audioUrl;
  } catch (err) {
    db.prepare("UPDATE agent_jobs SET status = 'failed', error = ? WHERE id = ?").run(err.message, jobId);
    throw err;
  }
}

// ─── RunPod serverless ────────────────────────────────────────────────────────
async function runOnRunPod(lyrics, songTypeId, { voice, bpm }) {
  const styleMap = {
    lullaby_starry: `gentle children's lullaby, soft piano, warm female vocal, slow tempo, dreamy`,
    lullaby_ocean: `soft acoustic guitar lullaby, warm female vocal, distant ocean waves, slow`,
    birthday: `upbeat children's birthday song, cheerful acoustic pop, kids choir`,
    good_morning: `cheerful children's morning song, bright acoustic guitar, energetic`,
    brushing_teeth: `fun children's routine song, bouncy ukulele, playful, mid-tempo`,
    abcs_with_name: `classic children's alphabet song, simple piano melody, educational`,
    superhero: `epic children's pop anthem, big drums, soaring synth, triumphant`,
    pet_friend: `warm acoustic children's song, fingerpicked guitar, heartfelt`,
    counting_song: `playful children's counting song, bouncy piano, educational`,
    dance_party: `upbeat children's dance pop, four-on-the-floor kick drum, joyful`,
  };

  const voiceMap = {
    warm_female: 'warm gentle female vocal, motherly tone',
    bright_female: 'bright clear female vocal, friendly teacher tone',
    soft_male: 'soft warm male vocal, fatherly tone',
    kid_choir: "children's choir backing vocals",
    cartoon_friendly: 'cheerful animated character vocal, playful',
  };

  const style = [styleMap[songTypeId] || 'cheerful children\'s song', voiceMap[voice] || ''].filter(Boolean).join(', ');

  // Submit to RunPod
  const submitRes = await fetch(
    `https://api.runpod.io/v2/${RUNPOD_ENDPOINT_ID}/run`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          lyrics,
          tags: style,
          duration: 120,
          bpm: bpm || null,
          audio_format: 'mp3',
        },
      }),
    }
  );

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`RunPod submit failed: ${err}`);
  }

  const { id: runpodJobId } = await submitRes.json();
  console.log(`[runpod] Job submitted: ${runpodJobId}`);

  // Poll until complete (max 5 min)
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const statusRes = await fetch(
      `https://api.runpod.io/v2/${RUNPOD_ENDPOINT_ID}/status/${runpodJobId}`,
      { headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` } }
    );
    const status = await statusRes.json();
    console.log(`[runpod] Status: ${status.status}`);

    if (status.status === 'COMPLETED') {
      // RunPod handler returns { audio_url } in output
      const audioUrl = status.output?.audio_url;
      if (!audioUrl) throw new Error('RunPod completed but returned no audio_url');
      return audioUrl;
    }
    if (status.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${JSON.stringify(status.error)}`);
    }
  }

  throw new Error('RunPod job timed out after 5 minutes');
}

// ─── Local ACE-Step (dev) ─────────────────────────────────────────────────────
async function runOnLocal(lyrics, songTypeId, { voice, bpm }) {
  const res = await fetch(`${ACESTEP_LOCAL_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lyrics,
      tags: `children's song, ${songTypeId.replace(/_/g, ' ')}`,
      duration: 120,
      bpm: bpm || 90,
      audio_format: 'mp3',
    }),
  });

  if (!res.ok) throw new Error(`Local ACE-Step error: ${res.statusText}`);
  const data = await res.json();
  const audioPath = data.audio_path || data.file;
  if (!audioPath) throw new Error('Local ACE-Step returned no audio path');

  // Copy to public/audio so it's web-accessible
  const filename = `${Date.now()}.mp3`;
  const dest = path.join(AUDIO_DIR, filename);
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.copyFileSync(audioPath, dest);
  return `/audio/${filename}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
