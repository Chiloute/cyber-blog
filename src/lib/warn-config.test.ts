import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConfig } from './warn-config.ts';
import { isEmailPlaceholder, securityTxt } from '../config/site.ts';

const expires = new Date(securityTxt.expires).getTime();
const DAY = 86_400_000;

test('expired security.txt fails the build', () => {
  assert.throws(() => checkConfig(() => {}, new Date(expires + DAY)), /expired/);
});

test('security.txt close to expiry only warns', () => {
  const msgs: string[] = [];
  checkConfig((m) => msgs.push(m), new Date(expires - 10 * DAY));
  assert.ok(msgs.some((m) => /expires in 10 days/.test(m)));
});

// Only meaningful while the repo still ships the TODO contact address.
test('placeholders only warn', { skip: !isEmailPlaceholder() && 'no placeholder left' }, () => {
  const msgs: string[] = [];
  checkConfig((m) => msgs.push(m), new Date(expires - 100 * DAY));
  assert.ok(msgs.some((m) => /CONTACT_EMAIL/.test(m)));
});
