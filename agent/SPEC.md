# SPEC — The History Stories Museum

Derived from `agent/GOAL.md` (2026-06-11). The site becomes a first-person gallery room. Stories hang as framed paintings on tradition walls; you walk with arrow keys, press Enter on a painting to read, Escape to step back into the room where you stood.

---

## 1. Architecture decisions

### 1.1 3D stack: react-three-fiber v9 + drei + three

**Decision:** `three` (latest) + `@react-three/fiber` v9 + `@react-three/drei` v10, all React 19 compatible. The room is one client-only component, dynamically imported with no SSR, mounted on the `/` page. Static export is unaffected: the page pre-renders an HTML shell; the canvas hydrates client-side.

**Why not CSS 3D transforms:** the goal demands lighting ("a museum at night"), wall collision, smooth walk/turn, and per-painting focus detection. In three.js these are a point light + spotlights, an AABB clamp, a velocity lerp, and an angle/distance check. In CSS 3D every one is hand-rolled against inconsistent `preserve-3d` browser behavior, and real lighting is impossible. The cost is ~250-300 KB gzipped JS (three ~160, R3F ~35, drei subset + troika text ~70), loaded only on the `/` route. Gallery and story pages stay lean. Accepted.

**Evaluability requirements (non-negotiable):**
- `<Canvas gl={{ preserveDrawingBuffer: true }}>` so Playwright screenshots capture the WebGL frame reliably.
- A DOM HUD (section 7) mirrors all interactive state into data attributes so the evaluator can assert position, heading, and focus without reading pixels.
- `?face=<wall>` query param (`roman|ramayana|mahabharata|curator`) places the camera at room center facing that wall. Permanent affordance for evaluation and debugging.
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

---

## 2. The room

### 2.1 Geometry and orientation

- Square room, 24 × 24 units, walls 5 high. Floor dark polished (subtle roughness), ceiling near-black. Background `--color-bg` (#0a0a0f).
- Eye height 1.6. Heading in degrees, 0° = facing Wall 1; ArrowRight increases heading clockwise.

| Wall | Tradition | Compass | Position |
|---|---|---|---|
| Wall 1 | Rome | north | z = -12 |
| Wall 2 | Ramayana | east | x = +12 |
| Wall 3 | Mahabharata | south | z = +12 |
| Wall 4 | Curator's wall | west | x = -12 |

- Default spawn: `(x: -9.5, z: 0)`, heading 90° — just inside the entrance (Wall 4 at your back), looking across the room at the Ramayana wall, Rome to your left, Mahabharata to your right.

### 2.2 Paintings and layout

- A painting = a textured quad of the story's `coverThumb`, 3.0 w × 1.875 h (16:10, matching cover aspect), inside a raised frame (box border 0.15 thick, dark bronze material), centered at y = 2.0.
- Per-wall layout function `layoutWall(stories, wall)`: usable wall width 20 units.
  - ≤ 6 paintings: full size, evenly spaced.
  - 7-8: shrink uniformly to fit (min width 2.2).
  - > 8: two rows at y = 1.5 and y = 3.2, paintings 2.2 × 1.375, up to 16 per wall. Beyond 16, hang the 16 most recent; wall label appends "+N more in the gallery".
- Stories sourced from `getAllStories()` at build time, grouped by `tradition`, newest first. **New stories appear with zero manual wiring** — the page is rebuilt by the same push that adds the markdown.
- Wall labels: drei `Text` (troika), tradition name in caps ("ROME", "RAMAYANA", "MAHABHARATA", "NEW ACQUISITIONS") above the row, tinted with the tradition color (amber/emerald/blue; violet accent for the curator wall). Each painting gets a small placard `Text` under the frame with the story title.

### 2.3 Lighting ("a museum at night")

- Low ambient (intensity ~0.15, cool blue-violet) so the room reads as night.
- One `SpotLight` per painting, mounted above, angled down at the frame: warm white, soft penumbra, visible pool of light on the wall. Paintings should glow against dark walls.
- Subtle accent: faint tradition-colored point light wash near each wall label.
- Keep total lights bounded: spotlights can be cheap (no shadows, `castShadow` off) to hold frame rate.

---

## 3. Controls

### 3.1 Desktop keyboard

- ArrowUp / ArrowDown: walk forward / back along heading. ArrowLeft / ArrowRight: turn. WASD aliases (W/S/A/D).
- Smooth motion: target velocity 3 units/s walk, 100°/s turn, lerped (accelerate/decay over ~150 ms). No teleporting; per-frame displacement stays small and continuous.
- Collision: camera position clamped to the room AABB inset by margin 1.5 from every wall. Sliding along a wall is fine; passing through is not.
- Enter: open the focused painting (section 4). Escape inside the room: no-op.
- First-visit hint overlay (DOM, `localStorage` flag `museum.hintSeen.v1`): "Arrow keys to walk and turn · Enter to view a painting · Esc to step back". Dismisses on first keypress or its close button.

### 3.2 Mobile / touch

Movement parity is not required; usability is.

- At touch/small viewports, show an on-screen control cluster (bottom center, semi-transparent): turn-left, forward, back, turn-right. Press-and-hold = continuous movement (pointer events, not click).
- Tap a painting (raycast on tap): first tap focuses it (highlight + prompt); tapping the prompt or the painting again opens the story.
- The `/` shell always shows the "Gallery view" link; mobile users who hate walking get the grid.

---

## 4. Painting interaction

- **Focus rule:** the nearest painting with camera distance < 3.0 *and* within ±35° of current heading. Ties broken by smallest angle. One painting focused at most.
- **Focused response:** frame brightens (emissive bump) and its spotlight intensity rises ~1.5×; the DOM prompt `#museum-prompt` appears fixed bottom-center: story title + "Press Enter to view" (touch: "Tap to view").
- **Unfocus:** moving out of range or turning away clears highlight and hides the prompt.
- **Enter (or prompt tap):** persist camera to sessionStorage, then client-navigate to `/<slug>`. Enter with no focus does nothing.

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

**Decision:** Wall 4 is the entrance wall, carrying (a) a lit museum placard and (b) a "New Acquisitions" row.

- **Placard** (center of wall, framed like a painting but text): "HISTORY STORIES — A Night Gallery" plus the controls legend (arrows walk and turn, Enter views, Esc steps back). Rendered as drei `Text` or a pre-rendered texture, lit by its own spotlight.
- **New Acquisitions:** the 3 most recent stories by frontmatter `date`, regardless of tradition, hung beside the placard with a small "NEW" tag on the placard text. These are duplicates of their tradition-wall copies and behave identically (focus, Enter, Escape-return).

**Why this over a rotating exhibit:** instructions become diegetic and permanent (the overlay hint shows once; the wall is always there when you turn around at spawn). New Acquisitions gives returning visitors a reason to look at Wall 4 every visit, and it is fully automatic — `sortByDate.slice(0, 3)` — so the continuously-running story pipeline keeps the wall fresh with zero curation, exactly matching the "no manual wiring" requirement. A rotating exhibit needs curation rules we don't have content for yet.

---

## 7. Evaluability contract (DOM HUD)

A visually-hidden `<div id="museum-hud">` on `/`, attributes mutated directly each frame (no React re-render):

| Attribute | Value |
|---|---|
| `data-x`, `data-z` | camera position, 2 decimals |
| `data-heading` | degrees 0-360, 1 decimal |
| `data-focused` | focused story slug or `""` |
| `data-loaded` | `"true"` once all wall textures resolved |
| `data-wall-roman` / `-ramayana` / `-mahabharata` / `-curator` | comma-separated slugs hung on that wall, in layout order |

Visible DOM elements the evaluator can assert: `#museum-prompt` (focus prompt), the hint overlay, the touch control cluster, the "Gallery view" link.

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
src/components/museum/MuseumRoom.tsx     Canvas, scene, lights
src/components/museum/Painting.tsx       quad + frame + placard + spotlight
src/components/museum/useWalkControls.ts keys/touch -> velocity, clamp, HUD writes
src/components/museum/layout.ts          wall assignment + spacing math
src/components/CoverCarousel.tsx         triptych client component
src/components/EscapeReturn.tsx          Escape -> router.push("/")
```

---

## 9. Performance budget

- `/` route JS ≤ ~350 KB gzipped (three + R3F + drei subset). Other routes unchanged.
- Textures: thumbs only in the room, ≤ 200 KB each, ≤ ~4 MB total at current count.
- No shadows from per-painting spotlights; single material instance per frame type; target 60 fps on a mid laptop, degrade gracefully via DPR clamp.
- Loading: room fades in from black once `data-loaded="true"`; before that, a minimal "Entering the museum…" state. No flash of unlit/untextured geometry.

---

## 10. Fallbacks and accessibility

- **No WebGL / context creation fails:** shell shows a message and the "Gallery view" link instead of a dead canvas. No console error spam.
- **No JS:** shell h1 + gallery link are server-rendered.
- **`/gallery`** is the permanent flat path: every story reachable by normal links, no canvas required.
- **Reduced motion:** `prefers-reduced-motion` halves movement speed and disables the fade/easing flourishes; a small note offers the gallery link.
- Story pages remain fully static, crawlable, and keyboard accessible (carousel dots are buttons, panels have alt text).
