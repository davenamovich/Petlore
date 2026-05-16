---
Task ID: 1
Agent: Main Agent
Task: Build THE CHAOS ENGINE - Pet-themed custom meme song service

Work Log:
- Analyzed the uploaded song-sprout.zip framework (Express + Vite + React monorepo with ACE-Step music generation, Anthropic lyrics, SQLite DB, and RunPod inference)
- Extracted and read all key source files: API routes, lyrics generator, inference service, KidsStudio UI, presets data, and database schema
- Initialized Next.js 16 fullstack project with fullstack-dev skill
- Designed and implemented Prisma schema for ChaosSong model
- Created comprehensive chaos-data.ts with all pet types, personalities, genres, visual styles, series templates, viral hooks, and AI prompt templates
- Built 3 API routes: /api/chaos/generate (lyrics generation), /api/chaos/lore (pet lore generation), /api/chaos/songs (gallery)
- Built complete frontend: Landing page, Chaos Studio (4-stage flow), Lore Generator, Gallery
- Generated hero images using z-ai-generate CLI

Stage Summary:
- Full THE CHAOS ENGINE application built on Next.js 16
- Backend: Prisma + SQLite, ZAI SDK for AI lyrics/lore generation
- Frontend: Landing page with viral hooks showcase, Chaos Studio with pet/personality/genre/visual selector, Lore Generator, Gallery
- Key files: src/lib/chaos-data.ts, src/app/api/chaos/*/route.ts, src/app/page.tsx
- App running successfully on port 3000
