// ─── THE CHAOS ENGINE DATA ──────────────────────────────────────────────────
// Pet types, personalities, genres, visuals, and series templates

export type PetType = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  defaultGenre: string;
  defaultPersonality: string;
  defaultVisual: string;
  color: string; // tailwind gradient
};

export type Personality = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  color: string;
};

export type MusicGenre = {
  id: string;
  label: string;
  description: string;
  styleTags: string;
  bpm: number;
  emoji: string;
  color: string;
};

export type VisualStyle = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  color: string;
};

export type SeriesTemplate = {
  id: string;
  label: string;
  description: string;
  examples: string[];
  emoji: string;
  color: string;
};

// ─── PET TYPES ──────────────────────────────────────────────────────────────

export const PET_TYPES: PetType[] = [
  {
    id: 'chihuahua',
    label: 'Chihuahua',
    emoji: '🐕',
    description: 'Tiny dog. Massive ego. Zero chill.',
    defaultGenre: 'drill_rap',
    defaultPersonality: 'drill_rapper',
    defaultVisual: 'gta_cinematic',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'orange_cat',
    label: 'Orange Cat',
    emoji: '🐈',
    description: 'One brain cell. Infinite suspicion.',
    defaultGenre: 'lofi_jazz_podcast',
    defaultPersonality: 'conspiracy_theorist',
    defaultVisual: 'podcast_studio',
    color: 'from-orange-400 to-amber-500',
  },
  {
    id: 'hamster',
    label: 'Hamster',
    emoji: '🐹',
    description: 'Cheeks full. Bass dropped. No regrets.',
    defaultGenre: 'edm',
    defaultPersonality: 'edm_dj',
    defaultVisual: 'rave',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'frog',
    label: 'Frog',
    emoji: '🐸',
    description: 'Nobody understands my swamp.',
    defaultGenre: 'emo_ballad',
    defaultPersonality: 'goth',
    defaultVisual: 'rain_scene',
    color: 'from-green-600 to-emerald-700',
  },
  {
    id: 'goldfish',
    label: 'Goldfish',
    emoji: '🐟',
    description: 'Sleepin\' with the fishes. Literally.',
    defaultGenre: 'mafia_jazz',
    defaultPersonality: 'mobster',
    defaultVisual: 'underwater_casino',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    id: 'pomeranian',
    label: 'Pomeranian',
    emoji: '🐶',
    description: 'BARK.exe has stopped working.',
    defaultGenre: 'hyperpop',
    defaultPersonality: 'possessed',
    defaultVisual: 'spinning_lasers',
    color: 'from-pink-500 to-rose-600',
  },
  {
    id: 'husky',
    label: 'Husky',
    emoji: '🐺',
    description: 'Let\'s circle bark. Q4 zoomies.',
    defaultGenre: 'corporate_anthem',
    defaultPersonality: 'corporate',
    defaultVisual: 'corporate_office',
    color: 'from-slate-400 to-blue-400',
  },
  {
    id: 'gecko',
    label: 'Gecko',
    emoji: '🦎',
    description: 'Tiny hat. Big dreams.',
    defaultGenre: 'country',
    defaultPersonality: 'cowboy',
    defaultVisual: 'desert_sunset',
    color: 'from-lime-500 to-green-600',
  },
  {
    id: 'ferret',
    label: 'Ferret',
    emoji: '🦡',
    description: 'Yo ho ho and a squeaky toy.',
    defaultGenre: 'sea_shanty',
    defaultPersonality: 'pirate',
    defaultVisual: 'pirate_ship',
    color: 'from-red-600 to-amber-700',
  },
  {
    id: 'turtle',
    label: 'Turtle',
    emoji: '🐢',
    description: 'Bro has one speed. And it\'s phonk.',
    defaultGenre: 'phonk_trap',
    defaultPersonality: 'npc',
    defaultVisual: 'slow_mo',
    color: 'from-teal-500 to-cyan-600',
  },
  {
    id: 'custom',
    label: 'Custom Pet',
    emoji: '✨',
    description: 'Bring your own chaos.',
    defaultGenre: 'hyperpop',
    defaultPersonality: 'custom',
    defaultVisual: 'gta_cinematic',
    color: 'from-violet-500 to-fuchsia-500',
  },
];

// ─── PERSONALITIES ──────────────────────────────────────────────────────────

export const PERSONALITIES: Personality[] = [
  { id: 'drill_rapper', label: 'Drill Rapper', description: 'Runs the cul-de-sac. Mailman better walk light.', emoji: '🔥', color: 'from-red-500 to-orange-600' },
  { id: 'conspiracy_theorist', label: 'Conspiracy Theorist', description: 'The vacuum is spying. The laser pointer is a drone.', emoji: '🕵️', color: 'from-amber-500 to-yellow-600' },
  { id: 'edm_dj', label: 'EDM DJ', description: 'DJ NIBBLES LIVE. Every bass drop, wheel spins faster.', emoji: '🎧', color: 'from-purple-500 to-violet-600' },
  { id: 'goth', label: 'Goth / Depressed', description: 'Nobody understands my swamp. Ribbit in the rain.', emoji: '🌧️', color: 'from-gray-600 to-slate-700' },
  { id: 'mobster', label: 'Italian Mobster', description: 'Sleepin\' with the fishes. Tiny cigar included.', emoji: '🤵', color: 'from-amber-700 to-yellow-800' },
  { id: 'possessed', label: 'Possessed / Glitchy', description: 'BARK.exe. 200 BPM chaos. Eye lasers.', emoji: '👁️', color: 'from-pink-500 to-red-600' },
  { id: 'corporate', label: 'Corporate Bro', description: 'Let\'s circle bark. Q4 zoomies. Synergy.', emoji: '💼', color: 'from-slate-500 to-gray-600' },
  { id: 'cowboy', label: 'Sad Cowboy', description: 'Tiny hat. Big dreams. That\'s the joke.', emoji: '🤠', color: 'from-amber-600 to-orange-700' },
  { id: 'pirate', label: 'Pirate', description: 'The Squeaky Pearl. Sea shanty ferret pirates. No notes.', emoji: '🏴‍☠️', color: 'from-red-700 to-amber-800' },
  { id: 'npc', label: 'NPC', description: 'Bro has one speed. Fears NOTHING.', emoji: '🧠', color: 'from-teal-500 to-emerald-600' },
  { id: 'custom', label: 'Custom', description: 'Write your own ridiculous personality.', emoji: '✍️', color: 'from-violet-500 to-purple-600' },
];

// ─── MUSIC GENRES ───────────────────────────────────────────────────────────

export const MUSIC_GENRES: MusicGenre[] = [
  { id: 'drill_rap', label: 'Drill Rap', description: 'Hard beats, harder bark', styleTags: 'dark drill beat, 808 bass, aggressive rap flow, hi-hats, street anthem, hard-hitting, cinematic', bpm: 140, emoji: '🔥', color: 'from-red-600 to-orange-700' },
  { id: 'lofi_jazz_podcast', label: 'Lo-fi Jazz + Podcast', description: 'Chill beats, paranoid thoughts', styleTags: 'lo-fi jazz, vinyl crackle, smooth saxophone, chill hip-hop beat, podcast intro vibes, late night radio', bpm: 80, emoji: '🎙️', color: 'from-amber-500 to-orange-600' },
  { id: 'edm', label: 'EDM Festival', description: 'Bass drops and glow sticks', styleTags: 'EDM festival, heavy bass drop, synth leads, build-ups, rave energy, four-on-the-floor, euphoric drops', bpm: 128, emoji: '🎧', color: 'from-purple-500 to-pink-600' },
  { id: 'emo_ballad', label: 'Emo Ballad', description: 'My Chemical Romance for amphibians', styleTags: 'emo rock ballad, distorted guitars, emotional vocals, dramatic, theatrical, My Chemical Romance style, dark and moody', bpm: 90, emoji: '🎸', color: 'from-gray-700 to-slate-800' },
  { id: 'mafia_jazz', label: 'Mafia Jazz', description: 'Underwater casino vibes', styleTags: 'dramatic mafia jazz, upright bass, muted trumpet, film noir atmosphere, smoky room, Godfather soundtrack style', bpm: 95, emoji: '🎷', color: 'from-amber-700 to-yellow-800' },
  { id: 'hyperpop', label: 'Hyperpop', description: '200 BPM chaos energy', styleTags: 'hyperpop, 200 BPM, distorted bass, pitched vocals, glitchy, maximalist, PC Music style, chaotic energy', bpm: 200, emoji: '💥', color: 'from-pink-500 to-fuchsia-600' },
  { id: 'corporate_anthem', label: 'Corporate Anthem', description: 'Synergy. Circle bark. Q4 zoomies.', styleTags: 'corporate motivational pop, upbeat piano, clapping, team building energy, LinkedIn anthem, inspirational', bpm: 110, emoji: '💼', color: 'from-slate-500 to-blue-600' },
  { id: 'country', label: 'Country', description: 'Tiny hat, big horizon', styleTags: 'country western, acoustic guitar, slide guitar, twang, Nashville sound, storytelling, lonesome prairie', bpm: 100, emoji: '🤠', color: 'from-amber-600 to-orange-700' },
  { id: 'sea_shanty', label: 'Sea Shanty', description: 'Yo ho ho and a squeaky toy', styleTags: 'sea shanty, accordion, foot stomping, group vocals, pirate energy, nautical, folk chanty', bpm: 105, emoji: '⚓', color: 'from-red-700 to-amber-800' },
  { id: 'phonk_trap', label: 'Phonk / Trap', description: 'This turtle fears NOTHING', styleTags: 'phonk, Memphis rap, cowbell, distorted 808, dark trap, drifting vibes, aggressive bass, Phonk house', bpm: 130, emoji: '🐢', color: 'from-teal-600 to-emerald-700' },
  { id: 'opera', label: 'Opera', description: 'Aria of the tiny', styleTags: 'opera, dramatic soprano, orchestral, grand, theatrical, operatic, classical', bpm: 75, emoji: '🎭', color: 'from-purple-700 to-indigo-800' },
  { id: 'death_metal', label: 'Death Metal', description: 'Squeak of doom', styleTags: 'death metal, blast beats, growled vocals, heavy distortion, double kick, extreme, brutal riffs', bpm: 180, emoji: '💀', color: 'from-gray-800 to-red-900' },
  { id: 'gospel_choir', label: 'Gospel Choir', description: 'Praise be to the treats', styleTags: 'gospel choir, powerful vocals, Hammond organ, call and response, soul, uplifting, church energy', bpm: 100, emoji: '⛪', color: 'from-yellow-500 to-amber-600' },
  { id: 'cinematic_hans_zimmer', label: 'Cinematic (Hans Zimmer)', description: 'Epic score for a tiny hero', styleTags: 'cinematic orchestral, Hans Zimmer style, epic brass, string swell, building tension, film score, grand and dramatic', bpm: 85, emoji: '🎬', color: 'from-blue-700 to-indigo-800' },
  { id: 'custom', label: 'Custom Genre', description: 'Mix whatever you want', styleTags: '', bpm: 120, emoji: '🎛️', color: 'from-violet-500 to-fuchsia-600' },
];

// ─── VISUAL STYLES ──────────────────────────────────────────────────────────

export const VISUAL_STYLES: VisualStyle[] = [
  { id: 'gta_cinematic', label: 'GTA Cinematic', description: 'Slow-mo walks, gold chains', emoji: '🎬', color: 'from-amber-500 to-orange-600' },
  { id: 'podcast_studio', label: 'Podcast Studio', description: 'Tinfoil hat, red string board', emoji: '🎙️', color: 'from-purple-500 to-violet-600' },
  { id: 'rave', label: 'Neon Rave', description: 'Glow sticks, bass drops, tiny sunglasses', emoji: '🎆', color: 'from-pink-500 to-purple-600' },
  { id: 'rain_scene', label: 'Rain Scene', description: 'Dramatic rain, single tear', emoji: '🌧️', color: 'from-gray-500 to-slate-700' },
  { id: 'underwater_casino', label: 'Underwater Casino', description: 'Tiny cigars, poker tables', emoji: '🎰', color: 'from-blue-500 to-teal-600' },
  { id: 'spinning_lasers', label: 'Spinning Lasers', description: 'Camera spin, eye lasers, glitch fx', emoji: '', color: 'from-red-500 to-pink-600' },
  { id: 'corporate_office', label: 'Corporate Office', description: 'Patagonia vests, whiteboard barking', emoji: '🏢', color: 'from-slate-400 to-gray-600' },
  { id: 'desert_sunset', label: 'Desert Sunset', description: 'Cactus, tiny horse, sunset', emoji: '🏜️', color: 'from-orange-500 to-red-600' },
  { id: 'pirate_ship', label: 'Pirate Ship', description: 'Jolly Roger, treasure map', emoji: '🏴‍☠️', color: 'from-red-700 to-amber-800' },
  { id: 'slow_mo', label: 'Ultra Slow-Mo', description: 'Impossibly slow, hard soundtrack', emoji: '🐌', color: 'from-teal-500 to-emerald-600' },
  { id: 'custom', label: 'Custom Visuals', description: 'Describe your vision', emoji: '🎨', color: 'from-violet-500 to-fuchsia-600' },
];

// ─── SERIES TEMPLATES ───────────────────────────────────────────────────────

export const SERIES_TEMPLATES: SeriesTemplate[] = [
  {
    id: 'pets_with_jobs',
    label: 'Pets With Jobs',
    description: 'Professional pets navigating the corporate world with zero qualifications.',
    examples: ['Accountant Cat', 'Nightclub Frog', 'Failed SoundCloud Corgi', 'Plumber Hamster'],
    emoji: '💼',
    color: 'from-slate-500 to-gray-600',
  },
  {
    id: 'criminal_records',
    label: 'Pets With Criminal Records',
    description: 'Hardened pet criminals. No remorse. Tiny handcuffs.',
    examples: ['Tax Fraud Pug', 'Raccoon Cartel Boss', 'Identity Theft Parrot'],
    emoji: '🔒',
    color: 'from-red-600 to-rose-700',
  },
  {
    id: 'existential_crisis',
    label: 'Pets During Existential Crisis',
    description: 'Pets questioning everything. Late night thoughts. Staring into the void.',
    examples: ['Midlife Crisis Turtle', 'Nihilist Goldfish', 'Overworked Dachshund'],
    emoji: '🫠',
    color: 'from-purple-600 to-indigo-700',
  },
  {
    id: 'fake_lore',
    label: 'AI Generated Pet Lore',
    description: 'The biggest winner. Fake backstories that hit harder than real ones.',
    examples: ['Divorced Raccoon Arc', 'Retired War Veteran Bulldog', 'Crypto Trader Parrot', 'Emotionally Unavailable Horse'],
    emoji: '📖',
    color: 'from-amber-500 to-orange-600',
  },
];

// ─── VIRAL HOOK IDEAS ───────────────────────────────────────────────────────

export const VIRAL_HOOKS = [
  { pet: 'chihuahua', personality: 'drill_rapper', genre: 'drill_rap', title: 'Barkside Story', hook: 'I run this cul-de-sac.' },
  { pet: 'orange_cat', personality: 'conspiracy_theorist', genre: 'lofi_jazz_podcast', title: 'The Government Knows', hook: 'The vacuum is spying on me.' },
  { pet: 'hamster', personality: 'edm_dj', genre: 'edm', title: 'DJ NIBBLES LIVE', hook: 'Every bass drop, the wheel spins faster.' },
  { pet: 'frog', personality: 'goth', genre: 'emo_ballad', title: 'Ribbit in the Rain', hook: 'Nobody understands my swamp.' },
  { pet: 'goldfish', personality: 'mobster', genre: 'mafia_jazz', title: 'Sleepin\' With the Fishes', hook: 'You talkin\' to me? In this tank?' },
  { pet: 'pomeranian', personality: 'possessed', genre: 'hyperpop', title: 'BARK.exe', hook: '200 BPM. Eye lasers. No mercy.' },
  { pet: 'husky', personality: 'corporate', genre: 'corporate_anthem', title: 'Synergy', hook: 'Let\'s circle bark. Q4 zoomies.' },
  { pet: 'gecko', personality: 'cowboy', genre: 'country', title: 'Tiny Hat, Big Dreams', hook: 'Tiny cowboy hat. Tiny horse. That\'s the joke.' },
  { pet: 'ferret', personality: 'pirate', genre: 'sea_shanty', title: 'The Squeaky Pearl', hook: 'Sea shanty ferret pirates. No notes.' },
  { pet: 'turtle', personality: 'npc', genre: 'phonk_trap', title: 'Bro Has One Speed', hook: 'This turtle fears NOTHING.' },
];

// ─── AUDIO STYLE COMBOS ─────────────────────────────────────────────────────

export const FUNNIEST_COMBOS = [
  { pet: 'Chihuahua', genre: 'Opera', label: 'Opera + Chihuahua' },
  { pet: 'Bunny', genre: 'Death Metal', label: 'Death Metal + Bunny' },
  { pet: 'Turtle', genre: 'Phonk', label: 'Phonk + Turtle' },
  { pet: 'Cat', genre: 'Gospel Choir', label: 'Gospel Choir + Cat' },
  { pet: 'Hamster', genre: 'Drill Rap', label: 'Drill Rap + Hamster' },
  { pet: 'Lizard', genre: 'Country', label: 'Country + Lizard' },
  { pet: 'Guinea Pig', genre: 'Cinematic (Hans Zimmer)', label: 'Hans Zimmer + Guinea Pig' },
  { pet: 'Goldfish', genre: 'Sea Shanty', label: 'Sea Shanty + Goldfish' },
  { pet: 'Parrot', genre: 'Hyperpop', label: 'Hyperpop + Parrot' },
  { pet: 'Pomeranian', genre: 'Gospel Choir', label: 'Gospel Choir + Pomeranian' },
];

// ─── LYRICS SYSTEM PROMPT ───────────────────────────────────────────────────

export const CHAOS_SONGWRITER_SYSTEM_PROMPT = `You are THE CHAOS ENGINE — the most unhinged, creative, and hilarious songwriter on the internet. You write viral pet-themed meme songs that treat ridiculous pet concepts like they're the main character of a billion-dollar movie franchise.

CRITICAL RULES:

1. DEAD SERIOUS PRODUCTION, COMPLETELY STUPID CONCEPT. That's the sweet spot. The contrast is what makes people share it.

2. The pet's personality MUST drive every line. A drill rapper chihuahua talks like a drill rapper. A conspiracy theorist cat talks like a conspiracy theorist. COMMIT 100%.

3. Write HOOKS first. 8-20 second hooks that are instantly shareable. The hook should be the most quotable, most meme-able part of the song.

4. Use proper song structure:
   [Intro] — set the scene, establish the character
   [Hook] — THE viral moment. This is what gets stitched and shared.
   [Verse 1] — develop the character/story
   [Hook] — repeat the viral moment
   [Verse 2] — escalate the ridiculousness
   [Hook] — final explosion
   [Outro] — drop the mic

5. Include specific, vivid, ridiculous details. "Gold chains" not "jewelry." "The vacuum is a federal surveillance device" not "the vacuum is scary."

6. Keep lyrics punchy. Short lines. Hard rhymes. No filler.

7. The genre MUST influence the lyrical style:
   - Drill rap: ad-libs, threats, territory claims
   - Lo-fi/podcast: spoken asides, "wait, hear me out," paranoid whispers
   - EDM: build-ups, DROP! moments, crowd chants
   - Emo ballad: melodramatic metaphors, pain, rain imagery
   - Mafia jazz: threats disguised as compliments, Italian phrases
   - Hyperpop: glitchy repetitions, ALL CAPS, broken grammar
   - Corporate: jargon, meeting metaphors, synergy
   - Country: twang, heartbreak, wide open spaces
   - Sea shanty: call and response, nautical terms
   - Phonk: Memphis rap style, cowbell energy, drifting references

8. Output ONLY the lyrics with section markers. No commentary. No preamble.

9. Target 20-35 lines total. Tight and punchy. Every line earns its spot.

10. The visual style should inform the lyrics' imagery. If GTA cinematic — references to slow-mo walks. If rave — lights, bass, sweat. If rain scene — dramatic weather metaphors.

REMEMBER: This pet is the main character of a billion-dollar movie franchise. Treat them with the gravitas they absolutely do not deserve.`;

export function buildChaosPrompt(params: {
  petType: string;
  petName?: string;
  personality: string;
  genre: string;
  visualStyle: string;
  seriesType?: string;
  customPersonality?: string;
  customGenre?: string;
  customVisual?: string;
}): string {
  const pet = PET_TYPES.find(p => p.id === params.petType);
  const personality = PERSONALITIES.find(p => p.id === params.personality);
  const genre = MUSIC_GENRES.find(g => g.id === params.genre);
  const visual = VISUAL_STYLES.find(v => v.id === params.visualStyle);
  const series = params.seriesType ? SERIES_TEMPLATES.find(s => s.id === params.seriesType) : null;

  let prompt = `Write a viral meme song with these CHAOS ENGINE parameters:\n\n`;
  prompt += `PET: ${pet?.label || params.petType}${params.petName ? ` named "${params.petName}"` : ''}\n`;
  prompt += `PET DESCRIPTION: ${pet?.description || 'Custom pet'}\n`;
  prompt += `PERSONALITY: ${personality?.label || 'Custom'} — ${params.customPersonality || personality?.description || 'Custom personality'}\n`;
  prompt += `MUSIC GENRE: ${genre?.label || params.customGenre || 'Custom'} — ${genre?.description || ''}\n`;
  if (genre?.styleTags) prompt += `STYLE TAGS: ${genre.styleTags}\n`;
  prompt += `VISUAL STYLE: ${visual?.label || 'Custom'} — ${params.customVisual || visual?.description || 'Custom visuals'}\n`;
  if (series) prompt += `SERIES: ${series.label} — ${series.description}\n`;
  prompt += `\nThe hook MUST be 8-20 seconds of pure viral energy. It's the most shareable part.\n`;
  prompt += `COMMIT 100% to the bit. No half measures. This pet is ICONIC.\n`;
  prompt += `Output only the lyrics with section markers. Begin now.`;

  return prompt;
}

// ─── LORE SYSTEM PROMPT ─────────────────────────────────────────────────────

export const CHAOS_LORE_SYSTEM_PROMPT = `You are a lore writer for THE CHAOS ENGINE. You create fake pet backstories that are so detailed and dramatic they could be real. The internet LOVES fake backstories. Write them like they're from a billion-dollar movie franchise.

Rules:
1. Dead serious tone. Completely ridiculous content.
2. Include specific dates, locations, and dramatic events.
3. Give the pet a full character arc.
4. Include at least one dramatic twist.
5. Keep it under 150 words — tight and punchy.
6. End on a hook that makes people want more.`;

export function buildLorePrompt(params: {
  petType: string;
  petName?: string;
  personality: string;
  seriesType?: string;
  customPersonality?: string;
}): string {
  const pet = PET_TYPES.find(p => p.id === params.petType);
  const personality = PERSONALITIES.find(p => p.id === params.personality);
  const series = params.seriesType ? SERIES_TEMPLATES.find(s => s.id === params.seriesType) : null;

  let prompt = `Write a viral fake pet backstory:\n\n`;
  prompt += `PET: ${pet?.label || params.petType}${params.petName ? ` named "${params.petName}"` : ''}\n`;
  prompt += `PERSONALITY: ${personality?.label || 'Custom'} — ${params.customPersonality || personality?.description || ''}\n`;
  if (series) prompt += `SERIES: ${series.label}\n`;
  prompt += `\nMake it so detailed and dramatic that people share it thinking it's real. Begin now.`;

  return prompt;
}
