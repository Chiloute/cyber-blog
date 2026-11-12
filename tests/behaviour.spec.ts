import { test, expect } from '@playwright/test';

test('theme toggle persists and announces', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Dark' }).first().check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[data-theme-status]').first()).toHaveText(/Theme set to dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('no wrong-theme flash', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __t: string | undefined }).__t = document.documentElement.dataset.theme;
    });
  });
  await page.goto('/');
  expect(await page.evaluate(() => (window as unknown as { __t: string }).__t)).toBe('dark');
});

test('flag reveal', async ({ page }) => {
  await page.goto('/writeups/example-web-ssti/');
  const btn = page.locator('[data-flag] button'); // accessible name flips Reveal -> Hide
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-flag] code')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Flag revealed' })).toHaveCount(1);
});

test('copy button', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/writeups/example-web-ssti/');
  await page.getByRole('button', { name: 'Copy code to clipboard' }).first().click();
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveCount(1);
});

test('mobile menu: Escape closes and refocuses button', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  const btn = page.locator('[data-mobile-nav-button]');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link').nth(2).focus();
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(btn).toBeFocused();
});

test('writeup filters update live count', async ({ page }) => {
  await page.goto('/writeups/');
  const count = page.locator('[data-count]');
  const total = await page.locator('[data-post]').count();
  await expect(count).toHaveText(`Showing ${total} of ${total} writeups`);
  await expect(count).toHaveAttribute('role', 'status');
  // Fixtures: exactly one "web" writeup (example-web-ssti), the draft example is "reverse".
  const clear = page.getByRole('button', { name: 'Clear filters' });
  await expect(clear).toBeHidden();
  await page.getByRole('group', { name: 'category' }).getByRole('radio', { name: 'web', exact: true }).check();
  await expect(count).toHaveText(`Showing 1 of ${total} writeups`);
  await expect(page).toHaveURL(/\?category=web/);
  await expect(page.locator('[data-echo]')).toHaveText('$ ls -lt ~/writeups --category=web');
  await clear.focus();
  await page.keyboard.press('Enter');
  await expect(page).not.toHaveURL(/category=/);
  await expect(count).toHaveText(`Showing ${total} of ${total} writeups`);
  await expect(clear).toBeHidden();
  // Focus does not fall back to <body> when the focused button disappears.
  await expect(page.getByRole('group', { name: 'category' }).getByRole('radio', { name: 'all' })).toBeFocused();
});

test('search finds the example writeup', async ({ page }) => {
  await page.goto('/search/');
  await page.locator('#search-form input').fill('template');
  await expect(page.locator('#search-results a[href*="example-web-ssti"]')).toBeVisible();
});

test('reduced motion zeroes transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const sel of ['a', 'button']) {
    const d = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(d)).toBeLessThan(0.01);
  }
});

test('back-to-top appears after scrolling on mobile and returns to the top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/writeups/example-web-ssti/');
  const link = page.getByRole('link', { name: 'Back to top' });
  await expect(link).toHaveCSS('opacity', '0');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => link.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.5);
  await link.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('back-to-top is hidden on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/writeups/example-web-ssti/');
  await expect(page.getByRole('link', { name: 'Back to top' })).toBeHidden();
});

test('static endpoints respond', async ({ request }) => {
  for (const url of ['/rss.xml', '/writeups/rss.xml', '/notes/rss.xml']) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()['content-type'], url).toContain('xml');
    expect(await res.text(), url).toContain('<rss');
  }
  const og = await request.get('/og/writeups/example-web-ssti.png');
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toContain('image/png');
  expect([...(await og.body()).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  for (const url of ['/robots.txt', '/.well-known/security.txt']) expect((await request.get(url)).status(), url).toBe(200);
  expect(await (await request.get('/sitemap-0.xml')).text()).not.toContain('/search/');
});
