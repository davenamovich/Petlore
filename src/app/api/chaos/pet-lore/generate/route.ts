import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petCharacter, previousEpisodes = [], episodeNumber } = body as {
      petCharacter: {
        name: string;
        species: string;
        breed: string;
        personality: string;
        flaw: string;
        catchphrase: string;
        furColors: string[];
        eyeColor: string;
        markings: string;
      };
      previousEpisodes: { episode: number; title: string; premise: string; cliffhanger: string }[];
      episodeNumber: number;
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const prevSummary = previousEpisodes.length > 0
      ? previousEpisodes.map(e =>
          `Episode ${e.episode} — "${e.title}": ${e.premise} Ended with: ${e.cliffhanger}`
        ).join('\n')
      : 'This is the first episode.';

    const prompt = `You are a comedy TV writer creating a serialized short-form pet content series for social media.

The star is a real pet with the following profile:
- Name: ${petCharacter.name}
- Species/Breed: ${petCharacter.species} (${petCharacter.breed})
- Core personality: ${petCharacter.personality}
- Defining flaw (the engine of every story): ${petCharacter.flaw}
- Catchphrase: "${petCharacter.catchphrase}"
- Appearance: ${petCharacter.furColors.join(', ')} fur, ${petCharacter.eyeColor} eyes, ${petCharacter.markings}

Story so far:
${prevSummary}

Write Episode ${episodeNumber} of their ongoing series. Each episode must:
- Follow naturally from the previous cliffhanger (if any)
- Centre the conflict on ${petCharacter.name}'s defining flaw: ${petCharacter.flaw}
- Include the catchphrase at a natural moment
- End with a new cliffhanger that makes viewers NEED to see the next episode
- Be shareable and relatable — the kind of thing pet owners screenshot and send to group chats
- Be funny, warm, and never mean — this pet is the lovable star, not the butt of the joke

Return ONLY valid JSON in this exact shape:
{
  "title": "Episode title (punny, memorable, under 8 words)",
  "premise": "2-3 sentence episode summary",
  "scenes": [
    {
      "n": 1,
      "dur": 7,
      "setting": "brief location description",
      "action": "what ${petCharacter.name} does in this beat",
      "dialogue": "exact spoken line or reaction sound in quotes",
      "gag": "the visual or comedic punchline",
      "cam": "camera direction (close-up / wide / POV / etc.)"
    }
  ],
  "cliffhanger": "One punchy sentence. The hook that brings them back for episode ${episodeNumber + 1}.",
  "socialCaption": "Ready-to-post caption with emoji — TikTok/Instagram style. Include episode number and series name. Under 150 chars.",
  "nextEpisodeTeaser": "Short teaser line for episode ${episodeNumber + 1} (builds anticipation)",
  "videoPrompts": {
    "main": "Full video generation prompt describing ${petCharacter.name} as the animated star — include breed, markings, fur color, personality, the episode's key visual moments. Optimized for AI video generators.",
    "thumbnail": "Thumbnail prompt — maximum expression on ${petCharacter.name}'s face, the episode's funniest or most dramatic moment, meme-ready composition"
  }
}

Include exactly 6 scenes. Each scene 6-9 seconds. Make it feel like a real episode of a beloved pet series.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Claude error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text || '';

    let episode: Record<string, unknown>;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      episode = JSON.parse(match ? match[0] : raw);
    } catch {
      return NextResponse.json({ error: 'Failed to parse episode JSON', raw }, { status: 500 });
    }

    return NextResponse.json({
      episode: { ...episode, episode: episodeNumber, createdAt: Date.now() },
      success: true,
    });
  } catch (error: unknown) {
    console.error('[pet-lore/generate] Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
