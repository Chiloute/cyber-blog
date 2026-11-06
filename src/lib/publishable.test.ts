import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublishable } from './publishable.ts';

const now = new Date('2026-11-06T12:00:00Z');
const past = new Date('2026-01-01T00:00:00Z');
const future = new Date('2027-01-01T00:00:00Z');

test('draft true is not publishable', () => {
  assert.equal(isPublishable({ draft: true }, now), false);
});

test('publishAfter in the future is not publishable', () => {
  assert.equal(isPublishable({ publishAfter: future }, now), false);
});

test('publishAfter in the past is publishable', () => {
  assert.equal(isPublishable({ publishAfter: past }, now), true);
});

test('publishAfter exactly now is publishable', () => {
  assert.equal(isPublishable({ publishAfter: now }, now), true);
});

test('no fields is publishable', () => {
  assert.equal(isPublishable({}, now), true);
});

test('draft false with publishAfter in the future is not publishable', () => {
  assert.equal(isPublishable({ draft: false, publishAfter: future }, now), false);
});
