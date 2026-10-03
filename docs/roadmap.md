# 🗺️ Inkflow — Update & Enhancement Plan

**Version basis:** 1.6.0 · **Date:** 2026-09-13 · **Branch:** `next-level`

This plan is grounded in a codebase analysis (knowledge-graph audit, lint/test runs, `gui-test-report.md` from 2026-09-10, and the `docs/` hub). Each item cites its evidence.

---

## Progress Log

**2026-10-03 — Pass #23 (i18n coverage growth → v1.20.1)**

- ✅ Hindi extended to the 11 paper-style buttons + Copy/Print (38 tagged strings); unused nav keys removed; round-trip toggle re-verified in-browser
- ✅ **The upgrade plan (M1–M3, Phase D, E, F) is complete.** Only user-gated items remain: the `next-level` → `main` merge and committing the working tree

**2026-10-03 — Pass #22 (F6 UI localization — Phase F complete → v1.20.0)**

- ✅ **`i18n.js`**: en/hi string tables (26 keys), `t()` with English→key fallback, `data-i18n` attribute bindings (toolbar, 11 section headers, primary actions, flashcards title), persisted `🌐` toolbar toggle, `document.documentElement.lang` sync — **6 new unit tests (264 total)**
- ✅ Verified in-browser: toggle to हिंदी translates the chrome instantly and persists across reload
- ✅ **Phase F complete** (F1 spaced repetition, F2 Gemini provider, F3 template gallery, F4 relay hardening, F5 HandFonted improvements, F6 localization)
- ⏭️ Remaining: merge `next-level` → `main` (standing recommendation); i18n coverage growth (sliders/comboboxes/toasts) as an open enhancement

**2026-10-03 — Pass #21 (F5 HandFonted improvements → v1.19.0)**

- ✅ **Live jitter preview**: saved glyphs render five times through the real variation pipeline (tilt/scale/shear + pressure-correlated bleed at live `S.realism`) on a ruled strip beside the flat preview — verified in-browser (630 ink pixels from a saved stroke)
- ✅ **`.inkfont` share format**: wrapped project export (format marker + version), legacy-accepting import, extracted into node-safe `inkfont-format.js` — **4 new unit tests (258 total)**
- ✅ Studio labels updated (Save Progress (.inkfont))
- ⏭️ Phase F remaining: F6 i18n (last item); merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #20 (F4 collaboration hardening → v1.18.0)**

- ✅ **server.js** refactored into `createCollabServer({ port, token })` (OT logic unchanged; direct run via `node server.js` with optional `INKFLOW_ROOM_TOKEN`); hardening: room-token gate (close 4401), 240-msg/10 s per-connection rate limit (close 1008), 5-per-IP concurrent cap (close 1013), 64 KB frame cap (1009), binary-frame rejection (1003)
- ✅ **Client**: token attached from `localStorage.inkflow-collab-token` when present; a 4401 close surfaces "Room token required" and stops the reconnect loop
- ✅ **7 new unit tests (254 total)** on ephemeral ports: open mode, token none/wrong/correct, per-IP cap, rate-limit flood, payload cap
- ✅ Verified: lint 0 errors, 254/254 unit, build green
- ⏭️ Phase F remaining: F5 HandFonted improvements, F6 i18n; merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #19 (F3 template gallery → v1.17.0)**

- ✅ **Four starter study layouts** registered in template-manager.js (`registerGalleryTemplates()`): lecture (header → notes → key-terms column), lab report (Objective → Method → Observations → Result in document order), vocabulary (term/definition columns), reading notes (header → notes → quotes/page-refs) — each with zone labels + guide lines drawn by the layout-decoration pass
- ✅ Dropdown extended; **5 new unit tests (247 total)** validating finite/in-page zone resolution; Lab Report render verified in-browser (section flow + guides + labels)
- ⏭️ Phase F remaining: F4 collaboration hardening (room tokens/rate limits — or document LAN-only), F5 HandFonted improvements, F6 i18n; merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #18 (F1 spaced repetition → v1.16.0)**

- ✅ **SM-2 lite review scheduling** in flashcards.js: pure engine (`cardId` FNV-1a identity, `gradeCard` 4-grade transitions with ease clamps, `isDue`/`countDue`) + localStorage persistence with node-safe fallback — **15 new unit tests (242 total)**
- ✅ **Review UI**: due badge in the Flashcards Review header, Anki-style grade buttons (1 Again / 2 Hard / 3 Good / 4 Easy) shown on flip with keyboard shortcuts, grading auto-advances; fixed a `.hidden`-vs-`display:flex` specificity clash found in browser verification
- ✅ Verified: 242/242 unit + full E2E + 0 lint errors + in-browser SRS round-trip (2 due → good → 1 due → again → persisted)
- ⏭️ Phase F remaining: F3 template gallery, F4 collaboration hardening, F5 HandFonted improvements, F6 i18n; merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #17 (Phase E complete + Gemini provider → v1.15.0)**

- ✅ **E1 — Phase E complete**: `lighthouserc.json` + `lighthouse` CI job (a11y ≥ 0.9 blocking; perf ≥ 0.4 + size budgets warn-level — headless perf variance measured ±0.09 between runs); `npm run lhci` runs locally against dist
- ✅ **F2 — Gemini direct provider**: `callGemini()` SSE streaming (`streamGenerateContent?alt=sse`), 5-model registry, provider dropdown option, per-provider key persistence, SW endpoint exclusion; no-key path + busy-state recovery verified in-browser
- ✅ Verified: 227/227 unit + 17/17 E2E + 0 lint errors + build + in-browser provider switch
- ⏭️ Phase F remaining: F1 spaced-repetition flashcards, F3 template gallery, F4 collaboration hardening, F5 HandFonted improvements, F6 i18n; merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #16 (Phase E first slice → v1.14.0)**

- ✅ **E2**: 50-family handwriting stylesheet loads non-blocking (`media="print"` swap + noscript fallback); canvas correctness preserved by the existing `document.fonts.ready` boot re-render and per-selection `fonts.load()` re-render; SW precache URL unchanged
- ✅ **E3**: paper-background cache gained an LRU cap (6 entries) — closes the slider-drag memory-growth path (~3.5 MB per cache entry)
- ⏭️ Phase E remaining: Lighthouse CI budgets (E1), grain shader → OffscreenCanvas/worker if profiling justifies it beyond the cache (E3 extended), canvas memory audit for very long documents (E4); Phase F features; merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #15 (D4 contrast audit → v1.13.1)**

- ✅ **Phase D complete.** axe-core audit (WCAG 2.0/2.1 A+AA) over index.html light+dark with all sidebar sections expanded; about.html verified by manual token math (its CSP blocks injected scripts)
- ✅ Fixes: `role="textbox"` + `aria-multiline` on contentEditable page editor + margin overlays (aria-prohibited-attr); `#canvas-area` keyboard-focusable (scrollable-region-focusable); about.css light `--accent` darkened to the index.css AA value
- ✅ Result: **light mode 0 violations**; dark mode's remaining 23 color-contrast flags are axe glass-compositing artifacts (translucent toolbar/sidebar layers — manual math ≥ 5:1 on every flagged pair; tokens already AA from the prior contrast pass)
- ✅ Documented in `docs/accessibility.md`
- ⏭️ Next: Phase E performance (font diet, grain-shader worker, page virtualization, Lighthouse CI), Phase F features, merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #14 (window bridge fully retired → v1.13.0)**

- ✅ **`render-pipeline.js` extracted** (662 L) and **`settings-sync.js`** (53 L); every lazy `window.*` reader converted to real imports; **the window bridge is gone** (verified in production: `typeof window.S === 'undefined'` while the app renders/exports/collaborates)
- ✅ index.js: **1,461 → ~900 lines** (4,276 at the original audit; −78%)
- ✅ Completed the interrupted wave-5 agent's cutover (its render-pipeline.js/settings-sync.js + reader conversions landed; index.js cut over, repaired a splice in `toggleCollaboration` against the git-HEAD original, removed extraction duplicates)
- ✅ Verified: 227/227 unit + 17/17 E2E + 0 lint errors + production bundle in-browser
- ⏭️ Remaining: **D4 dark-mode contrast audit** (agent dispatch hit the quota ceiling — rerun), merge `next-level` → `main` (standing recommendation), Phase E performance (font diet, grain-shader worker, page virtualization), Phase F features

**2026-10-03 — Pass #13 (M2 exit criterion met + Phase D slice → v1.12.0)**

- ✅ Executed with parallel-agent wave 4 (file-disjoint: Agent A owned index.js/new modules, Agent B owned ai-assistant.js/persistence.js/index.html/index.css/docs)
- ✅ **M2 EXIT MET: index.js 1,461 lines** (< 1,500) — **`layout-engine.js`** (626 L: layout engine, sticky/callout painters, margin-label drawing; `layoutText(text, currentPrediction)` parameterized) + **`shape-drawing.js`** (178 L: drawArrowhead/drawShapeOrEdge) + `fontSwitcher`/`markdownParser` moved to state.js; script-detector gained a node-env guard
- ✅ **D1**: AI busy states (aria-busy + button disable with single finally recovery — offline Smart Arrange verified round-trip in production); **D2**: autosave quota guard with 60 s-throttled rescue toast; **D3**: canvas `role="img"` + aria-label bridge (mine); **D5**: 9 slider min/max hint rows
- ✅ Verified: 227/227 unit + 17/17 E2E + 0 lint errors + production browser check
- ⏭️ Remaining: lazy `window.*` reader conversion (ai-assistant/notebooks/voice-notes/flashcards/persistence → imports), render/AI core extraction if index.js should shrink further, Phase D remainder (D4 dark-mode contrast audit, D6 docs catch-up), merge `next-level` → `main` (standing recommendation)

**2026-10-03 — Pass #12 (M2 exit + Phase C quality → v1.11.0)**

- ✅ Executed with parallel-agent wave 3 (file-disjoint: Agent A owned index.js/index.html, Agent B owned e2e/)
- ✅ **B4**: all **113 inline handlers** migrated to `addEventListener` (55 new stable ids, `preventDefault` semantics preserved) — **ESLint allowlist deleted**; **`ui-bindings.js`** (805 L) extracted with 16 per-panel binders replacing `bindUIActions()`
- ✅ **B3**: **`layer-panel.js`** (424 L) extracted; dead code removed (`addNewLayer`, `buildCharQueue`); `maybeUpdateLayerUI()` guard added for the render path
- ✅ **Window bridge retired to minimum**: only the lazy-reader publications remain (`renderText`/`autosave`/`debounceRender`/`S` + persistence's three UI hooks + `ALL_TEMPLATE_CHARS` + `renderSpecificPage`); converting those readers to imports = follow-up
- ✅ **C2**: `e2e/export-formats.spec.js` — 7 assertions covering PNG/JPG/transparent downloads, PDF Standard+High (upscale path), SVG content check, real clipboard image read, `window.print` counter → **17 E2E tests**
- ✅ **C3**: coverage ratchet in CI (`@vitest/coverage-v8`, thresholds 52/42/54/51 over the 15 module files, measured 2026-10-03) — raise with each release
- ✅ **C4**: global `error` + `unhandledrejection` listeners → rate-limited error toast + console group
- 🐛 `e2e/layer-manager.spec.js` updated for the retired `window.addNewLayerPreset` (now clicks the Add-Layer dropdown)
- ✅ index.js: **3,141 → 2,232 lines** (4,569 at v1.8.0; 4,276 at the original audit)
- ✅ Verified: 227/227 unit + 17/17 E2E + 0 lint errors (18 warnings, all pre-existing eqeqeq-style) + production bundle check
- ⏭️ Remaining for index.js < 1,500: render/AI core extraction (Phase B continuation); then Phase D UX/a11y polish; merge `next-level` → `main` still recommended before starting Phase D

**2026-10-02 — Pass #11 (M2 Architecture via parallel agents → v1.10.0)**

- ✅ Executed `docs/upgrade-plan.md` Phase B with two agent waves (file-disjoint partitions, integration-verified between waves)
- ✅ **Wave 1** — Agent 1: `handfonted-studio.js` extracted (index.js 4,607 → 3,316; glyph state + IndexedDB glyph layer moved into `state.js`); Agent 2: hashed filenames + build-injected precache manifest (`BUILD-PRECACHE` markers in dist/sw.js, idempotent, drift-fails-loudly; CI hash-safe; drift-tested all-200)
- ✅ **Wave 2** — Agent 3: `persistence.js` extracted (`autosave`/`restoreState`/`AUTOSAVE_KEYS`/`buildAutosavePayload`/`parseAutosaveState`; restoreState moved in full; +11 tests); Agent 4: 3 new E2E specs (about page, HandFonted modal, Diagram dropdown) — 10/10 passing; found the about-page version-pill drift (fixed)
- ✅ index.js: **4,607 → 3,141 lines** this release (4,569 at v1.8.0); new modules: handfonted-studio.js (1,200), persistence.js (269), state.js (211)
- ✅ Verified combined: 227/227 unit + 10/10 E2E + 0 lint errors + production browser check (persistence round-trip across reload, SW installed with the generated precache incl. hashed bundle/CSS)
- ⏭️ Remaining M2 exit criteria: split `bindUIActions()` + replace the ~113 inline handlers (kills the window bridge); then Phase C (export E2E assertions, coverage ratchet, error toast)

**2026-10-02 — Pass #10 (M1 Foundation: ES-module conversion → v1.9.0)**

- ✅ Executed per `docs/upgrade-plan.md` Phase A, with Context7-verified Vite semantics (`import.meta.env.DEV` static replacement, Rollup output options)
- ✅ **A1**: `npm audit` 2 high findings fixed (`brace-expansion`, `undici` via `npm audit fix`); CI audit job now blocking + dev-inclusive
- ✅ **A3 (the keystone)**: all 22 app scripts converted to ES modules — single `<script type="module" src="index.js">` entry, explicit imports replacing 59 `window.*` glue refs, inventory-driven (grep census + ESLint `no-undef` as the verifier with the project-global allowlist removed). Method: keep each module's `window.*` namespace assignments (zero behavior change), import state where modules read it at call time
- ✅ **state.js extracted** (Phase B2 first slice): `S`, `pages` (const, mutated in place), `PAGE_W`/`PAGE_H`, `cursiveConnector` — library modules import shared state directly; **zero index.js ⇄ module cycles remain**
- ✅ **Window bridge** in index.js for the ~45 inline-handler entry points + `renderText`/`autosave`/`debounceRender` lazy readers; **A2**: SW registers only when `!import.meta.env.DEV`
- ✅ **Real bundling**: single 161.8 kB `dist/index.js` (52.8 kB gzip), stable names, sw.js precache = the exact bundled shell; export-manager now calls `renderQueueItems`/`renderCursiveConnectionsOn` via direct imports (window.ExportRenderers namespace kept for console access)
- 🐛 Fixed 3 dead inline handlers found by the inventory: `closeGrammarModal`, `toggleLayerAddDropdown`, `closeLayerAddDropdown` (Add-Layer dropdown never opened via click — E2E only covered the hover path)
- 🐛 Test-harness conversions: `require()` → ES imports across 9 files; `cursive-connector.test.js`/`markdown-parser.pbt.js` renamed `.mjs` (Node-run ESM, still outside Vitest); stroke-prediction test switched from a side-effect import to a named import
- ✅ Verified: 216/216 unit + 7/7 E2E + 0 lint errors (warnings 50 → 23) + build + in-browser production check (render pipeline, bridged handlers, SW install, 0 console errors)
- ⏭️ Next (M2 / Phase B): `handfonted-studio.js` extraction (~1,382 L), `persistence.js`, `layer-panel.js`, split `bindUIActions()`, replace the remaining 113 inline handlers, hashed filenames + generated precache manifest (B5)

**2026-10-02 — Pass #9 (upstream sync: InkForge v1.6.25–v1.6.26 → v1.8.0)**

- ✅ Upstream download `InkForge-1.6.26` diffed against this fork; everything after the already-ported v1.6.24 was carried over (see `docs/changelog.md` [1.8.0])
- ✅ **Realism engine 1.6.25**: anisotropic scale (scaleX ±0.9·jitter compression / scaleY up to 1.1·jitter stretch), micro-shear `shearX` (±0.022·r, ×0.3 for Devanagari) applied in all three draw paths (render / animation / exports), pressure-correlated ink bleed (`bleedFactor = 1 + (pressureMod − 1) × 0.4 × r`), engine-level `clean` style guard — 8 new engine tests (216 total)
- ✅ **Blue Ink Pen preset (#000F55)** + `updateInkPresetActive()` accent-ring sync (preset click, freeform picker, restore, reset, and app init) with `data-ink`/`data-ink-name` attributes on all preset buttons
- ✅ **About page 1.6.26**: standalone `about.html` + `about.css` adapted to Inkflow branding (repo links, MIT license, `inkflow-dark` theme sync, Inkflow docs directory, interactive realism playground); brand emblem `inkflow_logo.jpeg` wired into toolbar, favicon, Apple touch icon, PWA manifest, and About page; toolbar logo is now clickable, plus an **ℹ️ About** toolbar button and sidebar footer links (About / Docs / GitHub)
- ✅ **PWA**: manifest shortcuts (New Note / Export PDF / About), logo as 512×512 maskable icon; sw.js precaches `about.html`, `about.css`, `inkflow_logo.jpeg`; vite build copies the About page assets verbatim
- 🐛 **Fixed pre-existing P0**: `dist/index.css` never existed (Vite bundles the stylesheet to a hashed `/assets/` name), so the sw.js `cache.addAll()` always rejected and **the service worker never installed in production** — vite.config.js now copies `index.css` to the dist root so the precache URL resolves
- ✅ Verified: 216/216 unit tests, 7/7 Playwright E2E, 0 lint errors, version check, production build + live preview (app + About page, light & dark, blue-ink ring)
- ⚠️ Known dev-mode quirk (pre-existing, out of scope): Vite dev serves `.css` URLs as JS HMR modules, so a SW-controlled dev session renders unstyled; test SW/PWA behavior against `npm run build` + `vite preview`

**2026-09-13 — Pass #8 (Phase 1.2: export-manager.js extraction)**

- ✅ All export pipelines (PNG/JPG/transparent PNG/PDF/SVG/clipboard, `triggerDownload`, `showExportToast`, `announceToScreenReader`) extracted from index.js into `export-manager.js` (280 lines) — top-level-declaration module pattern (globals resolve at call time through the shared classic-script lexical scope), so inline `onclick` handlers and index.js's `showToast` alias work unchanged
- ✅ index.js: 4,297 → 4,121 lines; verified by 197 unit tests + the live E2E export spec (6/6 browser tests passing) + lint + build
- ⏭️ Next Phase 1.2 candidates: `persistence.js` (autosave/restore/glyph DB) and the HandFonted Studio block (~700 lines)

**2026-09-13 — Pass #7 (agent-assisted clean-mode polish + v1.7.0 release prep)**

- ✅ Clean-mode layout polish (upstream v1.6.16): an empty ruled row is inserted before each question block (only when needed; idempotent across re-layouts), and question lines render **bold** (weight 600) in render, animation, and exports — Standard layout only
- ✅ **Version bumped 1.6.0 → 1.7.0** (service-worker cache auto-refresh for installed users)- ✅ Documentation catch-up: `docs/changelog.md` [1.7.0] entry; new-controls reference in `configuration-guide.md`; Seeded Realism Engine section in `handwriting-engine.md`; clean style in `paper-rendering.md`; mobile/drawer section in `ux-interactions.md`; post-processing + offline Smart Arrange in `ai-integration.md`; fonts precache in `pwa.md`; README features/badges refreshed
- ✅ **Playwright E2E suite live**: `e2e/` (6 specs — smoke, pagination, clean paper, flashcards, export download, settings/font-restriction) + `npm run test:e2e` + chromium-only config with a dedicated port 5175 (5173 was occupied by an unrelated dev server) + an `e2e` job in CI. **6/6 passing** in a real headless-browser run.

**2026-09-13 — Gap-fill pass #6 (full 48-font suite + offline fonts)**

- ✅ Google Fonts stylesheet expanded to 50 families; dropdown restructured to upstream's grouping: Print Handwriting (20) / Cursive & Script (20) / Devanagari (8) / Clean (2)
- ✅ Stylesheet URL precached by sw.js (must-match parity) → full font suite available offline (A4 closed)
- ⚠️ Combined-URL live check skipped per user instruction; URL assembled from a verified 200-OK request plus the in-production Reey form

**2026-09-13 — Gap-fill pass #5 (clean paper style, upstream 1.4.0/1.6.11–1.6.18 parity)**

- ✅ `clean` paper style (ruled ruling, no grain) + "✨ Clean" paper button + auto font restriction (non-clean handwriting fonts switch to Kalam)
- ✅ Crisp mode: neutral variation, no drafted glyphs, no ink-bleed shadow in render/animation
- ✅ Bare `Answer:` lines hidden on canvas in clean+standard (queue items flagged `hidden`, still editable; `Ans` margin label anchored to the answer content line per upstream v1.6.15)
- 🐛 Fixed: `setPaper()` missing `autosave()`

**2026-09-13 — Gap-fill pass #4 (seeded realism engine, upstream 1.6.22 parity)**

- ✅ `hashString`/`mulberry32`/`createPRNG` in the jitter engine; layout seeded from note text → pixel-identical re-renders/exports
- ✅ Upstream realism equations (MaxTilt/ScaleJitter/baseline/pressure/opacity × S.realism, Devanagari 0.3/0.4 multipliers) as an opts path; legacy path untouched
- ✅ Baseline-drift random walk per line; ~1.8% seeded retrace strokes drawn in render, animation, and exports behind `S.rareImperfections`
- ✅ "Realism / Human Jitter" slider + "Rare Imperfections" checkbox (persisted, reset-safe); +15 engine tests

**2026-09-13 — Upstream docs reference pass**

- 📖 All 19 docs from `github.com/VIPHACKER100/Inkflow/tree/main/docs` fetched and cross-checked (findings recorded in `docs/feature-gap-analysis.md` → "Reference" section). Validates passes #1–3 against upstream specs; refines remaining gaps (full 48-font suite list, exact realism-engine spec incl. S.realism/mulberry32/drift/rare-imperfections, clean-style Answer-hiding, showHeaderBox).

**2026-09-13 — Gap-fill pass #3 (margin labels + PDF presets)**

- ✅ New `margin-labels.js` (pure + 15 tests): queue line clustering, space-tolerant Q/Ans classifiers, document-wide sequential numbering cached per render
- ✅ Labels drawn in all three paint paths (renderSpecificPage, redrawPageCanvas, startAnimation lazy-per-page) with upstream v1.6.17 geometry; `S.showMarginLabels` checkbox (default on, persisted, reset-safe)
- ✅ `PDF_SIZE_PRESETS` (Compact/Standard/High) + `_upscaleCanvas` now used by `exportPDF()`; `#pdf-size-select` persisted under `'inkflow-pdf-size'`
- 🐛 Fixed: cursive render crashed (`renderCursive` called with 2 args vs 3-arg signature)

**2026-09-13 — Gap-fill pass #2 (mobile UX overhaul, upstream 1.6.23/1.6.24 parity)**

- ✅ `getResponsiveCanvasWidth()` + resize reflow of all page canvases (v1.6.24 mobile canvas fix; hardcoded `min(PAGE_W,720)` removed)
- ✅ Full drawer UX: `setSidebarOpen()` + `#sidebar-backdrop` scrim + scroll-lock + `aria-expanded` + close on scrim/canvas-tap/Escape
- ✅ Compact icon-only toolbar ≤768px (`.btn-label` spans + aria-labels), logo collapses ≤480px
- ✅ `viewport-fit=cover` + safe-area padding, `100dvh`, `touch-action: manipulation`, ≥16px drawer inputs, edge-to-edge modals ≤768px, canvas width constraints

**2026-09-13 — Gap-fill pass #1 (from docs/feature-gap-analysis.md)**

- ✅ New `ai-postprocess.js` (pure module + 23 tests): `sanitizeAiResponse()` (markdown/HTML leakage, diagram fences protected), `resequenceQA()` (sequential renumbering + trigram-Jaccard dedup ≥ 0.72), `smartArrangeLocal()` (offline bullet/header/tag/highlight/punctuation tidy-up with fix counts)
- ✅ `aiAction('arrange')` is now fully offline; all AI results pass through sanitize + resequence before rendering; grammar corrections sanitized
- ✅ SRI `integrity` + `crossorigin` on all 7 CDN resources (hashes computed from live responses)
- ✅ Font dropdown +8 previously-loaded-but-unselectable handwriting fonts
- ✅ Theme-pack UI (6 buttons, Paper Style section); Escape exits Study Mode; voice-recognition error toasts
- ✏️ Analysis correction: `contextual-jitter-engine.js` was NOT dead — it is wired into `layoutTextTemplated()`, which every layout path uses. Remaining realism gaps vs upstream v1.6.22: seeded PRNG determinism, baseline-drift walk, rare imperfections, Realism slider.

**2026-09-13 — Feature gap analysis vs. upstream changelog (v1.6.24)**

- 📋 `docs/feature-gap-analysis.md` — this fork is missing ~27 upstream features/functions (AI output sanitizer, offline Smart Arrange, realism engine, mobile UX overhaul, 12 fonts, Q/Ans margin labels, clean paper style, PDF size presets, SRI…). Top insight: `contextual-jitter-engine.js` is loaded but never wired — the realism engine can be delivered by pure integration work.

**2026-09-13 — Phase 0 complete, Phase 1 started** (all work on `next-level`; `main` untouched by request)

- ✅ **0.1** `sw.js` fixed: `/server.js` removed from precache, `manifest.json` + `audio-recorder.js` added; `scripts/check-version.js` (`npm run check:version`, runs in CI) guards cache-version drift
- ✅ **0.2** Root `README.md` added
- ✅ **0.3** ARIA labels on emoji-only buttons (ink presets, Animate/Start/Stop, page nav, modal closes)
- ✅ **0.4** `aria-live` status announcer wired into `setAiStatus()` and `showExportToast()`
- ✅ **0.5** `prefers-reduced-motion` + skip-to-canvas link
- ✅ **0.6** GitHub Actions CI (`.github/workflows/ci.yml`): lint + tests + version check + build (with dist sanity check) + non-blocking `npm audit`
- ⏸ **0.7** Merge `next-level` → `main` — **skipped per user request; do not touch `main`**
- ⬜ **0.8** Allowlist removal — folded into Phase 1 (1.4)
- 🔄 **1.2 started:** `flashcards.js` (with 8 unit tests for the pure extractor) and `voice-notes.js` extracted from `index.js` (4,276 → 4,139 lines); tests now 138 passing
- ✅ **Build pipeline fixed (part of 1.5):** `vite.config.js` now copies root scripts into dist — before this, `npm run build` produced a dist missing all 17 app JS files
- 🐛 **Found & fixed during extraction:** `window.S` was never assigned, so `ai-assistant.js` (`const S = window.S`) and `notebooks.js` state handling operated on `undefined` — any real AI action with a valid API key would crash with a TypeError. Fixed by exposing `window.S = S` in `index.js`.

---

## 1. Current State Analysis

### What Inkflow is
A client-side vanilla-JS PWA that turns text into realistic handwritten notes: canvas rendering with per-character jitter/pressure/smudge effects, 10 paper styles, AI actions (OpenRouter / Anthropic / Ollama, SSE streaming), a custom handwriting-font studio (sketch → vectorize → TTF via opentype.js), flashcards/study mode, notebooks (IndexedDB), multi-format export, and a WebSocket collaboration server.

### Health snapshot

| Area | Status | Evidence |
|------|--------|----------|
| Tests | ✅ 130/130 pass (~2s) | `vitest run` — 8 files, pure modules only |
| Lint | ⚠️ 0 errors, **38 warnings** | `eslint` — mostly a 45-item `no-unused-vars` allowlist workaround |
| GUI | ✅ 32/34 test points pass, 0 console errors | `gui-test-report.md` |
| Docs | ✅ 23 docs, current with v1.6.0 | `docs/README.md` index |
| CI | ⚠️ CodeQL only — **no test/lint/build CI** | `.github/workflows/codeql.yml` |
| Architecture | ⚠️ `index.js` is a **4,276-line monolith, 101 top-level functions** | wc + function census |
| Coupling | ⚠️ `window.*` global glue between modules; no ES-module graph | module wrappers, eslint allowlist |
| Repo | ⚠️ **No root `README.md`**; `next-level` branch is 88 files ahead of `main` | fs + git |

### Top weaknesses (evidence-backed)

1. **The monolith regrew.** v1.5.0 modularized index.js to 3,765 lines; it is back to 4,276. Inside it: the entire HandFonted Studio (~700 lines, L2904–3972), all export pipelines, flashcards, voice-to-notes, layers, persistence, and AI glue. `bindUIActions()` is the graph's #1 god node (44 edges).
2. **No real build pipeline.** `vite.config.js` exists but app scripts are non-module `<script>` tags — Rollup cannot bundle them. All inter-module communication goes through `window.*`; the ESLint config carries a 45-name allowlist of "unused" globals only because HTML inline handlers reference them.
3. **Service worker defects.** `sw.js` precaches `/server.js` (a Node file that can never run in the browser), versions the cache by a hand-edited string (`inkflow-v1.6.0`), and cache-first serves stale assets until someone remembers to bump it.
4. **Accessibility gaps are documented but unshipped.** `docs/accessibility.md` lists recommended ARIA labels, `aria-live` status regions, `prefers-reduced-motion`, and a skip link — none implemented. The GUI test report confirms emoji-only buttons have no accessible names, and the knowledge graph flags a "Screen Reader Gap" community. Canvas output is inherently invisible to assistive tech with no text alternative.
5. **The 4,276-line core has zero unit tests.** The 130 passing tests cover the extracted pure modules; state, rendering, export, autosave/restore, and flashcards are untested. Export pipelines (PDF/SVG/JPG) were explicitly left unverified by the GUI test run.
6. **No feedback during slow operations.** AI actions and full renders have no loading indicators (GUI test report recommendation #3).
7. **CDN dependency chain (7 libraries).** jsPDF, mammoth, mermaid, opentype.js, rough.js, Font Awesome, Google Fonts — SRI-pinned (good) but not precached by the service worker, so offline/PWA mode silently degrades.
8. **Collaboration server is a toy.** OT transform works and is tested, but there is no auth, no persistence, no room limits — fine for LAN, unsafe if exposed publicly.
9. **Storage fragmentation.** Note text + config live in localStorage (~5MB cap) while notebooks and glyphs use IndexedDB; a large note can silently hit the quota with no user-facing handling.

---

## 2. The Plan

Phases are sequenced so each one is shippable independently. Effort is for one developer.

### Phase 0 — Hygiene & Quick Wins (~1 week, P0)

Small, low-risk fixes with outsized value. Do these first.

| # | Task | Source |
|---|------|--------|
| 0.1 | **Fix `sw.js`**: remove `/server.js` from precache; derive cache name from `package.json` version (or a build stamp); runtime-precache the pinned CDN libs and font CSS for true offline mode | SW audit |
| 0.2 | **Add root `README.md`** (one-page overview + link to `docs/README.md`, screenshots, quick start) | Repo audit |
| 0.3 | **ARIA labels on all emoji-only buttons** (Animate, Start/Stop, theme packs, ink colors) | GUI report #1 |
| 0.4 | **`aria-live="polite"` status announcer** wired to existing `setAiStatus()` / `showExportToast()` | accessibility.md |
| 0.5 | **`prefers-reduced-motion` media query** + skip-to-content link | accessibility.md |
| 0.6 | **GitHub Actions CI**: `npm run lint && npm test && npm run build` on every PR | CI audit |
| 0.7 | **Merge `next-level` → `main`** (88 files of divergence is a risky window) and adopt PR flow | git audit |
| 0.8 | Delete the 45-name ESLint allowlist by replacing HTML inline `onclick` handlers with `addEventListener` bindings (see 1.4) | Lint run |

### Phase 1 — Architecture: Finish the Modularization (~2–3 weeks, P0)

Goal: `index.js` under ~1,500 lines, an ES-module graph Vite can actually bundle, and hash-hashed assets feeding the service worker.

| # | Task | Detail |
|---|------|--------|
| 1.1 | Convert app scripts to ES modules (`type="module"`) and import explicitly instead of `window.*` handoff. Keep one small `window.Inkflow` facade only for console/debug access | Coupling audit |
| 1.2 | **Extract from `index.js`, one module per PR, tests-first:** `handfonted-studio.js` (~700 L), `export-manager.js` (exportImage/PDF/SVG/clipboard, ~450 L), `flashcards.js`, `voice-notes.js`, `layer-panel.js`, `persistence.js` (autosave/restore/glyph DB, ~350 L) | Function census |
| 1.3 | Split `bindUIActions()` (44-edge god node) into per-panel binding modules (sidebar, toolbar, AI panel, export bar) | Graph report |
| 1.4 | Replace all inline `onclick=` in `index.html` with `addEventListener` (enables 0.8) | Lint run |
| 1.5 | Make `npm run build` real: Vite bundles ESM graph, emits hashed filenames; `sw.js` precache list generated from the build manifest (via `vite-plugin-pwa` or a small codegen step) | Vite audit |
| 1.6 | Re-run the GUI test suite after each extraction (it is the only safety net for the core today) | GUI report |

**Exit criteria:** `index.js` < 1,500 lines · ESLint allowlist deleted · `npm run build` produces a bundle the SW serves · all 130 tests + new module tests green.

### Phase 2 — Quality: Test the Core (~2 weeks, P1)

| # | Task | Detail |
|---|------|--------|
| 2.1 | Unit tests for extracted modules: export filename/format logic, flashcard parsing, autosave serialization, `restoreState()` hydration (the source of v1.5.1's state-corruption bugs) | Changelog 1.5.1 |
| 2.2 | **Playwright E2E** formalizing the 34 GUI test points from `gui-test-report.md` into repeatable CI checks | GUI report |
| 2.3 | Isolated export verification (PDF/SVG/JPG/copy/print) — the two "partial" items from the GUI report | GUI report |
| 2.4 | `vitest --coverage` in CI with a ratchet (start ~30% on modules, raise over time) | CI audit |
| 2.5 | Global `window.onerror` + `unhandledrejection` hook that surfaces a toast (users currently have no way to report failures) | Stability focus |

### Phase 3 — UX Polish (~2 weeks, P1)

| # | Task | Source |
|---|------|--------|
| 3.1 | Loading spinners/disabled states for AI actions and full renders | GUI report #3 |
| 3.2 | Fix the Note Layout combobox so the native `<select>` stays interactable (currently needs an automation workaround; real keyboard users hit the same wall) | GUI report #3.2 |
| 3.3 | Slider limit hints: min/max labels + tooltips (Margin max 100, Font ≥ 48, Rotation ≥ 10) and mirror them in `docs/configuration-guide.md` | GUI report #4 |
| 3.4 | localStorage quota guard: catch `QuotaExceededError` on autosave, warn the user, offer "export + clear" rescue flow | Storage audit |
| 3.5 | Dark-mode contrast audit against WCAG AA (docs claim AA; verify with an automated axe pass) | accessibility.md |
| 3.6 | Canvas accessibility bridge: expose the note text to screen readers via a visually-hidden `aria-label` on each page canvas | accessibility.md |

### Phase 4 — Feature Enhancements (user-visible, P2, pick per demand)

Ranked by expected value-to-effort:

1. **Flashcard spaced repetition (SM-2 lite)** — flashcards already parse from Q:/A:; add review scheduling + a "due today" count in the sidebar. Natural extension of Study Mode.
2. **More AI providers** — Gemini and direct OpenAI behind the existing `callAI()` provider router (Ollama proved the pattern; each is ~1 new provider function + model registry entry).
3. **Template gallery** — ship 5–10 starter `layoutTextTemplated` templates (lecture, meeting, Cornell already exists) selectable from the sidebar.
4. **Collaboration hardening** — room tokens, server-side notebook persistence, rate limits; only if public deployment is actually planned (otherwise document it as LAN-only).
5. **HandFonted improvements** — glyph preview using the real rendering engine (draw the saved glyph through the jitter pipeline), import/export sharing of `.inkfont` projects (export/import already exists — add a simple community-share format).
6. **Mobile app packaging** — the PWA is already installable; Capacitor wrapper is mostly configuration if an App Store presence is wanted.
7. **i18n** — Hinglish and Indic rendering already exist; add UI string extraction for real localization.

### Phase 5 — Performance & Scale (P2, measure first)

| # | Task | Rationale |
|---|------|-----------|
| 5.1 | **Google Fonts diet**: ~20 families are loaded up front; subset/preload only the 6–8 selectable handwriting fonts, lazy-load the rest. Likely the single biggest load-time win | index.html head audit |
| 5.2 | Move the 2,200-iteration paper-grain shader into an `OffscreenCanvas`/worker and cache per (style, size) — it re-runs per page | performance.md |
| 5.3 | Page virtualization: allocate canvases lazily for pages outside the viewport (10 pages ≈ 34 MB of canvas memory) | performance.md |
| 5.4 | Lighthouse CI in the Phase-0 CI pipeline with budgets, so regressions are caught automatically | CI audit |

### Security & Supply Chain (continuous, P1)

- Dependabot/Renovate for the 7 CDN libs + npm deps; SRI is present, but pin-and-update automation is missing.
- Document API-key storage risk (localStorage) and offer a "don't remember" default with a session-only option.
- `server.js`: add a `ws` origin check + optional shared-secret token before any public exposure.
- Keep CodeQL; add `npm audit` to CI (one line in the Phase-0 workflow).

---

## 3. Suggested Milestones

| Milestone | Contents | Target |
|-----------|----------|--------|
| **v1.6.1** (patch) | Phase 0 complete: SW fix, README, ARIA labels, CI | 1 week |
| **v1.7.0** (minor) | Phase 1 complete: ES modules, index.js < 1,500 L, real Vite build | +3 weeks |
| **v1.8.0** (minor) | Phases 2–3: E2E suite, coverage, loading states, quota guard | +4 weeks |
| **v2.0.0** (major) | Phase 4 highlights (spaced repetition, new AI providers, template gallery) + Phase 5 performance work | +6 weeks |

## 4. Success Metrics

- `index.js` line count: 4,276 → < 1,500
- ESLint warnings: 38 → 0 (allowlist deleted)
- Unit tests: 130 → 200+; E2E: 0 → 34 GUI points automated
- CI: CodeQL-only → lint + test + build + Lighthouse on every PR
- Lighthouse Performance ≥ 90, Accessibility ≥ 95 (PWA currently unverifiable — measure in Phase 0)
- Zero stale-cache bug reports after SW version automation
