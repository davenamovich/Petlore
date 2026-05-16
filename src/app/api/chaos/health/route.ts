import { NextResponse } from 'next/server';

// ─── Health Check — /api/chaos/health ─────────────────────────────────────────
// Returns live status for music generation backends.
// Called by AdminMetrics System tab to show real availability.

const ACESTEP_LOCAL_URL = process.env.ACESTEP_API_URL || 'http://localhost:8001';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || '';

type BackendStatus = {
  available: boolean;
  latencyMs?: number;
  error?: string;
  detail?: string;
};

async function checkAceStep(): Promise<BackendStatus> {
  const start = Date.now();
  try {
    // Ping the health endpoint; fall back to root if /health isn't exposed
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${ACESTEP_LOCAL_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      // /health might not exist — try root
      clearTimeout(timeout);
      const c2 = new AbortController();
      setTimeout(() => c2.abort(), 5000);
      return fetch(`${ACESTEP_LOCAL_URL}/`, { method: 'GET', signal: c2.signal });
    });

    clearTimeout(timeout);
    return {
      available: res.ok || res.status < 500,
      latencyMs: Date.now() - start,
      detail: `HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    return {
      available: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      detail: 'Connection refused or timed out',
    };
  }
}

function checkRunPod(): BackendStatus {
  const configured = !!(RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID);
  return {
    available: configured,
    detail: configured
      ? `Endpoint: ${RUNPOD_ENDPOINT_ID}`
      : 'RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID not set in .env',
  };
}

export async function GET() {
  const [aceStep, runpod] = await Promise.all([
    checkAceStep(),
    Promise.resolve(checkRunPod()),
  ]);

  const activeBackend = runpod.available ? 'runpod' : aceStep.available ? 'acestep' : 'none';

  return NextResponse.json(
    {
      activeBackend,
      backends: {
        aceStep: {
          ...aceStep,
          url: ACESTEP_LOCAL_URL,
        },
        runPod: {
          ...runpod,
          endpointId: RUNPOD_ENDPOINT_ID || null,
        },
      },
      env: {
        audioDir: process.env.AUDIO_DIR || './public/audio',
        audioBaseUrl: process.env.AUDIO_BASE_URL || '/audio',
      },
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
