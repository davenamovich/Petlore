import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MUSIC_GENRES } from '@/lib/chaos-data';
import path from 'path';
import fs from 'fs';

// ─── Config ──────────────────────────────────────────────────────────────────

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const ACESTEP_LOCAL_URL = process.env.ACESTEP_API_URL || 'http://localhost:8001';
const AUDIO_DIR = process.env.AUDIO_DIR || './public/audio';
// Relative path — Next.js serves public/audio at /audio from whatever port it runs on
const AUDIO_BASE_URL = process.env.AUDIO_BASE_URL || '/audio';

const useRunPod = !!(RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID);

// ─── Cover art map ───────────────────────────────────────────────────────────

const COVER_MAP: Record<string, string> = {
  chihuahua: 'https://images.unsplash.com/photo-1608848461950-0fe51dfc41cb?w=800&q=80',
  orange_cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
  hamster: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&q=80',
  frog: 'https://images.unsplash.com/photo-1559253664-ca248bb37e78?w=800&q=80',
  goldfish: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=800&q=80',
  pomeranian: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&q=80',
  husky: 'https://images.unsplash.com/photo-1531106340302-0c58e5f22e86?w=800&q=80',
  gecko: 'https://images.unsplash.com/photo-1568430462989-44163eb17ab2?w=800&q=80',
  ferret: 'https://images.unsplash.com/photo-1615087240969-eeff2fa558f2?w=800&q=80',
  turtle: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800&q=80',
};

// ─── ACE-Step production pipeline ────────────────────────────────────────────

async function generateMp3(song: {
  id: string;
  lyrics: string;
  musicGenre: string;
  petType: string;
}): Promise<string> {
  const genre = MUSIC_GENRES.find(g => g.id === song.musicGenre);
  const styleTags = genre?.styleTags || 'upbeat pop, fun, energetic';
  const bpm = genre?.bpm || 120;

  if (useRunPod) {
    return generateOnRunPod(song.lyrics, styleTags, bpm);
  } else {
    return generateOnLocal(song.id, song.lyrics, styleTags, bpm);
  }
}

async function generateOnRunPod(lyrics: string, styleTags: string, bpm: number): Promise<string> {
  // Submit job
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
          tags: styleTags,
          duration: 120,
          bpm,
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
  console.log(`[chaos/produce] RunPod job submitted: ${runpodJobId}`);

  // Poll up to 8 minutes
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const statusRes = await fetch(
      `https://api.runpod.io/v2/${RUNPOD_ENDPOINT_ID}/status/${runpodJobId}`,
      { headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` } }
    );
    const status = await statusRes.json();
    console.log(`[chaos/produce] RunPod status: ${status.status}`);

    if (status.status === 'COMPLETED') {
      const audioUrl = status.output?.audio_url;
      if (!audioUrl) throw new Error('RunPod completed but returned no audio_url');
      return audioUrl;
    }
    if (status.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${JSON.stringify(status.error)}`);
    }
  }

  throw new Error('RunPod job timed out after 8 minutes');
}

async function generateOnLocal(songId: string, lyrics: string, styleTags: string, bpm: number): Promise<string> {
  console.log(`[chaos/produce] Calling local ACE-Step at ${ACESTEP_LOCAL_URL}`);

  const res = await fetch(`${ACESTEP_LOCAL_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lyrics,
      tags: styleTags,
      // ACE-Step uses audio_duration (seconds), not duration
      audio_duration: 120,
      bpm,
      audio_format: 'mp3',
      infer_step: 60,
      guidance_scale: 15.0,
      scheduler_type: 'euler',
      cfg_type: 'apg',
      omega_scale: 10.0,
      seed: -1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Local ACE-Step error: ${res.status} ${errText}`);
  }

  const audioDir = path.resolve(AUDIO_DIR);
  fs.mkdirSync(audioDir, { recursive: true });
  const filename = `chaos-${songId}-${Date.now()}.mp3`;
  const dest = path.join(audioDir, filename);

  // ACE-Step can respond in several ways — handle all of them:
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
    // ① Binary audio response — save directly
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    console.log(`[chaos/produce] Saved binary audio → ${dest}`);
  } else {
    // ② JSON response
    const data = await res.json();
    console.log(`[chaos/produce] ACE-Step JSON response:`, JSON.stringify(data).slice(0, 200));

    // Priority: audio_url (URL to download from) > audio_path/file/output (local path to copy)
    const audioUrl: string | undefined = data.audio_url || data.url;
    const audioPath: string | undefined = data.audio_path || data.file || data.output;

    if (audioUrl) {
      // Download from ACE-Step's own HTTP server
      const dlRes = await fetch(audioUrl);
      if (!dlRes.ok) throw new Error(`ACE-Step audio download failed: ${dlRes.status} ${audioUrl}`);
      const buffer = Buffer.from(await dlRes.arrayBuffer());
      fs.writeFileSync(dest, buffer);
      console.log(`[chaos/produce] Downloaded audio from ${audioUrl} → ${dest}`);
    } else if (audioPath) {
      // Local file path — copy into public/audio
      if (!fs.existsSync(audioPath)) {
        throw new Error(`ACE-Step returned path that doesn't exist: ${audioPath}`);
      }
      fs.copyFileSync(audioPath, dest);
      console.log(`[chaos/produce] Copied audio from ${audioPath} → ${dest}`);
    } else {
      throw new Error(
        `ACE-Step returned no audio. Full response: ${JSON.stringify(data)}`
      );
    }
  }

  // Return relative URL — Next.js serves public/audio at /audio/*
  return `${AUDIO_BASE_URL}/${filename}`;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    const songs = await db.chaosSong.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ songs });
  } catch (error: unknown) {
    console.error('[chaos/admin/songs] GET Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Shared action handler (used by both POST and PATCH) ─────────────────────

async function handleAction(request: NextRequest) {
  let body: { songId?: string; action?: string; isPublic?: boolean; jobId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { songId, action, isPublic, jobId } = body;

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  // ── Status poll ─────────────────────────────────────────────────────────────
  if (action === 'status') {
    if (!songId) return NextResponse.json({ error: 'songId required' }, { status: 400 });
    const song = await db.chaosSong.findUnique({ where: { id: songId } });
    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    return NextResponse.json({
      status: song.status ?? 'pending',
      audioUrl: song.audioUrl ?? null,
      jobId: jobId ?? null,
    });
  }

  if (!songId) {
    return NextResponse.json({ error: 'songId is required' }, { status: 400 });
  }

  const song = await db.chaosSong.findUnique({ where: { id: songId } });
  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // ── Produce: generate real MP3 via ACE-Step ──────────────────────────────
  if (action === 'produce') {
    await db.chaosSong.update({
      where: { id: songId },
      data: { status: 'generating' },
    });

    generateMp3({
      id: song.id,
      lyrics: song.lyrics || '',
      musicGenre: song.musicGenre,
      petType: song.petType,
    })
      .then(async (audioUrl) => {
        await db.chaosSong.update({
          where: { id: songId },
          data: {
            status: 'done',
            audioUrl,
            coverUrl: COVER_MAP[song.petType] || COVER_MAP.orange_cat,
          },
        });
        console.log(`[chaos/produce] ✓ Done: ${songId} → ${audioUrl}`);
      })
      .catch(async (err) => {
        console.error(`[chaos/produce] ✗ Failed: ${songId}`, err);
        await db.chaosSong.update({
          where: { id: songId },
          data: { status: 'failed' },
        });
      });

    return NextResponse.json({
      status: 'generating',
      message: useRunPod
        ? 'Queued on RunPod — poll for status updates'
        : `Generating on local ACE-Step (${ACESTEP_LOCAL_URL}/generate) — this takes 1–3 min`,
    });
  }

  // ── Toggle public/private ────────────────────────────────────────────────
  if (action === 'togglePublic') {
    const updated = await db.chaosSong.update({
      where: { id: songId },
      data: { isPublic: isPublic !== undefined ? isPublic : !song.isPublic },
    });
    return NextResponse.json({ song: updated });
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  if (action === 'delete') {
    await db.chaosSong.delete({ where: { id: songId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    return await handleAction(request);
  } catch (error: unknown) {
    console.error('[chaos/admin/songs] POST Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return await handleAction(request);
  } catch (error: unknown) {
    console.error('[chaos/admin/songs] PATCH Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
