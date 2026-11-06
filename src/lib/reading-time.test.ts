import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes } from './reading-time.ts';

const w = (n: number) => Array(n).fill('word').join(' ');

test('empty text is 1 minute', () => assert.equal(readingMinutes(''), 1));
test('440 words is 2 minutes', () => assert.equal(readingMinutes(w(440)), 2));
test('441 words rounds up to 3', () => assert.equal(readingMinutes(w(441)), 3));
test('fenced code counts at lower weight', () => {
  assert.equal(readingMinutes('```sh\n' + w(2200) + '\n```'), 3); // 660 weighted words
});
