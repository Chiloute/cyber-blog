import data from '../data/projects.json' with { type: 'json' };
import { z } from 'astro/zod';
import { isPublishable, showDrafts } from './publishable.ts';

export interface Project {
  owner: string;
  name: string;
  slug: string;
  description: string;
  url: string;
  homepage: string | null;
  languages: string[];
  license: string | null;
}

// Hand-edited file: every field but repo may be missing.
const schema = z.object({
  projects: z.array(z.object({
    repo: z.string().regex(/^[^/]+\/[^/]+$/),
    description: z.string().optional(),
    homepage: z.string().url().nullable().optional(),
    languages: z.array(z.string()).optional(),
    license: z.string().nullable().optional(),
  }).strict()),
});

/** Validates the raw JSON; throws on schema errors and duplicate slugs. */
export function parseProjects(raw: unknown): Project[] {
  const list = schema.parse(raw).projects.map(({ repo, ...p }) => {
    const [owner = '', name = ''] = repo.split('/');
    return {
      owner, name, slug: name, url: `https://github.com/${repo}`,
      description: p.description ?? '', homepage: p.homepage ?? null,
      languages: p.languages ?? [], license: p.license ?? null,
    };
  });
  const seen = new Set<string>();
  for (const { slug } of list) {
    if (seen.has(slug)) throw new Error(`[projects] duplicate slug "${slug}" in src/data/projects.json`);
    seen.add(slug);
  }
  return list;
}

/** Featured projects from src/data/projects.json, in file order. */
export const projects: Project[] = parseProjects(data);

/** Slugs of projects that have a publishable MDX page under /projects/. */
export async function detailedProjects(): Promise<Set<string>> {
  const { getCollection } = await import('astro:content');
  return new Set((await getCollection('projects', (e) => isPublishable(e.data, showDrafts()))).map((e) => e.id));
}
