<p align="center">
  <img src="https://raw.githubusercontent.com/VIPHACKER100/InkForge/main/inkforge_logo.jpeg" alt="InkForge logo" width="110" />
</p>

# Welcome to the InkForge Wiki

**InkForge** is a free, open-source Progressive Web App that turns typed text into realistic handwritten notes on virtual A4 paper — right inside your browser. There is no server, no sign-up and no build step: rendering, exports and storage all happen client-side, and the whole app works **100% offline** once loaded.

- **Live app**: open [`index.html`](https://github.com/VIPHACKER100/InkForge) in any modern browser, or use your browser's *Install* button to add it as a PWA
- **About portal**: `about.html` — interactive Realism Engine playground, feature deep-dives and system specs
- **Author**: Aryan Ahirwar ([@VIPHACKER100](https://github.com/VIPHACKER100)) · **License**: MIT
- **Current release**: v1.6.24 — see the [Changelog](Changelog)

---

## Try It in 30 Seconds

1. Open the app and click the text area.
2. Paste: `Hello! This is InkForge. I make your notes look handwritten.`
3. Click **▶ Animate** and watch it write itself (or **✦ Render** for instant output).
4. Use the floating page indicator at the bottom to move between pages.
5. **Export → PNG** — done.

---

## Feature Highlights

| Category | What you get |
| :--- | :--- |
| **Handwriting** | 40+ handwriting fonts (English + Devanagari) plus custom uploads, 10 paper styles, ink presets, ink bleed, pen pressure and the Realism Engine ([Features](Features)) |
| **Layouts** | Standard flowing, Two-Column, and Cornell study notes; structured Clean mode ([Paper Styles & Layouts](Paper-Styles-and-Layouts)) |
| **Study tools** | Study Mode, auto-extracted Flashcards, Voice-to-Notes, Notebooks & Folders, margin Q/Ans labels, drag-in `.txt` / `.md` / `.pdf` import |
| **AI** | Summarize, Grammar Fix, Lecture→Notes, Assignment Generator via OpenRouter / Anthropic / local Ollama — plus **Smart Arrange**, which tidies notes fully offline with no API key ([AI Setup](AI-Setup-and-Workflows)) |
| **Custom fonts** | Upload `.ttf`/`.otf`, or build your own handwriting font in the browser with HandFonted Studio ([HandFonted Studio](HandFonted-Studio)) |
| **Export** | PNG, JPG, SVG, multi-page PDF, clipboard copy and print — all 2× upscaled ([Exporting Notes](Exporting-Notes)) |
| **Mobile & PWA** | Responsive canvas, icon toolbar, sidebar drawer, installable, offline via service worker |

---

## Why InkForge?

**Private by design.** Your notes, your API key and your custom fonts never leave your device. Notes live in your browser's own storage (IndexedDB + localStorage), AI calls go directly from your browser to the provider you choose, and there is no telemetry. HandFonted font synthesis is 100% on-device.

---

## Wiki Map

| Section | Pages |
| :--- | :--- |
| **Start here** | [Getting Started](Getting-Started) · [Features](Features) |
| **Using the app** | [Configuration Reference](Configuration-Reference) · [Study Syntax Cheatsheet](Study-Syntax-Cheatsheet) · [Paper Styles & Layouts](Paper-Styles-and-Layouts) · [AI Setup & Workflows](AI-Setup-and-Workflows) · [Exporting Notes](Exporting-Notes) · [HandFonted Studio](HandFonted-Studio) |
| **Under the hood** | [Architecture & Internals](Architecture-and-Internals) · [The Realism Engine](The-Realism-Engine) · [Performance](Performance) · [Accessibility](Accessibility) |
| **Project** | [Deploying InkForge](Deploying-InkForge) · [Troubleshooting & FAQ](Troubleshooting-and-FAQ) · [Contributing](Contributing) · [Roadmap](Roadmap) · [Changelog](Changelog) |

---

> **Deep documentation**: the in-repo [`docs/`](https://github.com/VIPHACKER100/InkForge/tree/main/docs) folder contains the full engineering documentation suite — including the complete [API Reference](https://github.com/VIPHACKER100/InkForge/blob/main/docs/api-reference.md) — for anyone working on the code itself.
