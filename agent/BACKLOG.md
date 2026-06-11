# Backlog

Ordered sprints. One sprint = one harness run. Each sprint must be small enough to build and evaluate in a single pass. The planner appends and reorders; the generator works strictly top-down on the first `pending` sprint.

## Sprint 1: Tradition filter tabs — pending

Homepage tabs: All / Rome / Ramayana / Mahabharata.

Acceptance criteria:
- Tabs render above the story grid, All active by default
- Clicking a tab filters cards client-side, no page reload
- Active tab is visually distinct; tradition tabs use their tradition color
- Works at 390px width without horizontal overflow
- Story count shown per filter or in grid (nice to have, not blocking)

## Sprint 2: Content-type tags on story cards — pending

Acceptance criteria:
- Each card shows its `type` from frontmatter (hard lesson, character study, etc.) as a small tag alongside the tradition tag
- Tags are visually quieter than the tradition tag, consistent across all cards
- Story page header shows the same type tag

## Sprint 3: Character profile pages — pending

`/characters/<slug>` for each figure in story frontmatter.

Acceptance criteria:
- Character names on cards and story pages link to the profile
- Profile shows: name, tradition, a 2-3 sentence bio (generated, historically accurate), and all their stories as cards
- An index page `/characters` lists all characters grouped by tradition
- Static export still works (`pnpm build` green)

## Sprint 4: Character relationships — pending

Acceptance criteria:
- Profiles show allies / rivals / family as linked chips (data in a checked-in `src/data/characters.ts` or similar)
- Links navigate to the related character's profile
- Characters without relationship data render cleanly without the section

## Sprint 5: Search — pending

Acceptance criteria:
- Keyword filter on the homepage across titles and one-liners, client-side
- Combines with tradition tabs (search within a tradition)
- Empty state message when nothing matches
