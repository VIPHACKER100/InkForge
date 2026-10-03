import { test, expect } from '@playwright/test';

test('HandFonted Studio opens, switches sketchpad/template tabs, and closes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.locator('#sidebar')).toBeVisible();

  const modal = page.locator('#handfonted-modal');
  await expect(modal).toBeHidden();

  // "✨ Create Your Own Font" opens the studio modal
  await page.click('#btn-handfonted-studio');
  await expect(modal).toBeVisible();
  await expect(page.locator('#handfonted-modal h3')).toContainText('HandFonted Studio');

  // switchFontTab buttons: Live Sketchpad is the default tab
  const sketchpadTab = page.locator('#tab-btn-sketchpad');
  const templateTab = page.locator('#tab-btn-template');
  await expect(sketchpadTab).toBeVisible();
  await expect(templateTab).toBeVisible();
  await expect(sketchpadTab).toHaveClass(/active/);
  await expect(page.locator('#panel-sketchpad')).toBeVisible();
  await expect(page.locator('#panel-template')).toBeHidden();

  // Switch to the Upload Template tab
  await templateTab.click();
  await expect(templateTab).toHaveClass(/active/);
  await expect(sketchpadTab).not.toHaveClass(/active/);
  await expect(page.locator('#panel-template')).toBeVisible();
  await expect(page.locator('#panel-sketchpad')).toBeHidden();

  // Close via the modal's close button
  await page.click('#handfonted-modal .modal-close');
  await expect(modal).toBeHidden();

  // Reopen and close via the exposed window.closeHandFontedModal() helper
  await page.click('#btn-handfonted-studio');
  await expect(modal).toBeVisible();
  await page.evaluate(() => window.closeHandFontedModal());
  await expect(modal).toBeHidden();

  expect(errors).toEqual([]);
});
