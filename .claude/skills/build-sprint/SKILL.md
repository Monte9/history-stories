---
name: build-sprint
description: Run the autonomous build harness for the History Stories site. Use when asked to run a sprint, run the harness, build the next feature, or continue building toward the goal. Reads agent/STATE.md and executes one phase (or loops in continuous mode).
---

# Build Sprint

Planner → Generator → Evaluator harness. State lives in git so any driver can run it: a live session, a scheduled routine, or an API-triggered routine run.

## State files

- `agent/GOAL.md` - north star, human-owned, never edit
- `agent/SPEC.md` - product spec (planner output)
- `agent/BACKLOG.md` - ordered sprints with acceptance criteria
- `agent/STATE.md` - cursor: phase, sprint, attempts, history
- `agent/RUBRIC.md` - evaluator criteria
- `agent/evals/` - verdict reports (markdown committed; `shots/` gitignored)

## Modes

- **Single phase** (default, for routine runs): execute one transition from the table below, commit, stop.
- **Continuous** (live sessions, or routine prompt says "continuous"): loop transitions until backlog is empty, two consecutive sprints block, or the user interrupts. Report after each landed sprint.

## Transition table

Read `agent/STATE.md`, pick the first matching row:

| Condition | Phase | Action |
|-----------|-------|--------|
| No `agent/SPEC.md`, or no pending sprints | plan | Spawn the `planner` subagent. Commit its output. Set phase=build, sprint=first pending, attempts=0 |
| phase=blocked | - | Stop. Report the blocked sprint and its verdict to the human. Do not build |
| phase=build, attempts < 2 | build | BUILD then EVALUATE (below) |
| phase=build, attempts >= 2 | blocked | Set phase=blocked. Commit state + verdict to a `claude/blocked-sprint-N` branch. Notify the human (Slack connector if available, otherwise the session report) |

## BUILD then EVALUATE

1. **Build**: implement the first pending sprint from `agent/BACKLOG.md`. Match existing code style. Keep static export viable. Run `pnpm build` yourself before handing off; don't waste evaluator runs on compile errors.
2. **Evaluate**: spawn the `evaluator` subagent with a fresh context. Give it only: the sprint number and its acceptance criteria. Never include your implementation notes, reasoning, or diff. Never grade your own work in the main context.
3. **On PASS**: commit `feat(sprint-N): <summary>` and push to main (standing permission, see AGENTS.md). Vercel deploys automatically. Mark the sprint done in BACKLOG, advance STATE (next pending sprint, attempts=0), append history row, commit state, push.
4. **On FAIL**: increment attempts in STATE. Fix exactly what the verdict's instructions say, then re-evaluate (back to step 2). Do not expand scope while fixing.

## Rules

- One sprint in flight at a time. Never start sprint N+1 while N is unresolved.
- Main only receives PASS work. Failed attempts live in the working tree or a `claude/` branch, never on main.
- Update `agent/STATE.md` and its history table on every transition, including failures. The state file is the source of truth for the next run, which may have no memory of this one.
- Verdict files are append-only history. Never edit or delete old verdicts.
- If the dev server, Playwright, or the sandbox misbehaves (infrastructure failure, not product failure), retry once, then stop and report. Don't count infrastructure failures as sprint attempts.
