# Backlog

Ordered sprints. One sprint = one harness run. Each sprint must be small enough to build and evaluate in a single pass. The planner appends and reorders; the generator works strictly top-down on the first `pending` sprint. Spec: `agent/SPEC.md`. Evaluator checks at 1280x900 and 390x844; `pnpm build` must stay green every sprint.

## Sprint 1: The room exists — done (2026-06-11, PASS)

R3F scene at `/`, walls + floor + lighting, all story covers hung by tradition with wall labels, static camera. Grid moves to `/gallery`. Thumb pipeline (sharp prebuild/predev, gitignored `public/covers/thumbs/`). `?face=<wall>` eval affordance and the `#museum-hud` skeleton (SPEC section 7) ship now.

Acceptance criteria:

- `/` renders the museum: a canvas filling the viewport; 1280px screenshots at `/`, `/?face=roman`, `/?face=ramayana`, `/?face=mahabharata` each show a lit wall with framed paintings and its tradition label, not a blank/black canvas
- Every published story hangs on its tradition wall: `#museum-hud` `data-wall-roman` / `-ramayana` / `-mahabharata` list slugs whose counts match the markdown files in `stories/` per tradition, and `data-loaded` becomes `"true"`
- Room textures load from `/covers/thumbs/*.webp` (network log shows thumb requests, no full-size `/covers/*.png` requests on `/`), each thumb ≤ 200 KB
- `/gallery` serves the previous card grid unchanged in function; `/` links to it ("Gallery view") and `/gallery` links back ("Enter the museum"); story pages still render
- At 390px, `/` shows the canvas plus a reachable "Gallery view" link, no horizontal overflow on `/` or `/gallery`

## Sprint 2: Walking — done (2026-06-11, PASS)

Keyboard movement with smoothing and wall collision (SPEC 3.1). HUD position/heading live. First-visit hint overlay.

Acceptance criteria:

- Holding ArrowUp changes `data-x`/`data-z` along the current heading through multiple intermediate values (smooth, no single-frame jumps > 0.5 units); before/after screenshots show a different view; ArrowDown walks backward
- ArrowLeft / ArrowRight change `data-heading` continuously (counterclockwise / clockwise) and the rendered view rotates
- WASD aliases behave identically to the arrows
- Collision: holding forward into any wall converges with the camera ≥ 1.4 units from it and `data-x`/`data-z` never exceed the room bounds; same in a corner approach
- First visit shows the controls hint overlay (arrows, Enter, Esc); it dismisses on first keypress or its close button and does not reappear after reload in the same browser profile

## Sprint 3: Focus and Enter — pending

Proximity focus (distance < 3.0, within ±35° of heading), frame/spotlight highlight, DOM prompt, Enter opens the story (SPEC 4).

Acceptance criteria:

- Walking up to a painting sets `data-focused` to its slug and shows `#museum-prompt` containing that story's title and an Enter hint
- The focused painting is visibly highlighted in a screenshot (brighter frame/spotlight) compared to its neighbors
- Walking away or turning away clears `data-focused` and hides the prompt
- Pressing Enter while focused navigates to that story's page (`/<slug>` renders the story)
- Pressing Enter with nothing focused leaves you in the room (URL unchanged, no errors)

## Sprint 4: Story triptych and Escape return — pending

Three-panel cover carousel (full cover + two derived treatments, `covers[]` frontmatter honored per SPEC 5.1), arrow-key cycling, swipe, dots. Camera persistence: Enter saves to sessionStorage, Escape on the story page returns to `/` at the saved spot.

Acceptance criteria:

- A story page shows a 3-panel image strip: panel 1 the full cover, panels 2-3 visibly distinct crops/treatments of it; three dots below with the first active
- ArrowRight / ArrowLeft cycle the panels (wrapping) and the active dot follows; dots are clickable and switch panels
- At 390px, a touch swipe on the strip changes the panel and the dot state; story text below remains readable and ArrowDown still scrolls the page
- Round trip: in the room, walk to a distinct spot, note `data-x`/`data-z`/`data-heading`, Enter a focused painting, press Escape on the story page; back on `/` the HUD values match the noted ones within 0.1
- Direct load of a story URL (fresh session) then Escape lands at the default spawn with no console errors

## Sprint 5: Curator's wall and night lighting — pending

Wall 4 per SPEC 6: entrance placard (title + controls legend) and New Acquisitions (3 most recent stories by date). Atmosphere pass: per-painting spotlights, dark walls, tradition-tinted label washes.

Acceptance criteria:

- `/?face=curator` shows Wall 4 with a lit placard whose title and controls legend are readable in a 1280px screenshot
- Wall 4 hangs exactly the 3 most recent stories by frontmatter date with a NEW marker; `data-wall-curator` lists those 3 slugs, matching the dates in `stories/*.md`
- A New Acquisitions painting focuses, opens with Enter, and Escape returns to the saved position, identically to tradition walls
- Screenshots of each wall show museum-at-night lighting: individual light pools on paintings against darker wall surfaces, tradition-colored label tint
- Pipeline-proof: temporarily add a new story markdown + cover (copy an existing PNG), rebuild, and the story appears on its tradition wall and displaces the oldest acquisition on Wall 4; remove the temp files afterward and rebuild green

## Sprint 6: Mobile movement, fallbacks, integration polish — pending

Touch control cluster, tap-to-focus/open, no-WebGL fallback, loading fade, end-to-end regression (SPEC 3.2, 9, 10).

Acceptance criteria:

- At 390px, on-screen turn-left / forward / back / turn-right controls overlay the canvas; press-and-hold forward changes `data-x`/`data-z` continuously; no horizontal overflow
- On a touch viewport, tapping a painting focuses it (prompt appears with its title) and a second tap (painting or prompt) opens the story; the story page's visible "Back to the museum" button returns to the saved position
- With WebGL disabled (Playwright init script nulling `canvas.getContext` for webgl/webgl2), `/` shows a graceful fallback message with a working `/gallery` link and zero console errors
- Initial load shows a loading state or fade-in, never a flash of black/untextured geometry; `data-loaded` flips to `"true"` and the room is fully textured in the post-load screenshot
- Full keyboard journey at 1280px with zero console errors: spawn → turn → walk to the Rome wall → focus → Enter → cycle the carousel → Escape (position preserved) → walk to Wall 4 → open a New Acquisition

---

## Superseded backlog (marked 2026-06-11)

`agent/GOAL.md` changed direction to the interactive museum. The sprints below were pending under the old browse-and-discovery goal and were never started. Kept for history; do not build.

- Sprint: Tradition filter tabs — superseded
- Sprint: Content-type tags on story cards — superseded
- Sprint: Character profile pages — superseded
- Sprint: Character relationships — superseded
- Sprint: Search — superseded
