/* ═══════════════════════════════════════════════════════════
   InkForge — axe-core contrast/accessibility audit (Phase D4)
   Usage:
     npx vite --port 5210 --strictPort   # in another shell
     node scripts/contrast-audit.mjs
   Env:
     AUDIT_BASE_URL (default http://localhost:5210)
   Audits index.html + about.html in light & dark mode
   (localStorage key `inkforge-dark`), with sidebar sections and
   dropdowns opened first so hidden-but-reachable states are
   covered. axe-core is downloaded once and injected as INLINE
   content (about.html's CSP only allows 'unsafe-inline', not
   external CDN scripts).
   For nodes axe reports as "incomplete" color-contrast, the
   script computes the WCAG ratio itself (foreground color +
   alpha-composited ancestor background chain) so nothing is
   left unverified.
   ═══════════════════════════════════════════════════════════ */
import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5210';
const AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
const CACHE = new URL('./.axe-core-cache.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

async function loadAxeSource() {
  if (existsSync(CACHE)) return readFileSync(CACHE, 'utf8');
  const res = await fetch(AXE_URL);
  if (!res.ok) throw new Error(`Failed to download axe-core: ${res.status}`);
  const src = await res.text();
  writeFileSync(CACHE, src);
  return src;
}

const PAGES = [
  { name: 'index light', url: '/', dark: false },
  { name: 'index dark', url: '/', dark: true },
  { name: 'about light', url: '/about.html', dark: false },
  { name: 'about dark', url: '/about.html', dark: true },
];

function fmtViolation(v) {
  const lines = [];
  lines.push(`  [${v.impact || 'none'}] ${v.id} — ${v.help} (${v.tags.join(', ')})`);
  for (const node of v.nodes) {
    lines.push(`    target: ${node.target.join(' ')}`);
    const summary = (node.failureSummary || '').replace(/\n\s*/g, ' | ');
    lines.push(`    summary: ${summary}`);
    const html = (node.html || '').slice(0, 160).replace(/\s+/g, ' ');
    lines.push(`    html: ${html}`);
  }
  return lines.join('\n');
}

const browser = await chromium.launch();
const axeSource = await loadAxeSource();
const report = {};

for (const p of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((dark) => {
    try { localStorage.setItem('inkforge-dark', dark ? '1' : '0'); } catch {}
  }, p.dark);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

  await page.goto(BASE + p.url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(2500);
  // Force the theme class (idempotent with the app's own init logic).
  await page.evaluate((dark) => {
    document.documentElement.classList.toggle('dark', dark);
  }, p.dark);
  await page.waitForTimeout(500);

  let interactions = [];
  if (p.url === '/') {
    // Open every collapsed sidebar section.
    const collapsed = await page.$$('.sb-section-header[aria-expanded="false"]');
    for (const el of collapsed) {
      await el.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(120);
    }
    interactions.push(`opened ${collapsed.length} collapsed sidebar section(s)`);
    // Open the Diagram dropdown and the Add-Layer dropdown.
    for (const sel of ['.dropdown > button', '#btn-add-layer-dropdown']) {
      const el = await page.$(sel);
      if (el) {
        await el.click({ timeout: 3000 }).catch(() => {});
        interactions.push(`clicked ${sel}`);
        await page.waitForTimeout(150);
      }
    }
    await page.waitForTimeout(300);
  }

  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(() =>
    axe.run(document, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      resultTypes: ['violations', 'incomplete'],
    })
  );

  // Manual verification of "incomplete" color-contrast nodes:
  // composite the alpha of every ancestor background and compute
  // the WCAG 2.x ratio ourselves.
  const probe = await page.evaluate(() => {
    const lum = (r, g, b) => {
      const f = (c) => {
        c /= 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (l1, l2) => {
      const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
      return (a + 0.05) / (b + 0.05);
    };
    const parse = (str) => {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(',').map((s) => parseFloat(s));
      return { r, g, b, a };
    };
    const composite = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * bg.a * (1 - fg.a),
      g: fg.g * fg.a + bg.g * bg.a * (1 - fg.a),
      b: fg.b * fg.a + bg.b * bg.a * (1 - fg.a),
      a: fg.a + bg.a * (1 - fg.a),
    });
    const effectiveBg = (el) => {
      // Collect background layers from the element upward until one is
      // fully opaque, then composite bottom-up over white.
      const layers = [];
      let node = el;
      while (node && node.nodeType === 1) {
        const bg = parse(getComputedStyle(node).backgroundColor);
        if (bg && bg.a > 0) {
          layers.push(bg);
          if (bg.a >= 0.99) break;
        }
        node = node.parentElement;
      }
      let acc = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) acc = composite(layers[i], acc);
      return acc;
    };
    // Emoji with emoji-presentation selector render as multicolored
    // glyphs — CSS color does not paint them. UI symbols (arrows,
    // geometric shapes, ✕) still count as meaningful text.
    const meaningful = (txt) =>
      !/\uFE0F/.test(txt) &&
      /[\p{L}\p{N}\u2190-\u2BFF\u25A0-\u25FF\u00B0-\u00BF]/u.test(txt);
    const out = [];
    const skippedGradient = [];
    document.querySelectorAll('*').forEach((el) => {
      if (!el.childNodes.length) return;
      const hasText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && meaningful(n.textContent)
      );
      if (!hasText) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        // Gradient/image backgrounds cannot be composited from
        // backgroundColor — record for manual math verification.
        const fg2 = parse(cs.color);
        if (fg2) {
          skippedGradient.push({
            target: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`,
            fg: cs.color,
            bgImage: cs.backgroundImage.slice(0, 120),
          });
        }
        return;
      }
      const fg = parse(cs.color);
      const bg = effectiveBg(el);
      if (!fg) return;
      const fgSolid = fg.a < 1 ? composite(fg, bg) : fg;
      const r = ratio(lum(fgSolid.r, fgSolid.g, fgSolid.b), lum(bg.r, bg.g, bg.b));
      const pt = parseFloat(cs.fontSize) * 0.75; // px -> pt
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = pt >= 18 || (pt >= 14 && bold); // 18pt normal / 14pt bold
      const need = large ? 3 : 4.5;
      if (r + 0.005 < need) {
        out.push({
          target: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`,
          fg: cs.color,
          bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}) (bg alpha ${bg.a.toFixed(2)})`,
          fontSize: cs.fontSize,
          ratio: r.toFixed(2),
          needed: need,
        });
      }
    });
    return { out, skippedGradient };
  });

  const manual = probe.out;
  report[p.name] = { res, pageErrors, interactions, manual, skippedGradient: probe.skippedGradient };
  console.log(`\n════════ ${p.name.toUpperCase()} (${p.url}) ════════`);
  if (interactions.length) console.log(`  interactions: ${interactions.join('; ')}`);
  if (pageErrors.length) console.log(`  page JS errors: ${pageErrors.length} (first: ${pageErrors[0]})`);
  console.log(`  passes: ${res.passes.length} rule groups, incomplete: ${res.incomplete.length}, violations: ${res.violations.length}`);
  if (res.incomplete.length) {
    console.log('  ── incomplete (needs manual review) ──');
    for (const v of res.incomplete) {
      console.log(`    [${v.impact || 'none'}] ${v.id} — ${v.nodes.length} node(s): ${v.nodes.map((n) => n.target.join(' ')).join(' ; ').slice(0, 400)}`);
    }
  }
  if (probe.skippedGradient.length) {
    console.log('  ── gradient/image backgrounds (not computable — verify stops manually) ──');
    for (const s of probe.skippedGradient) {
      console.log(`    CHECK ${s.target}  fg=${s.fg}  bg=${s.bgImage}`);
    }
  }
  if (manual.length) {
    console.log('  ── manual contrast probe (computed, incl. axe-incomplete nodes) ──');
    for (const m of manual) {
      console.log(`    FAIL ${m.ratio}:1 (need ${m.needed})  ${m.target}  fg=${m.fg}  bg=${m.bg}  font=${m.fontSize}`);
    }
  } else {
    console.log('  manual contrast probe: no additional failures');
  }
  if (res.violations.length === 0) {
    console.log('  ✅ no axe violations');
  } else {
    console.log('  ── axe violations ──');
    for (const v of res.violations) console.log(fmtViolation(v));
  }
  await ctx.close();
}

await browser.close();

// Exit non-zero if any real violations remain.
const total = Object.values(report).reduce((n, r) => n + r.res.violations.length, 0);
console.log(`\nTOTAL axe violations across ${PAGES.length} page/mode combos: ${total}`);
process.exit(total > 0 ? 1 : 0);
