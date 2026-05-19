// ─────────────────────────────────────────────────────────────────────────────
// PETLORE STUDIO — Creator Dashboard
// Next.js app for managing pet characters, shows, clips, and episodes.
// ─────────────────────────────────────────────────────────────────────────────
//
// ROUTES (to be built):
//
//   /                    → Studio home / pet selection
//   /pets/new            → Pet upload + character bible generation
//   /pets/[id]           → Pet profile + character bible view
//   /shows/new           → Show format selector
//   /shows/[id]          → Show dashboard (episodes, clips, stats)
//   /shows/[id]/research → Topic scraping interface (Reddit + Tinyfish)
//   /shows/[id]/episode/new → Episode generation flow
//   /episodes/[id]       → Full episode view + clip extraction
//   /clips/[id]          → Clip editor + animal-podcast pipeline trigger
//   /vet                 → Vet Newsletter OS dashboard
//   /vet/newsletters/new → Newsletter generation wizard
//
// ─────────────────────────────────────────────────────────────────────────────
//
// STACK:
//   - Next.js 15 (App Router)
//   - Tailwind CSS v4
//   - Prisma + SQLite (shared with /apps/web)
//   - Zustand for local state
//   - @tanstack/react-query for server data
//   - @petlore/types for all data models
//   - @petlore/prompts for agent calls
//   - @petlore/agents for agent execution
//   - @petlore/media for clip building + animal-podcast adapter
//   - @petlore/scrapers for Reddit/Tinyfish scraping
//
// ─────────────────────────────────────────────────────────────────────────────

export const STUDIO_VERSION = '0.1.0';
export const STUDIO_FEATURES = {
  petUpload: 'placeholder',        // → real with image storage
  characterGeneration: 'placeholder', // → real with LLM + Seedream
  showManagement: 'scaffold',
  episodeGeneration: 'scaffold',
  clipExtraction: 'scaffold',
  animalPodcastPipeline: 'integrated', // ✅ animal-podcast skill v0.5.1
  redditScraping: 'scaffold',
  vetNewsletter: 'scaffold',
  promotionPlanning: 'scaffold',
} as const;
