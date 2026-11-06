import type { APIContext } from 'astro';
import { getPublished } from '../lib/publishable.ts';
import { feed, noteItem, writeupItem } from '../lib/feeds.ts';

export async function GET({ site }: APIContext) {
  const items = [
    ...(await getPublished('writeups')).map(writeupItem(site!)),
    ...(await getPublished('notes')).map(noteItem(site!)),
  ].sort((a, b) => b.pubDate!.getTime() - a.pubDate!.getTime());
  return feed(site!, 'All', items);
}
