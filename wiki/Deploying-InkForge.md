# Deploying InkForge

InkForge is fully static — no build step, no server, no backend. Deployment is just *serving the files*.

---

## Minimum Files

```
index.html   index.css   index.js
about.html   about.css   inkforge_logo.jpeg
sw.js        manifest.json
```

(`robots.txt` and `sitemap.xml` are nice-to-haves for SEO.)

## Hosting Options

### Local preview

```bash
python -m http.server 8000   # or: npx serve .
```

### GitHub Pages

Push the repo, then **Settings → Pages** → source: `main` branch root. The site appears at `https://<user>.github.io/InkForge/`.

### Netlify / Vercel / Cloudflare Pages

Connect the repository — each detects a static site. Build command: none. Publish directory: repository root.

### Any web server

Copy the files above into your docroot (nginx, Apache, S3, …).

---

## CDN Dependencies

Third-party libraries load from CDNs at runtime — nothing is vendored:

| Library | Version | Purpose | Load |
| :--- | :--- | :--- | :--- |
| jsPDF | 2.5.1 | PDF generation | eager |
| html2canvas | 1.4.1 | legacy (no longer referenced by exports) | eager |
| Font Awesome | 6.4.0 | UI icons | eager |
| Google Fonts | — | Handwriting + UI fonts | eager |
| opentype.js | 1.3.4 | Custom font building | lazy |
| pdf.js | 3.4.120 | PDF file import | lazy |

The service worker pre-caches the app shell, About page and the fonts stylesheet, so installed PWAs work fully offline.

---

## Versioning & Cache-Busting

The version must agree in **three places**:

1. `package.json` → `version`
2. `sw.js` → `CACHE_VERSION`
3. `index.html` → the `index.js?v=…` cache-bust query

Run `npm run check-versions` to verify (exit code 1 on drift). **When you change `index.js` or `index.css`, bump all three** and add a `docs/changelog.md` entry — skipping the bump risks clients being served stale code from the service worker's cache-first asset cache.

---

## AI Considerations

OpenRouter and Anthropic allow direct browser calls (CORS is open), so **no proxy is needed** for personal use. If a network blocks those hosts, AI buttons show a connection error while everything else keeps working. Users bring their own key, stored only in their browser — never ship a key in the repo.

## SEO Surface

- `index.html` carries `description`, `robots`, `author`, `rel="canonical"`, Open Graph + Twitter card tags, and an inline `application/ld+json` `schema.org/WebApplication` block.
- `robots.txt` and `sitemap.xml` live at the repo root.
- All absolute URLs use the canonical origin `https://inkforge.in/` — if your domain differs, update the canonical link, `og:url`, `og:image`, `twitter:image`, the JSON-LD `url` in `index.html`, plus `robots.txt` and `sitemap.xml`.
- The service worker's offline fallback page is marked `noindex`.

## Security CI

`.github/workflows/codeql.yml` runs CodeQL static analysis on every push/PR (and weekly). After deploying, enable **Settings → Security → Code security** to receive alerts.

## Pre-Launch Checklist

- [ ] App loads; no localhost references remain in CDN/API URLs
- [ ] localStorage + IndexedDB persist across reloads
- [ ] All exports (PNG/JPG/PDF/SVG/Copy/Print) produce correct output
- [ ] Dark mode, paper styles and theme packs render correctly
- [ ] AI features fail gracefully when offline
- [ ] SEO tags intact; version parity check passes
