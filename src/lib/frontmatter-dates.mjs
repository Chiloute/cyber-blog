// Reads `updated ?? date` from MDX frontmatter. getCollection() is unavailable in astro.config,
// and `yaml` is only a transitive dependency, so a minimal scalar-line reader is used instead.
// shortcut: only top-level `key: value` scalars are read; fine for date fields.
import { readdirSync, readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { postUrl } from './urls.ts';

const DIRS = ['writeups', 'notes'];

/** Maps site-relative paths ("/writeups/<slug>/") to a lastmod Date. */
export function loadLastmods(root = 'src/content') {
  const map = new Map();
  for (const dir of DIRS) {
    let files = [];
    try {
      files = readdirSync(`${root}/${dir}`, { recursive: true }).map(String).filter((f) => f.endsWith('.mdx'));
    } catch {
      continue; // collection folder not created yet
    }
    for (const file of files) {
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(`${root}/${dir}/${file}`, 'utf8'))?.[1] ?? '';
      const field = (k) => new RegExp(`^${k}:\\s*["']?([^"'\\r\\n#]+?)["']?\\s*$`, 'm').exec(fm)?.[1];
      const d = new Date(field('updated') ?? field('date') ?? '');
      if (!Number.isNaN(d.getTime())) map.set(postUrl(dir, file.replace(/\.mdx$/, '').split(sep).join('/')), d);
    }
  }
  return map;
}
