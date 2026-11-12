import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProjects } from './projects.ts';

test('splits owner/name and applies defaults', () => {
  const [p] = parseProjects({ projects: [{ repo: 'me/tool' }] });
  assert.deepEqual(p, {
    owner: 'me', name: 'tool', slug: 'tool', url: 'https://github.com/me/tool',
    description: '', homepage: null, languages: [], license: null,
  });
});
test('rejects an unknown key', () => assert.throws(() => parseProjects({ projects: [{ repo: 'me/tool', stars: 3 }] })));
test('rejects a malformed repo', () => assert.throws(() => parseProjects({ projects: [{ repo: 'tool' }] })));
test('rejects a duplicate slug', () => assert.throws(() => parseProjects({ projects: [{ repo: 'a/x' }, { repo: 'b/x' }] }), /duplicate slug/));
