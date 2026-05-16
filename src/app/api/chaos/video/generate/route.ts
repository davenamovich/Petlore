import { NextRequest, NextResponse } from 'next/server';

const VESSEL_STUDIO_URL = 'http://localhost:3030';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      durationSeconds = 8,
      aspectRatio = '16:9',
      resolution = '1080p',
      generateAudio = true,
      forceModelId,
      forceProvider,
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Forward the request to Vessel Video Studio on port 3030
    try {
      const response = await fetch(`${VESSEL_STUDIO_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          durationSeconds,
          aspectRatio,
          resolution,
          generateAudio,
          forceModelId,
          forceProvider,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || 'Vessel Video Studio generation failed', code: data.code },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('[chaos/video/generate] Could not reach Vessel Video Studio on port 3030:', fetchError);
      return NextResponse.json(
        { 
          error: 'Could not connect to Vessel Video Studio. Please ensure vessel-video-studio is running on port 3030 (npm run dev in vessel-video-studio).',
          code: 'VESSEL_STUDIO_UNREACHABLE'
        },
        { status: 503 }
      );
    }
  } catch (error: unknown) {
    console.error('[chaos/video/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
