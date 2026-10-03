# ♿ Accessibility

This document covers accessibility considerations, keyboard navigation, and screen reader support in InkForge.

---

## Current Accessibility Features

### Semantic HTML
- Proper heading hierarchy (`<h1>` for app title, `<h2>` for section headers)
- `<button>` elements for all interactive controls (not clickable `<div>`s)
- `<label>` elements associated with all form inputs
- `<nav>` for pagination controls

### Keyboard Navigation
- All sidebar controls are focusable via Tab key
- Collapsible sections toggle via Enter/Space
- Export buttons accessible via keyboard
- Modal can be closed with ESC key

### Color & Contrast
- Light mode: Navy text (`#1c2340`) on cream backgrounds — WCAG AAA contrast ratio
- Dark mode: Chalk cream (`#e8e4d8`) on deep slate — WCAG AA contrast ratio
- Accent color (`#c0622a`) meets minimum 4.5:1 contrast on light backgrounds

---

## Recommended Improvements

### ARIA Labels
```html
<!-- Add to interactive elements -->
<button aria-label="Export as PDF">📄 PDF</button>
<input type="range" aria-label="Font Size" />
<div role="tabpanel" aria-labelledby="tab-sketchpad">...</div>
```

### Screen Reader Announcements
```html
<!-- Live region for AI status updates -->
<div aria-live="polite" id="status-announcer"></div>
```

### Focus Management
- Trap focus inside modal when HandFonted Studio is open
- Return focus to trigger button when modal closes
- Skip-to-content link for keyboard users

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode
```css
@media (forced-colors: active) {
  .card { border: 2px solid CanvasText; }
  .btn { border: 1px solid ButtonText; }
}
```

---

## Testing Checklist

- [ ] Navigate entire app using keyboard only (no mouse)
- [ ] Test with screen reader (NVDA, VoiceOver, or JAWS)
- [x] Verify all form inputs have associated labels
- [ ] Check color contrast ratios with axe DevTools
- [ ] Test with browser zoom at 200%
- [ ] Verify focus indicators are visible on all interactive elements
- [ ] Test `prefers-reduced-motion` with OS setting enabled

---

## Contrast Audit (v1.13.1 — Phase D4)

axe-core (WCAG 2.0/2.1 A+AA) was run against `index.html` in light and dark modes with all sidebar sections expanded. Light mode passes with **zero violations**. Dark mode's remaining `color-contrast` flags are a known axe limitation: the glassmorphism sidebar/toolbar use translucent rgba layers that axe cannot composite, so it resolves backgrounds against the wrong source (manually verified — every flagged pair is ≥ 5:1 against the effective composited background; e.g. toolbar logo 12:1, sidebar labels 5.4:1). Theme tokens were hardened in the prior contrast pass (light `--text-muted #6f6752` ≈ 4.7:1, dark `#948da9` ≈ 5.4:1) and `about.css`'s light `--accent` now matches (`#a34f1e`, 4.76:1 on cream). The audit also drove two structural fixes: contentEditable overlays carry `role="textbox"` + `aria-multiline` so their labels are valid, and the scrollable `#canvas-area` is keyboard-focusable.
