# 🤝 Contributing

Guidelines for contributing to Inkflow.

---

## Project Philosophy

Inkflow is a **single-page, zero-dependency-install** application. Contributions should maintain this philosophy:
- No build tools, bundlers, or transpilers required
- All code runs directly in the browser
- Dependencies are loaded via CDN only
- The app works offline once loaded

---

## Code Style

### JavaScript
- Use `const` and `let` — never `var`
- Use template literals for string interpolation
- Functions should be documented with a brief comment
- Keep functions focused and under 50 lines where possible
- Use descriptive variable names (no single-letter vars except loop counters)

### CSS
- Use CSS custom properties for all theme-dependent values
- Organize properties: layout → sizing → spacing → visual → animation
- Use `rem` for font sizes, `px` for borders and shadows
- Mobile-first media queries

### HTML
- Semantic elements (`<nav>`, `<main>`, `<section>`, `<button>`)
- All inputs must have associated `<label>` elements
- Unique `id` attributes on all interactive elements
- No inline styles — use CSS classes

---

## File Structure

```
index.html              # App shell — loads ONE <script type="module" src="index.js">
about.html / about.css  # Standalone About page (playground, docs directory)
inkflow_logo.jpeg       # Brand emblem (toolbar, favicon, PWA, About)
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

Do NOT split JS/CSS into additional files without discussion. The single-file architecture is intentional.

---

## Pull Request Process

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make changes** following the code style above
4. **Test** in Chrome, Firefox, and Safari
5. **Submit PR** with a clear description of changes

### PR Checklist
- [ ] Code follows existing style conventions
- [ ] All existing features still work (no regressions)
- [ ] Tested on desktop and mobile viewports
- [ ] Tested in at least 2 browsers
- [ ] Documentation updated if adding new features
- [ ] No new npm/build dependencies added

---

## Reporting Issues

Use GitHub Issues with one of these templates:

### Bug Report
```markdown
**Description**: What happened?
**Expected**: What should have happened?
**Browser**: Chrome 120 / Firefox 121 / Safari 17
**Steps to reproduce**:
1. ...
2. ...
```

### Feature Request
```markdown
**Description**: What feature would you like?
**Use case**: Why is this useful?
**Proposed solution**: How should it work?
```

---

## Areas Open for Contribution

- Additional paper styles (e.g. isometric, manuscript, ledger)
- New handwriting fonts
- Extended character sets (diacritics, CJK, Arabic)
- Additional diagram types (e.g. Gantt, sequence, class diagrams)
- Accessibility improvements (ARIA labels, screen reader testing)
- Performance optimizations for large documents
- Localization / i18n support
- Unit and integration tests for rendering engines
