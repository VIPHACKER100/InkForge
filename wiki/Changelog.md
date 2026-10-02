# Changelog

The authoritative release history lives in the repo: [`docs/changelog.md`](https://github.com/VIPHACKER100/InkForge/blob/main/docs/changelog.md). Recent highlights below.

---

## v1.6.24 (current release)

- **Expanded font collection** — 12 new open-source Google handwriting typefaces (Permanent Marker, Coming Soon, Short Stack, Handlee, Rancho, Amatic SC, Fuzzy Bubbles, Pacifico, Parisienne, Yellowtail, Charm, Aladin); selector now holds 40+ fonts across Print, Cursive, Devanagari and Clean categories; service-worker font pre-cache synchronized.
- **Mobile canvas layout fix** — new `getResponsiveCanvasWidth()` sizes canvases to the viewport (≤480 px: `vw − 24`, ≤768 px: `vw − 32`, desktop: 720 px) at page creation and on every resize/orientation change, ending ruled-line/header/editor misalignment on phones.
- Version parity verified by `npm run check-versions` (package.json ↔ sw.js ↔ index.html).

## Recent work documented in the changelog

- **Brand identity** — Minimalist Scribe Flame emblem applied across toolbar, favicon, PWA icons and docs; standalone **About portal** (`about.html` + `about.css`) with an interactive Realism Engine canvas simulator, feature deep-dives, privacy guarantee and synced dark mode; navigation overhaul (clickable logo, ℹ️ About button, sidebar footer links); About page added to the service-worker pre-cache.
- **Enhanced Realism Engine (1.6.25)** — anisotropic `scaleX`/`scaleY` jitter, micro-shear via `ctx.transform()`, pressure-correlated ink bleed, universal retrace double-stroke in all render paths, Devanagari/Indic shear protection; new **Blue Ink Pen** preset (`#000F55`) with `.active-ink` accent-ring styling.
- Earlier milestones include: margin Q/Ans labels (1.6.8), offline **Smart Arrange** (1.6.7), PDF output-size presets (1.6.20), AI response sanitizer + Q&A resequencer (1.6.23), responsive canvas sizing (1.6.24).

---

> Maintainers: when bumping versions, update `package.json`, `sw.js` `CACHE_VERSION` and the `index.html` cache-bust together — `npm run check-versions` enforces it — and add an entry to `docs/changelog.md`.
