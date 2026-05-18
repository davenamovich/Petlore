import { NextRequest, NextResponse } from 'next/server';
import { CHAOS_SONGWRITER_SYSTEM_PROMPT, buildChaosPrompt } from '@/lib/chaos-data';
import { db } from '@/lib/db';
import { callChaosLLM } from '@/lib/llm';

export async function GET(request: NextRequest) {
  try {
    // Get the song ID from query params
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');
    
    if (!songId) {
      return NextResponse.json(
        { error: 'songId is required' },
        { status: 400 }
      );
    }
    
    // Fetch the song from database
    const song = await db.chaosSong.findUnique({
      where: { id: songId },
      include: {
        user: true,
      }
    });
    
    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(song);
  } catch (error: unknown) {
    console.error('[chaos/slideshow] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
      useExistingSongId,
    } = body;
    
    let song;
    
    // If we're reusing an existing song, just fetch it
    if (useExistingSongId) {
      song = await db.chaosSong.findUnique({
        where: { id: useExistingSongId },
      });
      
      if (!song) {
        return NextResponse.json(
          { error: 'Existing song not found' },
          { status: 404 }
        );
      }
    } else {
      // Generate new song using existing chaos engine logic
      if (!petType || !personality || !musicGenre || !visualStyle) {
        return NextResponse.json(
          { error: 'petType, personality, musicGenre, and visualStyle are required' },
          { status: 400 }
        );
      }

      // Generate lyrics using custom LLM router
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

      const lyrics = await callChaosLLM({
        messages: [
          { role: 'system', content: CHAOS_SONGWRITER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.85,
        max_tokens: 500,
      });
      if (!lyrics) {
        return NextResponse.json({ error: 'Lyrics generation failed' }, { status: 500 });
      }

      // Extract title from lyrics if present, or generate one
      const titleMatch = lyrics.match(/\[(?:Title|Song Title):\s*(.+?)\]/i);
      const title = titleMatch?.[1] || generateTitle(petType, personality, musicGenre);

      // Save to database
      song = await db.chaosSong.create({
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
    }
    
    return NextResponse.json({
      id: song.id,
      title: song.songTitle,
      lyrics: song.lyrics,
      petType: song.petType,
      personality: song.personality,
      musicGenre: song.musicGenre,
      visualStyle: song.visualStyle,
    });
  } catch (error: unknown) {
    console.error('[chaos/slideshow] Error:', error);
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

// Helper function to get all songs for a user
export async function GET_ALL(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    const songs = await db.chaosSong.findMany({
      where: { 
        userId,
        status: 'draft'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(songs);
  } catch (error: unknown) {
    console.error('[chaos/slideshow/all] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}