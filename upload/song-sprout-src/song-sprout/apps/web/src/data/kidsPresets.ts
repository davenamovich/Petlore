// data/kidsPresets.ts
// Preset library for the Kids Studio name-personalized song generator.
// Drop into ace-step-ui/data/

export type KidsSongType = {
  id: string;
  label: string;
  description: string;
  styleTags: string;
  defaultBPM: number;
  ageRange: string; // e.g., "0-3", "3-7", "5-10"
  occasion: 'sleep' | 'play' | 'learning' | 'celebration';
  lyricsTemplate: (params: NamedSongParams) => string;
};

export type NamedSongParams = {
  name: string;             // child's first name
  age?: number;             // optional, used for celebration songs
  interests?: string[];     // e.g., ["dinosaurs", "drawing"]
  petName?: string;
  bedtimeWord?: string;     // optional bedtime trigger word ("sleep tight", "goodnight")
};

// ──────────────────────────────────────────────────────────────────────────────
// PHONETIC NAME HANDLING
// ──────────────────────────────────────────────────────────────────────────────
// ACE-Step's vocal model can mispronounce unusual names. Strategy:
//
// 1. Place names at LINE ENDS rather than mid-line — easier for the model to handle
// 2. Surround names with simple, common phonemes (e.g., "oh, NAME" or "sweet NAME")
// 3. For names with unusual letter clusters, provide a phonetic spelling option
//
// `phoneticize` is a best-effort respelling — the user can override in the UI.
// Common patterns:
//   silent letters → drop them (Knight → Nite)
//   ph → f (Phoebe → Feebee — but better to keep "Phoebe" and rely on vocal model)
//   uncommon clusters → space them
//
// In practice we expose BOTH the original name (for display in titles/lyrics) and
// the phonetic version (for the vocal model). The user can edit the phonetic spelling
// before generation if the test render sounds wrong.

export function suggestPhonetic(name: string): string {
  if (!name) return '';
  let p = name.trim();

  // Common silent-letter patterns at name starts
  p = p.replace(/^Kn/i, 'N');           // Knight → Night
  p = p.replace(/^Wr/i, 'R');           // Wren → Ren
  p = p.replace(/^Gn/i, 'N');           // Gnomon → Nomon
  p = p.replace(/^Ps/i, 'S');           // Psalm → Salm

  // "ough" is brutal for vocal models
  p = p.replace(/ough$/i, 'oh');        // Slough → Sloh
  p = p.replace(/aughn/i, 'awn');       // Vaughn → Vawn

  // ph → f for clarity (only if the user wants this — many "Ph" names are fine)
  // Leave Phoebe, Philip, etc. alone. This is a soft suggestion.

  // Double vowels can read flat — split if at name end
  // "Lee" stays Lee. "Tee" stays Tee. We don't touch these.

  return p;
}

// Check if a name is likely to render well without intervention
export function nameConfidence(name: string): 'high' | 'medium' | 'low' {
  if (!name) return 'high';
  const lower = name.toLowerCase();

  // High-confidence patterns: short, common-phoneme names
  if (/^[a-z]{2,6}$/.test(lower) && !/^(kn|wr|gn|ps|xz|qx)/.test(lower)) {
    return 'high';
  }

  // Low-confidence: tricky clusters or silent letters
  if (/^(kn|wr|gn|ps)|ough|aughn|tch$/.test(lower) ||
      /[xz]{2}|[qx][a-z]/.test(lower) ||
      lower.length > 10) {
    return 'low';
  }

  return 'medium';
}

// ──────────────────────────────────────────────────────────────────────────────
// SONG TYPES
// ──────────────────────────────────────────────────────────────────────────────

export const KIDS_SONG_TYPES: KidsSongType[] = [
  {
    id: 'lullaby_starry',
    label: 'Starry night lullaby',
    description: 'Gentle piano lullaby for sleep. Ages 0-5.',
    styleTags: 'gentle children\'s lullaby, soft piano, warm female vocal, slow tempo, dreamy reverb, calming and tender, twinkling bells, perfect for bedtime',
    defaultBPM: 60,
    ageRange: '0-5',
    occasion: 'sleep',
    lyricsTemplate: ({ name }) => {
      const bedName = name.toUpperCase();
      return `[Verse 1]
Twinkle little star above
Watching over ${name} with love
Close your eyes and softly sigh
Stars are dancing in the sky

[Chorus]
Sleep tight ${name}, sleep tight
Sleep tight ${name}, goodnight
Dreams of moonbeams pure and bright
${bedName}, sleep tight

[Verse 2]
Cozy blankets soft and warm
Safe from any little storm
Mama loves you, papa too
Every star is loving you

[Chorus]
Sleep tight ${name}, sleep tight
Sleep tight ${name}, goodnight
Dreams of moonbeams pure and bright
${bedName}, sleep tight

[Outro]
Goodnight ${name}, goodnight`;
    },
  },

  {
    id: 'lullaby_ocean',
    label: 'Ocean wave lullaby',
    description: 'Soft acoustic guitar with gentle ocean sounds. Ages 0-7.',
    styleTags: 'soft acoustic guitar lullaby, warm female vocal, distant ocean waves, fingerpicked guitar, gentle and soothing, slow tempo, intimate close mic',
    defaultBPM: 55,
    ageRange: '0-7',
    occasion: 'sleep',
    lyricsTemplate: ({ name }) => `[Verse 1]
Hush now ${name}, the day is done
Sun is sleeping, gone the run
Waves are humming low and slow
Time for little ones to go

[Chorus]
Sweet ${name}, sweet ${name}
Drift away on dreams of blue
Sweet ${name}, sweet ${name}
The whole world is hushed for you

[Verse 2]
Soft sand beaches, gentle shore
Sea is whispering once more
Cuddle in your cozy bed
Pillow soft beneath your head

[Chorus]
Sweet ${name}, sweet ${name}
Drift away on dreams of blue
Sweet ${name}, sweet ${name}
The whole world is hushed for you`,
  },

  {
    id: 'birthday',
    label: 'Birthday celebration',
    description: 'Upbeat birthday song with name and age. Ages 2-12.',
    styleTags: 'upbeat children\'s birthday song, cheerful acoustic pop, kids choir backing vocals, ukulele and clapping, joyful and bright, party energy, sing-along chorus',
    defaultBPM: 110,
    ageRange: '2-12',
    occasion: 'celebration',
    lyricsTemplate: ({ name, age }) => `[Verse 1]
Today's a special day for ${name}
Everybody sing the same
${age ? `Turning ${age} is so much fun` : 'Another year of running free'}
${name}, you're our shining one

[Chorus]
Happy birthday ${name}!
Happy birthday ${name}!
Make a wish and blow the candles bright
${name}, this is your night!

[Verse 2]
Friends and family gathered round
Cake and presents to be found
Dancing, laughing, having fun
${name}, today you are the one

[Chorus]
Happy birthday ${name}!
Happy birthday ${name}!
Make a wish and blow the candles bright
${name}, this is your night!

[Outro]
Hip hip hooray for ${name}!`,
  },

  {
    id: 'good_morning',
    label: 'Good morning song',
    description: 'Cheerful wake-up song. Ages 2-7.',
    styleTags: 'cheerful children\'s morning song, bright acoustic guitar, sunny vocal, ukulele, hand drums, happy and energetic, mid-tempo, family-friendly',
    defaultBPM: 105,
    ageRange: '2-7',
    occasion: 'play',
    lyricsTemplate: ({ name }) => `[Verse 1]
Good morning ${name}, rise and shine
The sun is up, you're feeling fine
Stretch your arms and tap your toes
Where the day will go, nobody knows

[Chorus]
Good morning, good morning, ${name}!
Good morning, good morning, ${name}!
A brand new day is here to play
${name}, hooray, hooray!

[Verse 2]
Birds are singing in the trees
Wind is whispering through the leaves
Breakfast waiting on your plate
${name}, the day will not wait

[Chorus]
Good morning, good morning, ${name}!
Good morning, good morning, ${name}!
A brand new day is here to play
${name}, hooray, hooray!`,
  },

  {
    id: 'brushing_teeth',
    label: 'Brushing teeth song',
    description: 'Routine helper for toothbrushing. 2 minutes. Ages 2-6.',
    styleTags: 'fun children\'s routine song, bouncy ukulele, playful kid vocal, light percussion, repetitive and catchy, mid-tempo, educational, sing-along',
    defaultBPM: 100,
    ageRange: '2-6',
    occasion: 'learning',
    lyricsTemplate: ({ name }) => `[Verse 1]
${name}, ${name}, time to brush
No need to rush, no need to rush
Up and down and side to side
Front teeth, back teeth, smile so wide

[Chorus]
Brush brush brush with ${name}
Brush brush brush with ${name}
Sparkly clean from front to back
${name}'s teeth are on the right track

[Verse 2]
Top teeth, bottom teeth, in between
${name} has the brightest grin you've seen
Spit and rinse and look around
${name}'s smile is the best in town

[Chorus]
Brush brush brush with ${name}
Brush brush brush with ${name}
Sparkly clean from front to back
${name}'s teeth are on the right track`,
  },

  {
    id: 'abcs_with_name',
    label: 'Personalized ABCs',
    description: 'Classic alphabet song with name shoutout. Ages 2-5.',
    styleTags: 'classic children\'s alphabet song, simple piano melody, gentle female vocal, traditional and timeless, mid-tempo, educational, clear pronunciation',
    defaultBPM: 90,
    ageRange: '2-5',
    occasion: 'learning',
    lyricsTemplate: ({ name }) => `[Intro]
${name}, it's time to learn your ABCs
Sing along with me

[Verse 1]
A B C D E F G
${name} can sing them all with me
H I J K L M N O P
${name} you're smart as you can be

[Bridge]
Q R S, T U V
W X Y and Z

[Chorus]
Now ${name} knows the ABCs
Next time won't you sing with me
Now ${name} knows the ABCs
${name}'s the smartest, yes indeed`,
  },

  {
    id: 'superhero',
    label: 'Superhero anthem',
    description: 'Confidence-building hero song. Ages 3-9.',
    styleTags: 'epic children\'s pop anthem, big drums, soaring synth, kids choir chorus, triumphant and empowering, mid-tempo, cinematic energy, family-friendly',
    defaultBPM: 120,
    ageRange: '3-9',
    occasion: 'play',
    lyricsTemplate: ({ name }) => `[Verse 1]
${name} is brave, ${name} is strong
${name} has known it all along
Heart of gold and head held high
${name} can touch the sky

[Pre-Chorus]
Watch out world, here comes ${name}
${name} is the shining one

[Chorus]
${name}! ${name}!
Hero of the day
${name}! ${name}!
Nothing in the way

[Verse 2]
When the day feels hard and gray
${name} finds another way
Kindness is ${name}'s superpower
${name} grows stronger every hour

[Chorus]
${name}! ${name}!
Hero of the day
${name}! ${name}!
Nothing in the way`,
  },

  {
    id: 'pet_friend',
    label: 'My pet and me',
    description: 'Song about a child and their pet. Ages 3-8.',
    styleTags: 'warm acoustic children\'s song, fingerpicked guitar, gentle female vocal, light percussion, sweet and heartfelt, mid-tempo, story-song style',
    defaultBPM: 95,
    ageRange: '3-8',
    occasion: 'play',
    lyricsTemplate: ({ name, petName }) => {
      const pet = petName || 'Buddy';
      return `[Verse 1]
${name} has a friend called ${pet}
The best friend you can get
${pet} runs and ${pet} plays
${name} and ${pet} every day

[Chorus]
${name} and ${pet}, ${name} and ${pet}
Two of a kind, a perfect set
Through the seasons, rain or shine
${name} and ${pet}, friends for all time

[Verse 2]
${pet} loves ${name} more than treats
Best of buddies, can't be beat
When ${name} smiles, ${pet} does too
${name} and ${pet}, a special crew

[Chorus]
${name} and ${pet}, ${name} and ${pet}
Two of a kind, a perfect set
Through the seasons, rain or shine
${name} and ${pet}, friends for all time`;
    },
  },

  {
    id: 'counting_song',
    label: 'Counting with name',
    description: 'Count 1-10 with personalization. Ages 2-5.',
    styleTags: 'playful children\'s counting song, bouncy piano, ukulele, kids backing vocals, educational and fun, mid-tempo, clear enunciation, sing-along',
    defaultBPM: 100,
    ageRange: '2-5',
    occasion: 'learning',
    lyricsTemplate: ({ name }) => `[Intro]
${name}, can you count with me?
Let's go!

[Verse 1]
One little finger, ${name} can count
Two little fingers, on and on
Three, four, five, the high five hand
${name} can count across the land

[Chorus]
${name}, ${name}, one two three
${name}, ${name}, four five six
Seven, eight, nine, and ten
${name} can count it all again

[Verse 2]
Six little jumping ${name} can do
Seven little hops and skips on cue
Eight, nine, ten, we're at the end
${name} is the counting champ, my friend

[Chorus]
${name}, ${name}, one two three
${name}, ${name}, four five six
Seven, eight, nine, and ten
${name} can count it all again`,
  },

  {
    id: 'dance_party',
    label: 'Dance party song',
    description: 'High-energy kids dance song. Ages 3-9.',
    styleTags: 'upbeat children\'s dance pop, four-on-the-floor kick drum, bouncy synth bass, claps, kids choir, joyful and high-energy, danceable, sing-along chorus',
    defaultBPM: 125,
    ageRange: '3-9',
    occasion: 'play',
    lyricsTemplate: ({ name }) => `[Verse 1]
Everybody clap your hands for ${name}!
Everybody stomp your feet for ${name}!
Spin around and shake it out
${name} knows what it's all about

[Chorus]
Dance dance dance with ${name}!
Dance dance dance with ${name}!
Move your body, let it go
${name}'s the star of the show

[Verse 2]
Jump up high and touch the sky
${name} can fly, oh me oh my
Wiggle, jiggle, do the shake
${name} is the move you make

[Chorus]
Dance dance dance with ${name}!
Dance dance dance with ${name}!
Move your body, let it go
${name}'s the star of the show

[Outro]
Go ${name}! Go ${name}! Go go go!`,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// THEMES (color/emotion modifiers layered on top of song type)
// ──────────────────────────────────────────────────────────────────────────────

export const THEMES = [
  { id: 'classic', label: 'Classic', tag: '' },
  { id: 'animals', label: 'Animal friends', tag: ', with mentions of forest animals like rabbits, foxes, and owls' },
  { id: 'space', label: 'Space and stars', tag: ', with imagery of planets, rockets, and constellations' },
  { id: 'ocean', label: 'Ocean and sea', tag: ', with imagery of waves, fish, and seashells' },
  { id: 'dinosaurs', label: 'Dinosaurs', tag: ', with mentions of friendly dinosaurs like T-Rex and Triceratops' },
  { id: 'princess', label: 'Princess and castle', tag: ', with imagery of castles, crowns, and magic' },
  { id: 'sports', label: 'Sports and games', tag: ', with imagery of balls, running, and winning together' },
  { id: 'art', label: 'Art and colors', tag: ', with imagery of crayons, painting, and rainbows' },
];

// ──────────────────────────────────────────────────────────────────────────────
// VOICE PRESETS (vocal style hints to ACE-Step)
// ──────────────────────────────────────────────────────────────────────────────

export const VOICE_PRESETS = [
  { id: 'warm_female', label: 'Warm female (mom voice)', tag: 'warm gentle female vocal, motherly tone' },
  { id: 'bright_female', label: 'Bright female (teacher)', tag: 'bright clear female vocal, friendly teacher tone' },
  { id: 'soft_male', label: 'Soft male (dad voice)', tag: 'soft warm male vocal, fatherly tone' },
  { id: 'kid_choir', label: 'Kids choir', tag: 'children\'s choir backing vocals, age-appropriate' },
  { id: 'cartoon_friendly', label: 'Cartoon friendly', tag: 'cheerful animated character vocal, expressive and playful' },
];

// ──────────────────────────────────────────────────────────────────────────────
// AGE-APPROPRIATE TEMPO + STYLE GUARDRAILS
// ──────────────────────────────────────────────────────────────────────────────

export function tempoForAge(ageYears: number): number {
  if (ageYears <= 2) return 60;   // very slow, lullaby pace
  if (ageYears <= 5) return 95;   // moderate sing-along
  if (ageYears <= 9) return 115;  // upbeat
  return 120;                     // older kids tolerate faster
}

// ──────────────────────────────────────────────────────────────────────────────
// BRACKETS — keep ACE-Step on-style for children's music
// ──────────────────────────────────────────────────────────────────────────────

export const KIDS_BOUNDARIES_OPEN = '[Children\'s Song] [Family-Friendly]';
export const KIDS_BOUNDARIES_CLOSE = '[Clear Vocals] [Age-Appropriate] [No Explicit Content]';
