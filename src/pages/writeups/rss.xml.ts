import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublished } from '../../lib/publishable.ts';
import { SITE_DESCRIPTION } from '../../config/site.ts';

// Summaries only: MDX components (Flag, Spoiler) would be lost or leak in feed readers.
export async function GET(context: APIContext) {
  const entries = await getPublished('writeups');
  return rss({
    title: 'chiloute — Writeups',
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: entries.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.date,
      link: new URL(`/writeups/${e.id}/`, context.site).href,
      categories: [e.data.category, ...e.data.tags],
    })),
    customData: '<language>en-us</language>',
  });
}
