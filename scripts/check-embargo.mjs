// Fails (exit 1) if any non-publishable content (draft / future publishAfter) leaks into dist/.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, basename } from 'node:path';

const DIST = 'dist';
const CANARIES = ['EMBARGO-CANARY-7f3a', 'DRAFT-CANARY-91c2'];

if (!existsSync(DIST)) {
  console.error('check-embargo: dist/ is missing, run `npm run build` first');
  process.exit(1);
}

// Same rule as src/lib/publishable.ts: draft === true or publishAfter > now.
// shortcut: regex frontmatter parse (top-level scalar lines only), upgrade if frontmatter gets multi-line values.
function field(fm, key) {
  const m = new RegExp(`^${key}:\\s*(.*?)\\s*$`, 'm').exec(fm);
  return m ? m[1].replace(/^(["'])(.*)\1$/, '$2') : undefined;
}

const now = new Date();
const needles = new Set(CANARIES);
const blocked = [];
for (const dir of ['writeups', 'notes', 'projects']) {
  const base = join('src/content', dir);
  if (!existsSync(base)) continue;
  for (const f of readdirSync(base).filter((n) => n.endsWith('.mdx'))) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(base, f), 'utf8'))?.[1] ?? '';
    const pa = field(fm, 'publishAfter');
    if (field(fm, 'draft') === 'true' || (pa && new Date(pa) > now)) {
      const slug = basename(f, '.mdx');
      const title = field(fm, 'title');
      blocked.push(`${dir}/${slug}`);
      // A project slug is also its repo name, legitimately shown on the GitHub card: match its page URL instead.
      needles.add(dir === 'projects' ? `/projects/${slug}/` : slug);
      if (title) needles.add(title);
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

const leaks = [];
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

console.log(`check-embargo: ${blocked.length} non-publishable entries (${blocked.join(', ') || 'none'}), ${files} files scanned`);
if (leaks.length) {
  console.error(`LEAKS FOUND (${leaks.length}):\n${leaks.join('\n')}`);
  process.exit(1);
}
console.log('check-embargo: OK, no leaks');
