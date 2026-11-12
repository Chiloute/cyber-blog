// Fails (exit 1) if any draft content leaks into dist/.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, sep } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const CANARIES = ['DRAFT-CANARY-91c2'];

if (!existsSync(DIST)) {
  console.error(`check-drafts: ${DIST}/ is missing, run \`npm run build\` first`);
  process.exit(1);
}

// Same rule as src/lib/publishable.ts: draft === true.
// shortcut: regex frontmatter parse (top-level scalar lines only), upgrade if frontmatter gets multi-line values.
function field(fm, key) {
  const m = new RegExp(`^${key}:\\s*(.*?)\\s*$`, 'm').exec(fm);
  return m ? m[1].replace(/^(["'])(.*)\1$/, '$2') : undefined;
}

const needles = new Set(CANARIES);
const blocked = [];
const leaks = [];
for (const dir of ['writeups', 'notes', 'projects']) {
  const base = join('src/content', dir);
  if (!existsSync(base)) continue;
  // Same discovery as the loaders: '**/*.mdx', slug = path relative to the collection dir, no extension.
  for (const f of readdirSync(base, { recursive: true }).map(String).filter((n) => n.endsWith('.mdx'))) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(base, f), 'utf8'))?.[1] ?? '';
    if (field(fm, 'draft') === 'true') {
      const slug = f.replace(/\.mdx$/, '').split(sep).join('/');
      const title = field(fm, 'title');
      blocked.push(`${dir}/${slug}`);
      // Page URL, not the bare slug: short slugs would give false positives (a project slug is also its repo name).
      needles.add(`/${dir}/${slug}/`);
      if (title) needles.add(title);
      for (const p of [`${dir}/${slug}`, `og/${dir}/${slug}.png`]) {
        if (existsSync(join(DIST, p))) leaks.push(`${join(DIST, p)}: exists`);
      }
    }
  }
}

function* walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let files = 0;
for (const p of walk(DIST)) {
  files++;
  let buf = readFileSync(p);
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    try { buf = gunzipSync(buf); } catch { /* not really gzip: scan raw bytes */ }
  }
  const text = buf.toString('latin1'); // byte-preserving; utf8 needles are re-encoded below
  const utf8 = buf.toString('utf8');
  for (const n of needles) {
    if (utf8.includes(n) || text.includes(Buffer.from(n, 'utf8').toString('latin1'))) leaks.push(`${p}: "${n}"`);
  }
}

console.log(`check-drafts: ${blocked.length} draft entries (${blocked.join(', ') || 'none'}), ${files} files scanned`);
if (leaks.length) {
  console.error(`LEAKS FOUND (${leaks.length}):\n${leaks.join('\n')}`);
  process.exit(1);
}
console.log('check-drafts: OK, no leaks');
