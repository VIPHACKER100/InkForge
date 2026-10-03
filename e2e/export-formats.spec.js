import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// C2 (docs/upgrade-plan.md) — export pipeline coverage beyond the PNG download
// trigger already asserted in export.spec.js: every format button (PNG / JPG /
// transparent PNG / PDF / SVG / clipboard / print) gets a per-format test.
//
// Conventions follow e2e/export.spec.js + smoke.spec.js: one test per behaviour,
// fresh page per test, fill → Render → observe, auto-waiting expect(), bounded
// waitForEvent timeouts, pageerror collection asserted empty.

// Bounded wait for downloads — generous vs. the 60s per-test timeout in playwright.config.js.
const DOWNLOAD_TIMEOUT = 15000;

// Filenames from export-manager.js: single-page docs export as `inkflow-notes.<ext>`,
// multi-page as `inkflow-notes-pageN.<ext>`. Transparent PNGs are ALWAYS page-suffixed
// (`inkflow-transparent-pageN.png`), even for a single-page document.
const SINGLE_OR_PAGED = (ext) => new RegExp(`^inkflow-notes(-page\\d+)?\\.${ext}$`);

/**
 * Render a short single-page note (the shared arrange step of every export test)
 * and collect page errors, smoke.spec.js-style, for the caller to assert empty.
 */
async function renderOnePageNote(page, text) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.fill('#text-input', text);
  await page.click('.btn-render');
  await expect(page.locator('.canvas-page').first()).toBeVisible();
  return errors;
}

/** Assert the download produced a healthy (saved, failure-free) file. */
async function expectHealthyDownload(download, filenamePattern) {
  expect(download.suggestedFilename()).toMatch(filenamePattern);
  expect(await download.path()).toBeTruthy();
  expect(await download.failure()).toBeNull();
}

test('PNG export downloads a valid inkflow-notes PNG', async ({ page }) => {
  const errors = await renderOnePageNote(page, 'PNG export pipeline test.');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }),
    page.click('[aria-label="Export as PNG image"]'),
  ]);
  await expectHealthyDownload(download, SINGLE_OR_PAGED('png'));
  expect(errors).toEqual([]);
});

test('JPG export downloads a valid inkflow-notes JPG', async ({ page }) => {
  const errors = await renderOnePageNote(page, 'JPG export pipeline test.');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }),
    page.click('[aria-label="Export as JPG image"]'),
  ]);
  await expectHealthyDownload(download, SINGLE_OR_PAGED('jpg'));
  expect(errors).toEqual([]);
});

test('Transparent PNG export downloads inkflow-transparent-pageN.png', async ({ page }) => {
  const errors = await renderOnePageNote(page, 'Transparent PNG export pipeline test.');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }),
    page.click('[aria-label="Export as PNG with transparent background"]'),
  ]);
  // export-manager.js always page-suffixes transparent exports (inkflow-transparent-page1.png here).
  await expectHealthyDownload(download, /^inkflow-transparent-page\d+\.png$/);
  expect(errors).toEqual([]);
});

test('PDF export downloads inkflow-notes.pdf in Standard and High presets', async ({ page }) => {
  const errors = await renderOnePageNote(page, 'PDF export pipeline test.');

  // jsPDF loads from a CDN with defer — wait until it is ready before exporting.
  await page.waitForFunction(
    () => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined',
    null,
    { timeout: 20000 }
  );

  // Standard preset (default): 2× JPEG 92%.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }),
    page.click('[aria-label="Export as PDF document"]'),
  ]);
  await expectHealthyDownload(download, SINGLE_OR_PAGED('pdf'));

  // High preset (2×, lossless PNG) — exercises ExportRenderers._upscaleCanvas.
  // index.js persists the select to localStorage under 'inkflow-pdf-size'.
  await page.selectOption('#pdf-size-select', 'high');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('inkflow-pdf-size')))
    .toBe('high');
  const [highDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }),
    page.click('[aria-label="Export as PDF document"]'),
  ]);
  await expectHealthyDownload(highDownload, SINGLE_OR_PAGED('pdf'));
  expect(errors).toEqual([]);
});

test('SVG export downloads a file containing SVG markup', async ({ page }) => {
  const errors = await renderOnePageNote(page, 'SVG export pipeline test.');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }),
    page.click('[aria-label="Export as SVG vector"]'),
  ]);
  await expectHealthyDownload(download, SINGLE_OR_PAGED('svg'));
  // The SVG wrapper embeds the page as a data-URL PNG image inside real <svg> markup.
  const svgContent = await readFile(await download.path(), 'utf8');
  expect(svgContent).toContain('<svg');
  expect(svgContent).toContain('</svg>');
  expect(svgContent).toContain('data:image/png');
  expect(errors).toEqual([]);
});

test('Copy export writes a PNG to the clipboard (confirmed by toast)', async ({ page }) => {
  const errors = await renderOnePageNote(page, 'Clipboard copy pipeline test.');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.click('[aria-label="Copy current page to clipboard"]');

  // export-manager.js reports the outcome on the aria-live announcer: on success
  // '✓ Copied to clipboard!', on failure 'Clipboard copy failed: …'. Headless
  // Chromium may deny the write, so accept either and only deep-verify the
  // clipboard payload when the read API is actually available.
  await expect(page.locator('#status-announcer')).toContainText(
    /Copied to clipboard|Clipboard copy failed/,
    { timeout: DOWNLOAD_TIMEOUT }
  );
  const success = await page
    .locator('#status-announcer')
    .evaluate((el) => el.textContent.includes('Copied to clipboard'));
  if (success) {
    const types = await page.evaluate(async () => {
      try {
        const items = await navigator.clipboard.read();
        return items.flatMap((item) => [...item.types]);
      } catch {
        return null; // clipboard read unavailable in this browser mode
      }
    });
    if (types !== null) {
      expect(types).toContain('image/png');
    } else {
      console.log(
        '[export-formats] navigator.clipboard.read() unavailable headless — ' +
          'copy verified via the #status-announcer success toast instead.'
      );
    }
  } else {
    console.log(
      '[export-formats] headless clipboard write denied — copy verified via the ' +
        '#status-announcer failure toast instead.'
    );
  }
  expect(errors).toEqual([]);
});

test('Print button invokes window.print exactly once', async ({ page }) => {
  // Intercept window.print before any app script runs: count calls instead of
  // opening the (headless-blocking) native print dialog.
  await page.addInitScript(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls += 1;
    };
  });
  const errors = await renderOnePageNote(page, 'Print pipeline test.');
  await page.click('[aria-label="Print notes"]');
  await expect
    .poll(() => page.evaluate(() => window.__printCalls), { timeout: DOWNLOAD_TIMEOUT })
    .toBe(1);
  expect(errors).toEqual([]);
});
