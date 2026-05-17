import { NextRequest, NextResponse } from 'next/server';

const VESSEL_STUDIO_URL = process.env.VESSEL_STUDIO_URL || 'http://localhost:3030';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const provider = searchParams.get('provider');
  const modelId = searchParams.get('modelId');
  const statusUrl = searchParams.get('statusUrl');
  const resultUrl = searchParams.get('resultUrl');

  if (!jobId || !provider || !modelId) {
    return NextResponse.json({ error: 'jobId, provider, and modelId are required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ jobId, provider, modelId });
    if (statusUrl) params.append('statusUrl', statusUrl);
    if (resultUrl) params.append('resultUrl', resultUrl);

    const response = await fetch(`${VESSEL_STUDIO_URL}/api/status?${params.toString()}`, {
      method: 'GET',
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Vessel Video Studio status check failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (fetchError) {
    console.error('[chaos/video/status] Could not reach Vessel Video Studio on port 3030:', fetchError);
    return NextResponse.json(
      { error: 'Could not connect to Vessel Video Studio on port 3030.' },
      { status: 503 }
    );
  }
}
