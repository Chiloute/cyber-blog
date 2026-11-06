// Single source of truth for which content entries are publishable.
// This helper MUST be used by every page, feed, sitemap source, OG image and JSON-LD that lists content.

type PublishGate = { draft?: boolean | undefined };

export function isPublishable(data: PublishGate, includeDrafts = false): boolean {
  return includeDrafts || data.draft !== true;
}

/** Drafts are shown by `astro dev`, and by the test-only build (`npm run build:test` -> dist-test/,
 *  never deployed; check:drafts guards the production dist/). Never set BLOG_TEST_DRAFTS elsewhere. */
export const showDrafts = (): boolean => import.meta.env.DEV === true || process.env.BLOG_TEST_DRAFTS === '1';

// astro:content is loaded lazily so the pure function above stays importable under plain Node (tests).
export async function getPublished<C extends 'writeups' | 'notes'>(collection: C) {
  const { getCollection } = await import('astro:content');
  const entries = await getCollection(collection, (entry) => isPublishable(entry.data, showDrafts()));
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
