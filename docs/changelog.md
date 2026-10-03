# 📋 Changelog

All notable changes to Inkflow are documented in this file.

---

## [1.20.1] — 2026-10-03

### 🌐 Changed — i18n coverage growth
- Hindi translations extended to the **11 paper-style buttons** (Ruled/साफ़/सादा/ग्रिड/कानूनी पैड/विंटेज/डार्क/डॉट ग्रिड/इंजीनियरिंग/म्यूज़िक स्टाफ/डेटेड) and the **Copy/Print** export actions — 38 tagged chrome strings total. Round-trip toggle verified in-browser (EN ⇄ हिंदी with persistence).
- Removed two unused nav string keys (the page-nav buttons are icon-only).

---

## [1.20.0] — 2026-10-03

### ✨ Added — Phase F6: UI localization (first slice)
- **`i18n.js`**: a string-table engine with English + Hindi (हिंदी) translations for the most visible chrome — toolbar buttons, all 11 sidebar section headers, primary actions (Render/Start/Stop/Connect/Reset), and the Flashcards modal title. `t(key)` falls back to English, then the key.
- **🌐 language toggle** in the toolbar (shows the other language's label): switches instantly, persists in `inkflow-lang`, updates `document.documentElement.lang`, and survives reload.
- Elements declare `data-i18n="key"` (26 tagged); extending coverage = add table entries + attributes.
- **6 new unit tests** (264 total): en/hi key parity, no empty strings, toggle-label consistency, English fallback, last-resort key fallback, default language.

> Phase F is now complete (F1 spaced repetition · F2 Gemini provider · F3 template gallery · F4 relay hardening · F5 HandFonted improvements · F6 localization).

---

## [1.19.0] — 2026-10-03

### ✨ Added — Phase F5: HandFonted improvements
- **Live jitter preview**: after saving a glyph, a new "In Your Notes (live jitter)" strip draws it five times through the real handwriting pipeline — seeded tilt/scale/micro-shear via `getCharVariationWithContext` plus pressure-correlated ink bleed at the live `S.realism` — on a ruled baseline. What you see is exactly how the glyph behaves inside actual notes.
- **`.inkfont` community-share format**: project export now downloads `<FontName>.inkfont` — the project payload wrapped with a `format: 'inkfont'` marker + `formatVersion: 1` for clean future migrations (`inkfont-format.js`, pure and node-safe). Import accepts both `.inkfont` and the legacy bare-project JSON; **4 new unit tests** (258 total) cover the round-trip, marker stripping, legacy acceptance and invalid-JSON rejection. Studio button labels updated to match.

---

## [1.18.0] — 2026-10-03

### 🔒 Added — Phase F4: collaboration relay hardening
- **Room-token gate**: set `INKFLOW_ROOM_TOKEN` when running `node server.js` — connections without a matching `?token=` are closed with 4401 before joining. The client surfaces **"Room token required"** and stops its reconnect loop (set `localStorage.inkflow-collab-token` to match). Without the env var the relay behaves exactly as before (LAN mode).
- **Per-connection message rate limit**: 240 messages / 10 s sliding window; flooding closes the socket with 1008.
- **Per-IP concurrent-connection cap**: 5 per address; the 6th is closed with 1013.
- **64 KB frame cap** on the WebSocket server (oversized frames close with 1009); binary frames close with 1003.
- `server.js` refactored into a `createCollabServer({ port, token })` factory (the direct-run path is unchanged) — **7 new unit tests** (254 total) cover the token gate (none/wrong/correct), the per-IP cap, the rate limit and the payload cap on ephemeral ports.

---

## [1.17.0] — 2026-10-03

### ✨ Added — Phase F3: template gallery
- **Four starter study layouts** registered in the template system and selectable from the Note Layout dropdown: **Lecture Notes** (topic/date header → main notes → Key Terms column), **Lab Report** (Objective → Method → Observations → Result / Conclusion, flowing in document order with section guide lines), **Vocabulary (Term / Definition)** (40/60 labeled columns), and **Reading Notes** (book/chapter header → main notes → Quotes & Page Refs column). Each carries zone labels and guide lines drawn by the layout-decoration pass.
- All gallery templates resolve to finite, in-page zones at any page size/margin (validated by **5 new unit tests**, 247 total) and render verified in-browser.

---

## [1.16.0] — 2026-10-03

### ✨ Added — Phase F1: spaced-repetition flashcards (SM-2 lite)
- **Review scheduling**: flashcards now carry SM-2-lite review state — per-card `ease` (clamped 1.3–3.0), `interval`, `due` date and `reps`, persisted in localStorage (`inkflow-srs`). Card identity is an FNV-1a hash of the question text, so schedules survive answer edits and card reordering.
- **Grade flow**: after flipping a card, four Anki-style grade buttons appear — **1 Again** (lapse: due now, ease −0.2), **2 Hard**, **3 Good**, **4 Easy** (ease boost + interval growth ×1.3) — with keyboard shortcuts 1–4. Grading auto-advances to the next card.
- **Due badge**: the Flashcards Review header shows a live `📅 N due` badge (turns `✓ all reviewed` when clear), recomputed on open, render and grade.
- Pure SRS engine (`cardId`, `gradeCard`, `isDue`, `countDue`, `loadSrsState`/`saveSrsState`) exported for tests — **15 new unit tests** (242 total) covering interval math, ease clamps, lapse resets and due counting.

---

## [1.15.0] — 2026-10-03

### ⚡ Performance — Phase E complete (E1)
- **Lighthouse CI budgets**: `lighthouserc.json` + a `lighthouse` CI job (chrome on ubuntu runners). `npm run lhci` audits both `dist/index.html` and `dist/about.html` per build. Assertions: **accessibility ≥ 0.9 (blocking)**; performance ≥ 0.4 and resource-size budgets are warn-level ratchets (headless perf scores vary ±0.09 run-to-run — raise the ratchet as optimizations land). Local: `npm run lhci`.

### ✨ Added — Phase F first feature (F2)
- **Google Gemini (AI Studio direct) provider**: new `🔑 Google Gemini (Direct)` option in the AI provider dropdown with 5 models (2.5 Flash/Flash Lite/Pro, 2.0 Flash/Flash Lite). `callGemini()` streams via `streamGenerateContent?alt=sse` with the browser-recommended key-in-query pattern, parses `candidates[].content.parts[].text` deltas, reuses the AI busy-state flow, per-provider key persistence (`inkflow-api-key-gemini`), and a friendly no-key path. The service worker never intercepts the Gemini endpoint.

---

## [1.14.0] — 2026-10-03

### ⚡ Performance — Phase E (first slice)

- **Paper-background cache hardened (E3)**: the static paper background (grain + ruling, ~2,200 noise iterations per page) was already cached per `(style, size, fontSize, lineHeight, margin, noteLayout)` key and blitted via `drawImage` — this pass added the missing **LRU cap (6 entries)**: each entry is a 794×1123 canvas (~3.5 MB), and a margin/size slider drag previously pinned every intermediate key (~140 MB worst case). Evicted keys simply redraw on demand.
- **Non-blocking font suite (E2)**: the 50-family Google Fonts stylesheet now loads with the `media="print" onload` swap pattern — first paint no longer waits on ~45 `@font-face` rules (a `<noscript>` fallback keeps no-JS working). Canvas correctness is preserved by the existing `document.fonts.ready` re-render at boot and the per-selection `document.fonts.load()` re-render in the font picker. Service-worker precache URL unchanged.

---

## [1.13.1] — 2026-10-03

### 🛠️ Fixed — Phase D4 accessibility audit (axe-core, WCAG 2.1 AA)
- **Audit result**: light mode **zero violations**; dark mode's only remaining class is axe's glassmorphism artifact — it cannot composite the translucent sidebar/toolbar layers, computing light-mode backgrounds against dark text (manually verified: every flagged pair is ≥ 5:1 against the actual effective backgrounds; e.g. logo 12:1, sidebar labels 5.4:1). Theme tokens had already been hardened in a prior pass (light `--text-muted #6f6752` ≈ 4.7:1, dark `#948da9` ≈ 5.4:1).
- **`role="textbox"` + `aria-multiline`** on the contentEditable page editor and margin-note overlays — their `aria-label`s were on a generic role (axe: aria-prohibited-attr, serious).
- **`#canvas-area` is now keyboard-focusable** (`tabindex="0"`) — the scrollable canvas region previously wasn't reachable by keyboard (axe: scrollable-region-focusable, serious).
- **about.css light `--accent` hardened** `#c0622a → #a34f1e` (matches index.css): small accent text (section tags, hero pill) was 3.79:1 — now 4.76:1 AA; white button text on accent improves to 5.7:1. Decorative glow/border tokens follow.
- Audited: index.html light+dark and about.html (axe blocked by about.html's own CSP on injected scripts — verified by manual WCAG math over its token pairs; all pass with the accent fix).

---

## [1.13.0] — 2026-10-03

**Window bridge fully retired** — the module architecture is complete (M2 epilogue).

### ✨ Changed — Architecture
- **`render-pipeline.js` extracted** (662 lines): `renderText`, `renderSpecificPage`, `debounceRender`/`triggerRender`, `startAnimation`/`stopAnimation`, page DOM management (`createPage`/`clearPages`/`updateEditorStyles`/`getGlobalTextFromEditors`/`getResponsiveCanvasWidth` + the resize reflow handler), `updatePageNav`/`navigatePage`, and the drafted-glyph image cache (moved from state.js — a draw-time concern). index.js: **1,461 → ~900 lines**.
- **`settings-sync.js` extracted** (53 lines): the three sidebar control-sync helpers (`updateInkPresetActive`, `syncMarkdownPenControls`, `syncHinglishControls`) so persistence.js imports them instead of reading them off `window`.
- **Every lazy `window.*` reader converted to real imports**: ai-assistant/notebooks/voice-notes/flashcards/handfonted-studio/persistence/layer-panel/ui-bindings now import `S`, `renderText`, `autosave`, `debounceRender`, and the sync helpers directly from state.js / render-pipeline.js / persistence.js / settings-sync.js / export-manager.js.
- **The window bridge is gone**: no `window.S`, no `window.renderText`, no handler publications — the only remaining `window.*` reads are self-published module namespaces (console/debug + runtime-generated markup) and CDN globals. One documented exception: persistence.js's drafted-char highlight reads `window.ALL_TEMPLATE_CHARS` lazily (importing it would evaluate handfonted-studio's top-level window side effects in node-env tests).
- index.js is now ~900 lines of pure app ownership: initApp/boot, prediction, page-editor focus logic, collaboration glue, AI registry, theme packs, error hook.

### 🧪 Testing
- 227/227 unit + 17/17 E2E + 0 lint errors; production bundle verified in-browser (render pipeline, ink presets, error-toast hook, collaboration UI) with the bridge confirmed absent (`typeof window.S === 'undefined'` while everything works).

---

## [1.12.0] — 2026-10-03

**M2 exit criterion met + Phase D UX slice** — parallel-agent wave 4 plus the canvas a11y bridge.

### ✨ Changed — Architecture (Phase B continuation)
- **M2 exit criterion met: index.js is 1,461 lines** (< 1,500; was 2,253 at v1.11.0, 4,276 at the original audit).
- **`layout-engine.js` extracted** (626 lines): `layoutText` (+ the private templated engine), the sticky/callout painters, and the margin-Q/Ans canvas drawing. `layoutText()` now takes `currentPrediction` as a parameter (owned by its callers).
- **`shape-drawing.js` extracted** (178 lines): `drawArrowhead`/`drawShapeOrEdge` (rough.js shape painting, distinct from diagram-engine's layout/mermaid concern).
- **`fontSwitcher`/`markdownParser` moved into `state.js`** (leaf-class instances, mirroring `cursiveConnector`); `script-detector.js`'s top-level `window` write gained a node-env guard so test imports of the state graph stay safe.
- index.js's `getDiagramImage` delegating wrapper deleted — callers use `DiagramEngine.getDiagramImage` directly.

### ✨ Added — Phase D UX
- **D1 AI loading states**: AI actions set `aria-busy` + a busy style on the AI section, disable its buttons once, and restore them in a `finally` — every exit path (missing key, errors, offline arrange) recovers.
- **D2 storage quota guard**: `autosave()` catches `QuotaExceededError` and shows a throttled (60 s) error toast with an export-and-clear rescue hint; non-quota errors still surface through the global error hook.
- **D3 canvas a11y bridge**: each page canvas is `role="img"` with a descriptive `aria-label` pointing screen readers to the editable page overlay that carries the text.
- **D5 slider limit hints**: all 9 sidebar sliders show min/max hint labels mirroring their input ranges.

### 🧪 Testing
- 227/227 unit + 17/17 E2E + 0 lint errors (12 warnings); production-verified in-browser (busy-state round-trip via offline Smart Arrange, hints, a11y labels).

---

## [1.11.0] — 2026-10-03

**M2 completed + Phase C core quality** of `docs/upgrade-plan.md` — parallel-agent wave 3 plus follow-ups.

### ✨ Changed — Architecture (M2 exit)
- **All 113 inline HTML handlers migrated to `addEventListener`** (55 elements gained stable ids; compound `return false` links became `preventDefault()` calls) — the last reason for the ESLint `no-unused-vars` allowlist is gone: **the allowlist is deleted**.
- **`ui-bindings.js` extracted** (805 lines, B4): 16 per-panel binders (`bindToolbar`, `bindTextPanel`, `bindFontStylePanel`, `bindEffectsPanel`, `bindPaperPanel`, `bindLayoutPanel`, `bindAIPanel`, `bindExportPanel`, `bindNotebooksPanel`, `bindAnimationPanel`, `bindPageNav`, `bindModals`, …) replace `bindUIActions()` and the scattered top-level bindings. index.js: **3,141 → 2,232 lines** (4,607 at v1.10.0's start).
- **`layer-panel.js` extracted** (B3, 424 lines): the layer UI (add presets, move/duplicate/clear/flatten, add-dropdown) with a guarded `maybeUpdateLayerUI()` render hook; dead code removed (`addNewLayer`, `buildCharQueue`).
- **Window bridge retired to its minimum**: only the lazy-reader publications remain (`renderText`, `autosave`, `debounceRender`, `S`, `updateInkPresetActive`, `syncMarkdownPenControls`, `syncHinglishControls`, `ALL_TEMPLATE_CHARS`, `renderSpecificPage`) — every handler-only publication is gone. Converting the remaining lazy readers to imports is a Phase B follow-up.

### 🧪 Testing (Phase C)
- **Export pipeline E2E (C2)**: 7 new assertions in `e2e/export-formats.spec.js` — PNG/JPG/transparent-PNG downloads with filename patterns, PDF in Standard + High presets (exercising `_upscaleCanvas`), SVG content validation from the downloaded file, real clipboard-image verification for Copy, and a `window.print` invocation counter. **17 E2E tests total.**
- **Coverage ratchet in CI (C3)**: `@vitest/coverage-v8` wired into `npm run test:coverage` with thresholds (52% lines / 42% branches / 54% functions / 51% statements over the 15 module files) — CI now fails if coverage regresses; raise the ratchet with each release.
- **Global error surface (C4)**: `window.onerror`-style `error` + `unhandledrejection` listeners surface failures as a rate-limited error toast (`showExportToast(msg, 'error')`) + console group — users can finally see and report failures.
- `e2e/layer-manager.spec.js` updated to click the Add-Layer dropdown instead of the retired `window.addNewLayerPreset` publication.

---

## [1.10.0] — 2026-10-02

**M2 Architecture** of `docs/upgrade-plan.md` — executed with parallel agents (two waves).

### ✨ Changed — Architecture
- **`handfonted-studio.js` extracted** (B1): the entire HandFonted Studio (~1,339 lines, 40+ functions) moved out of index.js into a 1,200-line module; shared glyph state (`draftedGlyphs`, the glyph image cache, and the IndexedDB glyph-persistence layer `getGlyphsDB`/`saveGlyphDB`/`pruneBlankGlyphs`) moved into `state.js` as live bindings. index.js: **4,607 → 3,141 lines** across this release.
- **`persistence.js` extracted** (B2): `autosave()` (with its 1,000 ms debounce), `restoreState()`, and — newly factored out as pure functions — the autosave whitelist (`AUTOSAVE_KEYS`, 22 keys in byte-stable order), `buildAutosavePayload()` and `parseAutosaveState()`. `restoreState` moved in full; its three UI couplings go through the established lazy `window.*` pattern. **11 new unit tests** cover the whitelist round-trip, corrupt-JSON handling, and re-hydration semantics (227 total).
- **Hashed production filenames + build-generated precache manifest** (B5): Vite emits `assets/index-[hash].js` / `-[hash].css`; `vite build` walks dist and injects the real file list between `BUILD-PRECACHE:BEGIN/END` markers in `dist/sw.js` (idempotent, fails loudly on drift). The hand-maintained precache array — the drift bug class that broke the SW twice — is gone. CI's dist sanity check is hash-safe.
- **export-manager → export-renderers**: direct imports replace the `window.ExportRenderers` indirection; the namespace stays for console access.

### 🧪 Testing
- **3 new E2E specs** (10 total): `about-page.spec.js` (playground canvas pixels, dark-mode persistence, nav back), `handfonted-studio.spec.js` (modal open/tab-switch/close round-trip), `diagram-dropdown.spec.js` (click-toggle, outside-click/Escape close, template insertion). **227/227 unit + 10/10 E2E + 0 lint errors.**

### 🛠️ Fixed
- About-page hero pill was hardcoded to the release version (drifted to v1.8.0); now bumped with the release (full dynamic sync is a Phase D nicety).

---

## [1.9.0] — 2026-10-02

**M1 Foundation** of `docs/upgrade-plan.md`: the app is now a real ES-module build.

### ✨ Changed — Architecture (upgrade plan A2/A3)
- **ES-module conversion complete**: index.html loads ONE `<script type="module" src="index.js">`; index.js imports all 21 library modules explicitly (in the classic load order). The 59 `window.*` glue handoffs are gone — every cross-file reference is a real import, verified by ESLint `no-undef` with the project-global allowlist removed (`sourceType: 'module'`).
- **New `state.js`**: owns the shared application state (`S`, `pages`, `PAGE_W`/`PAGE_H`, `cursiveConnector`) that library modules read at call time. This removes every index.js ⇄ module import cycle (text-layout, paper-renderer, export-manager, export-renderers now import state directly). `pages` is mutated in place (`pages.length = 0`) so the live binding stays shared.
- **Window bridge for inline handlers**: ES modules are strict and module-scoped, so index.js now explicitly bridges the ~45 inline-handler entry points (`Object.assign(window, { … })`) plus `renderText`/`autosave`/`debounceRender` for the modules that read them lazily.
- **Real bundling**: `npm run build` produces a single minified `dist/index.js` (161.8 kB / 52.8 kB gzip — was 23 unbundled files), stable output names (`index.js`, `assets/index.css`), and the sw.js precache list now matches the bundled output exactly. (Hashed filenames + a generated precache manifest are Phase B5.)
- **Service worker dev guard**: the SW registers from index.js only when `!import.meta.env.DEV` (statically replaced at build time) — the unstyled-dev-session quirk (Vite serves `.css` as HMR modules that the SW precached verbatim) is gone; `npm run dev` no longer installs a service worker.

### 🛠️ Fixed
- **2 high-severity npm audit findings** (`brace-expansion`, `undici` — dev chain) resolved via `npm audit fix`; the CI audit job is now **blocking** and covers dev dependencies too (was non-blocking, prod-only).
- **3 dead inline handlers** discovered by the conversion inventory: `closeGrammarModal()` (grammar modal close button threw a ReferenceError) is implemented; `toggleLayerAddDropdown()`/`closeLayerAddDropdown()` (the ➕ Add Layer dropdown menu never opened — the E2E suite only exercised the CSS hover path) are implemented and wired.
- Test files converted from `require()` to ES imports; `cursive-connector.test.js` → `cursive-connector.test.mjs` and `markdown-parser.pbt.js` → `markdown-parser.pbt.mjs` (Node-runnable ESM, still excluded from Vitest).

### 📦 PWA & Offline
- Precache list is now the real app shell: `/`, `index.html`, the bundled `index.js`, `assets/index.css`, the About page assets, the logo, and the manifest — installed and verified in production.

### 🧪 Testing
- 216/216 unit tests + 7/7 Playwright E2E + 0 lint errors (warnings 50 → 23) on the module graph; production bundle verified in-browser (render pipeline, bridged handlers, SW install, zero console errors).

---

## [1.8.0] — 2026-10-02

Upstream sync: ports every feature from InkForge v1.6.25–v1.6.26 that the fork was missing (verified against the upstream changelog and source).

### ✨ Added
- **Enhanced Realism Engine (upstream 1.6.25 parity)**, layered onto the seeded engine:
  - **Anisotropic scale jitter**: `getCharVariationWithContext()` now returns independent `scaleX`/`scaleY` — `scaleX` is biased toward horizontal compression (range ±0.9·jitter) while `scaleY` allows slight vertical stretch (up to 1.1·jitter), reproducing how real pen strokes widen and shorten under varying hand pressure.
  - **Micro-shear (`shearX`)**: each glyph receives a subtle horizontal shear (±0.022 × `S.realism`, scaled ×0.3 for Devanagari) applied via `ctx.transform()` in **all three draw paths** — static page render, writing animation, and export rendering — breaking the "mechanical italic" look of uniform slant. Neutralised in Clean mode (engine-level `clean` guard) and for Indic scripts.
  - **Pressure-correlated ink bleed**: with Ink Bleed active, the per-glyph bleed shadow radius is modulated by `pressureMod` (`bleedFactor = 1 + (pressureMod − 1) × 0.4 × realism`) — heavier-pressure glyphs bleed slightly more, matching fluid ink dynamics on paper fibers.
- **Blue Ink Pen preset (`#000F55`)**: deep royal-blue ballpoint tone added as the first preset in the ink row, with `data-ink`/`data-ink-name` attributes on every preset button.
- **`updateInkPresetActive()` helper**: centralises preset active-state management — the accent-ring `.active-ink` highlight always reflects the live ink color. Called from `setInkPreset()`, the freeform color-picker handler, `restoreState()`, and `resetToDefaults()`.
- **Standalone About page (`about.html` + `about.css`, upstream 1.6.26 parity)**, adapted to Inkflow branding:
  - Interactive Realism Engine playground — type text, tweak jitter magnitude and baseline drift, toggle notebook guidelines and retrace double-strokes, rendered live on canvas with a deterministic `mulberry32` simulator.
  - Deep-dive feature showcases (realism physics, paper styles, AI scribe, HandFonted Studio, exports, offline PWA), privacy guarantee, architecture & test-suite specs, documentation directory cards, and creator credits — all linked to the Inkflow repository, MIT license, and Inkflow docs.
  - Dark/Light toggle synchronised with the app through the shared `inkflow-dark` localStorage key.
- **Brand identity (upstream 1.6.26 parity)**: new brand emblem (`inkflow_logo.jpeg`) wired into the toolbar header, favicon, Apple touch icon, PWA manifest, and About page.
- **Navigation overhaul (upstream 1.6.26 parity)**: clickable brand logo in the toolbar linking to `about.html`, a dedicated **ℹ️ About** toolbar button, and quick-access footer links (**About Inkflow / Docs / GitHub**) at the bottom of the sidebar drawer.

### 📦 PWA & Offline
- **Manifest**: added "New Note / Export PDF / About Inkflow" shortcuts, the logo as a 512×512 maskable icon, categories, and repository metadata.
- **Service worker**: `about.html`, `about.css`, and `inkflow_logo.jpeg` precached for 100% offline availability; cache bumped to `inkflow-v1.8.0`.
- **Build**: `vite.config.js` copies the About page, its stylesheet, and the logo verbatim into `dist` so the precached URLs stay exact.

### 🧪 Testing
- 8 new engine tests: `shearX` presence/bounds, zero-realism neutrality, Devanagari 0.3× shear scaling, anisotropic ranges (Latin + Indic), and the Clean style guard; the Devanagari scale-range assertion was updated to the upstream 1.6.25 anisotropic bounds. **216/216 passing.**

---

## [1.7.0] — 2026-09-13

### ✨ Added
- **Seeded Realism Engine (upstream 1.6.22 parity)**: `mulberry32` PRNG seeded via an FNV-1a hash of the note text — re-renders, page switches, and PDF exports are now pixel-identical. New **Realism / Human Jitter** slider (0–1, default 0.5) scales all variation; Devanagari script auto-tightens jitter (0.3× rotation / 0.4× scale) to protect matras and the shirorekha line. Per-line baseline drift random walk (clamped ±3.5·r·k). New **Rare Imperfections** toggle: ~1.8% of glyphs render a faint 1px-offset retrace stroke in the live render, the writing animation, and exports.
- **Clean paper style (upstream 1.4.0 parity)**: new "✨ Clean" paper button — crisp typographic mode (neutral variation, no grain, no ink-bleed shadow, drafted glyphs bypassed). Unsupported handwriting fonts auto-switch to Kalam; bare `Answer:` lines are hidden on canvas in Standard layout and represented by the margin **Ans** label (still editable).
- **Margin Q/Ans labels (upstream 1.6.8–1.6.17 parity)**: new `margin-labels.js` module clusters the render queue into visual lines and draws **Q1…Qn** next to numbered question lines (space-tolerant matching, trailing `?` required) and **Ans** next to bare `Answer:` lines — right-aligned in the margin, document-wide sequential numbering computed per render, toggle in the Page Layout section (Standard layout only).
- **PDF Output Size presets (upstream 1.6.20 parity)**: new dropdown in Export — Compact (1×, JPEG 75%), Standard (2×, JPEG 92%, default), High (2×, lossless PNG). Persisted per browser; toast names the active preset.
- **AI Response Post-Processing (upstream 1.6.23 parity)**: new `ai-postprocess.js` — `sanitizeAiResponse()` strips markdown/HTML leakage before rendering (code fences, inline backticks, bold/italic, raw tags) while preserving Inkflow syntax and `​```diagram`/`​```mermaid` fences; `resequenceQA()` renumbers Q:/A: pairs sequentially from Q1 and silently drops near-duplicate questions (trigram Jaccard ≥ 0.72) with their paired answers. Applied to every AI result and accepted grammar corrections.
- **Offline Smart Arrange (upstream 1.6.7 parity)**: the 🪄 Smart Arrange button no longer needs an AI provider or API key — a deterministic in-browser tidy-up normalizes bullets, headers, study tags, highlights, Q/A labels and punctuation spacing, inserts structural breaks, and reports the fix count via toast.
- **Full 48-font handwriting suite**: Google Fonts expanded to 50 families; the font dropdown now mirrors the upstream grouping — Print Handwriting (20), Cursive & Script (20), Devanagari (8), Clean (2).
- **Mobile UX overhaul (upstream 1.6.23/1.6.24 parity)**: proper sidebar drawer (`setSidebarOpen()`, `#sidebar-backdrop` scrim, body scroll-lock, closes on scrim tap / canvas tap / Escape); compact icon-only toolbar ≤768px; responsive canvas width via `getResponsiveCanvasWidth()` (≤480px: vw−24, ≤768px: vw−32, desktop min(794,720)) with full resize reflow; `viewport-fit=cover` + safe-area padding; `100dvh` stable height; `touch-action: manipulation`; ≥16px drawer inputs (iOS zoom guard); edge-to-edge HandFonted/Flashcards modals on phones.
- **Accessibility**: ARIA labels on emoji-only buttons (ink presets, Animate/Start/Stop, page nav, modal closes, toolbar), `aria-live` screen-reader announcer wired to AI status and export toasts, skip-to-canvas link, `prefers-reduced-motion` support, canvas page `tabindex` focus.
- **Theme Packs UI**: 6 one-click theme buttons in the Paper Style section (the packs previously existed but had no launcher).
- **Supply chain**: SRI `integrity` + `crossorigin` attributes on all 7 CDN resources (hashes computed from the live CDN responses).
- **Offline fonts**: the Google Fonts stylesheet is precached by the service worker — the full suite is available offline; `.woff2` files cache at runtime.

### 🛠️ Fixed
- **Critical: `window.S` was never assigned** — `ai-assistant.js` and `notebooks.js` read shared state via `window.S`, which was `undefined`: any real AI action with a valid API key crashed with a TypeError mid-stream. State is now exposed in index.js.
- **Critical: broken production build** — `npm run build` produced a dist missing all 17 classic `<script>` files (Rollup ignores non-module scripts), so the built site was dead. `vite.config.js` now copies root scripts into dist.
- **Critical: cursive render crash** — `renderCursive(ctx, pageItems)` was called with 2 arguments against a 3-argument signature; Cursive Mode threw at render time.
- **Service worker**: removed `/server.js` (a Node file that can never run in the browser) from precache; added `manifest.json`, `audio-recorder.js` and the new modules; cache-name version drift is now enforced by `npm run check:version` (runs in CI).
- **`setPaper()` missing autosave** (claimed fixed in 1.6.2 but absent from the code).
- **Voice recognition errors were silent** — friendly toasts now appear for mic-denied / no-microphone / network / no-speech conditions.
- **ESLint**: the 45-name unused-vars allowlist no longer hides warnings for functions extracted to modules; 0 errors maintained.

### ♻️ Changed
- **Version bumped** 1.6.0 → 1.7.0 (service-worker cache refreshes automatically for installed users).
- **CI**: new GitHub Actions workflow — lint + unit tests (Vitest) + version-consistency check + production build with dist sanity check + non-blocking `npm audit` on every pull request.
- **Modularization continued**: `flashcards.js`, `voice-notes.js`, `ai-postprocess.js` and `margin-labels.js` extracted from index.js; new unit suites for AI post-processing, flashcard extraction, margin labels and the realism engine — **197 tests passing** (up from 130).
- **Root `README.md` added**, plus `docs/roadmap.md` (update & enhancement plan with progress log) and `docs/feature-gap-analysis.md` (fork-vs-upstream analysis, all items now closed).

---

## [1.6.0] — 2026-08-30

### ✨ Added
- **Rich Syntax System**: `parseRichSyntax()` extracts `[sticky:color]...[sticky]`, `[callout:type]...[callout]`, `==highlighted==` markers, and `Q:/A:` flashcard pairs from raw text. `paintStickyNotes()` and `paintCallouts()` render margin annotations on canvas.
- **Ollama Local AI**: New `callOllama()` function for local LLM inference via `localhost:11434`. Added `ollama` provider to AI dropdown with 7 pre-configured models (Llama 3.2, Mistral, Phi-4, Gemma 2, Qwen 2.5, DeepSeek R1, CodeLlama). No API key required.
- **AI System Prompt**: New `AI_SYSTEM_BASE_PROMPT` constant for rich-syntax-aware AI output formatting.
- **API Key Persistence**: New `initApiKeyPersistence()` saves/restores API keys per-provider in localStorage with "Remember key" checkbox.
- **Study Mode**: `toggleStudyMode()` activates study-focused view with flashcard extraction from Q:/A: patterns.
- **Flashcards Modal**: Interactive flip-card modal with prev/next navigation, counter, and 3D CSS flip animation.
- **Voice to Notes**: `startVoiceRecording()` uses Web Speech API (Chrome) for real-time speech-to-text transcription directly into the note editor.
- **Theme Packs**: 6 color presets (Default, Forest, Sunset, Ocean, Lavender, Charcoal) via `applyThemePack()`.
- **Notebooks System**: Full IndexedDB CRUD via `notebooks.js` — `saveNotebook`, `loadNotebook`, `listNotebooks`, `deleteNotebook`, `duplicateNotebook`. Sidebar UI with save/open/delete controls.
- **PWA Support**: `sw.js` service worker with cache-first static assets and network-first API calls. `manifest.json` for installable progressive web app.
- **TTF Font Export**: `exportCustomFontTTF()` in `font-compilation.js` downloads compiled handwriting font as `.ttf` file. Export button added to HandFonted Studio.
- **`drawRoundedRect`**: Rounded rectangle helper in `paper-renderer.js` for sticky notes and callout boxes.
- **`drawWrappedText`**: Word-wrapped text rendering with max-lines truncation in `paper-renderer.js`.
- **`splitRawTextIntoPages`**: Splits raw text by clean page boundaries for multi-page export fidelity in `text-layout.js`.
- **`parseStructuredContent`**: Parses headings, bullets, questions, and paragraphs from text in `text-layout.js`.
- **`containsDevanagari`**: Backward-compatible alias for `ScriptDetector.isIndicScript()` in `script-detector.js`.
- **`_upscaleCanvas`**: 2× canvas upscaler for high-DPI export in `export-renderers.js`.
- **`redrawPageCanvas`**: Full page re-render helper (background + smudge + queue) in `index.js`.
- **Modal Accessibility**: ESC key closes modals, Tab focus trap on all `.modal-overlay` elements, focus save/restore.
- **`glyphImageCache` LRU**: Converted from unbounded `{}` to `Map` with 500-entry cap.
- **`diagramCache` LRU**: Converted from unbounded `{}` to `Map` with 100-entry cap in `diagram-engine.js`.

### 🛠️ Fixed
- **PDF Text Extraction**: Added `hasEOL` handling to preserve paragraph structure in `content.items`.
- **Shape Rendering Dedup**: Extracted shared `drawShapeOrEdge()` function, replacing ~220L of duplicated code in `renderSpecificPage` and `startAnimation`. Adds diamond fallback and edge labels to animation path.
- **Dead Code Removed**: Removed `drawStudioCanvas` reference (undefined function), IntersectionObserver force-render block (made observer redundant), redundant `arguments[1]` check in `renderSpecificPage`.
- **Test Theater Removed**: `doubt-solver.test.js` and `solution-streaming.test.js` excluded from vitest — they tested mock data, not real code.
- **`diagram-engine.js` Moved**: Moved from `<head>` to bottom of `<body>` in `index.html` (was render-blocking).
- **`audio-recorder.js` Bug Fix**: `window.aiAction()` → `window.AIAssistant.aiAction()`.

### ♻️ Changed
- **Version Bumped**: `package.json` updated from 1.5.2 to 1.6.0.
- **27+ New Functions**: Across `paper-renderer.js`, `text-layout.js`, `script-detector.js`, `export-renderers.js`, `font-compilation.js`, `ai-assistant.js`, `index.js`, `notebooks.js`.
- **130 Vitest Tests Pass**: All existing tests plus new test theater exclusions.

---

## [1.5.1] — 2026-08-29

### 🛠️ Fixed
- **Critical: `renderCursiveConnections` undefined** — Cursive mode rendering crashed with `ReferenceError`. Fixed to call `renderCursiveConnectionsOn(ctx, pageItems)` from `export-renderers.js`.
- **Critical: Server crash on malformed operations** — `server.js` crashed on `op.char.length` when `op.char` was undefined. Added type validation and position bounds checking.
- **Critical: `autoFitFontSize` state corruption** — Binary search mutated `S.fontSize` with no `try/finally`. If `layoutText()` threw, font size was permanently corrupted. Added restore on error.
- **High: `loadImageToCanvas` hangs forever** — Promise never rejected on invalid images. Added `img.onerror` handler.
- **High: `curr.v.pressureMod` null deref** — Cursive rendering crashed on malformed queue items. Added optional chaining.
- **High: DOM null dereferences** — 8+ `getElementById` calls accessed properties without null checks. Added `?.` optional chaining to all.
- **Medium: `resolveDimension` ignores `"px"` strings** — Template manager treated `"20px"` as `0`. Added `px` branch.
- **Medium: `resolveTemplate` crashes on missing zones** — Added fallback `(template.zones || [])`.
- **Medium: `getAllTemplates` corrupts Map** — Malformed localStorage entries added `undefined` key. Added validation.
- **Medium: Blob URL leaked on invalid SVG** — `diagram-engine.js` didn't revoke URL on early return.
- **Medium: `drawPaperBackground` crashes on missing globals** — Added guard for `S`, `PAGE_W`, `PAGE_H`.
- **Medium: WebSocket reconnection** — Added exponential backoff (3 attempts, max 8s delay) in `collaborative-engine.js`.
- **Medium: Server error handler** — Added `ws.on('error')` to prevent noisy stderr logs.

---

## [1.5.0] — 2026-08-28

### ✨ Added
- **Modular Architecture**: Extracted 4 pure-logic modules from index.js, reducing it from ~5,000 to ~3,765 lines (−24.6%).
- **`font-compilation.js`**: Contour tracing (Moore-Neighbor), RDP path simplification, blank-cell detection, OpenType path compilation.
- **`paper-renderer.js`**: All 10 paper style renderers, smudge effects, layout decorations, alignment offsets.
- **`text-layout.js`**: `sanitizeText`, `parseBlocks`, `getGraphemes` — pure text processing helpers.
- **`export-renderers.js`**: `renderQueueItems` and `renderCursiveConnectionsOn` — pure canvas rendering for exports.
- **ESLint + Prettier**: Code quality tooling with flat config (ESLint v9+), 0 errors, consistent formatting.
- **Vitest Test Framework**: Modern test runner with `npm test`, `npm run test:watch`, `npm run test:coverage`.

### ♻️ Changed
- **index.js reduced to 3,765 lines** (from 4,993) — core UI, state, AI, animation remain.
- **16 JS modules** total (up from 12), all passing syntax checks.
- **178+ tests passing** (27 cursive-connector + 23 diagram-engine + 128 Vitest).
- **Documentation updated** across all 19 files to match actual file structure and feature set.
- **All JS files formatted** with Prettier (single quotes, trailing commas, 120 print width).

### 🛠️ Fixed
- **smudge-effects.test.js**: Migrated from Jest to Vitest (`jest.fn()` → `vi.fn()`).
- **Standalone test files**: `cursive-connector.test.js` and `diagram-engine.test.js` now work with both Node.js and Vitest.

---

## [1.4.0] — 2026-08-25

### ✨ Added
- **6 Diagram Types**: New dropdown with Cycle, Flowchart, Hierarchy (Tree), Pipeline, Pyramid, and Mermaid diagram options. Each uses rough.js for hand-drawn aesthetic.
- **New Shapes — Pill & Hexagon**: Added `pill`/`rounded` and `hexagon` shape types to diagram rendering (both rough.js and canvas2d), including animation support.
- **Dated Paper Style**: New "Dated" paper style with a date column line to the left of the margin for date-stamped notes.
- **Transparent PNG Export**: New `✨ Transparent` export button that renders text on a transparent background without paper grain or rulings.
- **Cursive Connector Rendering**: New `renderConnectionStroke()` function that draws smooth cursive connections between characters using quadratic Bezier curves.
- **Edge Label Rendering**: Diagram edges now support `label` property rendered with a background pill for readability.
- **Node Label Rendering**: Diagram nodes support `label` property rendered below shapes via new `diagram-label` queue items.
- **Diagram Engine Module**: Extracted `layoutCycle`, `layoutFlowchart`, `layoutHierarchy`, `getDiagramImage`, `parseDiagramJSON`, `positionDiagramNodes` into standalone `diagram-engine.js` module.
- **Tests**: Added `diagram-engine.test.js` (23 tests) and `cursive-connector.test.js` (27 tests).

### 🛠️ Fixed
- **Cursive Exit/Entry Points**: Fixed `charExitPoints`/`charEntryPoints` Y coordinates from top-relative (0.1–0.55) to baseline-relative (0.02), eliminating diagonal slash-through-text bug on characters like L, T, V, W.
- **fontSwitcher Null Dereference**: Fixed 8 call sites where `fontSwitcher?.getFontStack()` could return null, adding fallback to `S.font`.
- **n.label Undefined Crash**: Diagram label rendering loop now skips nodes with no label; `ctx.font` set before `measureText`.
- **Mermaid Object URL Leak**: Blob URLs from Mermaid rendering are now revoked after image loads (`URL.revokeObjectURL(url)`).
- **autoFitFontSize Fallback**: Defaults to minimum font size (14) when no size fits the page.
- **Collab Engine Event Listener Leak**: `disconnect()` now removes the input event listener to prevent memory leaks.
- **Null Guards**: Added optional chaining for slider wiring loop, fontSelect, inkColorInput listeners, cursive getExitPoint/getEntryPoint, and audio-recorder timerDisplay/sizeDisplay.

### ♻️ Changed
- **Diagram Queue Rendering**: Split `type: 'diagram'` queue items into individual shape+edge items for proper sequential rendering.
- **Edge Label Background**: Now derives from paper style (dark: `rgba(26,26,46,0.85)`, light: `rgba(247,243,234,0.85)`).
- **Script Loading**: `diagram-engine.js` loads without `defer` before `index.js` for proper global availability.

---

## [1.2.1] — 2026-06-20

### ✨ Added
- **"Smart Arrange" AI Tool**: New AI feature that restructures handwritten notes using an optimization prompt, automatically organizing lists, headers, and bullet points for better readability.
- **Font "Auto-Fit"**: New font size control that automatically scales the text size to perfectly fill the current page, preventing orphans and optimizing vertical space.
- **Glyph Pruning for Custom Fonts**: The font synthesizer now uses blank-cell detection (brightness/alpha checks) to skip empty cells in handwriting templates, preventing "invisible" character bugs in generated `.ttf` files.

### ♻️ Changed
- **"Line Height" Control Bar**: Renamed and upgraded "Line Spacing" to "Line Height", with an expanded scale range of $1.0$ to $3.5$ for more precise vertical typography.
- **Automatic First-Line Skip**: The layout engine now defaults all handwritten text to start from the **second line** of the page (skipping the first ruled line), providing a more natural notebook aesthetic.

---

## [1.2.0] — 2026-06-14

### 🛠️ Fixed
- **Critical Syntax Errors**: Resolved a corrupted merge that caused `clearText` and `layoutText` to be concatenated into a single broken function declaration, crashing all text rendering.
- **Duplicate Layout Code**: Removed a leftover copy of the manual word-wrap loop that had been incorrectly embedded inside `buildCharQueue`, causing parse failures.
- **Orphaned Function Fragments**: Cleaned up residual code (`ment.createElement('canvas')...`) left by failed paste operations near line 649.

### ✨ Added
- **Unified `layoutText()` Engine**: Centralized all word-wrap, line-break, and page-break calculations into a single `layoutText(text)` function. Both `renderText()` and `buildCharQueue()` now share this function, eliminating duplicate logic and ensuring consistent layout between static rendering and animation playback.
- **Restored Helper Functions**: Re-integrated `sanitizeText()`, `getGraphemes()`, `isIndicScript()`, `containsDevanagari()`, `DEVANAGARI_FONTS`, and `getFontStack()` — all of which were accidentally removed during a previous refactoring session.
- **Indic/Devanagari Script Support**: Fully restored multi-script rendering pipeline for Hindi and other Indic languages with proper Unicode range detection and automatic `Noto Sans Devanagari` font fallbacks.
- **`lineCharIndex` Tracking**: Added per-line character index tracking so sinusoidal baseline wobble resets at each new line, preventing runaway drift across long passages.
- **Page Editor Inline Editing**: Each canvas page now has a transparent overlay `<div contenteditable>` (`.page-editor`) allowing users to directly click and edit handwriting text on the page. Blur triggers a full canvas redraw.
- **`getGlobalTextFromEditors()`**: New function that reads all page editors and concatenates their text, keeping the sidebar textarea in sync with in-page edits.
- **Blob-based Export Downloads**: All exports (PNG, JPG, PDF, SVG) now use `URL.createObjectURL(blob)` instead of DataURL strings, resolving Chrome download tray invisibility for files over 2MB.
- **SVG Export**: New `exportSVG()` function that generates an SVG file wrapping a full-resolution PNG image of each page.
- **Copy to Clipboard**: New `copyToClipboard()` function using the Clipboard API to copy the current page as a PNG image.
- **`showExportToast()`**: Non-blocking toast notification system for real-time export progress feedback (`info`, `success`, `warn`, `error` types with auto-dismiss).
- **`triggerDownload()`**: Shared helper function for all download operations, correctly attaching and removing anchor elements from the DOM.
- **SSE AI Streaming**: `callClaude()` upgraded to use Server-Sent Events (SSE) streaming via `ReadableStream` and `TextDecoder`. Text renders word-by-word onto the canvas as the AI generates it, eliminating UI freezing during generation.
- **Auto-scroll During Animation**: The viewport now automatically scrolls to keep the pen cursor visible during animation playback.

### ♻️ Changed
- **`buildCharQueue(text)`**: Simplified to a thin wrapper (`return layoutText(text).queue`), delegating all coordinate computation to `layoutText()`.
- **`renderText()`**: Updated to use `layoutText()` for all layout computation, then render the returned `queue` and sync `pageTexts` to editors.
- **`clearText()`**: Restored and fully implemented: clears textarea, resets `S.text`, creates a blank canvas page with paper background, clears all page editors, and calls `autosave()`.
- **Export pipeline**: Migrated from `html2canvas` (screenshot-based) to native `canvas.toBlob()` / `canvas.toDataURL()` methods, removing the html2canvas dependency for exports and improving accuracy.
- **`updateEditorStyles(editor, canvas)`**: New helper to keep page editor styles (font, padding, size) in sync whenever the canvas is resized or settings change.

---

## [1.1.0] — 2026-05-17

### Added
- **Clean Fallback Fonts**: Added `Roboto` and `Arial` to the font options for users who require cleaner, non-handwriting typography to avoid rendering artifacts.

### Changed
- **CSS Architecture**: Migrated hundreds of inline styles into external `index.css` utility classes for better maintainability and cleaner DOM structure.
- **Accessibility Improvements**: Added descriptive `title` attributes and accessible labels to all form inputs, selects, and controls, resolving numerous screen-reader compliance warnings.

---

## [1.0.0] — 2026-05-17

### 🎉 Initial Release

#### Core Features
- **Handwriting Synthesis Engine** — Per-character rendering with randomized tilt, scale, baseline offset, ink bleed, and pen pressure simulation
- **6 Paper Styles** — Ruled, Plain, Grid, Legal Pad, Vintage Parchment, Dark Mode
- **Paper Grain Texture** — Procedural noise shader for realistic paper fiber texture
- **Multi-Page Layout** — Automatic word-wrap and page-break calculations for unlimited-length documents
- **Live Writing Animation** — Real-time character-by-character writing with floating SVG pen cursor tracking
- **Typography Controls** — Font family, size, line height, word spacing with 12+ handwriting fonts

#### AI Integration
- **Anthropic Claude API** — Direct browser-to-API integration
- **4 AI Workflows** — Summarize, Fix Grammar, Lecture → Notes, Generate Assignment
- **Plain-text output** — AI responses render directly as handwritten notes

#### Export System
- **PNG Export** — High-resolution lossless image with transparency
- **JPG Export** — Compressed image for smaller file sizes
- **PDF Export** — Multi-page A4 document via jsPDF
- **Print** — Native OS print dialog with print-optimized CSS

#### HandFonted Studio (Custom Font Suite)
- **Live Sketchpad** — Draw characters on interactive canvas with adjustable pen settings
- **Template Grid Generator** — Downloadable 8×8 blank handwriting template (64 characters)
- **Scan Upload & Alignment** — Upload scanned sheets with interactive grid overlay sliders
- **Moore-Neighbor Contour Tracing** — Raster-to-vector boundary extraction
- **RDP Curve Simplification** — Ramer-Douglas-Peucker path smoothing (ε = 1.0)
- **OpenType Font Compiler** — Client-side TrueType font compilation via opentype.js
- **Dynamic Font Registration** — CSS FontFace registration and instant activation

#### UI/UX
- **Glassmorphism Design** — Frosted glass sidebar with backdrop-filter blur
- **Dark/Light Theme** — Complete theme toggle with CSS custom properties
- **Responsive Layout** — Mobile-optimized with collapsible sidebar drawer
- **Collapsible Sections** — Smooth cubic-bezier accordion panels
- **State Persistence** — Auto-save to localStorage with debounced serialization

---

## [1.3.0] — 2026-06-15

### ✨ Added
- **Multi-Sheet HandFonting Templates**: Extended custom handwriting font coverage by dividing templates into two sheets: `Letters` (52 upper/lowercase letters) and `Numbers & Symbols` (32 standard numbers, symbols, and punctuation marks: `0–9` and standard symbols/punctuation: `. , ? ! @ # $ % ^ & * ( ) - _ + = / : ; ' "`).
- **Tabbed HandFonted Studio UI**: Interactive sheet tabs inside the Live Sketchpad modal and a dropdown selector inside the Scan Template upload tab to switch sheets. Each sheet retains separate grid alignment offsets (`X, Y, W, H`) and uploaded alignment image states.
- **IndexedDB Glyph Storage**: Migrated custom character drafts from `localStorage` to `IndexedDB` (`InkflowDB` -> `draftedGlyphs` store), bypassing the 5MB browser quota limit and preventing browser data crashes.
- **IndexedDB Auto-Migration**: Included a transparent boot migration script in `restoreState()` that transfers any pre-existing custom glyphs from `localStorage` into the IndexedDB store, clearing the old keys automatically.
- **Dotted Paper Grid**: New "Dot Grid" paper style rendering dots at 28px intervals on a beige background (`#f6f2ec`).
- **Engineering Paper Style**: New "Engineering" paper style on pale green background (`#eef6ed`) with 10px minor grid lines, 50px major grid lines, and reddish-brown margins.
- **Music Staff Paper Style**: New "Music Staff" paper style drawing groups of 5-line staffs with 8px spacing, 72px staff-to-staff spacing, and vertical bracket endpoints.
- **Cornell Note Layout**: New "Cornell Study Notes" layout template. Divides the page into visual cues, main notes, and summary sections, drawing dividing lines dynamically. Lines starting with `? ` or `cue:` automatically render in the Cues sidebar, and lines starting with `== ` or `summary:` render in the bottom Summary footer.
- **Two-Column Note Layout**: New "Two-Column Grid" layout template that wraps and flows text across two columns per page before breaking to the next page.
- **Page Layout UI Section**: Added a new collapsed "Page Layout" section in the sidebar with a note layout template selector.
- **Character-Level Soft Wrapping**: All three layout engines (Standard, Two-Column, and Cornell) now perform per-character wrap checks. Long continuous strings without spaces (e.g. URLs, unbroken text) wrap at the right margin instead of overflowing off the page.

### ♻️ Changed
- **`initApp()` & `restoreState()`**: Upgraded to async/await to support asynchronous IndexedDB initialization and glyph retrieval.
- **`cropTemplateCell()`**: Signature updated to `cropTemplateCell(index, sheetName)` to support slicing character cells from multiple templates.
- **`generateDownloadTemplate()`**: Updated to dynamically name files and draw guide characters depending on the active sheet.
- **`layoutText()` Engine**: Now includes character-level overflow detection in all layout modes; characters exceeding the right boundary trigger a soft line break with page-break checks.

---

## [Unreleased]

### Planned
- Extended character sets (diacritics, special symbols)
- Localization support (i18n)
- Bullet / Mind-map templates for AI output note styling
