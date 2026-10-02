# Performance

Why a 7,300-line vanilla-JS app stays fast.

---

## Architecture-Level Wins

- **Zero framework overhead** — vanilla ES2022, no virtual DOM, no runtime dependencies beyond lazy-loaded CDN libs.
- **Persistent page canvases** — characters are drawn once onto each A4 canvas and stay there; re-renders happen only on setting changes, not on scroll or export.
- **Debounced rendering** — text input triggers `debounceRender()` (280 ms trailing) around `renderText(S.text)`, so typing never re-lays-out per keystroke.
- **Debounced autosave** — `autosave()` waits 1000 ms before serializing to localStorage/IndexedDB; writes are batched and non-blocking.
- **IndexedDB for heavy assets** — glyph images and notebooks live in IndexedDB, keeping localStorage small.
- **Sub-millisecond AI post-processing** — `sanitizeAiResponse()` and `resequenceQA()` run < 1 ms via single-pass regex and trigram Sets.
- **O(pages) resize** — window resizes update canvas CSS widths in one pass with no redraws or layout thrash.

## Measured Characteristics

| Metric | Value |
| :--- | :--- |
| Animation rate (speed 8) | ~8 chars/frame → 500+ chars in ~2 s |
| A4 canvas internal resolution | 794 × 1123 px |
| A4 canvas CSS size (390 px phone) | ≈ 366 × 518 px |
| Memory per filled page | ~3.4 MB bitmap |
| Render debounce | 280 ms trailing |
| Autosave debounce | 1000 ms trailing |
| Auto-fit search | Binary search, 6 iterations |

## Where It Can Get Heavy

- **Very long notes** — each page costs ~3.4 MB of bitmap; rendering is O(chars) and page count scales linearly.
- **Many drafted glyphs** — grow IndexedDB; blank entries are pruned automatically (`pruneBlankGlyphs`).
- **Rapid slider dragging** — setting changes render immediately by design (only the *text* path is debounced).

## Future Optimizations (Not Yet Needed)

- Worker-thread layout for extremely large documents
- Delta rendering (only re-draw changed pages)
- `OffscreenCanvas` for page compositing

Full details: [`docs/performance.md`](https://github.com/VIPHACKER100/InkForge/blob/main/docs/performance.md).
