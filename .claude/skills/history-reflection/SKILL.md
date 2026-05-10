---
name: history-reflection
description: "Generate a historical reflection from Roman history, Ramayana, or Mahabharata. Use when asked for a historical reflection, or when called by another skill. For full stories with cover art, use story-from-history instead."
---

# History Reflection

Generate a single historical reflection drawn from Roman history, Ramayana, or Mahabharata. Teach real history — dates, names, empires, context — and draw out meaning. Return the reflection as text. The caller decides what to do with it (deliver, pair with an image, etc.).

## Domains

**Roman history** — Republic through Empire (~509 BCE to 476 CE). Emperors, senators, generals, Stoic philosophers. Battles, political crises, cultural shifts. Key figures: Marcus Aurelius, Seneca, Epictetus, Scipio Africanus, Julius Caesar, Augustus, Cincinnatus, Cato, Hadrian, Trajan, Nero, Constantine, Hannibal (as adversary), Cicero, Brutus.

**Ramayana** — Characters, events, philosophy, moral dilemmas, relationships. Key figures: Rama, Sita, Hanuman, Lakshmana, Bharata, Ravana, Vibhishana, Jatayu, Kaikeyi, Dasharatha, Shabari, Surpanakha.

**Mahabharata** — Characters, events, the Bhagavad Gita, strategy, duty, moral complexity. Key figures: Arjuna, Krishna, Bhishma, Karna, Yudhishthira, Draupadi, Vidura, Drona, Abhimanyu, Duryodhana, Shakuni, Kunti, Eklavya, Barbarik.

## Content Types

Pick one per reflection. Vary across runs.

| Type | What it is |
|------|-----------|
| **Hard lesson** | A decision with real cost. What someone chose and what it cost them. |
| **Did you know** | Surprising fact, hidden connection, overlooked detail. |
| **Origin story** | How a person or empire began, what shaped them. |
| **Breakthrough** | A turning point — victory earned through preparation, genius, or sacrifice. |
| **Timeline/context** | When this happened, who ruled, what the world looked like at the time. |
| **Philosophy** | A principle from the Gita, Stoic writing, or a ruler's lived code. |
| **Character study** | Who someone really was — contradictions, arc, what made them human. |

## Tone

- Direct, not flowery. Write like you're telling a friend something wild you learned.
- Include specific dates, names, places. Teach history, don't just allude to it.
- Give context — "This was 260 BCE. Rome was still fighting the Punic Wars."
- The hard parts matter. Don't sanitize the cost, the failure, the contradiction.
- End with an open reflection — a question or thought, not a lecture. Sometimes skip it entirely if the story speaks for itself.
- 200-500 words. Short enough to read in a minute, long enough to land.

## Steps

### 1. Check history (optional)

If the history tracker exists, read it for variety.

Use the current repository root as `<project-path>` whenever possible.

Known tracker paths:

| Harness | Tracker path |
|---------|-------------|
| **OpenClaw (Railway)** | `/data/.openclaw/projects/history-stories/history.json` |
| **Cursor** | `~/Projects/history-stories/history.json` |

Check the last 20 entries and note which characters, types, and traditions appeared recently. If the file doesn't exist, skip this step and generate freely.

### 2. Pick something fresh

When history is available:
- Don't repeat the same character + type combo from the last 20 entries
- Same character with a different type/story is fine
- Same type with a different character is fine
- Don't pick the same tradition as the last 2 entries — rotate between roman, ramayana, mahabharata
- Lean toward characters and stories that haven't appeared at all yet before repeating

### 3. Generate the reflection

Write the reflection following the tone guidelines above. Use the format:

```
**[Title]**

[Body — the story, the history, the context]

*[Optional reflection question or open-ended thought]*
```

### 4. Update history

After generating, append an entry to the history tracker (see path table in Step 1):

```json
{
  "character": "<primary figure>",
  "tradition": "roman|ramayana|mahabharata",
  "type": "<content type>",
  "theme": "<one word>",
  "title": "<title from the reflection>",
  "oneLiner": "<one sentence summary>",
  "createdAt": "<ISO 8601 timestamp>"
}
```

Theme is one word: adversity, duty, sacrifice, leadership, discipline, transformation, loyalty, mortality, wisdom, humility, strategy, courage, compassion.

If the file doesn't exist, create it with `{ "reflections": [] }` first.

## Output

Return the generated text. Include metadata for the caller:
- `character` — primary figure
- `tradition` — `roman`, `ramayana`, or `mahabharata`
- `type` — one of: `hard-lesson`, `did-you-know`, `origin-story`, `breakthrough`, `timeline`, `philosophy`, `character-study`
- `title` — the bold title used in the reflection

Do not send it anywhere — the caller handles delivery.
