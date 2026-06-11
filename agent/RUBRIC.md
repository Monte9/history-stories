# Evaluator Rubric

The evaluator grades the running site against this rubric plus the current sprint's acceptance criteria from `agent/BACKLOG.md`. Every line of the verdict must cite evidence: a screenshot path, a command output, or a DOM/console observation. No evidence, no verdict.

## Hard gates (any FAIL fails the sprint)

1. `pnpm build` exits 0 with no errors
2. Zero console errors on: homepage, one story page, and every page the sprint touched
3. No broken images (check `naturalWidth > 0` on rendered `img` elements)
4. No horizontal overflow at 390px viewport width on touched pages
5. Every acceptance criterion of the current sprint demonstrated by actual interaction (click it, type in it, navigate it), not by reading the code
6. No regressions: homepage and at least one existing story page render correctly at 1280px and 390px

## Soft criteria (note in verdict, do not fail on these alone)

- Spacing and alignment consistent with existing cards/sections
- Typography hierarchy clear; no near-invisible text anywhere (dark-on-dark on the site pages, light-on-white inside the bright room)
- Hover/active states present on new interactive elements
- Dark theme and tradition colors (amber/Roman, emerald/Ramayana, blue/Mahabharata) respected on **site chrome and pages only**: header, overlays, `/gallery`, story pages. This does NOT apply inside the museum room itself — the room is a bright daylight gallery per SPEC 2.3 (Monte's Broad reference, 2026-06-11, supersedes the old night look). A dark, moody room is now a defect, not a theme match.
- The museum room matches the Broad reference vibe: bright, airy, evenly lit, white walls, light polished-concrete floor, glowing honeycomb ceiling; tradition colors appear as legible darkened tints on labels and focus outlines, not as colored light washes

## Criteria alignment (pre-build, every sprint)

Added 2026-06-11 per Monte: the builder and evaluator agree the acceptance criteria BEFORE the build, so evaluation judges whether the implementation is the best outcome for the sprint goal, not merely whether it works. At sprint start the evaluator reviews the planner's draft ACs against the sprint goal, GOAL.md, and SPEC.md: strengthen weak criteria, add outcome-quality criteria (feel, legibility, composition, failure modes), cut redundancy, cap at ~6, keep every criterion interaction-verifiable, prescribe no implementation. The agreed list is recorded in BACKLOG.md (marked "aligned") and `agent/evals/<ts>-sprint-N-criteria.md` before feature code is written. The post-build verdict grades against the agreed list, and an implementation that meets every AC's letter while missing the sprint goal FAILS with evidence.

## Curator taste audit (on request, used by taste-pass sprints)

When a sprint asks for a taste audit, switch from gatekeeper to curator: walk the room at 1280x900 and 390x844, visit every `?face=` wall, do a full story round trip, and judge it as a demanding museum visitor. Deliverable: `agent/evals/<ts>-taste-audit.md` with screenshot evidence and a ranked findings list covering composition, lighting, spacing, typography, copy, and motion feel. Rate each finding "blocks shippable" or "nice to have". Findings must be concrete enough to convert into interaction-verifiable acceptance criteria. An audit is not a verdict; it does not PASS or FAIL a sprint by itself.

## Protocol

- Screenshot at 1280x900 and 390x844 for each checked page, saved under `agent/evals/shots/` (gitignored)
- Verdict file: `agent/evals/YYYYMMDD-HHmmss-sprint-N.md` (committed), structure: one line per hard gate with PASS/FAIL + evidence, soft notes, overall verdict, and concrete fix instructions on FAIL
- Overall verdict is PASS only if all hard gates pass

## Calibration

Monte audits a sampled PASS weekly. When the audit disagrees with a verdict, tighten the failing criterion here rather than in the evaluator prompt.
