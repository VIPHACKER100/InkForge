# Getting Started

InkForge is a **static single-page app** — no build step, no dependencies to install, no server. Everything runs in the browser tab.

---

## Requirements

- Any modern browser: Chrome, Edge, Firefox or Safari.
- (Optional) Node.js — only for the repo's helper scripts (`npm test`, `npm run lint`, `npm run check-versions`).

---

## Three Ways to Run It

### 1. Just open the file

Double-click `index.html`. All third-party libraries (jsPDF, opentype.js, Font Awesome, Google Fonts) load from CDNs, and the service worker caches them so the app keeps working offline afterwards.

### 2. Serve it locally

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000`.

### 3. Install as a PWA

Load the app once, then click the **Install** icon in your browser's address bar. InkForge becomes a standalone app window and works with **zero connectivity** — the service worker pre-caches the app shell, About page and fonts.

---

## Project Structure

```
InkForge/
├── index.html          # Studio app shell + CDN library loads
├── index.css           # Design tokens, themes, paper styles, modals (~2,900 lines)
├── index.js            # The entire application logic (~7,300 lines)
├── about.html          # Standalone About portal + live Realism Engine simulator
├── about.css           # Glassmorphic stylesheet for the About portal
├── inkforge_logo.jpeg  # Brand emblem (Minimalist Scribe Flame)
├── manifest.json       # PWA manifest & shortcuts
├── sw.js               # Service worker: offline pre-caching
├── scripts/
│   ├── check-versions.mjs  # npm run check-versions — version parity guard
│   └── smoke-test.mjs      # npm test — headless logic tests
├── eslint.config.mjs   # ESLint flat config
├── docs/               # Full engineering documentation suite
└── .github/workflows/codeql.yml  # CodeQL static analysis CI
```

---

## First Note in 30 Seconds

1. Click the sidebar text area.
2. Paste some text (or drag in a `.txt` / `.md` / `.pdf` file).
3. Press **▶ Animate** to watch it write, or **✦ Render** for an instant result.
4. Flip pages with the floating page indicator at the bottom.
5. **Export** — PNG, JPG, PDF, SVG, Copy or Print.

---

## Where To Next

- [Features](Features) — the full capability tour
- [Configuration Reference](Configuration-Reference) — every control explained
- [Study Syntax Cheatsheet](Study-Syntax-Cheatsheet) — sticky notes, callouts, highlights & flashcards
- [AI Setup & Workflows](AI-Setup-and-Workflows) — plugging in OpenRouter / Anthropic / Ollama
- [Troubleshooting & FAQ](Troubleshooting-and-FAQ) — when something looks off

> The in-repo version of this guide lives at [`docs/getting-started.md`](https://github.com/VIPHACKER100/InkForge/blob/main/docs/getting-started.md).
