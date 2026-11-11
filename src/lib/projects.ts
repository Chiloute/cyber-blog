import data from '../data/projects.json' with { type: 'json' };
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
type Entry = Partial<Omit<Project, 'owner' | 'name' | 'slug' | 'url'>> & { repo: string };

/** Featured projects from src/data/projects.json, in file order. */
export const projects: Project[] = (data.projects as Entry[]).map(({ repo, ...p }) => {
  const [owner = '', name = ''] = repo.split('/');
  return {
    owner, name, slug: name, url: `https://github.com/${repo}`,
    description: p.description ?? '', homepage: p.homepage ?? null,
    languages: p.languages ?? [], license: p.license ?? null,
  };
});

/** Slugs of projects that have a publishable MDX page under /projects/. */
export async function detailedProjects(): Promise<Set<string>> {
  const { getCollection } = await import('astro:content');
  return new Set((await getCollection('projects', (e) => isPublishable(e.data, showDrafts()))).map((e) => e.id));
}
