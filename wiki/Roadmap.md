# Roadmap

Areas where InkForge is actively open to contributions. Nothing here is promised on a schedule — it's a menu of the highest-value next steps. Pick one and open a PR!

---

## Accessibility (top priority)

From the [accessibility audit](Accessibility):

1. `aria-live="polite"` status region, wired to toasts and the AI status line
2. `aria-label` / `title` on paper-style and ink-preset buttons
3. `role="textbox"` on page editors, linked with the main textarea

## Content & Rendering

- **More paper styles** — isometric, manuscript, ledger
- **More handwriting fonts**
- **Extended character sets** — diacritics, CJK, Arabic (extends the script-awareness pattern already used for Devanagari)
- **Localization / i18n** of the UI

## Engineering

- Performance headroom for very large documents:
  - Worker-thread layout
  - Delta rendering (only re-draw changed pages)
  - `OffscreenCanvas` page compositing
- Accessibility improvements and screen-reader testing generally

---

See also: [Contributing](Contributing) for style rules and the PR checklist, and the [Changelog](Changelog) for what's landed recently.
