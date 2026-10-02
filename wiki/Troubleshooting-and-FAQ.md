# Troubleshooting & FAQ

---

## Frequently Asked Questions

### Do I need an API key?

Only for the four online AI actions (Summarize, Grammar Fix, Lecture → Notes, Assignment). **Smart Arrange works fully offline with no key**, and Ollama users need no key either. Everything else — handwriting, layouts, exports, HandFonted Studio — never touches the network. See [AI Setup & Workflows](AI-Setup-and-Workflows).

### Where is my data stored?

Entirely in your browser: settings and dark-mode flag in `localStorage`, notebooks and custom glyphs in IndexedDB (`InkForgeDB`). There is no account, no server, no telemetry. Clearing site data erases your notes — export important notes as PDF/PNG.

### Does it work offline?

Yes. After loading once, the PWA service worker serves the whole app shell from cache. Only the online AI actions need connectivity.

### Can I use it on my phone/tablet?

Yes — canvases resize to the viewport (`getResponsiveCanvasWidth()`), the toolbar compacts to icons, the sidebar becomes a drawer, and touch targets are ≥44 px. Install it as a PWA for a native-app feel.

### Is Devanagari / Hindi supported?

Yes. Indic scripts get automatic font fallback (`Noto Sans Devanagari` / `Hind`), damped jitter so connected matras and the *shirorekha* never break, and whole-word rendering to preserve shaping. See [The Realism Engine](The-Realism-Engine).

### Can I import a PDF?

Yes — drag in a `.pdf` and text is extracted client-side via pdf.js (with a progress bar). Also supported: `.txt` and `.md`.

### Can I really make my own handwriting font?

Yes, entirely in the browser — sketch glyphs or scan a template sheet, and HandFonted Studio traces, smooths and compiles a `.ttf` you can install system-wide. See [HandFonted Studio](HandFonted-Studio).

### Is InkForge free?

Yes — MIT licensed, no sign-up, no ads, no telemetry.

---

## Common Issues

| Symptom | Likely cause & fix |
| :--- | :--- |
| `⚠ Enter your OpenRouter/Anthropic API key first.` | No key set for the selected provider — paste a key, or switch provider to Ollama / use offline Smart Arrange |
| `✕ Network error: …` on AI buttons | The provider host is unreachable (offline, firewall, or blocked network). Everything else keeps working |
| `✕ API Error: <message>` | The provider rejected the request — check the key, the model, or your quota/rate limit at the provider's dashboard |
| App looks stale after an update | The service worker's cache-first cache is serving old assets. Hard-refresh; maintainers must bump the version in all three places (`package.json`, `sw.js`, `index.html` cache-bust) — `npm run check-versions` verifies |
| Notes/fonts/settings gone | They are per-browser and per-origin. You switched browsers, devices, private-mode windows, or cleared site data. Notebooks & glyphs do not sync across devices |
| HandFonted font won't compile | Fewer than 2 non-blank glyphs drafted — fill more characters (blank cells are skipped), or re-check template alignment |
| A drafted glyph renders blank | Blank-glyph hygiene normally prevents this; re-sketch the character or re-import your font project (`pruneBlankGlyphs` runs on boot and import) |
| Long words break the page | They shouldn't — ultra-long words wrap character-level. If you see overflow, confirm you're on the latest version |
| AI text looks messy (markdown fences, `**bold**`) | Automatic sanitization strips these; if markup still leaks, run **Smart Arrange** to tidy, and report the model via [Issues](https://github.com/VIPHACKER100/InkForge/issues) |
| Canvas misaligned with ruled lines on mobile | Fixed in v1.6.24's responsive canvas sizing — update your deployment and hard-refresh |

---

## Still Stuck?

Search [open issues](https://github.com/VIPHACKER100/InkForge/issues) or open a new one with the bug-report template from [Contributing](Contributing) — include your browser + version and steps to reproduce.
