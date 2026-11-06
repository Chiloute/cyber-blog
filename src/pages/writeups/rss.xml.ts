import type { APIContext } from 'astro';
import { getPublished } from '../../lib/publishable.ts';
import { feed, writeupItem } from '../../lib/feeds.ts';

export async function GET({ site }: APIContext) {
  return feed(site!, 'Writeups', (await getPublished('writeups')).map(writeupItem(site!)));
}
