import { NextRequest, NextResponse } from 'next/server';
import { CHAOS_LORE_SYSTEM_PROMPT, buildLorePrompt } from '@/lib/chaos-data';
import { callChaosLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petType, petName, personality, seriesType, customPersonality } = body;

    if (!petType || !personality) {
      return NextResponse.json(
        { error: 'petType and personality are required' },
        { status: 400 }
      );
    }

    const prompt = buildLorePrompt({
      petType,
      petName,
      personality,
      seriesType,
      customPersonality,
    });

    const lore = await callChaosLLM({
      messages: [
        { role: 'system', content: CHAOS_LORE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 500,
    });

    if (!lore) {
      return NextResponse.json({ error: 'Lore generation failed' }, { status: 500 });
    }

    return NextResponse.json({ lore });
  } catch (error: unknown) {
    console.error('[chaos/lore] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
