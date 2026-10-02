# Accessibility

InkForge is a canvas-heavy drawing tool, which imposes some inherent constraints — the rendered handwriting itself can't be read by a screen reader. The **textarea + Render** path is the accessible equivalent: the text stays in standard form controls the whole time.

---

## What's Already in Place

- **Native controls** — all interactive controls are real `<button>`, `<select>`, `<input>` and `<label>` elements; keyboard-activatable by default, with visible value readouts next to every slider.
- **ARIA labels** — hamburger, dark-mode toggle and all export buttons carry `aria-label`s.
- **Focus management** — visible focus rings; both modals (HandFonted Studio, Flashcards) enforce WCAG 2.1 focus trapping (`trapFocusModal()`) and restore focus on close.
- **Keyboard shortcuts** — `Escape` closes modals, closes the mobile drawer and exits Study Mode.
- **Mobile drawer state** — the hamburger carries `aria-expanded` / `aria-controls`, so assistive tech announces drawer state; scrim-tap / `Escape` / canvas-tap close all flow through the same `setSidebarOpen()` state.
- **Dark mode** — `html.dark` custom properties keep high contrast (e.g. `#e8e4d8` on `#12121e`).
- **Touch ergonomics** — ≥44 px touch targets on `hover: none` devices, `touch-action: manipulation` (no double-tap zoom delay), ≥16 px sidebar inputs so iOS Safari never focus-zooms.
- **Print stylesheet** — `@media print` strips chrome so notes print cleanly.

## Known Gaps

| Area | Gap | Recommendation |
| :--- | :--- | :--- |
| `aria-live` regions | Render/export/AI status not announced | Add `aria-live="polite"` regions for toasts + AI status |
| Icon-only paper buttons | Emoji labels (📏 ⬜ ⊞ …) lack `aria-label` | Add `aria-label`/`title` to each `.paper-btn` |
| Canvas content | Handwriting canvas is not screen-reader readable | Textarea is the accessible source of truth (documented) |
| Page editors | `.page-editor` has `aria-label` but no `role` | Add `role="textbox"` |
| Ink presets | Some rely on color/emoji alone | Add text labels or `title` attributes |

Full audit: [`docs/accessibility.md`](https://github.com/VIPHACKER100/InkForge/blob/main/docs/accessibility.md). Accessibility items are top of the [Roadmap](Roadmap) — contributions welcome.
