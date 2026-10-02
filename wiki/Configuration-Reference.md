# Configuration Reference

Every user-facing control in InkForge, with ranges and defaults. Defaults are also restorable any time via **Reset Defaults**.

---

## Typography

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Font Family** | Dropdown (40+) | Caveat | Rendering handwriting font |
| **Font Size** | 14–52 px | 22 px | Character size on canvas |
| **Line Height** | 1.2–3.0 | 1.5 | Vertical spacing between lines |
| **Word Spacing** | −2–14 px | 1 px | Horizontal gap between words |
| **Auto-Fit** | — | — | Binary-searches a font size that fits the text on one page |
| **Text Alignment** | Upper / Middle / Lower | Middle | Vertical position of handwriting relative to the ruled lines |
| **Custom Font Upload** | `.ttf` / `.otf` | — | Loads a local font, remembered via `localStorage` (`inkforge-fonts`) |

> Devanagari content automatically falls back to `Noto Sans Devanagari` / `Hind` when the selected font lacks Indic glyphs.

## Paper Style

Ten styles — full descriptions in [Paper Styles & Layouts](Paper-Styles-and-Layouts): **Ruled** *(default)*, Clean, Plain, Grid, Legal, Vintage, Dark, Dot Grid, Engineering, Music Staff.

Ruled & Clean also expose **Show Date & P. No. Header**, editable per page directly on the canvas.

## Note Layout

Standard *(default)* · Two-Column · Cornell Study Notes — syntax and behavior in [Paper Styles & Layouts](Paper-Styles-and-Layouts). Below the selector: the **margin Q/Ans labels** toggle (on by default).

## Ink & Impression

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Ink Color** | Hex picker | `#1c2340` | Color of all rendered text |
| **Ink Presets** | — | — | Blue Ink Pen / Navy / Black / Blue / Purple / Red / Green — one click; the active preset shows an accent ring |
| **Rotation Max** | 0–12° | 1.0° | Maximum per-character tilt |
| **Realism / Jitter** | 0.0–1.0 | 0.5 | Organic jitter intensity — scales tilt, anisotropic X/Y scale, micro-shear and baseline drift |
| **Rare Imperfections** | toggle | off | ~1.8% of glyphs get a faint 1px retrace double-stroke; right-margin space compression; pressure-correlated ink bleed |
| **Ink Bleed** | 0.0–2.5 | 0.5 | Shadow-blur simulating ink spreading into paper fibers |
| **Pen Pressure** | 0.0–0.3 | 0.12 | Stroke thickness & opacity variation |
| **Margin** | 20–100 px | 80 px | Page boundary padding |

## Theme Packs

One-click presets via `applyTheme(themeId)`:

| Theme | Paper | Ink | Rotation | Bleed | Pressure | Font size |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Default | Ruled | `#1c2340` | 1.0 | 0.5 | 0.12 | 22 |
| Vintage Diary | Vintage | `#3c2f2f` | 3.0 | 0.8 | 0.15 | 22 |
| Cute Pastel | Plain | `#5d3f6a` | 1.5 | 0.4 | 0.10 | 22 |
| Science Lab | Engineering | `#1a331e` | 0 | 0.3 | 0.08 | 20 |
| Minimal Noir | Dark | `#e0e0e0` | 0.8 | 0.2 | 0.10 | 22 |
| Scrapbook | Dot Grid | `#1c3144` | 2.2 | 0.6 | 0.14 | 24 |

## Animation

| Control | Range | Default | Effect |
| :--- | :--- | :--- | :--- |
| **Animation Speed** | 1–30 chars/frame | 8 | Writing speed. 1–3 slow & dramatic (presentations), 5–10 natural pace, 15–30 fast fill |

The viewport auto-scrolls to keep the pen cursor visible.

## Study & Productivity

- **Study Mode** — toolbar toggle, dims editing chrome.
- **Flashcards** — 🃏 deck built from `Q:`/`A:` pairs.
- **Voice to Notes** — Web Speech API dictation appends to your text.
- **Notebooks & Folders** — IndexedDB-backed note explorer.
- **File Upload** — drag in `.txt` / `.md` / `.pdf`.

## AI

| Setting | Notes |
| :--- | :--- |
| **AI Provider** | OpenRouter (100+ models) · Anthropic (direct) · Ollama (local, no key) |
| **Model** | Auto-fetched list for OpenRouter; static list for Anthropic |
| **API Key** | Entered at runtime, stored in your browser only. Not required for Ollama or Smart Arrange |

Actions: Smart Arrange *(offline)* · Summarize · Fix Grammar · Lecture → Notes · Generate Assignment. Details in [AI Setup & Workflows](AI-Setup-and-Workflows).

## Export

| Control | Description |
| :--- | :--- |
| **PDF Output Size** | **Compact** (1× JPEG 75%, smallest) · **Standard** (2× JPEG 92%, default) · **High** (2× lossless PNG, print/archive). Persisted per browser |

All formats are 2× upscaled — see [Exporting Notes](Exporting-Notes).

---

## Where Settings Live

Settings persist to `localStorage` (`inkforge-state`) after a 1000 ms idle debounce and mirror into the active notebook in IndexedDB. Full storage map in [Architecture & Internals](Architecture-and-Internals).
