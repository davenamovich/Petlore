# 🎙️ PETLORE PODCAST AGENCY

> **"Turn your pet into the host of their own podcast."**

The Internet's First Pet Podcast Agency — AI-powered cartoon pet hosts, Reddit-sourced topics, agent-written clips, and a full vet newsletter system.

---

## What's Built

### Landing Page (`src/app/page.tsx`)
Full interactive landing page with 4 views:
- **Landing** — Hero, How It Works, 7 example shows, clip preview, agency pitch, vet teaser, email CTA
- **Create** — Pet upload UI, name input, 12-format selector, character bible preview
- **Clip Browser** — All 10 demo clips with full JSON scene data, tabbed by host
- **Vet** — Vet Newsletter OS explainer with sample newsletter output

### Packages

| Package | Contents |
|---|---|
| `packages/types` | All shared TS types: PetProfile, CharacterBible, PodcastShow, Episode, Clip, ContentSource, ScrapeResult, VetClinic, VetNewsletter + enums |
| `packages/prompts` | System prompts for: character creation, show concept, episode writing, clip writing, long-form episodes, promotion, captions, thumbnails, vet newsletter |
| `packages/agents` | 9 agent definitions: PetCharacter, Research, PodcastWriter, Clip, Voice, Video, Promotion, Showrunner, VetNewsletter |
| `packages/scrapers` | Tinyfish.ai enrichment, Agent-Reach Reddit scraper, clip potential scorer, emotional trigger detector, subreddit presets by show format |
| `packages/media` | Clip JSON builder, cartoon style presets, audio direction builder, **animal-podcast adapter** (Petlore Clip → SKILL.md script) |

### Apps

| App | Contents |
|---|---|
| `apps/studio` | Creator dashboard scaffold — route map for all future pages |
| `apps/worker` | 14 background job definitions with dependency graph and full episode pipeline order |

### Database (`prisma/schema.prisma`)
12 models: ChaosSong (legacy), PetProfile, CharacterBible, PodcastShow, Episode, Clip, ContentSource, PromotionPlan, GeneratedAsset, AgentRun, VetClinic, VetNewsletter

### Demo Data (`src/lib/demo-data.ts`)
- **7 example shows**: Barks & Takes, The Neighborhood Sniff, Paws & Problems, The Daily Biscuit, Unleashed With Sir Barksalot, Cat Court, The Squirrel Files
- **10 full clip JSONs**: Complete scene data with hooks, setups, pet takes, punchlines, captions, hashtags, scene/camera/audio direction
- **12 podcast formats**
- **2 vet newsletter samples**

---

## Animal Podcast Skill (v0.5.1)

Installed at `.claude/skills/animal-podcast/` — the full Seedance 2.0 video pipeline.

**Integration in `packages/media/src/animal-podcast-adapter.ts`:**
- `clipToAnimalPodcastScript()` — converts Petlore Clip JSON → SKILL.md script format
- `renderScriptMarkdown()` — renders to the exact `.md` format validate_script.py expects
- `episodeToClipBatch()` — splits a full episode into up to 8 video projects
- `buildTimeline()` — builds the `timeline.json` for Stage 4 video generation

**Worker pipeline integration** — `generate.animal_podcast_script` and `generate.video_clip` jobs wire directly into the skill's Stage 2–4 pipeline.

---

## Next Steps (to build)

1. **Real photo upload** → Cloudflare R2 or Vercel Blob storage
2. **Character generation** → LLM call using `packages/prompts/character.ts` + Seedream for cartoon avatar
3. **Reddit scraping** → Wire `packages/scrapers` to live Tinyfish + Agent-Reach APIs
4. **Episode writer** → Connect `packages/prompts/podcast.ts` to an LLM API route
5. **Clip pipeline** → Trigger `generate.animal_podcast_script` job → run animal-podcast skill
6. **Studio dashboard** → Build out `apps/studio` routes
7. **Vet newsletter signup** → Auth + VetClinic onboarding flow
8. **Payments** → Stripe for Studio ($29/mo), Vet OS ($99/mo), Agency ($299/mo)

---

## Taglines

- *"Your Pet Has Takes."*
- *"Cartoon Pets. Real Podcasts. Viral Clips."*
- *"Upload Your Pet. Launch Their Show."*
- *"Your pet already has a personality. Now give them a microphone."*
