# 🚀 InkForge Upgrade Plan — v1.9 → v2.0

> **✅ COMPLETED 2026-10-03 (v1.9.0 → v1.20.1).** All milestones shipped: M1 Foundation (v1.9.0),
> M2 Architecture (v1.10.0–1.13.0), M3 Quality (v1.11.0–1.12.0), Phase D (v1.13.1), Phase E
> (v1.14.0–1.15.0), Phase F F1–F6 (v1.16.0–1.20.1). index.js: 4,569 → ~900 lines. See
> `docs/changelog.md` and the Progress Log in `docs/roadmap.md` for the pass-by-pass record.
> The only outstanding item is the user-gated `next-level` → `main` merge.

**Date:** 2026-10-02 · **Version basis:** 1.8.0 · **Branch:** `next-level`
**Method:** knowledge-graph audit (`graphify-out/`, 466 nodes / 788 edges), fresh code metrics, `docs/roadmap.md` progress log, live verification runs. Every claim below is measured, not assumed.

This plan supersedes the phase tables in `docs/roadmap.md` (which stay as the historical progress log) and re-sequences the remaining work against today's codebase.

---

## 1. Where the project stands (2026-10-02)

InkForge is a client-side vanilla-JS PWA that renders typed text as realistic handwriting (canvas, per-character jitter/pressure/bleed), with AI actions (OpenRouter / Anthropic / Ollama), a custom-font studio (sketch → vectorize → TTF), study tools, notebooks, multi-format export, and an About/docs site. **It is now fully synced with upstream InkForge through v1.6.26 and ahead of it** (modular tests, CI, E2E, clean-mode polish) — future upstream syncs are small diffs, not projects.

### Health snapshot (measured 2026-10-02)

| Area | Status | Evidence |
|------|--------|----------|
| Unit tests | ✅ 216/216 pass (~2s) | `vitest run` — 13 files, pure modules only |
| E2E | ✅ 7/7 pass (~1 min) | Playwright chromium, headless — smoke, pagination, paper, flashcards, export, settings, layers |
| Lint | ⚠️ 0 errors, **50 warnings** | `eslint` — legacy allowlist era still visible |
| CI | ✅ lint + tests + version check + build + audit (non-blocking) + E2E + CodeQL | `.github/workflows/ci.yml` |
| Dependencies | 🔴 **2 high-severity `npm audit` findings** | untriaged, non-blocking in CI |
| Upstream | ✅ InkForge 1.6.25–1.6.26 fully ported (v1.8.0) | `docs/changelog.md` |
| Service worker | ✅ installs in production (dist precache fixed in 1.8.0) / ⚠️ dev-mode quirk | Vite dev serves `.css` as JS HMR modules → SW-controlled dev sessions render unstyled |
| PWA/About | ✅ About page, manifest shortcuts, logo, offline shell | v1.8.0 |

### Structural findings (knowledge graph + census)

| # | Finding | Evidence |
|---|---------|----------|
| 1 | **The monolith regrew again**: `index.js` is **4,569 lines** (4,121 after pass #8 → grew with 1.7.0/1.8.0 features). The HandFonted Studio alone is **~1,382 lines / ~40 functions** (L3188–4569); persistence (`autosave`/`restoreState`/glyph DB), layer panel UI, and animation control all still live inside it | `wc -l`, grep census |
| 2 | **No ES-module graph**: 22 classic `<script src>` tags, **59 `window.*` glue references** in index.js, **113 inline `onclick/onchange` handlers** in index.html. Vite cannot bundle any of it — dist ships 23 verbatim files, no hashing, and the SW precache is a hand-maintained list | grep counts |
| 3 | **`bindUIActions()` is the graph's #1 god node (44 edges)**; `renderText()` (20), `layoutText()` (18), `autosave()` (16) follow | `graphify-out/GRAPH_REPORT.md` |
| 4 | **The core has zero unit tests** — all 216 tests cover extracted pure modules; state, rendering, autosave/restore hydration, and the 4,569-line core are untested | test file census |
| 5 | No import cycles detected; module boundaries that exist (export-manager, ai-postprocess, margin-labels, …) are clean and tested — the extraction pattern works | graph report |
| 6 | Storage: note text + config in localStorage (~5 MB cap, no `QuotaExceededError` handling), notebooks/glyphs in IndexedDB | code audit |
| 7 | ~50 Google-Font families load up front; the paper-grain shader re-runs per page on the main thread | index.html head, performance docs |

---

## 2. The Upgrade Plan

Sequenced so each phase ships independently behind a version bump. Effort = one developer.

### Phase A — Foundation & quick wins (~3–4 days, P0) → **v1.9.0**

| # | Task | Why now |
|---|------|---------|
| A1 | **Triage the 2 high-severity audit findings** (`npm audit` output; almost certainly dev-chain: jsdom/ws). Fix or add targeted `overrides`; make the CI audit job **blocking** | Only red item in the health snapshot |
| A2 | **Service-worker dev guard**: don't register `sw.js` in dev (`import.meta.env.DEV` after A3, or a `location.port` check today). Kills the unstyled-dev-session quirk permanently | Discovered 2026-10-02 |
| A3 | **ES-module conversion, staged**: leaf modules first (`script-detector`, `markdown-parser`, `text-layout`, `paper-renderer`, …), `index.js` last; one `<script type="module">` graph, explicit imports replacing the 59 `window.*` handoffs; keep one `window.InkForge` debug facade. Run the E2E suite after each file | The keystone — unblocks B4/C/E |
| A4 | **Merge `next-level` → `main`** and adopt PR flow (standing item since 2026-09-13; divergence keeps growing) | Risk management |

### Phase B — Finish the modularization (~2 weeks, P0) → **v1.10.0**

| # | Task | Detail |
|---|------|--------|
| B1 | **Extract `handfonted-studio.js`** (~1,382 L, tests-first for the pure canvas→opentype path) | Biggest block; do it before anything else lands in that region |
| B2 | **Extract `persistence.js`** (`autosave`, `restoreState`, glyph IndexedDB, ~350 L) — the extraction that historically fixes state-corruption bug classes | Roadmap 1.2 leftover |
| B3 | **Extract `layer-panel.js`** + remaining animation/AI glue | Function census |
| B4 | **Split `bindUIActions()`** into per-panel binders (text, font/style, effects, AI, export, notebooks, animation) and **replace all 113 inline handlers** with `addEventListener` — deletes the last reason for the lint allowlist | God-node evidence |
| B5 | **Real bundling**: Vite bundles the ESM graph, emits hashed filenames, and the sw precache list is **generated from the build manifest** (vite-plugin-pwa or a small codegen) — no more hand-edited URL lists (the 1.8.0 `dist/index.css` bug class becomes impossible) | Roadmap 1.5 completion |

**Exit criteria:** `index.js` < 1,500 lines · 0 inline handlers · 0 `window.*` glue (except the debug facade) · SW precache generated at build · 216+ tests green.

### Phase C — Test the core (~1.5 weeks, P1)

| # | Task | Detail |
|---|------|--------|
| C1 | Unit tests for `persistence.js`: `autosave()` serialization round-trip, `restoreState()` hydration of every whitelisted key (the historical bug source) | — |
| C2 | Export verification per format (PNG/JPG/PDF/SVG/copy) as Playwright download assertions | GUI report's untested area |
| C3 | `vitest --coverage` in CI with a ratchet (start ~35% on modules, raise each release) | — |
| C4 | `window.onerror` + `unhandledrejection` → toast + console group, so users can report failures | Stability |

### Phase D — UX & accessibility polish (~1.5 weeks, P1)

| # | Task | Source |
|---|------|--------|
| D1 | Loading/disabled states for AI actions and full renders | GUI report #3 |
| D2 | `QuotaExceededError` guard on autosave + "export & clear" rescue flow | Storage audit |
| D3 | Canvas a11y bridge: visually-hidden text alternative per page canvas | accessibility.md |
| D4 | Dark-mode WCAG AA contrast audit (automated axe pass) | accessibility.md |
| D5 | Layout `<select>` keyboard interaction fix; slider min/max hints mirrored into `docs/configuration-guide.md` | GUI report #3.2/#4 |
| D6 | Docs refresh per change (changelog + configuration-guide discipline) | House rule |

### Phase E — Performance (P2, measure first, ~1 week)

| # | Task | Rationale |
|---|------|-----------|
| E1 | Lighthouse CI budgets in CI (after A3 makes bundles real) | Catch regressions automatically |
| E2 | **Fonts diet**: eagerly load 6–8 families, lazy-load the rest of the ~50-family suite (biggest load-time win) | index.html head audit |
| E3 | Paper-grain shader → `OffscreenCanvas` worker, cached per (style, size) | Re-runs per page today |
| E4 | Page virtualization: allocate page canvases lazily outside the viewport (10 pages ≈ 34 MB canvas memory) | performance docs |

### Phase F — Feature enhancements (P2, pick per demand)

1. **Flashcard spaced repetition (SM-2 lite)** — flashcards already parse from `Q:/A:`; add scheduling + a "due today" badge.
2. **Gemini + direct OpenAI providers** behind the existing `callAI()` router (Ollama proved the pattern).
3. **Template gallery** — 5–10 starter `layoutTextTemplated` presets in the sidebar.
4. **Collaboration hardening** — room tokens + rate limits, or document it as LAN-only.
5. **HandFonted improvements** — glyph preview through the real jitter pipeline; `.inkfont` community-share format.
6. **i18n** — UI string extraction (Hinglish/Indic rendering already exists).

### Continuous

- **Upstream sync routine**: quarterly, diff upstream InkForge changelog against `docs/changelog.md` (the 1.8.0 pass made this a small, mechanical job — keep it that way).
- **Supply chain**: Renovate/Dependabot for the 7 pinned CDN libs + npm deps.
- **Server**: `server.js` stays LAN-only until origin checks + tokens are added (F4).

---

## 3. Milestones

| Milestone | Contents | Effort | Version |
|-----------|----------|--------|---------|
| **M1 — Foundation** | Phase A (audit fixes, SW dev guard, ESM conversion, merge to main) | ~3–4 days | v1.9.0 |
| **M2 — Architecture complete** | Phase B (handfonted/persistence/layer extraction, handler migration, real bundling) | ~2 weeks | v1.10.0 |
| **M3 — Quality** | Phase C + D (core tests, coverage ratchet, a11y/UX polish) | ~3 weeks | v1.11.0 |
| **M4 — Performance + first feature** | Phase E + one Phase F pick | ~2 weeks | **v2.0.0** |

## 4. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| ESM conversion touches all 22 scripts at once | Staged leaf-first conversion (A3), E2E suite after every file, feature-branch per step |
| HandFonted extraction regresses the GUI-heavy studio | Do it in isolation (B1), tests-first for the vectorize/compile path, GUI re-run after |
| `main` divergence keeps growing while merge is deferred | A4 is in the first phase; if still deferred, cut a release branch from `main` instead |
| `:has()` / newer CSS used by recent fixes | Class-based fallbacks already in place (`.dropdown-open`); Browserlist check in M2 |
| Scope creep into phases | Each phase ships behind its own version bump; feature work (F) never blocks M1–M3 |

---

*Generated from a graphify knowledge-graph audit + live code measurement. Update the health snapshot table whenever a milestone ships.*
