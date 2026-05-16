import { NextRequest, NextResponse } from 'next/server';
import { CHAOS_SONGWRITER_SYSTEM_PROMPT, buildChaosPrompt } from '@/lib/chaos-data';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      petType,
      petName,
      personality,
      musicGenre,
      visualStyle,
      seriesType,
      customPersonality,
      customGenre,
      customVisual,
    } = body;

    if (!petType || !personality || !musicGenre || !visualStyle) {
      return NextResponse.json(
        { error: 'petType, personality, musicGenre, and visualStyle are required' },
        { status: 400 }
      );
    }

    // Generate lyrics using ZAI
    const zai = await ZAI.create();
    const prompt = buildChaosPrompt({
      petType,
      petName,
      personality,
      genre: musicGenre,
      visualStyle,
      seriesType,
      customPersonality,
      customGenre,
      customVisual,
    });

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: CHAOS_SONGWRITER_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.92,
      max_tokens: 1500,
    });

    const lyrics = completion.choices[0]?.message?.content || '';
    if (!lyrics) {
      return NextResponse.json({ error: 'Lyrics generation failed' }, { status: 500 });
    }

    // Extract title from lyrics if present, or generate one
    const titleMatch = lyrics.match(/\[(?:Title|Song Title):\s*(.+?)\]/i);
    const title = titleMatch?.[1] || generateTitle(petType, personality, musicGenre);

    // Save to database
    const song = await db.chaosSong.create({
      data: {
        petType,
        petName: petName || null,
        personality,
        musicGenre,
        visualStyle,
        seriesType: seriesType || null,
        lyrics,
        songTitle: title,
        status: 'draft',
      },
    });

    return NextResponse.json({
      id: song.id,
      title,
      lyrics,
      petType,
      personality,
      musicGenre,
      visualStyle,
    });
  } catch (error: unknown) {
    console.error('[chaos/generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateTitle(petType: string, personality: string, genre: string): string {
  const titles: Record<string, string[]> = {
    chihuahua: ['Barkside Story', 'Tiny King', 'The Cul-de-Sac Don'],
    orange_cat: ['The Government Knows', 'One Brain Cell', 'Laser Pointer Drone'],
    hamster: ['DJ NIBBLES LIVE', 'Bass & Seeds', 'Rave Wheel'],
    frog: ['Ribbit in the Rain', 'Swamp Gothic', 'Nobody Understands'],
    goldfish: ['Sleepin\' With the Fishes', 'Tank Boss', 'The Don of the Bowl'],
    pomeranian: ['BARK.exe', 'Error 404: Chill Not Found', 'Glitch Bark'],
    husky: ['Synergy', 'Circle Bark', 'Q4 Zoomies'],
    gecko: ['Tiny Hat, Big Dreams', 'Desert Lullaby', 'Scale Rider'],
    ferret: ['The Squeaky Pearl', 'Ferret Seas', 'Yo Ho Squeak'],
    turtle: ['Bro Has One Speed', 'Slow Motion Icon', 'Phonk Shell'],
  };

  const petTitles = titles[petType];
  if (petTitles) {
    return petTitles[Math.floor(Math.random() * petTitles.length)];
  }
  return 'Untitled Chaos';
}
