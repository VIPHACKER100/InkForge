# Paper Styles & Layouts

InkForge renders on A4 canvases (794 × 1123 px internal resolution) with procedurally drawn backgrounds — ruling, grids, grain texture and the Date / P. No. header box are all painted by the paper rendering engine (`drawPaperBackground`).

---

## The 10 Paper Styles

| Style | Look | Best for |
| :--- | :--- | :--- |
| **Ruled** *(default)* | Off-white notebook, blue guidelines, double red margin rules, printed Date/P. No. box | Standard notebook notes |
| **Clean** | Same ruling as Ruled, but crisp typographic text — no jitter/bleed/drafted glyphs, structured headings & bullets | Lecture notes, study handouts |
| **Plain** | Warm ivory, no lines | Freeform writing, letters |
| **Grid** | Light grid at `fontSize × lineHeight` intervals | Math, diagrams |
| **Legal** | Yellow pad, dense ruling, red left margin | Legal-style formal notes |
| **Vintage** | Aged parchment with radial vignette | Journals, creative writing |
| **Dark** | Indigo slate, muted guides | Dark mode, presentations |
| **Dot Grid** | Dots at grid pitch | Bullet journaling, sketches |
| **Engineering** | Pale green minor + major grid, reddish margins | Calculations, graphing |
| **Music Staff** | Sets of 5-line staffs with brackets | Sheet music |

Extras:

- **Paper grain** — each page gets ~2,200 faint micro-rectangles of organic noise (skipped for Dark and Clean), so no two renders look machine-stamped.
- **Date / P. No. header box** — Ruled & Clean draw a red-bordered box top-right; the values are editable per page directly on the canvas (toggle: *Show Date & P. No. Header*).

---

## Note Layout Templates

### Standard (Flowing) — default

Single column; text wraps naturally and breaks to a new page when the bottom margin is reached. Each page starts on its **second ruled line** for a natural notebook look. Ultra-long words wrap character-level instead of overflowing.

### Two-Column Grid

Fills the left column first, then the right, then the next page.

### Cornell Study Notes

Divides the page into **Cues / Questions** (left), **Main Notes** (right) and **Summary** (bottom). Route lines with prefixes:

```
? Key term or question      → Cues column
== Summary sentence         → Summary area
plain text                  → Main Notes
```

### Clean structured mode

With *Clean* paper, the engine parses `#`/`##` headings, `-`/`*` bullets, numbered/`Q1.`-style questions and bare `Answer:` blocks — see the [Study Syntax Cheatsheet](Study-Syntax-Cheatsheet).

---

## Margin Notes & Labels

- **Margin text** (`.margin-text-overlay`) is constrained to a strict 62 px lane left of the double red rules.
- **Margin Q/Ans labels** (`Q1…Qn`, `Ans`) right-align at `x = margin − 24`, clear of the red rules — toggle via *Question & answer numbers in left margin*. Details: [Study Syntax Cheatsheet](Study-Syntax-Cheatsheet).
- **Sticky notes & callouts** from `[sticky:…]` / `[callout:…]` syntax paint into the margins as post-passes.

---

## Theme Packs vs. Paper Styles

[Theme packs](Configuration-Reference#theme-packs) bundle a paper style with matching ink color, jitter, bleed and pressure (e.g. *Vintage Diary*, *Science Lab*, *Minimal Noir*) — a quick way to get a coherent look.
