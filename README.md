# InkForge — AI Handwritten Notes Generator

InkForge turns typed text into realistic handwritten notes, rendered on canvas with per-character
variation: baseline wobble, pen pressure, ink bleed, smudge, and cursive connections. It runs
entirely in the browser as an installable PWA — no account, no server required.

![Version](https://img.shields.io/badge/version-1.20.1-blue) ![Tests](https://img.shields.io/badge/tests-264%20passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Handwriting engine** — 48 fonts (Print / Cursive & Script / Devanagari), seeded per-character
  realism (anisotropic scale, micro-shear, pressure, baseline drift, rare imperfections), pressure-
  correlated ink bleed, smudge, cursive connections, and a crisp ✨ **Clean** paper mode
- **Margin Q/Ans labels** — numbered question/answer marks in the left margin (Standard layout)
- **AI actions** — Smart Arrange (fully offline), Summarize, Grammar fix, Lecture→Notes, Assignment
  generation via OpenRouter, Anthropic, Google Gemini (direct), or local Ollama; every result is
  sanitized and Q:/A: pairs renumbered & deduplicated automatically
- **HandFonted Studio** — draw your own glyphs and compile them into a real `.ttf` font in-browser
- **Study tools** — Q:/A: flashcards with spaced repetition (SM-2 lite), study mode, rich syntax
  (stickies, callouts, highlights)
- **Template gallery** — 8 note layouts: Standard, Two-Column, Cornell, Meeting, Lecture, Lab Report,
  Vocabulary, Reading Notes
- **10 paper styles**, 4 note layouts (Standard, Two-Column, Cornell, Meeting), layer manager
- **Export** — PNG / JPG / transparent PNG / SVG / multi-page PDF (Compact/Standard/High size
  presets) / clipboard / print
- **Voice to Notes** — live speech-to-text via Web Speech API
- **About page** — standalone `about.html` with an interactive realism playground, docs directory,
  and a brand emblem wired into the toolbar, favicon, and PWA manifest
- **हिंदी UI** — one-click English ⇄ हिंदी interface toggle (extensible string tables)
- **PWA** — installable, offline-capable via service worker (app shell + About page precached)
- **Hardened collaboration relay** — optional room token, rate limits, connection and payload caps

## 🚀 Quick Start

```bash
npm install
npm run dev        # Vite dev server
npm run server     # optional: collaboration WebSocket server (localhost:8080)
```

Open the printed URL, type notes in the sidebar, and press **✦ Render**.

## 🧰 Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run the Vitest suite (264 tests) |
| `npm run test:coverage` | Vitest with the coverage ratchet (fails below thresholds) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run check:version` | Verify `sw.js` cache version matches `package.json` |
| `npm run lhci` | Lighthouse audits against the production build |
| `npx playwright test` | End-to-end suite (17 specs) |
| `npm run server` | Collaboration WebSocket relay (optional `INKFORGE_ROOM_TOKEN`) |

## 📚 Documentation

Full documentation lives in [`docs/`](./docs/README.md) — architecture, handwriting engine,
AI integration, export pipelines, PWA, accessibility, and more.

## 🤝 Contributing

See [`docs/contributing.md`](./docs/contributing.md). CI runs lint, tests, the version-consistency
check, and a build on every pull request.

## 📄 License

[MIT](./LICENSE)
