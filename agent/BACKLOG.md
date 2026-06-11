# Backlog

Ordered sprints. One sprint = one harness run. Each sprint must be small enough to build and evaluate in a single pass. The planner appends and reorders; the generator works strictly top-down on the first `pending` sprint. Spec: `agent/SPEC.md`. Evaluator checks at 1280x900 and 390x844; `pnpm build` must stay green every sprint.

2026-06-11: Monte tested the finished museum and gave direction-changing feedback (bright Broad-style room, trackpad movement, gaze focus, taste passes). Sprints 7-11 below encode it. The original "Sprint 7: Touch polish" was never built; its still-valid items are folded into Sprint 9 (see the superseded section at the bottom).

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

## Sprint 3: Focus and Enter — done (2026-06-11, PASS)

Proximity focus (distance < 3.0, within ±35° of heading), frame/spotlight highlight, DOM prompt, Enter opens the story (SPEC 4). Note: the proximity rule was replaced by gaze focus in Sprint 8 per Monte's feedback.

Acceptance criteria:

- Walking up to a painting sets `data-focused` to its slug and shows `#museum-prompt` containing that story's title and an Enter hint
- The focused painting is visibly highlighted in a screenshot (brighter frame/spotlight) compared to its neighbors
- Walking away or turning away clears `data-focused` and hides the prompt
- Pressing Enter while focused navigates to that story's page (`/<slug>` renders the story)
- Pressing Enter with nothing focused leaves you in the room (URL unchanged, no errors)

## Sprint 4: Story triptych and Escape return — done (2026-06-11, PASS)

Three-panel cover carousel (full cover + two derived treatments, `covers[]` frontmatter honored per SPEC 5.1), arrow-key cycling, swipe, dots. Camera persistence: Enter saves to sessionStorage, Escape on the story page returns to `/` at the saved spot.

Acceptance criteria:

- A story page shows a 3-panel image strip: panel 1 the full cover, panels 2-3 visibly distinct crops/treatments of it; three dots below with the first active
- ArrowRight / ArrowLeft cycle the panels (wrapping) and the active dot follows; dots are clickable and switch panels
- At 390px, a touch swipe on the strip changes the panel and the dot state; story text below remains readable and ArrowDown still scrolls the page
- Round trip: in the room, walk to a distinct spot, note `data-x`/`data-z`/`data-heading`, Enter a focused painting, press Escape on the story page; back on `/` the HUD values match the noted ones within 0.1
- Direct load of a story URL (fresh session) then Escape lands at the default spawn with no console errors

## Sprint 5: Curator's wall and night lighting — done (2026-06-11, PASS)

Wall 4 per SPEC 6: entrance placard (title + controls legend) and New Acquisitions (3 most recent stories by date). Atmosphere pass: per-painting spotlights, dark walls, tradition-tinted label washes. Note: the night atmosphere was superseded by the Broad daylight rework in Sprint 7 per Monte's feedback.

Acceptance criteria:

- `/?face=curator` shows Wall 4 with a lit placard whose title and controls legend are readable in a 1280px screenshot
- Wall 4 hangs exactly the 3 most recent stories by frontmatter date with a NEW marker; `data-wall-curator` lists those 3 slugs, matching the dates in `stories/*.md`
- A New Acquisitions painting focuses, opens with Enter, and Escape returns to the saved position, identically to tradition walls
- Screenshots of each wall show museum-at-night lighting: individual light pools on paintings against darker wall surfaces, tradition-colored label tint
- Pipeline-proof: temporarily add a new story markdown + cover (copy an existing PNG), rebuild, and the story appears on its tradition wall and displaces the oldest acquisition on Wall 4; remove the temp files afterward and rebuild green

## Sprint 6: Mobile movement, fallbacks, integration polish — done (2026-06-11, PASS)

Touch control cluster, tap-to-focus/open, no-WebGL fallback, loading fade, end-to-end regression (SPEC 3.2, 9, 10).

Acceptance criteria:

- At 390px, on-screen turn-left / forward / back / turn-right controls overlay the canvas; press-and-hold forward changes `data-x`/`data-z` continuously; no horizontal overflow
- On a touch viewport, tapping a painting focuses it (prompt appears with its title) and a second tap (painting or prompt) opens the story; the story page's visible "Back to the museum" button returns to the saved position
- With WebGL disabled (Playwright init script nulling `canvas.getContext` for webgl/webgl2), `/` shows a graceful fallback message with a working `/gallery` link and zero console errors
- Initial load shows a loading state or fade-in, never a flash of black/untextured geometry; `data-loaded` flips to `"true"` and the room is fully textured in the post-load screenshot
- Full keyboard journey at 1280px with zero console errors: spawn → turn → walk to the Rome wall → focus → Enter → cycle the carousel → Escape (position preserved) → walk to Wall 4 → open a New Acquisition

## Sprint 7: The Broad room rework (daylight gallery) — done (2026-06-11, PASS)

Monte's feedback item 1. Replace the night room with the Broad-style daylight gallery per SPEC 2.1-2.3: white walls, light polished-concrete floor, glowing honeycomb veil ceiling (canvas-generated emissive texture), hemisphere + ambient rig, fog removed, thin frames, dark-on-light placards and darkened tradition-tint wall labels, restyled curator placard (no "Night Gallery"), tradition-tinted focus outline visible in daylight (SPEC 4.2). Keep the HUD contract, `?face=`, controls, and focus *rule* untouched — this sprint is look only; the gaze rule lands in Sprint 8.

Acceptance criteria:

- 1280px screenshots at `/?face=roman`, `/?face=ramayana`, `/?face=mahabharata`, `/?face=curator` each show white walls, the light concrete floor at the bottom of frame, and the glowing honeycomb ceiling at the top of frame; mean pixel luminance of each shot exceeds 100/255 (bright daylight, clearly not the old night build); no fog haze or black voids
- Legibility on white: a close-up screenshot (face a wall, walk forward) shows the tradition wall label in its darkened tint and at least one story placard as dark text on a light card, both readable; the curator placard is a light plate with dark readable text and its subtitle contains no night reference
- Focus highlight reads in daylight: with a painting focused, a screenshot shows a clearly visible tradition-tinted outline/highlight versus its unfocused neighbors; `data-focused` and `#museum-prompt` behave exactly as before
- Regression: full keyboard journey green at 1280px (spawn → walk → focus → Enter → carousel → Escape with position restored within 0.1); all `#museum-hud` attributes and `?face=` semantics unchanged; zero console errors; `pnpm build` green
- At 390px: the bright room renders, the touch cluster and hint overlay remain legible over the bright canvas, no horizontal overflow

## Sprint 8: Trackpad movement and gaze focus — pending

Monte's feedback items 2 and 3. SPEC 3.3 and 4.1: wheel walk/turn with preventDefault, pointer-drag look with clamped pitch (`data-pitch` HUD attribute), drag-vs-tap threshold, and the gaze focus rule (view-centered, no distance gate) replacing the proximity rule. Update hint overlay and curator placard legend copy.

Acceptance criteria:

- Wheel walk: dispatching `mouse.wheel(0, -300)` over the canvas moves the camera forward along the current heading (`data-x`/`data-z` change across multiple frames, total displacement between 0.5 and 4 units); `mouse.wheel(0, 300)` moves backward; the page itself does not scroll and shows no zoom artifacts
- Wheel turn: `mouse.wheel(240, 0)` increases `data-heading` (clockwise) and the rendered view rotates; negative deltaX decreases it
- Drag look: a pointer drag right increases `data-heading` and drag left decreases it (~0.2-0.35° per px); vertical drag changes `data-pitch`, clamped to [-25, 25]; releasing a > 5 px drag never changes `data-focused` or navigates (drag is not a tap)
- Gaze focus: at `/?face=roman` (room center, paintings > 3 units away) `data-focused` is the slug of the painting at view center; turning hands focus to the next painting as it crosses center; aiming at a corner or empty wall stretch clears `data-focused` and hides the prompt; Enter on a gaze-focused distant painting opens its story and Escape returns to the saved spot
- Coexistence and copy: keyboard arrows/WASD and the 390px touch cluster still move through the same HUD pipeline; the hint overlay and curator placard legend now mention scroll and drag; no em dashes in new copy; zero console errors; `pnpm build` green

## Sprint 9: Touch and copy polish — pending (folds the original Sprint 7 items)

Deterministic refinements carried over from the sprint 6 evaluator sweep, done before the taste audit so the audit is not noise. The old "tap-to-focus distance rule" item is dropped: SPEC 4.2 now documents remote open as intended under gaze focus.

Acceptance criteria:

- Hint overlay and focus prompt show touch-appropriate copy on coarse pointers (no "Arrow keys", "scroll", "Press Enter", or "Esc" wording on phones); hint auto-dismisses on first touch-control use as well as key/wheel/drag
- Hint overlay never overlaps the touch control cluster at 390x844 (bounding boxes disjoint with both visible)
- Carousel active dot updates immediately on keypress, not after smooth-scroll settle
- No-WebGL fallback copy and all museum overlay copy use plain punctuation (no em dashes); with WebGL disabled, `/` still shows the fallback with a working `/gallery` link and zero console errors
- `pnpm build` green; keyboard, wheel, drag, and gaze focus regressions all pass

## Sprint 10: Shippability taste pass (evaluator-driven) — pending

Monte's feedback item 4: "ask the evaluator for taste and judgement and then do another pass or two on it to really be shippable." Process sprint: the generator FIRST runs the evaluator in curator taste audit mode (see RUBRIC "Curator taste audit") against the built site at both viewports — walking the room, every `?face=` wall, a story round trip — producing `agent/evals/<ts>-taste-audit.md` with screenshots and ranked findings. The generator then converts the top 3-5 findings into concrete, interaction-verifiable ACs appended under this sprint in this file, and only then builds.

Acceptance criteria:

- A taste audit verdict file exists in `agent/evals/` with screenshot evidence and a ranked findings list (composition, lighting, spacing, typography, copy, motion feel), each finding rated "blocks shippable" or "nice to have"
- The top 3-5 findings are recorded below as concrete ACs (each verifiable by interacting with the site) before any feature code is written
- Every converted AC is demonstrated fixed by interaction and screenshot
- A post-fix re-audit is recorded in `agent/evals/` with no remaining "blocks shippable" finding
- No regressions: keyboard journey, wheel/drag controls, gaze focus, HUD contract, `pnpm build` green

Converted ACs (filled in by the generator from the audit, before building):

- (to be appended at sprint start)

## Sprint 11: Second taste pass — pending (conditional)

Run only if Sprint 10's re-audit still lists "blocks shippable" findings, or if Monte's next review asks for another pass. Same process as Sprint 10: fresh audit, convert top findings to ACs here, fix, re-audit clean. If Sprint 10's re-audit is clean and Monte signs off, mark this sprint skipped instead of building filler.

Acceptance criteria:

- (same standing structure as Sprint 10; converted ACs appended at sprint start)

---

## Superseded: original Sprint 7 (marked 2026-06-11)

**Sprint 7: Touch polish — superseded, folded into Sprint 9.** Never built; queued awaiting Monte's test, which instead produced the direction change above. Original items and their disposition:

- Touch-appropriate hint/prompt copy + auto-dismiss → Sprint 9
- Hint overlay never overlaps touch cluster at 390px → Sprint 9
- Tap-to-focus distance rule → dropped: superseded by the Sprint 8 gaze rule; remote open is intended (SPEC 4.2)
- Carousel dot updates immediately on keypress → Sprint 9
- No-WebGL fallback plain punctuation → Sprint 9

## Superseded backlog (marked 2026-06-11)

`agent/GOAL.md` changed direction to the interactive museum. The sprints below were pending under the old browse-and-discovery goal and were never started. Kept for history; do not build.

- Sprint: Tradition filter tabs — superseded
- Sprint: Content-type tags on story cards — superseded
- Sprint: Character profile pages — superseded
- Sprint: Character relationships — superseded
- Sprint: Search — superseded
