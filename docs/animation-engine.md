<p align="center">
  <img src="../inkforge_logo.jpeg" alt="InkForge Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# ✍️ Animation Engine

This document explains the live handwriting animation that makes text appear as if it is being written by a human hand.

---

## Overview

`startAnimation()` orchestrates the entire writing animation. The pipeline is:

```
raw text → sanitizeText() → parseRichSyntax() → layoutText() → char queue
    → paper + page setup → requestAnimationFrame draw loop
    → character-by-character drawing with human variations
    → pen cursor + auto-scroll → renderText() final pass
```

When animation finishes, the canvas is finalized through the normal `renderText()` path, guaranteeing WYSIWYG consistency between animation and exported output.

---

## Key Functions

| Function | Role |
| :--- | :--- |
| `startAnimation()` | Entry point — builds the queue, sets up pages, launches the RAF loop |
| `stopAnimation()` | Cancels the loop and hides the pen cursor |
| `buildCharQueue(text)` | Thin wrapper returning the character queue from `layoutText()` |
| `layoutText(text)` | Unified layout engine (routes to Two-Column / Cornell / Clean-Standard) |
| `getCharVariation(rotMax, pressure, fontSize, isIndic, paperStyle)` | Generates per-character human variation (returns `tiltDeg`, `scaleX`, `scaleY`, `shearX`, `baselineOff`, `spacingExtra`, `pressureMod`, `opacity`, `isRetrace`) |

---

## Animation Pipeline

### 1. Queue Construction
The text is sanitized, run through `parseRichSyntax()` to strip study syntax and extract sticky notes, callouts, highlights, and flashcards, then passed to `layoutText()`. The result is a `queue` array of character render items — each carrying the character, coordinates, font, and per-character variation. Sticky/callout placeholder items and bare `Answer:` lines (v1.6.11, when margin labels are on) are skipped by the pen — they appear via their margin decorations in the final `renderText()` pass.

### 2. Page Setup
`clearPages()` removes existing pages; then each page is created with `createPage(pageNum)` — a full A4 canvas plus a `contenteditable` editor overlay for live editing. All pages are drawn with their paper background before animation begins.

### 3. Frame Loop
A `requestAnimationFrame` loop processes `S.animSpeed` characters per frame (1–30, default 8). For each character it:

- Draws the glyph with the configured font, size, and ink color
- Applies per-character variation (tilt, anisotropic scale X/Y, micro-shear via `ctx.transform()`, baseline offset, spacing, opacity) via `getCharVariation()`
- Advances a pen-cursor element to the character position
- Auto-scrolls the viewport to keep the writing line visible

### 4. Sticky Notes & Callouts
After the primary characters are placed, `paintStickyNotes()` and `paintCallouts()` run per page as post-passes, drawing the side-note elements into the margins.

### 5. Completion
On the last character the loop stops, the pen hides, `isAnimating` is cleared, and `renderText(S.text)` produces the final stable canvas.

---

## Human Variation Model

Each character is rendered slightly differently using randomized parameters from `getCharVariation()`:

| Parameter | Behavior |
| :--- | :--- |
| `tiltDeg` | Slight left/right rotation (±`rotationMax`°, default 1°) |
| `scaleX` | Anisotropic horizontal scaling jitter (independent of `scaleY`) |
| `scaleY` | Anisotropic vertical scaling jitter (±8% × `realism`) |
| `shearX` | Horizontal micro-shear applied via `ctx.transform()` (±0.022 × `realism`), giving each letter a subtly different slant |
| `baselineOff` | Tiny baseline wander for organic lines |
| `spacingExtra` | Letter-spacing jitter |
| `pressureMod` | Subtle opacity variation weighted by the pressure setting (0.12) |
| `opacity` | Per-glyph alpha applied during drawing |
| `isRetrace` | Whether this glyph gets a faint 1px double-stroke (Rare Imperfections mode) |

The `Bleed` setting (`S.bleed`, 0–2.5, default 0.5) adds a drop-shadow offset below each glyph emulating ink spread into paper fibers. When **Rare Imperfections** is enabled the bleed radius is further modulated per character by `pressureMod` so heavier-pressure glyphs bleed slightly more, mirroring real pen dynamics.

---

## Controls

- **Animation Speed** (`#animSpeed`): 1 (slow/handwriting) to 30 (fast) — defaults to 8
- **Start**: `startAnimation()` — animates whatever is currently in the text area
- **Stop**: `stopAnimation()` — freezes the current frame instantly

---

## Performance

- Uses a single `requestAnimationFrame` loop (no timers)
- Characters are drawn directly onto the persistent A4 canvases — no per-frame buffer copies
- `getOptimalAnimationSettings()` (index.js:4278) computes `{ useRAF, smoothing }` from screen refresh rate; defined for future use
- Animating 500+ characters at speed 8 completes in ~2 seconds on typical hardware

## Edge Cases

- **Empty text**: `startAnimation()` shows a warning toast and returns without creating pages
- **Single page**: no pagination nav is needed; the loop simply draws and stops
- **Clean paper style**: neutralizes per-character jitter for a clean typographic look (see [Handwriting Engine](./handwriting-engine.md))
