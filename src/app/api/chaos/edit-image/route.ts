import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, prompt, size = '1024x1024' } = body;

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

    // Convert base64 string to a Blob
    const buffer = Buffer.from(image, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('model', 'gpt-image-2');
    formData.append('prompt', prompt);
    formData.append('image', blob, 'image.png');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Failed to edit image with OpenAI' }, { status: res.status });
    }

    const imageUrl = data.data?.[0]?.b64_json 
      ? `data:image/png;base64,${data.data[0].b64_json}` 
      : data.data?.[0]?.url;

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
