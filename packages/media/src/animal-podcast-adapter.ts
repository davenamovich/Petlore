// ─────────────────────────────────────────────────────────────────────────────
// PETLORE — Animal Podcast Skill Adapter
// Bridges Petlore's Clip/Episode format → animal-podcast SKILL.md pipeline
// Skill source: .claude/skills/animal-podcast/SKILL.md (v0.5.1)
// ─────────────────────────────────────────────────────────────────────────────

import type { Clip, CharacterBible, Episode } from '@petlore/types';

// ─── ANIMAL PODCAST SCRIPT FORMAT ────────────────────────────────────────────

export type AnimalPodcastCharacter = {
  name: string;          // e.g. "Biscuit", "Sir Barksalot"
  animal: string;        // e.g. "golden retriever", "corgi"
  personality: string;   // e.g. "overconfident CEO, talks in business jargon"
  catchphrase: string;   // e.g. "Let's circle back on that"
  style: string;         // for image gen: e.g. "smug, tailored suit, tiny AirPods"
};

export type AnimalPodcastScene = {
  sceneId: string;
  title: string;
  lines: AnimalPodcastLine[];
};

export type AnimalPodcastLine = {
  speaker: string;
  dialogue: string;
  visualDescription: string;  // English, for Seedream image gen
  estimatedDuration: number;  // seconds
  sfx?: 'laughter' | 'surprise' | 'applause' | 'awkward_silence';
};

export type AnimalPodcastScript = {
  projectName: string;
  topic: string;
  animalPairing: string;
  targetDuration: string;    // e.g. "30-39 seconds"
  aspectRatio: '9:16' | '16:9';
  characters: AnimalPodcastCharacter[];
  scenes: AnimalPodcastScene[];
};

// ─── CONVERTER: Petlore Clip → Animal Podcast Script ─────────────────────────

/**
 * Convert a Petlore Clip JSON into the animal-podcast SKILL.md script format.
 * This feeds directly into Stage 2 (Comedy Script) of the skill pipeline.
 */
export function clipToAnimalPodcastScript(
  clip: Clip,
  bible: CharacterBible,
  cohost?: { name: string; animal: string; personality: string }
): AnimalPodcastScript {
  const mainChar: AnimalPodcastCharacter = {
    name: bible.hostName,
    animal: 'dog', // resolved from pet profile at runtime
    personality: bible.showPersona,
    catchphrase: bible.catchphrases[0] ?? 'Let me tell you something...',
    style: bible.visualStyle,
  };

  const cohostChar: AnimalPodcastCharacter = cohost
    ? {
        name: cohost.name,
        animal: cohost.animal,
        personality: cohost.personality,
        catchphrase: 'Interesting...',
        style: 'skeptical, small glasses, notepad',
      }
    : {
        name: 'Producer',
        animal: 'cat',
        personality: 'deadpan, unimpressed, secretly loves the show',
        catchphrase: "That's a stretch.",
        style: 'bored expression, coffee mug, headphones around neck',
      };

  // Build 3 scenes from the clip structure: opening, punchline, closing
  const scenes: AnimalPodcastScene[] = [
    {
      sceneId: 'opening',
      title: 'The Hook',
      lines: [
        {
          speaker: mainChar.name,
          dialogue: clip.hook,
          visualDescription: `A ${mainChar.animal} named ${mainChar.name} sits at a podcast mic, leaning forward with an urgent expression. ${mainChar.style}. Podcast studio, cartoon style, ${clip.jsonScene.aspect_ratio}.`,
          estimatedDuration: 5,
        },
        {
          speaker: cohostChar.name,
          dialogue: clip.setup,
          visualDescription: `A ${cohostChar.animal} looking skeptical and slightly bored, adjusting mic. ${cohostChar.style}. Same studio, ${clip.jsonScene.aspect_ratio}.`,
          estimatedDuration: 6,
          sfx: 'surprise',
        },
      ],
    },
    {
      sceneId: 'punchline',
      title: 'The Take',
      lines: [
        {
          speaker: mainChar.name,
          dialogue: clip.petTake,
          visualDescription: `${mainChar.name} gesturing dramatically, very animated, floating text bubbles with keywords. ${clip.jsonScene.aspect_ratio}.`,
          estimatedDuration: 8,
        },
        {
          speaker: cohostChar.name,
          dialogue: clip.punchline,
          visualDescription: `${cohostChar.name} face-palming or doing a slow clap. ${clip.jsonScene.aspect_ratio}.`,
          estimatedDuration: 7,
          sfx: 'laughter',
        },
      ],
    },
    {
      sceneId: 'closing',
      title: 'The CTA',
      lines: [
        {
          speaker: mainChar.name,
          dialogue: clip.callToAction,
          visualDescription: `Both characters wave at camera, ${mainChar.name} enthusiastically, ${cohostChar.name} lazily. "FOLLOW FOR MORE" text overlay. ${clip.jsonScene.aspect_ratio}.`,
          estimatedDuration: 4,
          sfx: 'applause',
        },
      ],
    },
  ];

  return {
    projectName: `${bible.hostName.toLowerCase().replace(/\s+/g, '_')}_ep_${clip.id.slice(0, 6)}`,
    topic: clip.topicSource?.summary ?? clip.title,
    animalPairing: `${mainChar.animal} + ${cohostChar.animal}`,
    targetDuration: '30-39 seconds',
    aspectRatio: (clip.aspectRatio as '9:16' | '16:9') ?? '9:16',
    characters: [mainChar, cohostChar],
    scenes,
  };
}

// ─── RENDERER: Script → SKILL.md Markdown Format ─────────────────────────────

/**
 * Render an AnimalPodcastScript to the exact .md format expected by
 * the animal-podcast skill's validate_script.py and video pipeline.
 */
export function renderScriptMarkdown(script: AnimalPodcastScript): string {
  const sfxMap: Record<string, string> = {
    laughter: 'Laughter',
    surprise: 'Surprise',
    applause: 'Applause',
    awkward_silence: 'Awkward Silence',
  };

  const header = [
    `# Animal Podcast Script`,
    ``,
    `Topic: ${script.topic}`,
    `Animal Pairing: ${script.animalPairing}`,
    `Target Duration: ${script.targetDuration}`,
    `Aspect Ratio: ${script.aspectRatio}`,
    ``,
    `Characters:`,
    ...script.characters.map(
      c => `- ${c.name} (${c.animal}): ${c.personality} — catchphrase: "${c.catchphrase}"`
    ),
    ``,
    `---`,
    ``,
  ].join('\n');

  const sceneMd = script.scenes
    .map(scene => {
      const lines = scene.lines
        .map(line => {
          const sfxLine = line.sfx ? `\n**SFX:** ${sfxMap[line.sfx]}` : '';
          return [
            `**${line.speaker}:**`,
            line.dialogue,
            ``,
            `**Visual Description:**`,
            line.visualDescription,
            ``,
            `**Estimated Duration:** ${line.estimatedDuration}s${sfxLine}`,
          ].join('\n');
        })
        .join('\n\n---\n\n');

      return `## [SCENE:${scene.sceneId}] ${scene.title}\n\n${lines}`;
    })
    .join('\n\n---\n\n');

  return header + sceneMd;
}

// ─── CONVERTER: Episode → Multi-Clip Batch ───────────────────────────────────

/**
 * Split a full episode into individual animal-podcast project configs.
 * Each clip suggestion becomes a separate 30s video project.
 */
export function episodeToClipBatch(
  episode: Episode,
  clips: Clip[],
  bible: CharacterBible
): Array<{ script: AnimalPodcastScript; markdown: string }> {
  return clips
    .filter(c => c.episodeId === episode.id)
    .slice(0, 8) // max 8 clips per episode
    .map(clip => {
      const script = clipToAnimalPodcastScript(clip, bible);
      return { script, markdown: renderScriptMarkdown(script) };
    });
}

// ─── TIMELINE BUILDER ────────────────────────────────────────────────────────

/**
 * Build the timeline.json expected by the animal-podcast skill's Stage 4.
 */
export function buildTimeline(
  projectName: string,
  clip1Lines: string[],
  clip2Lines: string[]
) {
  return {
    audio_mode: 'seedance_builtin',
    project: projectName,
    clips: [
      {
        clip_id: 'clip_01',
        video_path: `videos/clip_01.mp4`,
        duration: 15,
        start_time: 0,
        end_time: 15,
        lines: clip1Lines,
      },
      {
        clip_id: 'clip_02',
        video_path: `videos/clip_02.mp4`,
        duration: 15,
        start_time: 15,
        end_time: 30,
        lines: clip2Lines,
      },
    ],
    total_duration: 30,
  };
}
