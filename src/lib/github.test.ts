import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchProjects } from './github.ts';

const R = 'chiloute/example-repo-1';
const repoJson = { name: 'example-repo-1', description: 'd', html_url: 'https://github.com/chiloute/example-repo-1', homepage: 'https://demo.example', stargazers_count: 12, pushed_at: '2026-02-01T00:00:00Z', license: { spdx_id: 'MIT' } };
const langJson = { A: 1, B: 50, C: 20, D: 5, E: 3 };
const json = (b: unknown, status = 200, h: Record<string, string> = {}) => new Response(JSON.stringify(b), { status, headers: h });
const ok = (calls: { url: string; headers: Record<string, string> }[] = []) =>
  (async (u: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(u), headers: init?.headers as Record<string, string> });
    return String(u).endsWith('/languages') ? json(langJson) : json(repoJson);
  }) as typeof fetch;
const run = (f: typeof fetch, token?: string) => fetchProjects([R], { fetchImpl: f, token, timeoutMs: 50 });

test.beforeEach(() => { console.warn = () => {}; });

test('200 OK normalizes, languages sorted by bytes max 4', async () => {
  const [p] = await run(ok());
  assert.equal(p?.source, 'api');
  assert.equal(p?.stars, 12);
  assert.deepEqual(p?.languages, ['B', 'C', 'D', 'E']);
  assert.equal(p?.license, 'MIT');
  assert.equal(p?.homepage, 'https://demo.example');
});

test('token sent only when provided', async () => {
  const a: { url: string; headers: Record<string, string> }[] = [];
  await run(ok(a));
  assert.ok(a.length === 2 && a.every((c) => !('Authorization' in c.headers)));
  const b: typeof a = [];
  await run(ok(b), 'tok');
  assert.ok(b.every((c) => c.headers.Authorization === 'Bearer tok' && c.headers['User-Agent'] === 'chiloute-site-build'));
});

for (const [name, f] of [
  ['403 rate limited', async () => json({}, 403, { 'x-ratelimit-remaining': '0' })],
  ['500', async () => json({}, 500)],
  ['network error', async () => { throw new TypeError('fetch failed'); }],
  ['invalid JSON', async () => new Response('<html>', { status: 200 })],
  ['wrong shape', async () => json({ foo: 1 })],
  ['timeout', async (_u: unknown, init?: RequestInit) => new Promise((_, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))],
] as const) {
  test(`${name} -> fallback`, async () => {
    const [p] = await run(f as unknown as typeof fetch);
    assert.equal(p?.source, 'fallback');
    assert.equal(p?.slug, 'example-repo-1');
    assert.equal(p?.license, 'MIT');
  });
}

test('unknown repo without fallback -> minimal entry', async () => {
  const [p] = await fetchProjects(['x/y'], { fetchImpl: (async () => json({}, 500)) as typeof fetch });
  assert.equal(p?.source, 'fallback');
  assert.equal(p?.url, 'https://github.com/x/y');
});
