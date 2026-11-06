// Single source of truth for which content entries are publishable.
// This helper MUST be used by every page, feed, sitemap source, OG image and JSON-LD that lists content.

type PublishGate = { draft?: boolean | undefined; publishAfter?: Date | undefined };

export function isPublishable(data: PublishGate, now: Date = new Date()): boolean {
  return data.draft !== true && (data.publishAfter === undefined || data.publishAfter <= now);
}

// astro:content is loaded lazily so the pure function above stays importable under plain Node (tests).
export async function getPublished<C extends 'writeups' | 'notes'>(collection: C, now: Date = new Date()) {
  const { getCollection } = await import('astro:content');
  const entries = await getCollection(collection, (entry) => isPublishable(entry.data, now));
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
