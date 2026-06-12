# SPEC — The History Stories Museum

Derived from `agent/GOAL.md` (2026-06-11), revised 2026-06-11 after Monte's live test. The site is a first-person gallery room. Stories hang as framed paintings on tradition walls; you walk with arrow keys, trackpad, or drag, point at a painting to focus it, press Enter to read, Escape to step back into the room where you stood.

> **Direction change (2026-06-11, Monte's live feedback — supersedes GOAL.md "museum at night"):** the room is now a bright daylight gallery modeled on The Broad's third-floor gallery in LA (Monte supplied a reference photo): white walls, light polished-concrete floor, and a glowing honeycomb "veil" skylight ceiling that provides even, soft illumination everywhere. Section 2.3 below replaces the old night-lighting spec. Future agents: do NOT revert to the dark room; Monte's live feedback wins over the GOAL.md atmosphere line. Site chrome and other pages keep the existing dark theme.

> **Extension (2026-06-11, second revision): GOAL.md was rewritten the same day with two new goals — a third-person body and live multiplayer presence.** Sections 11-12 (appended) spec them. One semantic clarification to section 7: `data-x` / `data-z` / `data-heading` / `data-pitch` describe the PLAYER, not the camera (in first person the two are identical, so every shipped assertion keeps passing). Everything else in sections 1-10 stands. Note for accuracy: the shipped museum runs on `three` + `@react-three/fiber` only; drei (mentioned in 1.1) was never actually needed or installed, and sections 11-12 add no new 3D dependencies.

---

## 1. Architecture decisions

### 1.1 3D stack: react-three-fiber v9 + drei + three

**Decision:** `three` (latest) + `@react-three/fiber` v9 + `@react-three/drei` v10, all React 19 compatible. The room is one client-only component, dynamically imported with no SSR, mounted on the `/` page. Static export is unaffected: the page pre-renders an HTML shell; the canvas hydrates client-side.

**Why not CSS 3D transforms:** the goal demands lighting, wall collision, smooth walk/turn, and per-painting focus detection. In three.js these are lights, an AABB clamp, a velocity lerp, and an angle check. In CSS 3D every one is hand-rolled against inconsistent `preserve-3d` browser behavior, and real lighting is impossible. The cost is ~250-300 KB gzipped JS, loaded only on the `/` route. Gallery and story pages stay lean. Accepted.

**Evaluability requirements (non-negotiable):**
- `<Canvas gl={{ preserveDrawingBuffer: true }}>` so Playwright screenshots capture the WebGL frame reliably.
- A DOM HUD (section 7) mirrors all interactive state into data attributes so the evaluator can assert position, heading, pitch, and focus without reading pixels.
- `?face=<wall>` query param (`roman|ramayana|mahabharata|curator`) places the camera at room center facing that wall, pitch 0. Permanent affordance for evaluation and debugging.
- `frameloop="always"`, DPR clamped to `min(devicePixelRatio, 2)` (1.5 below 500px viewport width).

### 1.2 Texture pipeline: build-time thumbs via sharp

Covers are 1-2 MB PNGs; the room shows a dozen-plus at once. Loading the originals as textures is 20+ MB of network and VRAM.

- `scripts/build-thumbs.mjs` (sharp, devDependency): for every `public/covers/*.png`, write `public/covers/thumbs/<basename>.webp`, max width 1024 (aspect preserved), quality 75 (~40-150 KB each). Skip when the thumb exists and is newer than the source. Never fail on an empty covers dir.
- Wired as both `prebuild` and `predev` npm scripts, so `pnpm build` (Vercel included) and local dev always have thumbs. `public/covers/thumbs/` is gitignored; the story pipeline needs zero changes — new covers get thumbed at next build.
- Convention: thumb URL is derived from the cover path (`/covers/X.png` → `/covers/thumbs/X.webp`). `stories.ts` exposes it as `coverThumb`.
- The room uses thumbs only. Story pages use the full-resolution cover (one image set per page, fine).

### 1.3 Routes

| Route | Content |
|---|---|
| `/` | The museum room (canvas). HTML shell behind it: `<h1>History Stories</h1>`, one-line description, visible "Gallery view" link (also the no-JS/no-WebGL path). |
| `/gallery` | The current card grid, moved verbatim from today's homepage, plus an "Enter the museum" link in the header. Permanent accessibility/SEO/crawl path and mobile-friendly fallback. |
| `/<slug>` | Story page: triptych carousel on top, story text below, Escape returns to the room. |

### 1.4 Camera persistence

`sessionStorage` key `museum.camera.v1` = `{ x, z, headingDeg, savedAt }`.
- Written: throttled every 500 ms while moving, and synchronously before any Enter-navigation to a story.
- Read: on room mount. If present, restore exactly. If absent (direct visit, new tab), use the default spawn.
- `?face=` overrides any saved state for that load (eval determinism).
- Pitch (section 3.3) is **not** persisted; the schema stays v1. Pitch resets to 0 on mount and on `?face=`.

---

## 2. The room

### 2.1 Geometry and orientation

- Square room, 24 × 24 units, walls 5 high. Eye height 1.6. Heading in degrees, 0° = facing Wall 1; ArrowRight increases heading clockwise. Geometry, wall assignment, spawn, and `?face=` headings are unchanged from the night build.
- **Materials (the Broad look):**
  - Walls: warm white (~`#f2f1ed`), roughness ~0.95, metalness 0. Clean, matte, gallery white.
  - Floor: light-gray polished concrete (~`#c9c9c5`), roughness ~0.4, low metalness (≤ 0.1) for a subtle sheen. Optionally a canvas-generated texture with faint panel seams (hairlines ~every 4 units, `#b8b8b4`); keep it subtle.
  - Ceiling: the "veil" — see 2.3.
  - Canvas background: light neutral (~`#e9e8e4`); no dark bleed at edges. The page shell behind the canvas remains dark site chrome.

| Wall | Tradition | Compass | Position |
|---|---|---|---|
| Wall 1 | Rome | north | z = -12 |
| Wall 2 | Ramayana | east | x = +12 |
| Wall 3 | Mahabharata | south | z = +12 |
| Wall 4 | Curator's wall | west | x = -12 |

- Default spawn: `(x: -9.5, z: 0)`, heading 90° — just inside the entrance (Wall 4 at your back), looking across the room at the Ramayana wall, Rome to your left, Mahabharata to your right.

### 2.2 Paintings and layout

- A painting = a textured quad of the story's `coverThumb`, 3.0 w × 1.875 h (16:10, matching cover aspect), centered at y = 2.0. Layout math (`layoutWall`, two-row fallback, 16-per-wall cap, zero manual wiring for new stories) is unchanged.
- **Frames (restyled for white walls):** thin profile, ~0.07 border per side (box ≈ painting + 0.14), depth ~0.06. Matte near-black (`#26221e`) or warm walnut (`#3a2e22`) — generator picks one and uses it everywhere. No bronze chunk; the Broad hangs thin frames.
- **Placards (restyled):** dark text (~`#2b2b2b`) on an off-white card (~`#fbfaf7`) with a hairline border, like a real wall label. The old light-text-on-dark `makeTextTexture` defaults are for the night room and will be invisible on white walls; restyle the texture helpers, do not just reuse them.
- **Wall labels:** tradition name in caps as before, but rendered in **darkened tradition tints** legible on white: roman `#92600b`, ramayana `#066e54`, mahabharata `#1e4fae`, curator `#6d28d9` (or equivalent ~700-800 shades). Remove the colored point-light washes near labels; in an evenly lit room they read as stains.

### 2.3 Lighting ("The Broad daylight gallery") — supersedes the night spec

This section replaces the old "museum at night" lighting. Reference: The Broad, third floor — luminous, calm, monumental, nothing dark or moody.

- **Ceiling veil:** a canvas-generated honeycomb texture on the ceiling plane: hexagonal cells whose interiors glow near-white (skylight through each cell) and whose walls are light gray (~`#d8d7d2`) with per-cell gradient shading to fake the deep sculptural cells. Roughly 10-14 cells across the room; texture generated once, canvas ≤ 2048px. Apply as an emissive material (emissive map or `meshBasicMaterial`) so the ceiling reads as the light source. Instanced hex-cell geometry is acceptable only if it stays within the perf budget; the texture is the default approach.
- **Light rig:** a `hemisphereLight` (sky white, ground light gray, intensity ~1.0-1.3) plus moderate ambient (~0.5, neutral/warm-neutral). Even, soft, shadow-free illumination everywhere; every wall, the floor, and the ceiling clearly visible from anywhere in the room.
- **Fog: removed.** No distance haze inside a 24-unit bright room.
- **Per-painting spotlights:** keep at most as subtle accents (intensity cut to roughly a quarter of the night values, no visible hard pools), or remove entirely. The focus highlight no longer depends on a spotlight bump (see section 4).
- **Screenshot bar:** any `?face=` screenshot at 1280×900 shows white walls, the light floor at the bottom of frame, and the glowing honeycomb ceiling at the top of frame, with overall bright exposure (mean luminance well above the old night build).

---

## 3. Controls

### 3.1 Desktop keyboard

- ArrowUp / ArrowDown: walk forward / back along heading. ArrowLeft / ArrowRight: turn. WASD aliases (W/S/A/D).
- Smooth motion: target velocity 3 units/s walk, 100°/s turn, lerped (accelerate/decay over ~150 ms). No teleporting; per-frame displacement stays small and continuous.
- Collision: camera position clamped to the room AABB inset by margin 1.5 from every wall. Sliding along a wall is fine; passing through is not.
- Enter: open the focused painting (section 4). Escape inside the room: no-op.
- First-visit hint overlay (DOM, `localStorage` flag `museum.hintSeen.v1`). Copy once pointer controls land: "Arrow keys or scroll to walk · drag to look around · Enter to view a painting · Esc to step back" (touch-appropriate variant on coarse pointers). Dismisses on first keypress, wheel, drag, touch-control press, or its close button.

### 3.2 Mobile / touch

Movement parity is not required; usability is.

- At touch/small viewports, show an on-screen control cluster (bottom center, semi-transparent): turn-left, forward, back, turn-right. Press-and-hold = continuous movement (pointer events, not click).
- Tap a painting (raycast on tap): first tap focuses it (highlight + prompt); tapping the prompt or the painting again opens the story.
- The `/` shell always shows the "Gallery view" link; mobile users who hate walking get the grid.

### 3.3 Trackpad and pointer (new, 2026-06-11)

All pointer input feeds the **same** target-velocity / lerp / clamp / HUD pipeline in `WalkControls` as the keyboard and touch cluster (export impulse/drag setters alongside `pressAction`). Nothing bypasses the collision clamp or the HUD writes.

- **Wheel / two-finger scroll** on the canvas (non-passive listener, `preventDefault` so the page never scrolls or pinch-zooms):
  - `deltaY < 0` (scroll up) = walk forward; `deltaY > 0` = walk back.
  - `deltaX > 0` = turn right (heading increases); `deltaX < 0` = turn left.
  - Wheel input converts to a velocity impulse that decays over ~250 ms after scrolling stops, capped at the keyboard speeds. Tuning bound: a single `mouse.wheel(0, -300)` displaces the camera between 0.5 and 4 units total.
- **Pointer drag** (any pointer type, primary button) on the canvas = look:
  - Horizontal: drag right increases heading (turn right), ~0.2-0.35°/px.
  - Vertical: drag up pitches the view up, ~0.1-0.2°/px, **clamped to ±25°**. Pitch exists so two-row walls' top row can be aimed at; it is render + focus state only (not persisted, reset by `?face=` and on mount), mirrored to the HUD as `data-pitch`.
  - Drag vs tap: a pointer that moves > 5 px is a drag; suppress the resulting click so a drag never focuses or opens a painting.
- Keyboard, touch cluster, wheel, and drag must coexist; simultaneous inputs sum into the same velocity targets and the strongest clamp wins.

---

## 4. Painting interaction

### 4.1 Gaze focus (new rule, 2026-06-11 — replaces proximity focus)

The old rule (distance < 3.0 AND within ±35° of heading) forced you to stand right in front of a painting. Monte's feedback: focus should follow what you are pointing at, anywhere in your field of vision. New rule, evaluated per frame:

- Candidates: every hung painting whose front faces the camera. **No distance gate** — anything visible in the room is focusable.
- Gate: the painting center's azimuth offset from the view direction is ≤ 12°.
- Score: `azimuthOffset + 0.5 × elevationOffset` (elevation measured against current pitch); smallest score wins; ties broken by distance (nearer wins). At level pitch this naturally prefers the bottom row on two-row walls; pitching up reaches the top row.
- An equivalent screen-center raycast implementation is acceptable if it meets the same observable contract: point-blank focus still works (standing at the wall, facing the painting dead-on), the painting at view center focuses from across the room, and aiming at empty wall clears focus.
- At most one painting focused. No candidate within the gate = no focus.

### 4.2 Response, open, unfocus

- **Focused response (restyled for the bright room):** a thin emissive outline in the tradition tint around the frame (slightly larger plane or edge mesh, toggled on focus) plus an optional slight brightness lift on the canvas. It must be clearly visible in a screenshot against white walls; the old emissive-frame + spotlight bump is invisible in daylight. The DOM prompt `#museum-prompt` behavior is unchanged: story title + "Press Enter to view" (touch: "Tap to view").
- **Unfocus:** aiming away (no candidate within the gate) clears the highlight and hides the prompt.
- **Enter (or prompt tap):** persist camera to sessionStorage, then client-navigate to `/<slug>`. Enter with no focus does nothing.
- **Tap focus:** the tap override (`focusStore.tapSlug`) is retained. With gaze focus there is deliberately no distance gate, so opening a painting from across the room (by gaze or tap) is **intended behavior**, consistent everywhere.

---

## 5. The story page

### 5.1 Triptych carousel (three images, one source cover)

No image-generation key exists here, and every story currently has exactly one cover. The three panels are **deterministic treatments of the single cover**, CSS-only (an `<img>` inside an `overflow-hidden` container; `object-position`, `transform: scale`, `filter`):

1. **The Painting** — full cover, `object-fit: cover`, no treatment.
2. **Detail** — scale 1.8, `object-position: 25% 40%` (left-third close-up), slight warm vignette overlay.
3. **Archival plate** — scale 1.4, `object-position: 75% 50%`, `grayscale(1) sepia(.35) contrast(1.05)`, thin tradition-colored border.

**Forward compatibility:** frontmatter may supply `covers: ["/covers/a.png", ...]` (list). `stories.ts` exposes `covers: string[]` (frontmatter list if present, else `[cover]`). The carousel uses real images for as many panels as provided and fills the remainder with the derived treatments above. When the pipeline starts generating variants, no site change is needed.

### 5.2 Carousel behavior

- Horizontal strip, one panel visible, height ~50vh (min 260px). Three position dots beneath; active dot in the accent color; dots are buttons.
- Desktop: ArrowRight / ArrowLeft cycle panels (wrap around). ArrowUp/Down are left alone so the page still scrolls.
- Mobile: swipe via horizontal scroll-snap; dot state synced from scroll position; dots tappable.
- Implemented as a client component; the rest of the story page stays a server component.

### 5.3 Escape back to the room

- A client `EscapeReturn` component listens for Escape and `router.push("/")`. The room restores from `museum.camera.v1` — you stand exactly where you were (±float noise), same heading.
- Visible equivalents for mouse/touch: a "← Back to the museum (Esc)" button near the title and in the footer; footer also links to `/gallery`.
- Direct visitors (no saved camera) land at the default spawn. No errors.

---

## 6. Wall 4: the curator's wall — Entrance + New Acquisitions

**Decision:** Wall 4 is the entrance wall, carrying (a) a museum placard and (b) a "New Acquisitions" row.

- **Placard** (center-left of wall, framed like a painting but text): "HISTORY STORIES" plus the controls legend. **Restyle for daylight:** light plate (off-white) with dark text; thin frame matching the paintings. The subtitle "A Night Gallery" is obsolete — replace with something fitting the daylight room (e.g., "The Collection" or "A Walking Gallery"); no night references. When sprint 8 lands, the legend mentions scroll/drag alongside arrows, Enter, Esc.
- **New Acquisitions:** the 3 most recent stories by frontmatter `date`, regardless of tradition, hung beside the placard with a small "NEW" tag. These are duplicates of their tradition-wall copies and behave identically (focus, Enter, Escape-return).

**Why this over a rotating exhibit:** instructions become diegetic and permanent (the overlay hint shows once; the wall is always there when you turn around at spawn). New Acquisitions gives returning visitors a reason to look at Wall 4 every visit, and it is fully automatic — `sortByDate.slice(0, 3)` — so the continuously-running story pipeline keeps the wall fresh with zero curation, exactly matching the "no manual wiring" requirement.

---

## 7. Evaluability contract (DOM HUD)

A visually-hidden `<div id="museum-hud">` on `/`, attributes mutated directly each frame (no React re-render):

| Attribute | Value |
|---|---|
| `data-x`, `data-z` | camera position, 2 decimals |
| `data-heading` | degrees 0-360, 1 decimal |
| `data-pitch` | degrees -25 to 25, 1 decimal (0 until first vertical drag) |
| `data-focused` | focused story slug or `""` |
| `data-loaded` | `"true"` once all wall textures resolved |
| `data-wall-roman` / `-ramayana` / `-mahabharata` / `-curator` | comma-separated slugs hung on that wall, in layout order |

Visible DOM elements the evaluator can assert: `#museum-prompt` (focus prompt), the hint overlay, the touch control cluster, the "Gallery view" link. Existing attribute semantics are frozen; `data-pitch` is the only addition.

> **Clarification (2026-06-11, second revision):** `data-x/z/heading/pitch` describe the PLAYER. Through sprint 10 the player and the camera were the same point, so this is not a behavior change and every shipped assertion holds. From sprint 12 on, the camera may trail the player (third person); the HUD keeps reporting the player. New attributes for camera mode and presence are specced in 11.5 and 12.6 — they are additions; nothing in the table above changes meaning.

---

## 8. Data model

`Story` in `src/lib/stories.ts` gains:

```ts
covers: string[];     // frontmatter covers ?? [cover]
coverThumb: string;   // /covers/thumbs/<basename>.webp derived from cover
```

Frontmatter stays backward compatible; `covers` is optional. No story file edits required.

New/changed files (target shape, not a mandate on names elsewhere):

```
scripts/build-thumbs.mjs        sharp resize, prebuild + predev
src/app/page.tsx                museum shell (h1, links, dynamic <MuseumRoom>)
src/app/gallery/page.tsx        the old grid, moved
src/app/[slug]/page.tsx         + <CoverCarousel/>, <EscapeReturn/>
src/components/museum/MuseumRoom.tsx     Canvas, scene, lights, veil ceiling
src/components/museum/Painting.tsx       quad + thin frame + placard + focus outline
src/components/museum/WalkControls.ts(x) keys/touch/wheel/drag -> velocity, clamp, HUD writes
src/components/museum/layout.ts          wall assignment + spacing math
src/components/museum/textures.ts        canvas textures: labels, placards, honeycomb veil
src/components/CoverCarousel.tsx         triptych client component
src/components/EscapeReturn.tsx          Escape -> router.push("/")
```

---

## 9. Performance budget

- `/` route JS ≤ ~350 KB gzipped (three + R3F + drei subset). Other routes unchanged.
- Textures: thumbs only in the room, ≤ 200 KB each, ≤ ~4 MB total at current count. Honeycomb veil texture generated once per mount, canvas ≤ 2048px.
- Light count bounded: hemisphere + ambient + (optional) accent spots, no shadows; target 60 fps on a mid laptop, degrade gracefully via DPR clamp.
- Loading: room fades in once `data-loaded="true"`; before that, a minimal "Entering the museum…" state. No flash of unlit/untextured geometry.

(Revised by 12.7: the `/` budget rises to ≤ 400 KB gzipped once the lazy presence chunk lands.)

---

## 10. Fallbacks and accessibility

- **No WebGL / context creation fails:** shell shows a message and the "Gallery view" link instead of a dead canvas. No console error spam. Copy uses plain punctuation (no em dashes, repo convention).
- **No JS:** shell h1 + gallery link are server-rendered.
- **`/gallery`** is the permanent flat path: every story reachable by normal links, no canvas required.
- **Reduced motion:** `prefers-reduced-motion` halves movement speed and disables the fade/easing flourishes; a small note offers the gallery link.
- Story pages remain fully static, crawlable, and keyboard accessible (carousel dots are buttons, panels have alt text).

---

## 11. The body: third-person view (new, 2026-06-11 second revision)

GOAL.md #1: "I want to see my human body, especially as I walk." Third person becomes the default view; a readable human avatar stands in the room and walks where you walk. Everything in sections 3-4 keeps working unchanged.

### 11.1 Decision: procedural articulated avatar, zero new 3D dependencies

**Decision:** the body is a code-built articulated human — a hierarchy of ~18 primitive meshes (head, neck, torso, pelvis; per side: upper arm, forearm, hand, thigh, calf, foot) under one group, posed every frame by a deterministic gait function. No GLB, no GLTFLoader, no AnimationMixer, no drei.

Why procedural over a vendored CC0 rigged GLB (Quaternius/KayKit class):

- **Zero acquisition risk.** This build environment's egress may block downloading model files; a procedural body cannot be blocked, and the sprint cannot stall on an asset hunt or license vetting.
- **Exact gait sync.** The walk cycle is driven directly by the same velocity pipeline that moves the player, so stride frequency tracks speed precisely and feet never skate. Clip-based animation only approximates this with playback-rate hacks.
- **Cheap per peer.** Shared geometries, per-peer cloned materials for tinting (section 12), no skinned mesh or skeleton per avatar. Matters once several visitors stand in the room on a phone.
- **Deterministic and evaluable.** Pose is a pure function of (speed, phase, time); screenshots are reproducible.

The cost is stylization: a clean, faceless, modern gallery figure rather than a photoreal human. That suits the Broad room. GOAL.md's stated failure mode is "a sliding mannequin or a floating capsule" — the sin is skating and stiffness, which the gait spec (11.2) addresses; mesh fidelity is secondary. **Upgrade path:** the body hides behind an `AvatarBody` component whose input is a pose (speed, gait phase, heading, tint), so a rigged GLB could replace the primitives later without touching camera, gait, or presence code. Whether to spend that fidelity budget is a future taste call for Monte, not a sprint here.

### 11.2 Avatar anatomy and gait

- **Proportions:** total height ~1.75 (room eye height 1.6 preserved as the aim origin), believable ratios: head ~0.24 tall, legs ~52% of height, shoulder width ~0.44. Rounded primitives (capsules / capsule-box mix), matte materials (roughness ~0.8), no shadows.
- **Color blocking** so it reads as a clothed person, not a wood figure: neutral-warm head and hands, distinct shirt tone, darker trousers, near-black shoes. The local player wears neutral warm charcoal; remote visitors get the tint palette (12.4).
- **Walk gait:** phase advances at `2π · speed / stride` (stride ~0.85 u per step, ≈ 1.75 Hz full cycle at 3 u/s). Legs swing in antiphase ±~32° at the hip with knee flex up to ~45° during swing (no straight-leg compass gait), feet lift ~0.12 u, arms counter-swing ±~22° opposite the same-side leg with a slight elbow bend, torso bobs ±~0.03 u at twice the cycle frequency, slight forward lean (~4°) scaling with speed. Backward walking plays the cycle in reverse at reduced amplitude.
- **Turn-in-place** (|turn rate| > ~30°/s, speed ≈ 0): a low-amplitude stepping shuffle (small alternating foot lifts ~2 Hz) so rotating never looks like a statue on a turntable.
- **Idle** (speed < 0.05): blend to a natural stance within ~250 ms; subtle breathing (chest/shoulders ±0.01 u at ~0.25 Hz) and a very slow weight sway. Never a frozen mid-stride pose.
- **Blending:** pose targets lerp over ~120-250 ms across walk/turn/idle transitions; no snapping.
- **Raycast-inert:** avatar meshes never intercept pointer raycasts (noop `raycast` or layers), so tapping a painting through or past a body always works.

### 11.3 Player rig: camera modes, boom, wall collision

`WalkControls` keeps sole ownership of input → velocity → clamp → player state; nothing in section 3 changes. Player state (x, z, heading, pitch, speed) moves into a plain `playerStore` module (same pattern as `focusStore`), written only by WalkControls each frame; the camera rig, FocusManager, local avatar, and presence sender all read from it.

- **Modes:**
  - `third` (default): camera on a boom behind the player — default boom ~3.1 u, camera height ~2.35, looking at a point ~1.45 u high at the player. The whole rig yaws with heading; pitch tilts the look (pitching up raises the look target so the top row is still aimable). At default boom the full body is visible, occupying roughly the lower third of a 1280×900 frame, with the facing wall and paintings clearly visible past it.
  - `first`: camera at the eye, exactly the shipped behavior; the local body is fully hidden (no limbs in view). First person survives as a toggle because it is near-free and better for close reading.
- **Boom collision (camera AND body stay in the room):** each frame the ideal camera point is clamped to the room interior inset 0.35 from walls and ceiling; if outside, the boom shortens along its axis until the camera is inside. Minimum boom 0.7. The camera never clips a wall and never shows the void. When the boom is < ~1.3 the local body fades toward transparent so it cannot blind the view, restoring as the boom re-extends. Optional light positional smoothing on the camera (≤ ~120 ms) for feel; disabled under `prefers-reduced-motion`.
- **Toggle:** keyboard `V`, plus a visible DOM button `#museum-cam-toggle` (top-right cluster near the "Gallery view" link, accessible label), required on coarse pointers. Mode persists in `sessionStorage` `museum.camMode.v1` and survives story round trips; new sessions default to `third`. `?cam=first|third` forces a mode for that load (eval affordance, same spirit as `?face=`); `?face=` itself only places the player and does not touch the mode.

### 11.4 Aiming and focus from third person

- **The aim ray is the player's, not the camera's:** origin at the player eye (x, 1.6, z), direction from heading + pitch. FocusManager keeps its exact section-4.1 math but reads `playerStore` instead of the camera. In first person this is identical to today by construction.
- **Observable contract:** the chase camera sits directly behind the player on the same heading, so the focused painting is the one at/near horizontal screen center, above the avatar's head. Point-blank focus, cross-room focus, empty-wall unfocus, `data-focused`, `#museum-prompt`, Enter, and Escape-return all behave exactly as sections 4.1-4.2.
- **Tap focus** raycasts from the rendering camera (taps hit what they visually hit); bodies never intercept (11.2). The `focusStore.tapSlug` override is unchanged.

### 11.5 HUD and persistence extensions (extends section 7; existing semantics frozen)

New `#museum-hud` attributes:

| Attribute | Value |
|---|---|
| `data-cam-mode` | `"third"` or `"first"` |
| `data-cam-dist` | current boom length, 2 decimals (`"0.00"` in first person) |
| `data-speed` | player planar speed in units/s, 2 decimals |

`sessionStorage`: `museum.camera.v1` unchanged (player pose). New key `museum.camMode.v1` = `"third" | "first"`.

---

## 12. Company: live presence (new, 2026-06-11 second revision)

GOAL.md #2: every live visitor materializes in the same room, walks around with their own body in real time, and vanishes gracefully. Target scale: a handful of friends. Anonymous: bodies with a generated label and a color variant, nothing else. Solo-graceful: alone, the room is exactly as good as today.

### 12.1 Transport decision: WebRTC via trystero (Nostr signaling), zero credentials

**Decision:** production presence uses **trystero** (MIT, ~v0.23, actively maintained) with its default **Nostr** strategy: peers discover each other through public Nostr relays (hundreds active; trystero spreads across a relay list for redundancy), then all traffic flows peer-to-peer over WebRTC data channels, end-to-end encrypted. The relays never see app data, only encrypted rendezvous. No account, no API key, no server: it works the moment it lands on main, which GOAL.md explicitly prefers. Config: `{ appId: "history-stories-museum" }`, room `"main"` — one museum room, one presence room. trystero's MQTT strategy (public brokers) is the documented in-code fallback knob if Nostr relays degrade; same API, one-line swap.

Why not the alternatives:

- **y-webrtc public signaling:** its default public servers have a documented history of outages and discontinuation; reliability would rest on infrastructure nobody maintains.
- **PeerJS public cloud:** a single central broker, and no room discovery — peers must exchange IDs out of band, which forces building a rendezvous service anyway.
- **PartyKit / Liveblocks / Supabase Realtime:** more dependable rendezvous, but all require an account (and a publishable key committed to a public repo). Violates the zero-credential first ship.

> **Decision for Monte (surfaced per GOAL.md, not blocking any sprint):** two known limits of the free path. **(1) Public relay flakiness:** if friends occasionally fail to see each other, the robust upgrade is Supabase Realtime presence (free tier; the anon key is publishable and safe in a public repo, but Monte must create the project) or PartyKit (free tier; account plus a one-time deploy). The transport abstraction below makes either a drop-in third transport, no protocol changes. **(2) NAT traversal:** with no TURN server, a small fraction of peer pairs (symmetric-NAT cellular networks, strict corporate NATs) cannot form a WebRTC connection at all. Free-tier TURN (Cloudflare, metered.ca) also needs an account and key. Recommendation: ship zero-credential now; revisit only if real-world misses are observed.

### 12.2 Transport abstraction and the local eval transport

All networking sits behind one interface so the room never knows which wire it is on, and so presence is provable with zero internet (the evaluator's sandbox may block all egress):

```ts
type PeerState = { x: number; z: number; heading: number; pitch: number; speed: number };

interface PresenceTransport {
  readonly kind: "webrtc" | "local" | "off";
  join(room: string): void;                                   // idempotent
  sendState(s: PeerState): void;                              // fire-and-forget, latest-wins
  onPeerState(cb: (id: string, s: PeerState, at: number) => void): void;
  onPeerLeave(cb: (id: string) => void): void;
  leave(): void;                                              // best-effort bye
}
```

Selection via `?net=` (permanent affordance, like `?face=`):

- **(no param) → `webrtc`:** dynamic-import the trystero chunk only after `data-loaded="true"`. Any failure (import, join, relays unreachable, WebRTC unsupported) degrades silently to `off` — at most one `console.info`, never a `console.error`, so the zero-console-error eval gate stays meaningful and the solo museum is untouched.
- **`?net=local` → `local`:** a `BroadcastChannel("museum.presence.local")` transport with a per-tab random id. Same-origin tabs in one browser profile (including two Playwright pages in one context) see each other with no internet. Join is announced by first state; leave by `bye` plus heartbeat timeout. This is not test-only throwaway: it is the reference implementation of the protocol layer (12.3), which trystero merely re-wires.
- **`?net=off` → `off`:** no presence module loads at all; zero network and CPU cost.

The no-WebGL fallback and `/gallery` never load presence in any mode.

### 12.3 Wire protocol

- **Identity:** ephemeral per-session peer id (trystero `selfId`; random hex for local). Payloads are pose-only; no PII exists anywhere in the protocol by construction.
- **Messages** (one JSON action, trystero `makeAction("st")` plus a `bye`):
  - `state { x, z, h, p, s }` — quantized to 2 decimals (≤ ~80 bytes). The first state from an unknown id IS the join signal; periodic states are the heartbeat.
  - `bye {}` — best effort on `pagehide` and room unmount.
- **Tick:** 10 Hz while moving (pose changed > 0.01 u or 0.5°); heartbeat every 2 s while idle. Receiver timeout 6 s (3 missed heartbeats) = leave.
- **Receive pipeline per peer:** keep the last two timestamped states; render the avatar ~150 ms behind newest with position lerp and shortest-arc heading lerp; extrapolate at most 250 ms across gaps, then freeze into the idle pose. Remote gait is driven by the interpolated speed, so their legs move exactly when their body moves and stop when it stops. Smoothness bar: a remote walking at full speed renders with no visible step > 0.5 u between frames.
- **Teleport rule:** a state jump > 3 u (peer used `?face=`, or returned from a story across the room) repositions via a quick fade-out/in at the new spot — never a cross-room glide.
- **Peer cap:** render at most 8 remote avatars; additional peers are tracked but not rendered (handful-scale target; the cap protects mobile).

### 12.4 Identity: colors and labels

- **Color:** `colorIndex = hash(peerId) mod 8` into a fixed palette of 8 muted, white-wall-legible tints — terracotta `#b85c38`, teal `#2d7d72`, indigo `#4f5d9e`, ochre `#b08b2e`, plum `#8e4f79`, moss `#6b7f3a`, slate `#5b7793`, rose `#b06161` (generator may tune shades; must keep 8 clearly distinct hues). Applied to the remote shirt and label accent. The local body stays neutral charcoal so company pops. Collisions at handful scale are acceptable.
- **Label:** `Visitor N`, assigned locally in arrival order: the first peer you see this session is "Visitor 2" (you are implicitly 1 and unlabeled). Numbering is per-observer, not globally consistent — acceptable: anonymous, no chat, nobody can compare notes. Rendered as a billboard sprite (canvas texture, dark text on an off-white pill, placard-styled) ~0.35 u above the head, legible in a 1280×900 screenshot from across the room.

### 12.5 Remote avatar rendering and lifecycle

- Remote bodies reuse `AvatarBody` (shared geometry, cloned tinted materials).
- **Lifecycle, each state mirrored to the DOM (12.6):** `entering` (first state received: fade/scale in over ~400 ms) → `live` → `leaving` (bye or timeout: fade out ~400 ms, then unmount). Materializing and vanishing are staged, never pops.
- Remote bodies are scenery: no collision with the local player (walking through one is fine), raycast-inert, never grab focus, never alter local controls or the HUD's player attributes.
- A small visible chip `#museum-presence-count` (e.g. "2 in the room", styled like the nav pill) appears only while rendered peers ≥ 1; hidden when alone and under `?net=off`. This is the only UI presence adds, and only with company — solo-graceful holds.

### 12.6 Evaluability contract extensions (presence)

On `#museum-hud`:

| Attribute | Value |
|---|---|
| `data-net` | `"webrtc"` \| `"local"` \| `"off"` — the settled transport for this load |
| `data-peers` | count of currently rendered remote avatars |

Plus one child node per rendered peer, `<div class="museum-peer">`, attributes updated at ≥ 10 Hz:

| Attribute | Value |
|---|---|
| `data-peer-id` | transport peer id |
| `data-peer-label` | e.g. `Visitor 2` |
| `data-peer-color` | assigned palette hex |
| `data-peer-x`, `data-peer-z`, `data-peer-heading` | the rendered (interpolated) pose, 2 decimals |
| `data-peer-state` | `entering` \| `live` \| `leaving` |

Contract: two Playwright pages joined via `?net=local` can prove materialize-in, smooth interpolated movement (sample `data-peer-x/z` over time), label/color variants, and clean despawn from these attributes plus screenshots — no pixel reading, no internet.

### 12.7 Performance and solo-graceful budgets

- Each avatar ≤ ~20 meshes / ~2k triangles, geometry shared across all bodies; per-frame pose updates allocation-free.
- Presence chunk (trystero + glue) lazy-loaded after `data-loaded`; ≤ ~40 KB gzipped extra. The `/` route budget rises to ≤ 400 KB gzipped (revises section 9); other routes unchanged.
- Network: ≤ 10 Hz sends, ≤ ~80 bytes per message; at 8 peers under 8 KB/s total.
- Solo: zero remote meshes and no per-frame presence work beyond the heartbeat timer. No presence failure of any kind may unmount, stall, or error the room. Mobile: the existing DPR clamp plus the peer cap keep 4 simultaneous bodies usable at 390px.

### 12.8 Files (target shape)

```
src/components/museum/playerStore.ts            player pose written by WalkControls, read by rig/focus/avatar/presence
src/components/museum/AvatarBody.tsx            shared articulated body + gait pose function (local and remote)
src/components/museum/PlayerRig.tsx             camera modes, boom + wall clamp, local body mount, V toggle, HUD cam attrs
src/components/museum/presence/types.ts         PresenceTransport, PeerState
src/components/museum/presence/local.ts         BroadcastChannel reference transport
src/components/museum/presence/webrtc.ts        trystero wrapper (lazy chunk)
src/components/museum/presence/PresenceManager.tsx  join/leave, peer map, interpolation, DOM mirror, remote bodies, count chip
```

Dependency added in the presence sprint: `trystero` (^0.23). Nothing else.

---

## 13. Revisions from Monte's live test 2 (2026-06-12)

- **Pace** (revises 3.1, 11.2): walking 4 u/s (was 3); holding Shift sprints at 7 u/s. Gait amplitude saturates at 4 u/s; stride lengthens 0.85 -> 1.15 and lean/swing deepen toward 7. Wheel impulses stay at walking pace.
- **Arms** (revises 11.2): shoulder swing ±~36-47 deg (was ±22), dynamic elbow bend; counter-swing unchanged.
- **Bodies** (extends 11.1, 12.4): four avatar variants (skin/outfit/hair/build) in `avatarVariants.ts`. New browsers are assigned one at random (localStorage `museum.avatar.v1`); `B` cycles; the variant travels in presence state as optional field `v` (absent = 0, backward compatible). Remote shirts no longer take the peer palette tint; the palette remains on label borders for identity.
- **Multiplayer reliability note**: production e2e (real Nostr relays, separate browser contexts) verified working on the live site 2026-06-12. Known unfixed-by-design gaps of the zero-credential transport: TURN-less symmetric NAT pairs (e.g. cellular-to-wifi) cannot connect; the upgrade path (PartyKit/Supabase + TURN) remains a Monte decision per 12.1.
