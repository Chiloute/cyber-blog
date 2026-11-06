import rss, { type RSSFeedItem } from '@astrojs/rss';
import type { CollectionEntry } from 'astro:content';
import { SITE_DESCRIPTION } from '../config/site.ts';

// Summaries only: MDX components (Flag, Spoiler) would be lost or leak in feed readers.
export const writeupItem = (site: URL) => (e: CollectionEntry<'writeups'>): RSSFeedItem => ({
  title: e.data.title,
  description: e.data.description,
  pubDate: e.data.date,
  link: new URL(`/writeups/${e.id}/`, site).href,
  categories: [e.data.category, ...e.data.tags],
});

export const noteItem = (site: URL) => (e: CollectionEntry<'notes'>): RSSFeedItem => ({
  title: e.data.title,
  description: e.data.description,
  pubDate: e.data.date,
  link: new URL(`/notes/${e.id}/`, site).href,
  categories: e.data.tags,
});

export const feed = (site: URL, name: string, items: RSSFeedItem[]) =>
  rss({ title: `chiloute — ${name}`, description: SITE_DESCRIPTION, site, items, customData: '<language>en-us</language>' });
