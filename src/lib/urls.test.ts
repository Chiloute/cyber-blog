import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postUrl, ogPath, tagUrl } from './urls.ts';

test('postUrl', () => {
  assert.equal(postUrl('writeups', 'a/b'), '/writeups/a/b/');
  assert.equal(postUrl('notes', 'x'), '/notes/x/');
});
test('ogPath', () => assert.equal(ogPath('notes', 'x'), '/og/notes/x.png'));
test('tagUrl', () => assert.equal(tagUrl('sql-injection'), '/writeups/tags/sql-injection/'));
