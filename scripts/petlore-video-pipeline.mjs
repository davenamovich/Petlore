/**
 * Petlore video pipeline using the existing Vessel Video Studio integration.
 *
 * Reads scene_generation.json and ai_video_prompts.json, starts one video job per
 * scene through /api/chaos/video/generate, polls /api/chaos/video/status, and
 * writes a manifest under download/petlore-<runId>/.
 *
 * Usage:
 *   node scripts/petlore-video-pipeline.mjs --dry-run
 *   node scripts/petlore-video-pipeline.mjs --base-url http://localhost:3027
 *   node scripts/petlore-video-pipeline.mjs --scenes 1,3 --style runway
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const opts = {
    baseUrl: process.env.PETLORE_BASE_URL || 'http://localhost:3027',
    runId: new Date().toISOString().replace(/[:.]/g, '-'),
    style: 'veo',
    dryRun: false,
    pollMs: 5000,
    timeoutMs: 10 * 60_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--base-url' && next) {
      opts.baseUrl = next;
      i += 1;
    } else if (arg === '--run-id' && next) {
      opts.runId = next;
      i += 1;
    } else if (arg === '--style' && next) {
      opts.style = next;
      i += 1;
    } else if (arg === '--scenes' && next) {
      opts.scenes = new Set(next.split(',').map((n) => Number(n.trim())).filter(Number.isFinite));
      i += 1;
    } else if (arg === '--poll-ms' && next) {
      opts.pollMs = Number(next);
      i += 1;
    } else if (arg === '--timeout-ms' && next) {
      opts.timeoutMs = Number(next);
      i += 1;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    }
  }

  return opts;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function stylePrompt(styleConfig, style) {
  const key = `${style}_prompt`;
  const prompt = styleConfig[key] || styleConfig.prompt || styleConfig.veo_prompt;
  return typeof prompt === 'string' ? prompt : '';
}

function buildScenePrompt(styleGuide, scene) {
  return [
    styleGuide,
    scene.setting && `Setting: ${scene.setting}.`,
    scene.action && `Action: ${scene.action}.`,
    scene.camera && `Camera: ${scene.camera}.`,
    scene.facial_expression && `Expression: ${scene.facial_expression}.`,
    scene.visual_gag && `Visual gag: ${scene.visual_gag}.`,
    scene.dialogue_or_lyric && `Dialogue: "${scene.dialogue_or_lyric}".`,
    scene.audio && `Audio cue: ${scene.audio}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

async function writeManifest(path, entries) {
  await writeFile(path, JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2));
}

async function startVideo(baseUrl, entry, scene) {
  const res = await fetch(`${baseUrl}/api/chaos/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: entry.prompt,
      durationSeconds: scene.duration_seconds ?? 8,
      aspectRatio: '9:16',
      resolution: '1080p',
      generateAudio: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Generate failed with HTTP ${res.status}`);
  return data;
}

async function pollVideo(baseUrl, entry, opts) {
  const started = Date.now();
  while (Date.now() - started < opts.timeoutMs) {
    const params = new URLSearchParams();
    if (entry.jobId) params.set('jobId', entry.jobId);
    if (entry.provider) params.set('provider', entry.provider);
    if (entry.modelId) params.set('modelId', entry.modelId);
    if (entry.statusUrl) params.set('statusUrl', entry.statusUrl);
    if (entry.resultUrl) params.set('resultUrl', entry.resultUrl);

    const res = await fetch(`${baseUrl}/api/chaos/video/status?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Status failed with HTTP ${res.status}`);

    const status = String(data.status || '').toLowerCase();
    if (data.resultUrl) entry.resultUrl = data.resultUrl;
    if (status === 'completed' || status === 'done' || entry.resultUrl) {
      entry.status = 'completed';
      return;
    }
    if (status === 'failed' || status === 'error') {
      entry.status = 'failed';
      entry.error = data.error || 'Video generation failed';
      return;
    }
    entry.status = 'running';
    await new Promise((resolvePoll) => setTimeout(resolvePoll, opts.pollMs));
  }
  entry.status = 'failed';
  entry.error = 'Timed out waiting for video generation';
}

async function main() {
  const repoRoot = resolve(__dirname, '..');
  const opts = parseArgs(process.argv.slice(2));
  const scenes = await readJson(join(repoRoot, 'scene_generation.json'));
  const styles = await readJson(join(repoRoot, 'ai_video_prompts.json'));
  const selectedScenes = opts.scenes ? scenes.filter((scene) => opts.scenes.has(scene.scene_number)) : scenes;
  const guide = stylePrompt(styles, opts.style);

  const outDir = join(repoRoot, 'download', `petlore-${opts.runId}`);
  await mkdir(outDir, { recursive: true });
  const manifestPath = join(outDir, 'manifest.json');

  const entries = selectedScenes.map((scene) => ({
    sceneNumber: scene.scene_number,
    prompt: buildScenePrompt(guide, scene),
    status: 'planned',
  }));

  await writeManifest(manifestPath, entries);

  for (const entry of entries) {
    const scene = selectedScenes.find((candidate) => candidate.scene_number === entry.sceneNumber);
    if (!scene) continue;
    if (opts.dryRun) {
      console.log(`Scene ${entry.sceneNumber}: ${entry.prompt}`);
      continue;
    }

    entry.startedAt = new Date().toISOString();
    try {
      const job = await startVideo(opts.baseUrl, entry, scene);
      entry.jobId = job.jobId;
      entry.provider = job.provider;
      entry.modelId = job.modelId;
      entry.statusUrl = job.statusUrl;
      entry.resultUrl = job.resultUrl;
      entry.status = job.resultUrl ? 'completed' : 'queued';
      await writeManifest(manifestPath, entries);
      if (!entry.resultUrl) await pollVideo(opts.baseUrl, entry, opts);
    } catch (error) {
      entry.status = 'failed';
      entry.error = error instanceof Error ? error.message : String(error);
    } finally {
      entry.finishedAt = new Date().toISOString();
      await writeManifest(manifestPath, entries);
    }
  }

  console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
