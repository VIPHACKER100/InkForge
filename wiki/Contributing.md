# Contributing

Thanks for helping improve InkForge! The full guide lives in [`docs/contributing.md`](https://github.com/VIPHACKER100/InkForge/blob/main/docs/contributing.md); here's the short version.

---

## Project Philosophy

InkForge is a **single-page, zero-dependency-install** app. Please preserve that:

- No build tools, bundlers or transpilers
- All code runs directly in the browser
- Dependencies via CDN only
- Works offline once loaded

## Code Style

**JavaScript** — `const`/`let` only (never `var`); template literals; brief doc comments; functions focused and ≤ 50 lines where possible; descriptive names.

**CSS** — custom properties for theme values; organize properties layout → sizing → spacing → visual → animation; `rem` for font sizes, `px` for borders/shadows; mobile-first media queries.

**HTML** — semantic elements; every input has a `<label>`; unique `id`s; no inline styles.

## Pull Request Workflow

1. Fork → `git checkout -b feature/your-feature`
2. Make changes in the style above
3. Run the checks:
   ```bash
   npm run lint            # ESLint — 0 errors (style warnings OK)
   npm run check-versions  # package.json ↔ sw.js ↔ index.html parity
   npm test                # headless smoke tests
   ```
4. Test in Chrome, Firefox and Safari, on desktop **and** mobile viewports
5. Open the PR with a clear description

### PR Checklist

- [ ] Existing style conventions followed
- [ ] `npm run lint` and `npm run check-versions` pass
- [ ] No regressions; tested in ≥ 2 browsers, desktop + mobile
- [ ] Documentation updated if you added features (keep `docs/README.md` + `docs/changelog.md` versions in sync)
- [ ] CodeQL passes with no new high-severity findings
- [ ] No new npm/build dependencies

## Reporting Issues

Use [GitHub Issues](https://github.com/VIPHACKER100/InkForge/issues):

```markdown
**Description**: What happened?
**Expected**: What should have happened?
**Browser**: Chrome 120 / Firefox 121 / Safari 17
**Steps to reproduce**:
1. …
```

Feature requests: describe the use case and a proposed solution.

## Where Help Is Most Wanted

See the [Roadmap](Roadmap) — paper styles, new fonts, extended character sets, accessibility and i18n are all open.
