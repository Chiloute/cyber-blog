// Pure JSON-LD builders (no astro imports) so they run under node --test.
import { AUTHOR, SITE_URL, socialLinks, ctfProfiles } from '../config/site.ts';

export type JsonLd = Record<string, unknown>;

/** Serialize for an inline <script>: escape "<" so a title containing "</script>" cannot break out. */
export const serializeJsonLd = (data: JsonLd | JsonLd[]): string =>
  JSON.stringify(data).replace(/</g, '\\u003c');

const abs = (path: string, base: string): string => new URL(path, base).href;

export function personJsonLd(base: string = SITE_URL): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${abs('/', base)}#person`,
    name: AUTHOR,
    url: abs('/', base),
    sameAs: [...socialLinks.map((s) => s.url), ...ctfProfiles.filter((p) => p.enabled).map((p) => p.url)],
  };
}

export interface BlogPostingInput {
  title: string;
  description: string;
  url: string;
  image: string;
  datePublished: string;
  dateModified?: string | undefined;
  tags?: string[] | undefined;
}

export function blogPostingJsonLd(p: BlogPostingInput, base: string = SITE_URL): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.datePublished,
    dateModified: p.dateModified ?? p.datePublished,
    author: { '@id': `${abs('/', base)}#person` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': p.url },
    image: p.image,
    ...(p.tags?.length ? { keywords: p.tags.join(', ') } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], base: string = SITE_URL): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path, base),
    })),
  };
}
