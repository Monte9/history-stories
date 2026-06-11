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
- Typography hierarchy clear; no near-invisible text on the dark theme
- Hover/active states present on new interactive elements
- Dark theme and tradition colors (amber/Roman, emerald/Ramayana, blue/Mahabharata) respected

## Protocol

- Screenshot at 1280x900 and 390x844 for each checked page, saved under `agent/evals/shots/` (gitignored)
- Verdict file: `agent/evals/YYYYMMDD-HHmmss-sprint-N.md` (committed), structure: one line per hard gate with PASS/FAIL + evidence, soft notes, overall verdict, and concrete fix instructions on FAIL
- Overall verdict is PASS only if all hard gates pass

## Calibration

Monte audits a sampled PASS weekly. When the audit disagrees with a verdict, tighten the failing criterion here rather than in the evaluator prompt.
