import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublishable } from './publishable.ts';

test('draft true is not publishable', () => {
  assert.equal(isPublishable({ draft: true }), false);
});

test('draft false is publishable', () => {
  assert.equal(isPublishable({ draft: false }), true);
});

test('no fields is publishable', () => {
  assert.equal(isPublishable({}), true);
});

test('includeDrafts lifts the draft flag', () => {
  assert.equal(isPublishable({ draft: true }, true), true);
});
