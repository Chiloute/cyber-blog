// WCAG 2.x contrast check. Parses tokens from src/styles/global.css. `--markdown` prints the docs table.
import { readFileSync, existsSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const block = (sel) => {
  const m = css.match(new RegExp(`^${sel.replace(/[[\]"]/g, '\\$&')} \\{([^}]*)\\}`, 'm'));
  if (!m) throw new Error(`block not found: ${sel}`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)].map((x) => [x[1], x[2].toLowerCase()]));
};
const themes = { light: block(':root'), dark: block('[data-theme="dark"]') };

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [label, foreground token, background token, required ratio]
const pairs = [
  ['text / bg', 'text', 'bg', 4.5],
  ['muted / bg', 'muted', 'bg', 4.5],
  ['text / surface', 'text', 'surface', 4.5],
  ['muted / surface', 'muted', 'surface', 4.5],
  ['accent (links) / bg', 'accent', 'bg', 4.5],
  ['accent (links) / surface', 'accent', 'surface', 4.5],
  ['accent-contrast / accent (buttons)', 'accent-contrast', 'accent', 4.5],
  ['focus / bg', 'focus', 'bg', 3],
  ['focus / surface', 'focus', 'surface', 3],
  ['border-ui / bg (inputs, buttons)', 'border-ui', 'bg', 3],
  ['highlight (active nav) / bg', 'highlight', 'bg', 4.5],
  ['highlight / surface', 'highlight', 'surface', 4.5],
  ['text / highlight-bg (mark, selection)', 'text', 'highlight-bg', 4.5],
  ['accent (links) / code-bg', 'accent', 'code-bg', 4.5],
  ...['web', 'crypto', 'pwn', 'reverse', 'forensic', 'osint', 'misc'].map((k) => [`badge cat-${k} / bg`, `cat-${k}`, 'bg', 4.5]),
  ...['easy', 'medium', 'hard', 'insane'].map((k) => [`badge diff-${k} / bg`, `diff-${k}`, 'bg', 4.5]),
  ['text / code-bg', 'text', 'code-bg', 4.5],
  ['muted / code-bg', 'muted', 'code-bg', 4.5],
  ...['success', 'warning', 'info'].map((k) => [`callout ${k} / surface`, k, 'surface', 4.5]),
  ['callout text / surface', 'text', 'surface', 4.5],
  ...['web', 'crypto', 'pwn', 'reverse', 'forensic', 'osint', 'misc'].map((k) => [`badge cat-${k} / surface`, `cat-${k}`, 'surface', 4.5]),
  ...['easy', 'medium', 'hard', 'insane'].map((k) => [`badge diff-${k} / surface`, `diff-${k}`, 'surface', 4.5]),
];

const md = process.argv.includes('--markdown');
let failed = 0;
const out = [];
for (const [name, t] of Object.entries(themes)) {
  out.push(md ? `## ${name[0].toUpperCase() + name.slice(1)} theme\n\n| Pair | Foreground | Background | Ratio | Required | Pass |\n|---|---|---|---|---|---|` : `\n[${name}]`);
  for (const [label, fg, bg, req] of pairs) {
    if (!t[fg] || !t[bg]) throw new Error(`missing token in ${name}: ${fg} or ${bg}`);
    const r = ratio(t[fg], t[bg]);
    const ok = r >= req;
    if (!ok) failed++;
    out.push(md
      ? `| ${label} | \`${t[fg]}\` | \`${t[bg]}\` | ${r.toFixed(2)} | ${req} | ${ok ? 'yes' : 'NO'} |`
      : `${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(36)} ${t[fg]} on ${t[bg]}  ${r.toFixed(2)} (>= ${req})`);
  }
  if (md) out.push('');
}
console.log(out.join('\n'));

// Syntax highlighting. The painted bg is the Shiki one (global.css: .astro-code uses --shiki-*-bg).
// Part 1 (no build): render samples with the themes read from astro.config.mjs. Part 2: dist/shiki.css if present.
if (!md) {
  const full = (h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h).toLowerCase();
  const check = (src, mode, bg, fg, text) => {
    const r = ratio(fg, bg);
    if (r < 4.5) { failed++; console.log(`FAIL  code ${src} ${mode}  ${fg} on ${bg}  ${r.toFixed(2)} (>= 4.5)  ${text ?? ''}`); }
    return r;
  };
  const cfg = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  const named = cfg.match(/themes:\s*\{\s*light:\s*'([^']+)',\s*dark:\s*'([^']+)'/);
  if (!named) throw new Error('shikiConfig themes not found in astro.config.mjs');
  const { codeToTokens } = await import('shiki');
  const samples = {
    ts: '// c\nconst a: number = 1; /* x */ function f<T>(x: T) { return `t${x}` + /re/g; }',
    bash: '# c\nif [ -f "$x" ]; then echo $HOME | grep -E \'a\'; fi',
    python: '# c\n@d\ndef f(x: int) -> str:\n  """doc"""\n  return f"{x}"',
    c: '// c\n#include <stdio.h>\nint main(){printf("%d\\n",1);return 0;}',
    json: '{"a":[1,true,null,"s"]}',
    diff: '--- a\n+++ b\n@@ -1 +1 @@\n-a\n+b',
    yaml: '# c\na: &x\n  - b: "c"\n  - 1',
  };
  for (const [mode, theme] of [['light', named[1]], ['dark', named[2]]]) {
    let min = Infinity;
    for (const [lang, code] of Object.entries(samples)) {
      const { tokens, bg } = await codeToTokens(code, { lang, theme });
      for (const tok of tokens.flat()) {
        if (!tok.content.trim()) continue; // whitespace is invisible
        min = Math.min(min, check(`${theme}/${lang}`, mode, full(bg), full(tok.color), JSON.stringify(tok.content)));
      }
    }
    console.log(`code samples ${mode} (${theme}): min ratio ${min.toFixed(2)}`);
  }

  const cssFile = new URL('../dist/shiki.css', import.meta.url);
  if (existsSync(cssFile)) {
    const sc = readFileSync(cssFile, 'utf8');
    const get = (v) => [...sc.matchAll(new RegExp(`--shiki-${v}:\\s*(#[0-9a-fA-F]{3,8})`, 'g'))].map((m) => full(m[1]));
    for (const mode of ['light', 'dark']) {
      const bgs = [...new Set(get(`${mode}-bg`))];
      if (!bgs.length) throw new Error(`no --shiki-${mode}-bg in dist/shiki.css`);
      let min = Infinity;
      for (const fg of new Set(get(mode))) for (const bg of bgs) min = Math.min(min, check('dist/shiki.css', mode, bg, fg));
      console.log(`dist/shiki.css ${mode}: min ratio ${min.toFixed(2)}`);
    }
  }
}

if (failed) { console.error(`\n${failed} pair(s) below threshold`); process.exit(1); }
