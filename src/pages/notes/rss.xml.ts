import type { APIContext } from 'astro';
import { getPublished } from '../../lib/publishable.ts';
import { feed, noteItem } from '../../lib/feeds.ts';

export async function GET({ site }: APIContext) {
  return feed(site!, 'Notes', (await getPublished('notes')).map(noteItem(site!)));
}
