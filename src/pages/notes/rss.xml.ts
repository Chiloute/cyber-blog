import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublished } from '../../lib/publishable.ts';
import { SITE_DESCRIPTION } from '../../config/site.ts';

// Summaries only: MDX components (Flag, Spoiler) would be lost or leak in feed readers.
export async function GET(context: APIContext) {
  const entries = await getPublished('notes');
  return rss({
    title: 'chiloute — Notes',
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: entries.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.date,
      link: new URL(`/notes/${e.id}/`, context.site).href,
      categories: e.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
