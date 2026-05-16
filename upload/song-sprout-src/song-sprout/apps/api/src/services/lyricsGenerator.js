import Anthropic from '@anthropic-ai/sdk';

export const SONGWRITER_SYSTEM_PROMPT = `You are a professional children's songwriter who has written for Sesame Street, Disney Junior, and Raffi. Your job is to write original, age-appropriate song lyrics that include a specific child's name naturally throughout.

CRITICAL RULES:

1. The child's name MUST appear 10–15 times throughout the song. Not more, not less.
   This is the product — parents are paying to hear their child's name a lot.

2. Place the name at LINE ENDS whenever possible. AI vocal models (like ACE-Step)
   pronounce names more clearly when they fall at the end of a musical phrase.

3. Surround the name with simple, sing-able phonemes. "Sweet [name]" works.
   "Oh, [name]" works. Avoid sticking the name next to hard consonants or
   complex blends ("brrr [name]" or "[name] grrrr" — bad).

4. Use simple, repetitive structure. Every children's song has a clear chorus that
   repeats. The chorus is where the name lives most.

5. Match the song to the age range given. A lullaby for a 2-year-old uses different
   vocabulary than a superhero anthem for an 8-year-old. Vocabulary scales:
   - Ages 0-3: 1-syllable words mostly, very repetitive, lots of soft "sh" "oo" "ee" sounds
   - Ages 3-5: 1-2 syllable words, more imagery, still very repetitive
   - Ages 5-8: 2-3 syllable words OK, can introduce concepts, less repetition
   - Ages 8-12: full vocabulary, can be silly/clever, complete narrative arcs

6. INCORPORATE the child's interests when provided. If they love dinosaurs, work in
   dinosaurs. If they love their dog Buddy, work in Buddy. Make it feel personal.

7. Use proper song structure markers in your output:
   [Intro]
   [Verse 1]
   [Chorus]
   [Verse 2]
   [Chorus]
   [Bridge]   (optional, age 5+)
   [Outro]

8. Never include anything inappropriate: no violence, no fear-inducing imagery
   (monsters under bed, dark woods, etc.), no romantic content, no commercial
   references, no real-person names besides the child's.

9. Lyrics should be 24-40 lines total. Not shorter (too brief), not longer (the song
   is 2-3 minutes; longer lyrics get rushed).

10. Output ONLY the lyrics, with section markers. No commentary, no explanations,
    no "Here are the lyrics:" preamble. Just the song.

EXAMPLES OF GOOD NAME PLACEMENT:

✓ "Twinkle little star above / Watching over Sophie with love"
  (name at line end, soft sounds before it)

✓ "Dance, dance, dance with Liam! / Dance, dance, dance with Liam!"
  (repetition + line end + simple)

✗ "Maximilian thought about his tractor that was big"
  (name mid-line, hard consonants, too complex)

✗ "Sophie Sophie Sophie Sophie Sophie"
  (lazy — feels machine-generated)

REMEMBER: parents will play this song 50+ times. Make it bearable. Better: make it
beautiful.`;

export const SONG_TYPE_BRIEFS = {
  lullaby_starry: { description: 'A gentle bedtime lullaby with starry-night imagery', mood: 'calming, soothing, tender, slow', imagery: 'stars, moon, sky, dreams, twinkle, soft, peaceful', structure: '2 verses, 2 choruses, gentle outro', lengthLines: 28 },
  lullaby_ocean: { description: 'A gentle bedtime lullaby with ocean imagery', mood: 'calming, gentle, peaceful, slow', imagery: 'waves, sand, sea, breeze, shore, gentle', structure: '2 verses, 2 choruses, gentle outro', lengthLines: 28 },
  birthday: { description: 'An upbeat birthday celebration song that includes the child\'s age', mood: 'joyful, celebratory, exciting, energetic', imagery: 'cake, candles, presents, party, friends, wishes', structure: '2 verses, 2 choruses, joyful outro', lengthLines: 28, requiresAge: true },
  good_morning: { description: 'A cheerful wake-up song to start the day', mood: 'bright, optimistic, gentle but energetic', imagery: 'sun, morning, birds, breakfast, day ahead, fresh', structure: '2 verses, 2 choruses', lengthLines: 26 },
  brushing_teeth: { description: 'A 2-minute routine song to help the child brush their teeth properly', mood: 'fun, repetitive, encouraging', imagery: 'sparkly teeth, brush, smile, healthy, side to side', structure: '2 verses, 3 choruses (because it has to be 2 min)', lengthLines: 32, timingHint: 'verses cover the brushing motions in time-appropriate sequence' },
  abcs_with_name: { description: 'An alphabet learning song that includes the child\'s name prominently', mood: 'educational, friendly, classic', imagery: 'letters, learning, smart, growing up', structure: 'intro, full alphabet verse, chorus celebrating learning', lengthLines: 24, educationalRequirement: 'MUST include the full alphabet A-Z in order, broken into 2-3 lines' },
  superhero: { description: 'An empowering anthem that frames the child as a hero', mood: 'triumphant, empowering, big, confident', imagery: 'strength, kindness as superpower, brave, sky, fly, hero', structure: 'verse, pre-chorus, big chorus, verse, big chorus', lengthLines: 30 },
  pet_friend: { description: 'A heartfelt song about the child and their pet as best friends', mood: 'warm, story-like, gentle', imagery: 'friendship, playing, loyalty, together', structure: '2 verses, 2 choruses, optional bridge', lengthLines: 28, requiresPetName: true },
  counting_song: { description: 'A counting song that goes from 1 to 10 with the child\'s name', mood: 'playful, educational, bouncy', imagery: 'fingers, jumps, hops, counting things', structure: 'verse, counting chorus, verse, counting chorus', lengthLines: 26, educationalRequirement: 'MUST include numbers 1 through 10 in order' },
  dance_party: { description: 'A high-energy dance song with movement instructions', mood: 'energetic, fun, danceable, sing-along', imagery: 'clap, stomp, jump, spin, dance, move', structure: '2 verses, 2 big choruses, outro chant', lengthLines: 30 },
};

export function buildUserPrompt(params) {
  const { name, age, interests = [], petName, songTypeId } = params;
  const brief = SONG_TYPE_BRIEFS[songTypeId];
  if (!brief) throw new Error(`Unknown song type: ${songTypeId}`);
  if (brief.requiresAge && !age) throw new Error('This song type requires the child\'s age');
  if (brief.requiresPetName && !petName) throw new Error('This song type requires the pet\'s name');

  let prompt = `Write song lyrics with the following parameters:\n\nCHILD PROFILE:\n- Name: ${name}\n- Age: ${age || '(not specified)'}\n- Important: use the child's name instead of any pronouns (he/she/they). Never use gendered or neutral pronouns.`;
  if (interests.length > 0) prompt += `\n- Interests: ${interests.join(', ')}`;
  if (petName) prompt += `\n- Pet's name: ${petName}`;
  prompt += `\n\nSONG TYPE: ${brief.description}\n\nREQUIREMENTS:\n- Mood: ${brief.mood}\n- Imagery to weave in: ${brief.imagery}\n- Structure: ${brief.structure}\n- Target length: ~${brief.lengthLines} lines`;
  if (brief.educationalRequirement) prompt += `\n- IMPORTANT: ${brief.educationalRequirement}`;
  if (brief.timingHint) prompt += `\n- Timing note: ${brief.timingHint}`;
  prompt += `\n\nThe name "${name}" must appear 10-15 times. Most appearances should be at line ends. Output only the lyrics with section markers. Begin now.`;
  return prompt;
}

export function validateLyrics(lyrics, name) {
  const issues = [];
  const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  const matches = lyrics.match(nameRegex) || [];
  if (matches.length < 8) issues.push(`Name appears only ${matches.length} times (target: 10-15)`);
  if (matches.length > 20) issues.push(`Name appears ${matches.length} times — too repetitive (target: 10-15)`);
  if (!/\[(Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus)/i.test(lyrics)) issues.push('Missing structural section markers');
  const lines = lyrics.split('\n').filter(l => l.trim() && !l.trim().startsWith('['));
  if (lines.length < 18) issues.push(`Only ${lines.length} content lines (target: 24-40)`);
  if (lines.length > 50) issues.push(`${lines.length} content lines — too long (target: 24-40)`);

  const forbiddenWords = ['monster', 'scary', 'kill', 'death', 'dying', 'blood', 'dark and scary', 'sex', 'sexy', 'kiss me', 'lover', 'disney', 'mickey', 'spider-man', 'batman', 'elsa', 'frozen'];
  const lowerLyrics = lyrics.toLowerCase();
  for (const word of forbiddenWords) if (lowerLyrics.includes(word.toLowerCase())) issues.push(`Contains potentially inappropriate or copyrighted reference: "${word}"`);

  return { valid: issues.length === 0, issues, nameCount: matches.length, lineCount: lines.length };
}

export async function generateLyrics(params, apiKey, opts = {}) {
  const { maxRetries = 2, model = 'claude-3-5-haiku-20241022' } = opts;
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';

  // If apiKey is missing but OLLAMA_BASE_URL is explicitly provided or we want to allow local fallback
  const useOllama = !apiKey || apiKey === 'ollama' || model.includes('ollama');

  const userPrompt = buildUserPrompt(params);
  let lastIssues = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const adjustedUserPrompt = attempt === 0 ? userPrompt : userPrompt + `\n\nPREVIOUS ATTEMPT HAD THESE ISSUES — fix them: ${lastIssues.join('; ')}`;
    let lyrics = '';
    let usedModel = model;

    if (useOllama) {
      try {
        console.log(`[lyricsGenerator] Attempting local generation via Ollama (${ollamaModel}) at ${ollamaBaseUrl}`);
        usedModel = ollamaModel;
        const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [
              { role: 'system', content: SONGWRITER_SYSTEM_PROMPT },
              { role: 'user', content: adjustedUserPrompt }
            ],
            stream: false,
            options: { temperature: 0.85 }
          }),
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
        const data = await response.json();
        lyrics = data.message.content.trim();
      } catch (err) {
        if (!apiKey || apiKey === 'ollama') throw err; // 'ollama' is not a real Anthropic key
        // Only fall through to Anthropic if we have a real key
        console.warn('Ollama failed, falling back to Anthropic:', err.message);
      }
    }

    const isRealAnthropicKey = apiKey && apiKey !== 'ollama';
    if (!lyrics && isRealAnthropicKey) {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 1500,
        system: SONGWRITER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: adjustedUserPrompt }],
        temperature: 0.85
      });
      lyrics = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    }

    if (!lyrics) throw new Error('Lyrics generation failed: No AI service available (Anthropic/Ollama)');

    const validation = validateLyrics(lyrics, params.name);
    if (validation.valid || attempt === maxRetries) {
      return { lyrics, validation, modelUsed: usedModel, attemptsUsed: attempt + 1 };
    }
    lastIssues = validation.issues;
  }
  throw new Error('Lyrics generation failed after retries');
}

export async function generateVariations(params, apiKey, count = 3, opts = {}) {
  const variations = [];
  console.log(`[lyricsGenerator] Generating ${count} variations sequentially...`);
  for (let i = 0; i < count; i++) {
    try {
      console.log(`[lyricsGenerator] Starting variation ${i + 1}/${count}`);
      const variation = await generateLyrics(params, apiKey, opts);
      variations.push(variation);
    } catch (e) {
      console.error(`[lyricsGenerator] Variation ${i + 1} failed:`, e.message);
      variations.push({ error: e.message, index: i });
    }
  }
  return variations;
}

export function getFallbackTemplateLyrics(songTypeId, params) {
  return { fallback: true, reason: 'No AI songwriter key configured. Using template lyrics.' };
}
