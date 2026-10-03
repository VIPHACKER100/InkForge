# 🚀 Getting Started

This guide covers everything you need to set up and run InkForge locally.

---

## Prerequisites

- A modern web browser (Chrome 90+, Firefox 88+, Safari 15+, Edge 90+)
- No server, Node.js, or package manager required
- Optional: OpenRouter or Anthropic API key for AI features

---

## Quick Start

### 1. Download or Clone
```bash
git clone https://github.com/VIPHACKER100/inkforge.git
cd inkforge
```

Or simply download and extract the ZIP archive.

### 2. Open in Browser
Open `index.html` directly in your browser:
```
File → Open → index.html
```

### 3. Use a Local Dev Server (Recommended)
For the best experience (especially for font loading, file uploads, and clipboard copy), use a local HTTP server:

**VS Code Live Server:**
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"
3. App opens at `http://localhost:5500/index.html`

**Python:**
```bash
python -m http.server 5500
```

**Node.js:**
```bash
npx -y http-server -p 8000
```

---

## Project Structure

```
inkforge/
index.html              # App shell — loads ONE <script type="module" src="index.js">
about.html / about.css  # Standalone About page (playground, docs directory)
inkforge_logo.jpeg       # Brand emblem (toolbar, favicon, PWA, About)
index.css               # Design tokens, components, layouts, light/dark themes
index.js                # Boot + initApp + prediction + page-editor focus + error hook
state.js                # Shared state: S, pages, PAGE_W/PAGE_H, draftedGlyphs, fontSwitcher
render-pipeline.js      # renderText / renderSpecificPage / animation / page DOM
layout-engine.js        # layoutText + zone-chaining templates + sticky/callout painters
ui-bindings.js          # Per-panel binders — every control wired via addEventListener
persistence.js          # autosave / restoreState + serialization whitelist
settings-sync.js        # Sidebar control-sync helpers (shared with persistence)
paper-renderer.js       # 10 paper styles (LRU-cached backgrounds), smudge effects
text-layout.js          # sanitizeText, parseBlocks, getGraphemes, parseRichSyntax
template-manager.js     # 8 built-in layouts (gallery) + custom templates
export-manager.js       # PNG/JPG/transparent/PDF/SVG/clipboard pipelines
export-renderers.js     # Queue item rendering + cursive connections on canvas
margin-labels.js        # Margin Q/Ans clustering + drawing
flashcards.js           # Flashcards, study mode, SM-2 lite spaced repetition
ai-assistant.js         # Provider router: OpenRouter/Anthropic/Gemini/Ollama (SSE)
ai-postprocess.js       # sanitizeAiResponse, resequenceQA, smartArrangeLocal
handfonted-studio.js    # Sketch/template glyph capture, aligner, TTF build
inkfont-format.js       # .inkfont community-share wrap/parse
font-compilation.js     # Contour tracing, RDP, OpenType compilation
diagram-engine.js       # Diagram layout algorithms, Mermaid rendering
shape-drawing.js        # drawArrowhead / drawShapeOrEdge (rough.js)
cursive-connector.js    # Cursive exit/entry points, Bezier connections
collaborative-engine.js # WebSocket real-time collaboration (OT client)
layer-compositor.js     # Multi-layer canvas compositing
markdown-parser.js      # Markdown tokenization for AI output
stroke-prediction-engine.js # Stroke completion prediction
audio-recorder.js       # Voice-to-notes audio recording
script-detector.js      # Unicode script detection + FontSwitcher
notebooks.js            # IndexedDB notebook CRUD + sidebar UI
i18n.js                 # EN/हिंदी string tables + language toggle
voice-notes.js          # Web Speech voice-to-notes
server.js               # Hardened collaboration relay (room token, rate limits)
sw.js                   # Service worker — build-generated precache
manifest.json           # PWA manifest (shortcuts, logo, share targets)
e2e/                    # 17 Playwright specs
scripts/                # check-version, contrast-audit tooling
docs/                   # This documentation
```

---

## External Dependencies (CDN-loaded)

| Library | Version | Purpose |
| :--- | :--- | :--- |
| Google Fonts | — | Caveat, Patrick Hand, Indie Flower, Kalam, etc. |
| Noto Sans Devanagari | — | Devanagari/Indic script fallback |
| Font Awesome | 6.x | UI icons |
| jsPDF | 2.5.1 | Multi-page PDF generation |
| opentype.js | 1.3.4 | Custom font compilation (lazy-loaded) |
| pdf.js | 3.4.120 | PDF text extraction for file upload (lazy-loaded) |
| Rough.js | 4.6.6 | Hand-drawn diagram shapes |
| Mammoth | 1.6.0 | DOCX text extraction for file upload |
| Mermaid | 11.4.1 | ```mermaid fenced diagram rendering |
| TensorFlow.js | 4.20.0 | Smart stroke prediction |

The app itself runs from the CDN — `npm install` is only needed for the dev
tooling (Vite, Vitest, Playwright, ESLint). `html2canvas` is no longer required
as of v1.2.0.

---

## First Steps

1. **Type or paste text** into the textarea on the left sidebar, or **click directly on the page** to edit inline
2. **Choose a paper style** — ruled, grid, plain, legal, vintage, dark, dot grid, engineering, music staff, or dated
3. **Adjust typography** — font family, size, line height, word spacing
4. **Tune handwriting style** — rotation, ink bleed, pen pressure
5. **Add diagrams** — select Cycle, Flowchart, Hierarchy, Pipeline, Pyramid, or Mermaid from the diagram dropdown
6. **Export** — download as PNG, Transparent PNG, JPG, SVG, PDF, copy to clipboard, or print directly

### Optional: AI Features
1. Select your AI provider (OpenRouter or Anthropic) and enter your API key
2. Paste source text (lecture notes, essays, etc.)
3. Click an AI action: Summarize, Fix Grammar, Convert to Notes, or Generate Assignment
4. The AI output streams in real-time as handwritten notes

### Optional: File Upload
1. Click the upload zone or drag-and-drop a `.txt`, `.md`, or `.pdf` file
2. Text is extracted and rendered as handwriting automatically

### Optional: Custom Font
1. Click "✨ Create Your Own Font" in the sidebar
2. Use the Live Sketchpad to draw characters, or upload a scanned template
3. Click "Build Font" to compile and activate your handwriting

### Optional: Study Mode
1. Add Q:/A: pairs to your text (e.g. `Q: What is X?` / `A: It is Y.`)
2. Click the 📖 Study button in the toolbar to activate study mode
3. Use the flashcards modal to review — click to flip, arrow keys to navigate

### Optional: Voice Input
1. Click the 🎤 Voice button in the toolbar (Chrome required)
2. Speak naturally — transcription appears in real-time
3. Click again to stop recording

### Optional: Notebooks
1. Expand the 📓 Notebooks section in the sidebar
2. Click "Save Current" to store your notes in IndexedDB
3. Click any notebook to open it, or ✕ to delete

### Optional: Ollama (Local AI)
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Run `ollama serve` in your terminal
3. Select "🏠 Ollama (Local)" from the AI provider dropdown
4. Choose a model and generate notes without an API key
