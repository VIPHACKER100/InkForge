# Features

A tour of everything InkForge does. Every control mentioned here is documented in the [Configuration Reference](Configuration-Reference).

---

## ✍️ Handwriting

- **40+ handwriting fonts** — print handwriting, cursive & script, Devanagari/Hindi, and clean fallbacks (all OFL/Apache 2.0 Google Fonts), plus your own `.ttf`/`.otf` uploads.
- **Realism Engine** — every glyph gets seeded-random tilt, anisotropic scale, micro-shear, baseline drift, letter-spacing jitter, pen pressure and ink bleed. See [The Realism Engine](The-Realism-Engine).
- **Ink presets** — Blue Ink Pen, Navy, Black, Blue, Purple, Red, Green, plus a freeform color picker.
- **Indic script aware** — Devanagari and other Indic scripts are rendered with damped jitter so connected matras and the *shirorekha* never break.
- **Auto-Fit** — binary-searches a font size that fits your text on one page.

## 📄 Paper & Layouts

- **10 paper styles**: Ruled, Clean, Plain, Grid, Legal, Vintage, Dark, Dot Grid, Engineering, Music Staff.
- **3 note layouts**: Standard flowing, Two-Column, Cornell study notes — plus the structured **Clean** mode for headings/bullets/Q&A.
- **Date / P. No. header box** on Ruled & Clean pages, editable per page.
- Full details: [Paper Styles & Layouts](Paper-Styles-and-Layouts).

## 🎓 Study Tools

| Tool | What it does |
| :--- | :--- |
| **Study Mode** | Dims all editing chrome for distraction-free review (floating exit button, `Escape` to leave) |
| **Flashcards** | Every `Q:`/`A:` pair in your notes becomes a flip-card review deck (toolbar 🃏 button) |
| **Voice to Notes** | Microphone dictation appends transcribed text via the Web Speech API |
| **Notebooks & Folders** | IndexedDB-backed explorer — create, load, delete and organize notes by folder |
| **Margin Q/Ans labels** | Draws `Q1…Qn` and `Ans` in the left margin next to numbered questions and `Answer:` lines |
| **File import** | Drag-and-drop `.txt`, `.md`, `.pdf` — PDFs are extracted client-side via pdf.js with a progress bar |

## 🤖 AI (optional) + Offline Helpers

- **Smart Arrange** — tidies headings, bullets, tags, punctuation and Q&A numbering **fully offline, no API key**.
- **Summarize**, **Grammar Fix**, **Lecture → Notes**, **Generate Assignment** — powered by OpenRouter (100+ models), Anthropic (direct) or a local **Ollama** install. Streams word-by-word onto the canvas. See [AI Setup & Workflows](AI-Setup-and-Workflows).

## 🔤 Custom Fonts (HandFonted Studio)

Sketch glyphs on the live sketchpad or fill a printable template sheet, and InkForge traces, smooths and compiles a real **TrueType `.ttf`** you can install on your OS — all inside the browser. See [HandFonted Studio](HandFonted-Studio).

## 📤 Export

PNG (lossless, 2× ≈150 DPI), JPG, SVG, multi-page A4 PDF with three quality presets, clipboard copy and native print. See [Exporting Notes](Exporting-Notes).

## 📱 Mobile & PWA

- Responsive canvas sizing (`getResponsiveCanvasWidth()`) fills the viewport on phones and tablets and survives resize/orientation changes.
- Icon-only compact toolbar, off-canvas sidebar drawer with scrim, safe-area insets, ≥44px touch targets, full-screen modals.
- Installable PWA with full offline support via the service worker.

## 🔒 Privacy

- 100% client-side processing — no server, no telemetry, no sign-up.
- Notes, fonts and settings live only in your browser (IndexedDB + localStorage).
- AI calls go **directly** from your browser to the provider, using a key you enter at runtime and that is stored only in your browser.
