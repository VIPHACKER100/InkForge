# The Realism Engine

What makes InkForge look *handwritten* rather than typed: every single glyph is drawn individually with seeded-random human imperfections. This page explains the model; the full math lives in [`docs/handwriting-engine.md`](https://github.com/VIPHACKER100/InkForge/blob/main/docs/handwriting-engine.md). You can play with it live on the [About page](https://github.com/VIPHACKER100/InkForge/blob/main/about.html) (`about.html`).

> All variation scales with **`fontSize / 22`** (so it looks natural at any size) and with the **Realism / Jitter** slider (0–1, default 0.5).

---

## What Varies Per Character

| Property | Effect | Driven by |
| :--- | :--- | :--- |
| **Tilt** | Random rotation within ±*Rotation Max* | `Rotation Max` slider |
| **Anisotropic scale** | Independent X/Y scale jitter — strokes widen & shorten under hand pressure | `Realism` |
| **Micro-shear** | ±0.022 horizontal shear via `ctx.transform()` — each letter leans slightly differently | `Realism` |
| **Baseline drift** | A per-line random walk (clamped) — lines slope organically instead of sitting perfectly straight | `Realism` |
| **Baseline wobble** | Per-character vertical wander (per-*line* indexing prevents drift accumulating over long documents) | `Realism` |
| **Pen pressure** | Per-glyph size & opacity fluctuation — `fontSize × (1 − rand(0, pressure × 1.4))` | `Pen Pressure` slider |
| **Ink bleed** | Canvas drop-shadow blur simulating ink spreading into paper fibers | `Ink Bleed` slider |
| **Letter-spacing jitter** | Tiny horizontal advance variation | `Realism` |

## Deterministic by Design

A fast **`mulberry32` PRNG** is seeded with an FNV-1a hash of the active note ID + text content:

```
seed = hash(activeNotebookId + cleanText)
```

The same note always renders pixel-identically — across re-renders, page navigation, and multi-page PDF exports.

## Rare Imperfections (toggle)

Simulates the small accidents of real writing:

1. **Retrace double-stroke** — ~1.8% of glyphs get a faint 1px-offset second stroke (applied identically in static render, single-page redraw *and* the animation loop).
2. **Pressure-correlated bleed** — heavier-pressure glyphs bleed slightly more ink into the fibers.
3. **Margin space compression** — words near the right margin sometimes get their spacing squeezed, like a hand misjudging the margin.

## Script Awareness (Devanagari & Indic)

Indic scripts have connected matras and the horizontal *shirorekha* top line — heavy rotation or shear would sever them. Indic content gets:

- Damped jitter (`scriptRotMult = 0.3`, `scriptScaleMult = 0.4`)
- Whole-word rendering instead of character-by-character, preserving shaping/ligatures
- Automatic font fallback to `Noto Sans Devanagari` / `Hind`

## Clean Mode

With the **Clean** paper style, all variation is forced to neutral (no tilt, scale, shear, wobble, drift or bleed) — you get crisp, typographic output, which is what the [structured Clean layout](Paper-Styles-and-Layouts) expects.

## Drafted Glyphs

Characters you sketched in [HandFonted Studio](HandFonted-Studio) are drawn as cached images instead of font glyphs (decoded once, reused across pages), and are also bypassed in Clean mode.

---

## The Writing Animation

**▶ Animate** replays the same character queue through a `requestAnimationFrame` loop:

- `S.animSpeed` characters per frame (1–30, default 8); 500+ characters finish in ~2 s at the default speed.
- A pen-cursor element tracks the current position and the viewport auto-scrolls to keep the writing line visible.
- Sticky notes, callouts and margin labels are painted after the characters; on completion a final `renderText()` pass guarantees the canvas exactly matches what would be exported.

InkForge's own Realism Engine simulator on `about.html` runs an embedded deterministic PRNG so you can tweak jitter magnitude, baseline drift, guidelines and retrace in real time.
