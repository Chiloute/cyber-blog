import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CollectionEntry } from 'astro:content';
import { writeupItem, noteItem } from './feeds.ts';

const site = new URL('https://example.org');
const date = new Date('2026-03-04T00:00:00Z');

test('writeup item', () => {
  const e = { id: 'a-b', data: { title: 'T', description: 'D', date, category: 'web', tags: ['x'] } } as unknown as CollectionEntry<'writeups'>;
  assert.deepEqual(writeupItem(site)(e), {
    title: 'T', description: 'D', pubDate: date, link: 'https://example.org/writeups/a-b/', categories: ['web', 'x'],
  });
});

test('note item', () => {
  const e = { id: 'n', data: { title: 'N', description: 'D', date, tags: [] } } as unknown as CollectionEntry<'notes'>;
  const item = noteItem(site)(e);
  assert.equal(item.link, 'https://example.org/notes/n/');
  assert.equal(item.title, 'N');
  assert.equal(item.pubDate, date);
});
