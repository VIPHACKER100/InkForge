# Study Syntax Cheatsheet

InkForge parses lightweight markup straight out of your plain text and renders it as study artifacts on the page. Type it manually, paste it, or let the AI workflows emit it for you.

---

## Rich Study Syntax

| Syntax | Rendered as |
| :--- | :--- |
| `[sticky:yellow] text [sticky]` | Sticky note floating in the **right margin** — colors: `yellow`, `cyan`, `pink`, `mint` |
| `[callout:warning] text [callout]` | Boxed tag in the **left margin** — types: `warning`, `info`, `formula` (with icon) |
| `==text==` | Translucent highlight rectangle behind the characters |
| `Q: question` + `A: answer` on the next line | A flashcard collected into the review deck (toolbar 🃏) |

### Example

```
==Photosynthesis== converts light into chemical energy.

[callout:formula] 6CO2 + 6H2O → C6H12O6 + 6O2 [callout]

[sticky:yellow] Exam focus: the light-dependent reactions [sticky]

Q: Where does photosynthesis occur?
A: In the chloroplasts.
```

---

## Cornell Layout Syntax

Switch the **Note Layout** to *Cornell Study Notes*, then prefix lines to route them:

| Prefix | Goes to |
| :--- | :--- |
| `? ` or `cue:` | Cues / Questions column (left) |
| `== ` or `summary:` | Summary area (bottom) |
| *(nothing)* | Main Notes (right) |

---

## Clean Mode Structured Syntax

With **Paper Style = Clean**, the layout engine parses structured blocks:

| Syntax | Rendered as |
| :--- | :--- |
| `# Title` | Main heading |
| `## Subtitle` | Section subheading |
| `- Item` / `* Item` | Bullets (two nested indent levels) |
| `Q1.` / `Q.` / `1. What are …?` | Numbered questions, rendered bold (numbered questions ending in `?` keep their original number style) |
| `Answer:` | Its own block — hidden on canvas and represented by the **Ans** margin label; one blank line is inserted after every finished answer |

---

## Margin Q/Ans Labels (Standard layout)

Enable **Question & answer numbers in left margin** (below the layout selector) to draw:

- `Q1…Qn` next to numbered question lines,
- `Ans` next to bare `Answer:` lines — the label sits one line down, aligned with the first line of the answer.

When enabled, a line containing only `Answer:` is **not** drawn on the page — the margin label carries the meaning — while the word stays visible in the textarea and page editors. Labels are drawn on the canvas, so exports and print include them.

---

## AI Output Uses This Too

The master AI system prompt instructs models to answer in exactly this syntax (`#`, `##`, `-`, `==…==`, `[sticky:…]`, `[callout:…]`, `Q:`/`A:`), so AI-generated notes render natively on the paper. Markdown leakage (code fences, `**bold**`, raw HTML) is stripped automatically — see [AI Setup & Workflows](AI-Setup-and-Workflows).
