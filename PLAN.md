# History Stories (GetChronica) — Plan

A mobile-first exploration app for timeless epics — Roman History, Mahabharata, and Ramayana. Browse stories, discover characters, follow timelines, and collect daily wisdom.

---

## Vision

GetChronica brings timeless epics into your hands. Start with three traditions — Roman History, Mahabharata, Ramayana — and build a living library where users can explore characters and their relationships, follow chronological timelines of battles and dynasties, receive daily quotes, and save what resonates. The kind of app you'd open every morning and recommend to anyone getting into history.

---

## Current State

**Live at [historystories.vercel.app](https://historystories.vercel.app).** Auto-deploys from `nexuslabsx/history-stories` on push.

- 7 stories published (3 Ramayana, 2 Roman, 2 Mahabharata)
- Characters covered: Scipio Aemilianus, Karna, Jatayu, Marcus Aurelius, Hanuman, Rama, Ashwatthama
- Each story has AI-generated cover art (Gemini Pro via nano-banana skill)
- File-system architecture: markdown stories + frontmatter, git = database, static export
- Next.js + Tailwind, dark theme with purple/violet accent
- Story cards with tradition-colored tags (amber/Roman, emerald/Ramayana, blue/Mahabharata)
- Individual story pages with hero cover images
- Cross-harness pipeline: both OpenClaw and Cursor can generate and publish stories
- `history.json` tracker prevents character/type repetition
- `story-from-history` skill handles full pipeline: generate text + cover art, write, commit, push

---

## Phases

### Phase 1: GetChronica Foundation — Browse & Character Discovery
Transform the story blog into an exploration app.
- Rename/rebrand to GetChronica (domain, title, metadata)
- Tradition filter tabs: All / Rome / Ramayana / Mahabharata
- **Character profiles** — dedicated page per figure, all their stories grouped, bio + role in tradition
- Character relationship data (basic: allies, rivals, family) displayed on profile pages
- Content type tags on story cards (origin, hard lesson, character study, timeline)
- Sort + basic search across titles and one-liners

### Phase 2: Timelines
- Chronological timeline view per tradition — battles, events, dynasties
- Each timeline entry links to relevant stories and characters
- Visual treatment: horizontal scroll or vertical with era markers

### Phase 3: Daily Quotes
- Curated verse/passage per day from across all three traditions
- Delivered on home screen or dedicated tab
- Static generation (pre-curated list) to start; rotating daily

### Phase 4: Personalization
- Save favorite characters, quotes, and stories
- Persisted locally (localStorage to start, optional account later)
- "Your collection" view

---

## Backlog

- **Custom domain** — getchronica.com or similar, Vercel connect. Low effort, good polish
- **Content depth** — batch-generate to 20+ stories, balanced across traditions
- **RSS feed** — static XML for subscribers
- **OG images + social sharing** — cover art as Twitter/OG cards
- **Audio narration** — TTS per story, embedded player
- **Make repo public** — no secrets in code, safe to open source
- **Account + sync** — cloud-backed personalization across devices

---

*Updated: 2026-04-06*
