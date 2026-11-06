import data from '../data/projects.json' with { type: 'json' };

export interface Project {
  owner: string;
  name: string;
  slug: string;
  description: string;
  url: string;
  homepage: string | null;
  stars: number;
  languages: string[];
  updatedAt: string | null;
  license: string | null;
}

// Hand-edited file: every field but repo may be missing.
type Entry = Partial<Omit<Project, 'owner' | 'name' | 'slug' | 'url'>> & { repo: string };

/** Featured projects from src/data/projects.json, in file order. */
export const projects: Project[] = (data.projects as Entry[]).map(({ repo, ...p }) => {
  const [owner = '', name = ''] = repo.split('/');
  return {
    owner, name, slug: name, url: `https://github.com/${repo}`,
    description: p.description ?? '', homepage: p.homepage ?? null, stars: p.stars ?? 0,
    languages: p.languages ?? [], updatedAt: p.updatedAt ?? null, license: p.license ?? null,
  };
});
