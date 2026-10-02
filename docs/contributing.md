<p align="center">
  <img src="../inkforge_logo.jpeg" alt="InkForge Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# 🤝 Contributing

Guidelines for contributing to InkForge.

---

## Project Philosophy

InkForge is a **single-page, zero-dependency-install** application. Contributions should maintain this philosophy:
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
index.html    # Studio workspace structure and CDN library loads
index.css     # Studio styles — design tokens, components, layouts, modals
index.js      # Core application logic — engines, state, UI handlers, storage
about.html    # Standalone About & Documentation portal with live Realism Simulator
about.css     # Dedicated glassmorphic stylesheet for the About portal
inkforge_logo.jpeg # Official brand emblem (Minimalist Scribe Flame)
manifest.json # Web App Manifest and PWA shortcut descriptors
sw.js         # Service worker offline caching
scripts/      # Version parity and headless logic smoke tests
docs/         # Documentation (markdown suite — see docs/README.md)
.github/
  workflows/
    codeql.yml # GitHub CodeQL Advanced static-analysis CI
```

The core editor architecture follows a clean, decoupled client-side design. Avoid adding bundler build dependencies.

---

## Pull Request Process

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make changes** following the code style above
4. **Test** in Chrome, Firefox, and Safari
5. **Submit PR** with a clear description of changes

### PR Checklist
- [ ] Code follows existing style conventions
- [ ] `npm run lint` passes with 0 errors (style warnings are acceptable)
- [ ] `npm run check-versions` passes (`package.json`, `sw.js`, and the `index.html` cache-bust agree)
- [ ] All existing features still work (no regressions)
- [ ] Tested on desktop and mobile viewports
- [ ] Tested in at least 2 browsers
- [ ] Documentation updated if adding new features (keep the version number in `docs/README.md` and `docs/changelog.md` in sync)
- [ ] GitHub CodeQL workflow passes (no new high-severity findings)
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
- Accessibility improvements (ARIA labels, screen reader testing)
- Performance optimizations for large documents
- Localization / i18n support
