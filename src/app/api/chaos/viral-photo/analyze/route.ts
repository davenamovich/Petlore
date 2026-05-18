import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, petName } = body as { images: string[]; petName?: string };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
    }

    const imageContent = images.slice(0, 4).map((b64: string) => {
      // Strip data URL prefix if present
      const data = b64.includes(',') ? b64.split(',')[1] : b64;
      return {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data },
      };
    });

    const systemPrompt = `You are a professional pet photographer and animal behavior expert. Analyze pet photos and extract precise visual identity data. Always respond with valid JSON only — no markdown, no explanation, just the JSON object.`;

    const userPrompt = `Analyze ${images.length > 1 ? 'these pet photos' : 'this pet photo'}${petName ? ` of ${petName}` : ''} and extract a complete Pet Identity Profile.

Return a JSON object with exactly these fields:
{
  "petName": "${petName || 'Unknown'}",
  "species": "dog/cat/rabbit/bird/etc",
  "breedEstimate": "specific breed or mix description",
  "furColors": ["list of fur colors"],
  "markings": "description of distinctive markings, patterns, patches",
  "eyeColor": "eye color",
  "earShape": "ear description (floppy/erect/folded/etc)",
  "sizeAndBuild": "small/medium/large + body build description",
  "expression": "current expression in the photo",
  "personalityVibe": "inferred personality from appearance and expression",
  "mostRecognizableTraits": ["top 3-5 most distinctive visual features"],
  "mustNeverChange": ["critical identity features that must be preserved in any edit"],
  "thumbnailReadabilityScore": "high/medium/low — how well this photo reads as a thumbnail"
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContent,
              { type: 'text', text: userPrompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Claude API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text || '';

    let profile: Record<string, unknown>;
    try {
      // Extract JSON even if wrapped in backticks
      const match = raw.match(/\{[\s\S]*\}/);
      profile = JSON.parse(match ? match[0] : raw);
    } catch {
      return NextResponse.json({ error: 'Failed to parse pet identity JSON', raw }, { status: 500 });
    }

    return NextResponse.json({ profile, success: true });
  } catch (error: unknown) {
    console.error('[viral-photo/analyze] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
