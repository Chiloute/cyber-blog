import { existsSync, readFileSync } from 'node:fs';
import { isEmailPlaceholder, securityTxt } from '../config/site.ts';
import { isHostPlaceholder } from '../config/hosting.ts';

const DAY_MS = 86_400_000;

const PGP_KEY = 'public/pgp-key.txt';
const pgpKeyMissing = (): boolean => !existsSync(PGP_KEY) || !readFileSync(PGP_KEY, 'utf8').includes('BEGIN PGP PUBLIC KEY BLOCK');

/** Warns on placeholder/expiring config; throws when security.txt has expired. */
export function checkConfig(warn: (msg: string) => void, now: Date = new Date()): void {
  if (process.env.BLOG_TEST_DRAFTS === '1') warn('BLOG_TEST_DRAFTS=1: drafts included. Test build only, NEVER deploy this output.');
  const placeholders = [
    isEmailPlaceholder() && 'CONTACT_EMAIL (src/config/site.ts)',
    isHostPlaceholder() && 'host (src/config/hosting.ts)',
    pgpKeyMissing() && 'PGP key (public/pgp-key.txt)',
  ].filter((p): p is string => Boolean(p));
  for (const p of placeholders) warn(`${p} is still a placeholder.`);
  const daysLeft = (new Date(securityTxt.expires).getTime() - now.getTime()) / DAY_MS;
  if (Number.isNaN(daysLeft)) throw new Error('securityTxt.expires is not a valid date.');
  if (daysLeft < 0) throw new Error(`security.txt expired on ${securityTxt.expires}; renew it in src/config/site.ts.`);
  if (daysLeft < 30) warn(`security.txt expires in ${Math.floor(daysLeft)} days.`);
}
