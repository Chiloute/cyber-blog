import { isEmailPlaceholder, securityTxt } from '../config/site.ts';

const DAY_MS = 86_400_000;

/** Warns on placeholder/expiring config; throws when security.txt has expired. */
export function checkConfig(warn: (msg: string) => void, now: Date = new Date()): void {
  if (process.env.BLOG_TEST_DRAFTS === '1') warn('BLOG_TEST_DRAFTS=1: drafts included. Test build only, NEVER deploy this output.');
  if (isEmailPlaceholder()) warn('CONTACT_EMAIL is still a placeholder (src/config/site.ts).');
  const daysLeft = (new Date(securityTxt.expires).getTime() - now.getTime()) / DAY_MS;
  if (Number.isNaN(daysLeft)) throw new Error('securityTxt.expires is not a valid date.');
  if (daysLeft < 0) throw new Error(`security.txt expired on ${securityTxt.expires}; renew it in src/config/site.ts.`);
  if (daysLeft < 30) warn(`security.txt expires in ${Math.floor(daysLeft)} days.`);
}
