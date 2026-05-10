---
name: story-from-history
description: "Generate a historical story with a cinematic cover image and publish it to the History Stories site. Use when the user says 'teach me from history', 'give me a history lesson', 'tell me a story from history', or any request for a historical reflection or story."
---

# Story from History

Generates a historical reflection with a cinematic cover image, publishes it to the History Stories website, and delivers it to the user.

## Prerequisites

- `uv` installed (for nano-banana image generation)
- `GEMINI_API_KEY` set in environment
- `GITHUB_TOKEN` set in environment (for git push)
- Vercel auto-deploys on push (GitHub app connected to nexuslabsx org)
- Run from the History Stories repo root when possible

## Project path

Use the current repository root as `<project-path>` whenever possible.

Known harness paths:

| Harness | Project path |
|---------|-------------|
| **OpenClaw (Railway)** | `/data/.openclaw/projects/history-stories/` |
| **Cursor** | `~/Projects/history-stories/` |

## Steps

### 1. Generate the reflection

Read and follow `.claude/skills/history-reflection/SKILL.md`.

The history tracker file lives inside the history-stories project:
- **Tracker:** `<project-path>/history.json`

Produces: reflection text, title, character, tradition, type, theme.

### 2. Generate a cover image

Using the reflection from Step 1, build an image prompt:

```
Cinematic movie poster style, [key scene from the reflection]. [Setting/architecture details].
Dramatic lighting, rich color palette, epic composition.
Style: hyper-detailed digital painting, Imax movie poster aesthetic,
wide-angle lens feel, volumetric lighting, atmospheric haze.
```

Fill in `[key scene]` and `[setting/architecture]` from the actual reflection content.

Then follow the universal `nano-banana` skill (generate) with:
- **prompt**: the image prompt above
- **outputPath**: `<project-path>/public/covers/YYYYMMDD-HHmmss-<slug>.png`
- **aspectRatio**: `landscape`

If image generation fails, continue with the text (the image is a bonus, not a blocker). Use a placeholder cover path or omit the cover field.

### 3. Write the story file

Create a markdown file at `<project-path>/stories/YYYYMMDD-HHmmss-<slug>.md` with this format (timestamp matches the cover image):

```markdown
---
title: "<Title>"
character: "<Primary figure>"
tradition: "<roman|ramayana|mahabharata>"
type: "<content type>"
theme: "<one word theme>"
date: "YYYY-MM-DD"
cover: "/covers/YYYYMMDD-HHmmss-<slug>.png"
oneLiner: "<One sentence summary>"
---

<Full story text here>
```

The slug should be kebab-case derived from the title (e.g. `the-soldier-who-wept-for-his-enemy`).

**All timestamps MUST be UTC.** Use `date -u +%Y%m%d-%H%M%S` to generate timestamps. Do not use local time.

### 4. Update history tracker

Append an entry to `<project-path>/history.json`:

```json
{
  "character": "<primary figure>",
  "tradition": "roman|ramayana|mahabharata",
  "type": "<content type>",
  "theme": "<one word>",
  "title": "<title>",
  "oneLiner": "<one sentence summary>",
  "createdAt": "<ISO 8601 timestamp>"
}
```

If the file doesn't exist, create it with `{ "reflections": [] }` first.

### 5. Commit and push

```bash
cd <project-path>
git add stories/ public/covers/ history.json
git commit -m "story: <title>"
git push
```

Vercel auto-deploys on push to main (~30 seconds). No manual deploy needed.

### 6. Deliver to user

Send **three things** in this order:

1. **Cover image**: Use `MEDIA:<project-path>/public/covers/<filename>.png` (or the appropriate harness media path)
2. **Story**: The full reflection text (as a voice note if the user sent voice, otherwise as text)
3. **Link**: The story URL: `https://historystories.vercel.app/YYYYMMDD-HHmmss-<slug>`

Do not include narration or planning text between these deliveries. Just deliver the final product.

## Error Handling

- If image generation fails: publish the story without a cover image (omit the cover field in frontmatter)
- If deployment fails: still deliver the story and image to the user, mention the site will update on next successful deploy
- If git push fails: check for conflicts, pull first if needed
