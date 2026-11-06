import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/', '/writeups/', '/writeups/example-web-ssti/', '/writeups/tags/ssti/', '/notes/',
  '/notes/linux-privesc-cheatsheet/', '/projects/', '/about/', '/uses/', '/search/', '/legal-notice/',
  '/privacy/', '/accessibility/', '/disclaimer/', '/licenses/',
  '/does-not-exist/', // astro preview serves 404.html with status 404 for unknown URLs
];
const THEMES = ['light', 'dark'] as const;

async function open(page: Page, url: string, theme: (typeof THEMES)[number]) {
  const problems: string[] = [];
  await page.addInitScript((t) => {
    localStorage.setItem('theme', t);
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
    (window as unknown as { __csp: string[] }).__csp = [];
  }, theme);
  await page.emulateMedia({ colorScheme: theme });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  const res = await page.goto(url);
  // A missing page would silently test the 404 template instead: require 200 for every real page.
  expect(res?.status(), `HTTP status of ${url}`).toBe(url === '/does-not-exist/' ? 404 : 200);
  await page.waitForLoadState('networkidle');
  return problems;
}

for (const url of PAGES) {
  for (const theme of THEMES) {
    test(`axe + CSP: ${url} (${theme})`, async ({ page }) => {
      const problems = await open(page, url, theme);
      const csp = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const summary = violations
        .map((v) => `${v.id} [${v.impact}]: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
        .join('\n');
      expect(violations, `axe violations:\n${summary}`).toEqual([]);
      expect(csp, 'CSP violations').toEqual([]);
      // 404 page legitimately logs the failed document load as a console error.
      expect(problems.filter((p) => !/status of 404/.test(p)), 'console errors').toEqual([]);
    });
  }

  test(`structure: ${url}`, async ({ page }) => {
    await open(page, url, 'light');
    await expect(page.locator('h1')).toHaveCount(1);
    await page.keyboard.press('Tab');
    const skip = page.locator(':focus');
    await expect(skip).toHaveClass(/skip-link/);
    await expect(skip).toBeInViewport();
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}
