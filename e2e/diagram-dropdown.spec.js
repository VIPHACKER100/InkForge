import { test, expect } from '@playwright/test';

test('diagram dropdown opens, closes via outside click and Escape, and inserts a template', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.locator('#sidebar')).toBeVisible();

  const dropdown = page.locator('.action-buttons-row .dropdown');
  const diagramButton = dropdown.locator('button');
  const menu = dropdown.locator('.dropdown-content');

  await diagramButton.click(); // "📊 Diagram ▾"
  await expect(dropdown).toHaveClass(/open/);

  // Six template links: Flowchart, Cycle, Hierarchy, Pipeline, Pyramid, Mermaid
  await expect(menu.locator('a')).toHaveCount(6);

  // Clicking outside closes the menu
  await page.click('#text-input');
  await expect(dropdown).not.toHaveClass(/open/);

  // Escape closes the menu
  await diagramButton.click();
  await expect(dropdown).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(dropdown).not.toHaveClass(/open/);

  // Inserting the Cycle template writes a ```diagram fence into the textarea
  await diagramButton.click();
  await expect(dropdown).toHaveClass(/open/);
  await menu.locator('a', { hasText: 'Cycle' }).click();
  await expect(page.locator('#text-input')).toHaveValue(/```diagram/);
  await expect(dropdown).not.toHaveClass(/open/);

  expect(errors).toEqual([]);
});
