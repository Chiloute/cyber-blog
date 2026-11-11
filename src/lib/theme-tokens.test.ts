import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { darkTokens, themeColors } from '../config/site.ts';

// Same block parser as scripts/check-contrast.mjs: plain #rrggbb tokens only.
const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');
const block = (sel: string) => {
  const m = css.match(new RegExp(`^${sel.replace(/[[\]"]/g, '\\$&')} \\{([^}]*)\\}`, 'm'));
  assert.ok(m, `block not found: ${sel}`);
  return Object.fromEntries([...m[1]!.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)].map((x) => [x[1], x[2]!.toLowerCase()]));
};

test('themeColors and darkTokens equal the CSS tokens', () => {
  const light = block(':root');
  const dark = block('[data-theme="dark"]');
  assert.equal(themeColors.light, light['bg']);
  assert.equal(themeColors.dark, dark['bg']);
  for (const [k, v] of Object.entries(darkTokens)) assert.equal(v, dark[k], `darkTokens.${k}`);
});
