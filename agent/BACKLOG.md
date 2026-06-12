# Backlog

Ordered sprints. One sprint = one harness run. Each sprint must be small enough to build and evaluate in a single pass. The planner appends and reorders; the generator works strictly top-down on the first `pending` sprint. Spec: `agent/SPEC.md`. Evaluator checks at 1280x900 and 390x844; `pnpm build` must stay green every sprint.

2026-06-11: Monte tested the finished museum and gave direction-changing feedback (bright Broad-style room, trackpad movement, gaze focus, taste passes). Sprints 7-11 below encode it. The original "Sprint 7: Touch polish" was never built; its still-valid items are folded into Sprint 9 (see the superseded section at the bottom).

2026-06-11 (second revision): GOAL.md rewritten with two new goals — a third-person body and live multiplayer presence (SPEC sections 11-12). Sprints 12-16 encode them. **Process change (Monte, today):** sprint criteria below are DRAFTS. At sprint start, the builder and a fresh evaluator align on the final list per RUBRIC "Criteria alignment" and record it in this file (marked "aligned") plus `agent/evals/<ts>-sprint-N-criteria.md` before any feature code.

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

## Sprint 8: Trackpad movement and gaze focus — done (2026-06-11, PASS attempt 2)

Monte's feedback items 2 and 3. SPEC 3.3 and 4.1: wheel walk/turn with preventDefault, pointer-drag look with clamped pitch (`data-pitch` HUD attribute), drag-vs-tap threshold, and the gaze focus rule (view-centered, no distance gate) replacing the proximity rule. Update hint overlay and curator placard legend copy.

Acceptance criteria:

- Wheel walk: dispatching `mouse.wheel(0, -300)` over the canvas moves the camera forward along the current heading (`data-x`/`data-z` change across multiple frames, total displacement between 0.5 and 4 units); `mouse.wheel(0, 300)` moves backward; the page itself does not scroll and shows no zoom artifacts
- Wheel turn: `mouse.wheel(240, 0)` increases `data-heading` (clockwise) and the rendered view rotates; negative deltaX decreases it
- Drag look: a pointer drag right increases `data-heading` and drag left decreases it (~0.2-0.35° per px); vertical drag changes `data-pitch`, clamped to [-25, 25]; releasing a > 5 px drag never changes `data-focused` or navigates (drag is not a tap)
- Gaze focus: at `/?face=roman` (room center, paintings > 3 units away) `data-focused` is the slug of the painting at view center; turning hands focus to the next painting as it crosses center; aiming at a corner or empty wall stretch clears `data-focused` and hides the prompt; Enter on a gaze-focused distant painting opens its story and Escape returns to the saved spot
- Coexistence and copy: keyboard arrows/WASD and the 390px touch cluster still move through the same HUD pipeline; the hint overlay and curator placard legend now mention scroll and drag; no em dashes in new copy; zero console errors; `pnpm build` green

## Sprint 9: Touch and copy polish — done (2026-06-11, PASS)

Deterministic refinements carried over from the sprint 6 evaluator sweep, done before the taste audit so the audit is not noise. The old "tap-to-focus distance rule" item is dropped: SPEC 4.2 now documents remote open as intended under gaze focus.

Acceptance criteria:

- Hint overlay and focus prompt show touch-appropriate copy on coarse pointers (no "Arrow keys", "scroll", "Press Enter", or "Esc" wording on phones); hint auto-dismisses on first touch-control use as well as key/wheel/drag
- Hint overlay never overlaps the touch control cluster at 390x844 (bounding boxes disjoint with both visible)
- Carousel active dot updates immediately on keypress, not after smooth-scroll settle
- No-WebGL fallback copy and all museum overlay copy use plain punctuation (no em dashes); with WebGL disabled, `/` still shows the fallback with a working `/gallery` link and zero console errors
- `pnpm build` green; keyboard, wheel, drag, and gaze focus regressions all pass

## Sprint 10: Shippability taste pass (evaluator-driven) — done (2026-06-11, PASS attempt 2)

Monte's feedback item 4: "ask the evaluator for taste and judgement and then do another pass or two on it to really be shippable." Process sprint: the generator FIRST runs the evaluator in curator taste audit mode (see RUBRIC "Curator taste audit") against the built site at both viewports — walking the room, every `?face=` wall, a story round trip — producing `agent/evals/<ts>-taste-audit.md` with screenshots and ranked findings. The generator then converts the top 3-5 findings into concrete, interaction-verifiable ACs appended under this sprint in this file, and only then builds.

Acceptance criteria:

- A taste audit verdict file exists in `agent/evals/` with screenshot evidence and a ranked findings list (composition, lighting, spacing, typography, copy, motion feel), each finding rated "blocks shippable" or "nice to have"
- The top 3-5 findings are recorded below as concrete ACs (each verifiable by interacting with the site) before any feature code is written
- Every converted AC is demonstrated fixed by interaction and screenshot
- A post-fix re-audit is recorded in `agent/evals/` with no remaining "blocks shippable" finding
- No regressions: keyboard journey, wheel/drag controls, gaze focus, HUD contract, `pnpm build` green

Converted ACs (from agent/evals/20260611-085051-taste-audit.md findings 1-5, all "blocks shippable"; recorded before building):

- Walls gallery white (audit 1): in fresh 1280x900 shots at all four `?face=` walls, a 5x5 mean sample of bare wall reads RGB 225-248 per channel; painting canvases unclipped and placard cards sample ≤ 250
- No spawn toast pile-up (audit 2): fresh profile at 1280x900 with a painting focused at spawn, `#museum-hint` and `#museum-prompt` bounding rects are disjoint (or the prompt stays hidden until the hint dismisses, then appears for the still-focused painting)
- Legible nav pill (audit 3): the "Gallery view" link's computed text color vs its own pill background gives contrast >= 4.5:1, and 1280 + 390 screenshots show it legible over both ceiling and wall
- Markdown emphasis renders (audit 4): a DOM scan of every story page's article text finds zero `*...*` pairs; the Karna story renders kavacha/kundala inside `<em>` elements
- Spawn composition (audit 5): at default spawn 1280x900, the facing wall's center painting measures >= 100px tall in the screenshot; collision, gaze focus, and Enter/Escape regressions still pass

Also being fixed this sprint (audit nice-to-haves 6-12, opportunistic, must not regress the ACs above): floor sheen gradient, crisp placard ink (unlit, larger type), brighter veil cell glow vs webbing, regrouped sparse walls and centered curator wall, no Esc chip on coarse pointers, real dark-to-light load fade, placard frame/subtitle toned to match.

## Sprint 11: Second taste pass — skipped (2026-06-11)

Sprint 10's attempt-2 re-evaluation found zero remaining "blocks shippable" findings (agent/evals/20260611-094608-sprint-10-attempt2.md), so per this sprint's own rule it is marked skipped rather than building filler. Reopen if Monte's next review asks for another pass. Known open nice-to-haves, in priority order if reopened:

- Floor sheen still subtle: gloss-only luminance range ~16 vs the ≥20 target (seams retained)
- Walls perfectly uniform, fusing at corners (no seam/AO shading)
- Content quirk: the plato story's cover art has "THE SILENT SENATE" baked in while its placard reads its real title (story pipeline, not museum code)
- Lint for em dashes in generated story prose (add to the story-from-history skill)

---

## Sprint 12: The body — third-person view — done (2026-06-11, PASS)

SPEC 11. The procedural articulated avatar (anatomy + gait per 11.2), `playerStore`, the chase-camera rig with boom wall-clamp (11.3), player-aim focus (11.4), the `V` / `#museum-cam-toggle` / `?cam=` mode switch, and HUD additions `data-cam-mode` / `data-cam-dist` / `data-speed` (11.5). Third person becomes the default; first person survives as a toggle. No presence code this sprint.

Acceptance criteria (aligned 2026-06-11, evaluator note: `agent/evals/20260611-215137-sprint-12-criteria.md`):

1. **Third person is the default and the frame is composed.** A fresh session loading `/?face=roman` at 1280x900 reaches `data-cam-mode="third"` with `data-cam-dist` > 0, and the screenshot shows: a complete human figure seen from behind (head, torso, two arms, two legs) with distinct clothing tones, not a capsule, blob, or stick figure; the body fully in frame occupying roughly the lower third of it, with the Roman wall and its paintings clearly visible beyond the figure; the figure's silhouette clearly separable from the white wall and light floor (no white-on-white wash-out); a fresh 390x844 load shows the same third-person body with the touch cluster present and no horizontal overflow
2. **Movement parity.** Arrows/WASD, wheel, pointer drag, and the 390px touch cluster each still drive `data-x`/`data-z`/`data-heading`/`data-pitch` with their shipped semantics (single `mouse.wheel(0, -300)` displaces 0.5-4 units; drag right increases heading; pitch clamps to +/-25; collision clamp holds), and after each input the avatar renders at the new player position facing along `data-heading`
3. **The gait reads human: never skates, never freezes, never a turntable statue.** While walking (`data-speed` >= ~2), two screenshots with the player displaced ~0.4 units apart show clearly different limb configurations (legs alternating, arms counter-swinging) and no in-motion screenshot pair shows identical limbs while `data-x`/`data-z` changed; `data-speed` reads ~0.00 at rest and rises toward ~3.00 holding forward; after stopping, a screenshot within ~1 s shows a natural standing pose (feet under body, arms hanging), not a mid-stride freeze; turn-in-place (turn key, no forward) changes `data-heading` with `data-speed` ~0 and screenshots at two headings show the body rotated with visible foot/leg pose differences
4. **Focus, Enter, Escape work from third person, proving the aim is the player's.** At `/?face=roman`: the wall-center painting sets `data-focused` and shows `#museum-prompt`, sitting near the horizontal center of frame above the avatar's head in the screenshot; turning moves focus along the wall; empty wall clears it; point-blank focus still works; Enter opens the story; Escape returns to the same `data-x`/`data-z`/`data-heading` (+/- float noise). At 390x844 tap-to-focus and tap-to-open still work with the body in scene (the body never intercepts a tap)
5. **The camera never leaves the room or blinds you.** Backing the player into each of the four walls and at least one corner: every screenshot shows only room interior (no void, no through-wall geometry); `data-cam-dist` shrinks below its default while pinned and recovers after walking back to open floor; when the boom is very short the local body fades or clears so the frame is not filled by the avatar's back
6. **Mode switching is complete and nothing shipped regresses.** `V` flips `data-cam-mode` between `"third"` and `"first"`; the visible `#museum-cam-toggle` does the same and is tappable at 390x844; in first person no part of the local body is visible at any heading/pitch, `data-cam-dist` reads `"0.00"`, and movement plus gaze focus behave exactly as shipped; `?cam=first` forces the mode for that load; the chosen mode survives a story round trip; a subsequent `?face=` load preserves the stored mode; the no-WebGL fallback still works with zero console error spam; zero console errors in the room; no horizontal overflow at 390px; `pnpm build` exits 0

## Sprint 13: Presence plumbing — transport, protocol, local eval mode — done (2026-06-12, PASS)

SPEC 12.2-12.3. The `PresenceTransport` abstraction, the BroadcastChannel `?net=local` reference transport, the trystero/Nostr `webrtc` production default (lazy chunk, silent degrade to `off`), `?net=off`, the state/bye protocol with tick rates and heartbeat timeout, and the HUD presence contract (`data-net`, `data-peers`, per-peer nodes per 12.6). No remote bodies render yet — this sprint proves the data flows; bodies land in sprint 14. Adds the `trystero` dependency.

Acceptance criteria (aligned 2026-06-11, evaluator note: `agent/evals/20260611-233038-sprint-13-criteria.md`):

1. **Local discovery, honest contract, no self-echo.** A single page at `/?net=local` settles to `data-net="local"` with `data-peers="0"` and no `.museum-peer` nodes (a tab never counts itself). A second page in the same browser context: within ~5 s both pages show `data-peers="1"` with exactly one `.museum-peer` node carrying all seven contract attributes (`data-peer-id` non-empty, `data-peer-label` reading `Visitor 2` on each side, `data-peer-color` a CSS hex, `data-peer-x`/`-z`/`-heading` numeric to 2 decimals, `data-peer-state` present). At rest each page's peer pose matches the other page's own HUD pose within 0.5 u / 10 deg. Peer id/label/color are unchanged when re-sampled after criterion 2's walk.
2. **Live streaming both ways, smooth enough for bodies.** While page A walks >= 3 u, page B's `data-peer-x`/`-z` (sampled every ~100-200 ms) pass through at least 5 distinct intermediate positions strictly between A's start and end with no sampled step > 1.5 u, settling within 0.3 u of A's final pose within ~2 s of stopping; A turning in place reflects in B's `data-peer-heading` within ~10 deg (mod 360); the reverse direction shows the same streaming in at least one spot check.
3. **Leaves, timeouts, and ghost-proofing.** (a) Closing page B removes its node from page A within 5 s and `data-peers` returns to `"0"`. (b) A peer that dies WITHOUT a clean unload (no bye) is removed by heartbeat timeout within ~10 s of its last update. (c) Reloading page A three times in quick succession leaves B settled at exactly `data-peers="1"` with one node carrying A's current session id; `data-peers` never exceeds the number of live tabs at any sampled moment. (d) Two pages idle 12+ s both keep `data-peers="1"` (idle heartbeats prevent false despawn).
4. **The production default settles honestly, degrades quietly, and the connection noise is bounded** (amended post-build-start, `agent/evals/20260611-235012-sprint-13-criteria-r2.md`). With no `?net` param: within ~15 s of `data-loaded="true"`, `data-net` reads exactly `"webrtc"` or `"off"` and never changes or flaps afterward; when zero relay/WebRTC connections succeed (as in this sandbox) it must settle to `"off"` (a `"webrtc"` claim with no live connection fails). Over a 60 s watch from page load: zero script-caused console errors, zero pageerror/unhandled rejections, at most one info-level presence message. Browser network-layer connection-failure logs (type error matching /WebSocket connection to .+ failed/ or bare net:: connection codes) are exempt during settling but bounded: fewer than 50 total, none later than 45 s after load, final ~15 s silent. Either way the solo room behaves identically to sprint 12 (`data-peers="0"`, walk, focus, Enter, Escape all work).
5. **Presence costs nothing where it isn't wanted.** At `/?net=off`: `data-net="off"`, `data-peers` stays `"0"`, no `.museum-peer` ever appears, zero presence network requests (no relay websockets, no STUN/TURN). On the default load, any JS not fetched under `?net=off` is fetched only after `data-loaded="true"` (lazy chunk). `/gallery`, one story page, and the no-WebGL fallback open zero presence connections in any mode with zero console errors.
6. **Nothing shipped regresses.** `pnpm build` exits 0. With a peer connected at `/?net=local`, the sprint-12 solo journey still passes on page A (third-person default, movement, focus + `#museum-prompt`, Enter, Escape to the same pose); the HUD's player attributes are never altered by incoming peer traffic; zero console errors at 1280x900 and 390x844; no horizontal overflow at 390px.

## Sprint 14: Company — remote bodies materialize and walk — pending

SPEC 12.4-12.5. Remote avatars reusing `AvatarBody` with palette tints and `Visitor N` billboard labels, the entering/live/leaving lifecycle with staged fades, 150 ms interpolation driving remote gait, the teleport rule, and the `#museum-presence-count` chip. Verified entirely over `?net=local`.

Draft acceptance criteria (alignment pending):

- With pages A and B at `/?net=local`, B's 1280x900 screenshot shows a second full human figure at A's position wearing a visibly distinct accent color from your own neutral body, with a floating `Visitor N` label above its head matching `data-peer-label` and legible against the white wall
- Staged lifecycle, never pops: the peer node passes `data-peer-state` `"entering"` → `"live"` on join and `"leaving"` before removal on close; the figure is fully gone within 5 s of A closing; screenshots near join or leave catch a transitional (faded/scaling) body or the state attributes prove the staging
- Alive movement: while A walks a straight line, B's figure advances smoothly (`data-peer-x`/`-z` sampled at 100 ms show monotonic progress, no step > 0.5 units) with legs and arms visibly animating between screenshots; when A stops, the figure settles to idle (limb poses stop changing)
- Remote turning: A turning in place rotates B's figure to the new facing (`data-peer-heading` tracks within ~15°; a screenshot shows the body oriented the new way)
- Company indicator, solo-graceful: `#museum-presence-count` appears on B only while A is present (and counts correctly) and is absent when alone and under `?net=off`; remote bodies never change local `data-x`/`data-z`/`data-focused`, never block focus or taps, and walking through one is unobstructed
- Regression both modes and viewports: first person shows remote bodies but not your own; at 390px with a peer present there is no overflow and the touch cluster still moves the player; zero console errors; `pnpm build` green

## Sprint 15: Presence hardening — reconnects, idle, a handful at once — pending

SPEC 12.3 edge rules. Story-round-trip rejoin, heartbeat/idle stability, the teleport rule under `?face=` jumps, the 8-peer render cap, and multi-peer performance on desktop and mobile.

Draft acceptance criteria (alignment pending):

- Round-trip rejoin: page A enters a story and returns to the room; page B sees a clean despawn then re-materialize, with `data-peers` accurate at every step (never 2 for one human, no ghost left behind); A re-acquires B the same way
- Idle stability: a peer idle for 60+ s stays present and stationary on the other page (no drift, flicker, or false despawn); closing the idle tab still despawns it within 5 s
- Teleport handling: when A jumps discontinuously (reload at `/?face=mahabharata&net=local` from a far corner), B's figure repositions without gliding across the room (no visible > 3-unit slide; fade-out/in or instant repose per SPEC 12.3)
- A handful at once: with 5 concurrent pages at `/?net=local`, the primary page shows 4 distinct labeled, distinctly tinted figures, `data-peers="4"`, and local walking stays smooth (`data-x` updates continuously while holding forward, no input stalls); at 390px the same scene has no overflow and usable controls
- Cap and solo regression: peers beyond the render cap are ignored without errors (`data-peers` never exceeds 8); solo loads (`webrtc` degrade and `?net=off`) remain behaviorally identical to sprint 12; zero console errors; `pnpm build` green

## Sprint 16: Taste pass — the body and the company feel shippable — pending

Process sprint, sprint-10 pattern. The evaluator runs a curator taste audit (RUBRIC) of the third-person and presence experience at both viewports: avatar look and proportions, gait quality at all speeds and while turning, chase-camera framing and feel near walls, label and count-chip legibility, materialize/despawn feel, multi-peer composition. Top findings convert to ACs before any code.

Draft acceptance criteria (alignment pending):

- A taste audit file exists in `agent/evals/` with screenshot evidence (solo and two-peer scenes, both viewports) and ranked findings, each rated "blocks shippable" or "nice to have"
- The top 3-5 findings are recorded under this sprint as concrete interaction-verifiable ACs before feature code is written
- Every converted AC is demonstrated fixed by interaction and screenshot
- A post-fix re-audit in `agent/evals/` shows zero remaining "blocks shippable" findings
- No regressions: sprint 12 third-person journey, sprint 13-15 two-page presence flows, solo keyboard journey, HUD contract, `pnpm build` green

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
