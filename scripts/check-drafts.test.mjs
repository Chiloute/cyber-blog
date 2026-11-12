import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const run = (html) => {
  const dir = mkdtempSync(join(tmpdir(), 'check-drafts-'));
  writeFileSync(join(dir, 'index.html'), html);
  return spawnSync(process.execPath, ['scripts/check-drafts.mjs', dir], { encoding: 'utf8' }).status;
};

test('exits 1 when a canary leaks', () => assert.equal(run('<p>DRAFT-CANARY-91c2</p>'), 1));
test('exits 0 on a clean dist', () => assert.equal(run('<p>hello</p>'), 0));
