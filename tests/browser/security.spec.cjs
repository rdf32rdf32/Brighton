const { test, expect } = require('@playwright/test');

// A restrictive privacy mode must never prevent visitors opening the site.
test('the public site remains usable when browser storage throws', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: () => { throw new DOMException('Storage is blocked by privacy settings', 'SecurityError'); }
      });
    }
  });
  await page.goto('/#shootout', { waitUntil: 'load' });
  await expect(page.locator('#shootout')).toBeVisible();
  await expect(page.locator('#xiPlayerPalette')).toBeAttached();
  await expect(page.locator('#scorersRows')).toBeAttached();
  await expect(page).toHaveURL(/#shootout$/);
  expect(errors).toEqual([]);
});

test('site security policy leaves games and navigation working', async ({ page }) => {
  const violations = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      window.__albionViolations ||= [];
      window.__albionViolations.push(event.violatedDirective + ': ' + event.blockedURI);
    });
  });
  await page.goto('/#players', { waitUntil: 'load' });
  await expect(page.locator('#players')).toBeVisible();
  await expect(page.locator('#shootout')).toBeAttached();
  await expect(page.locator('#scorersRows')).toBeAttached();
  violations.push(...await page.evaluate(() => window.__albionViolations || []));
  expect(errors).toEqual([]);
  expect(violations).toEqual([]);
});
