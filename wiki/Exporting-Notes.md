# Exporting Notes

Every raster export runs through a 2× upscale pass (`_upscaleCanvas` with high-quality smoothing), producing ~150 DPI output from the native 794 × 1123 A4 canvas. Multi-page notes export one file per page (`inkforge-notes-page1.png`, …).

---

## Formats at a Glance

| Format | Quality | Use case |
| :--- | :--- | :--- |
| **PNG** | Lossless, 2× | Digital sharing, presentations |
| **JPG** | 97% JPEG, 2× | Email attachments, web upload |
| **SVG** | PNG embedded in an SVG wrapper | Vector-aware applications |
| **PDF** | Multi-page A4, preset-dependent (below) | Printing, submission, archival |
| **Copy** | PNG straight to the system clipboard | Paste into other apps |
| **Print** | `@media print` rules strip all chrome | Direct hardcopy |

---

## PDF Output Size Presets

Choose the preset from the **PDF Output Size** dropdown (persisted per browser):

| Preset | Render scale | Encoding | Typical size/page | Best for |
| :--- | :--- | :--- | :--- | :--- |
| **Compact** | 1× | JPEG 75% | ~142 KB | Quick sharing |
| **Standard** *(default)* | 2× | JPEG 92% | ~465 KB | Balanced documents |
| **High** | 2× | Lossless PNG, no compression | ~1.8 MB | Print & archive, zero artifacts |

PDFs are assembled with jsPDF as A4 portrait pages (210 × 297 mm) with progress toasts.

---

## Behavior Notes

- **Pre-export state**: active page-editor overlays are blurred and the app waits 320 ms for a clean canvas before capturing — so inline-edit text never leaks into exports.
- **Nothing to export**: exporting with no pages shows a "Nothing to export — add some text first." warning toast.
- **Toasts**: progress toasts persist until done; success/warn/error toasts auto-dismiss after 3 seconds.
- **Memory**: downloads stream per-page via Blob URLs (revoked after 1 s), so memory stays bounded regardless of note length.

---

## Tips

- For the sharpest printed pages, use **PDF → High** or **PNG** (both effectively lossless at 2×).
- The Date / P. No. header and margin Q/Ans labels are drawn on the canvas itself, so they are always included in exports and print.
- For paper handouts, **Print** applies dedicated print CSS that hides all app chrome and prints only the note pages.
