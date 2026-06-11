# SPEC — The History Stories Museum

Derived from `agent/GOAL.md` (2026-06-11), revised 2026-06-11 after Monte's live test. The site is a first-person gallery room. Stories hang as framed paintings on tradition walls; you walk with arrow keys, trackpad, or drag, point at a painting to focus it, press Enter to read, Escape to step back into the room where you stood.

> **Direction change (2026-06-11, Monte's live feedback — supersedes GOAL.md "museum at night"):** the room is now a bright daylight gallery modeled on The Broad's third-floor gallery in LA (Monte supplied a reference photo): white walls, light polished-concrete floor, and a glowing honeycomb "veil" skylight ceiling that provides even, soft illumination everywhere. Section 2.3 below replaces the old night-lighting spec. Future agents: do NOT revert to the dark room; Monte's live feedback wins over the GOAL.md atmosphere line. Site chrome and other pages keep the existing dark theme.

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

---

## 10. Fallbacks and accessibility

- **No WebGL / context creation fails:** shell shows a message and the "Gallery view" link instead of a dead canvas. No console error spam. Copy uses plain punctuation (no em dashes, repo convention).
- **No JS:** shell h1 + gallery link are server-rendered.
- **`/gallery`** is the permanent flat path: every story reachable by normal links, no canvas required.
- **Reduced motion:** `prefers-reduced-motion` halves movement speed and disables the fade/easing flourishes; a small note offers the gallery link.
- Story pages remain fully static, crawlable, and keyboard accessible (carousel dots are buttons, panels have alt text).
