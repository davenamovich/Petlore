import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, prompt } = body;

    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'image and prompt are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 });
    }

    const enhancedPrompt = `Create a gorgeous artistic cartoon or animated digital illustration of a pet. Style and theme: ${prompt}. Cinematic lighting, vibrant colors, detailed digital masterpiece.`;

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to generate restyled image with OpenAI' },
        { status: res.status }
      );
    }

    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: 'OpenAI returned empty image data' }, { status: 500 });
    }

    return NextResponse.json({ url: imageUrl, success: true });
  } catch (error: unknown) {
    console.error('[chaos/edit-image] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
