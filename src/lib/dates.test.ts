import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, isoDate } from './dates.ts';

// Run under TZ=Pacific/Kiritimati (UTC+14) and TZ=America/Anchorage (UTC-9): the day must not shift.
const d = new Date('2026-03-04T00:00:00Z');

test('isoDate is UTC', () => assert.equal(isoDate(d), '2026-03-04'));
test('formatDate is UTC', () => assert.equal(formatDate(d), 'March 4, 2026'));
test('late-evening UTC stays on the same day', () => assert.equal(isoDate(new Date('2026-03-04T23:59:59Z')), '2026-03-04'));
