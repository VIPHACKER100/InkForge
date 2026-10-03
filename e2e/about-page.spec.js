import { test, expect } from '@playwright/test';

test('about page loads, draws the demo canvas, toggles dark mode, and links back', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/about.html');
  await expect(page).toHaveTitle(/About InkForge/);

  // Hero pill shows the app version
  await expect(page.locator('.hero-pill')).toContainText(/v\d+\.\d+\.\d+/);

  // The interactive realism playground actually draws ink (non-transparent pixels)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const canvas = document.getElementById('demo-canvas');
        if (!canvas) return false;
        const ctx = canvas.getContext('2d');
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) return true;
        }
        return false;
      })
    )
    .toBe(true);

  // Dark-mode toggle flips the root class and persists the shared theme key
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/); // fresh context starts in light mode
  await page.click('#dark-toggle');
  await expect(html).toHaveClass(/dark/);
  await expect(page.locator('#dark-icon')).toHaveText('🌙');
  expect(await page.evaluate(() => localStorage.getItem('inkforge-dark'))).toBe('1');

  // The persisted choice is reapplied on a fresh load
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);

  // "Open Studio" navigates back to the editor
  await page.click('nav .nav-actions a.btn-cta');
  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator('#toolbar')).toBeVisible();

  expect(errors).toEqual([]);
});
