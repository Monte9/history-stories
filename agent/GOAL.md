# Goal

The first goal shipped: the site IS a bright, Broad-style gallery room you walk through (sprints 1-10, 2026-06-11). Two new goals now, from Monte's review that morning. Both build on the museum; neither replaces it.

## 1. A body: third-person view

"I want to see my human body, especially as I walk." The camera pulls back to third person: a readable human avatar stands in the room and walks where you walk. The body is the point, so it must read as human (limbs, gait, a walk animation that matches movement speed and turning), not a sliding mannequin or a floating capsule. Everything that works today keeps working from the new view: walking (keys, trackpad, drag), gaze focus, Enter to open a story, Escape back, touch controls. Whether a first-person toggle survives is the planner's call.

## 2. Company: a shared room

"When another person visits the website, I want to see them materialize in the same room and we should be able to walk around together." Every live visitor is present: you see them materialize when they arrive, walk around with their own body in real time, and vanish gracefully when they leave. Target scale is a handful of simultaneous visitors (friends checking out the site), not hundreds. Movement of others must feel alive: interpolated and smooth, not teleporting dots.

## Constraints

- The site stays a static export, deployed by pushing to main. There are no secrets in this repo or its deploy environment. If the best realtime answer needs an account or API key (PartyKit, Liveblocks, Supabase...), the planner surfaces that as a decision for Monte with setup steps, and prefers a zero-credential path (e.g. WebRTC over public signaling) that works the moment it lands on main.
- Solo-graceful: with nobody else online, the room is exactly as good as today. Presence must never break the single-player museum, the no-WebGL fallback, or mobile.
- Anonymous by design: no accounts, no chat, no PII. Visitors are bodies with at most a generated label ("Visitor 2") and a color variant.
- `pnpm build` stays green every sprint.

This file is human-owned. The planner reads it; agents never edit it (this revision records Monte's direction of 2026-06-11 verbatim in spirit).
