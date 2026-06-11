# Goal

An interactive museum for History Stories. The site IS a room you walk through, not a list you scroll.

## The room

- One gallery room, four walls. First-person POV camera, no body.
- Arrow keys move and turn: up/down walk forward/back, left/right turn. Walls stop you; you cannot walk through them.
- Wall 1: Rome. Wall 2: Ramayana. Wall 3: Mahabharata. Wall 4: the curator's wall - the planner picks its purpose (entrance/instructions, new acquisitions, rotating exhibit) and justifies it in the spec.
- The paintings on the walls are the cover images of published stories, framed, grouped by tradition onto their wall, with wall labels.
- Walk up to a painting and it responds (highlight, prompt). Press Enter to open that story.

## The story page

- Three images at the top. Cycle with arrow keys on desktop, swipe on mobile. Position dots underneath.
- Scroll down to read the full story text.
- Press Escape to exit back into the room, standing exactly where you were.

## Quality bar

- Fully usable in a desktop browser with keyboard only. Mobile gets a usable fallback for movement; swipe must work on the story carousel.
- Static export stays green (`pnpm build`). No backend.
- Atmosphere matters: lighting, frames, labels. A museum at night, in keeping with the existing dark theme and tradition colors.
- New stories published by the story pipeline must appear in the museum without manual wiring.

This file is human-owned. The planner reads it; agents never edit it.
