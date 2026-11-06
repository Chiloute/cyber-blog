import { featuredRepos } from '../config/projects.ts';
import fallbackData from '../data/projects.fallback.json' with { type: 'json' };

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
  source: 'api' | 'fallback';
}

interface Options {
  token?: string | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

type FallbackEntry = Partial<Omit<Project, 'source'>>;
const fallbacks = (fallbackData as { projects: Record<string, FallbackEntry> }).projects;

const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

async function getJson(url: string, o: Required<Omit<Options, 'token'>> & { token?: string | undefined }): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'chiloute-site-build',
    };
    if (o.token) headers.Authorization = `Bearer ${o.token}`;
    const res = await o.fetchImpl(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}${res.headers.get('x-ratelimit-remaining') === '0' ? ' (rate limited)' : ''}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function fromFallback(full: string): Project {
  const [owner = '', name = ''] = full.split('/');
  const f = fallbacks[full] ?? {};
  return {
    owner,
    name,
    slug: name,
    description: f.description ?? '',
    url: `https://github.com/${full}`,
    homepage: f.homepage ?? null,
    stars: f.stars ?? 0,
    languages: f.languages ?? [],
    updatedAt: f.updatedAt ?? null,
    license: f.license ?? null,
    source: 'fallback',
  };
}

async function fetchOne(full: string, o: Parameters<typeof getJson>[1]): Promise<Project> {
  try {
    const base = `https://api.github.com/repos/${full}`;
    const [repo, langs] = await Promise.all([getJson(base, o), getJson(`${base}/languages`, o)]);
    if (typeof repo !== 'object' || repo === null || typeof langs !== 'object' || langs === null) throw new Error('unexpected JSON shape');
    const r = repo as Record<string, unknown>;
    if (typeof r.name !== 'string' || typeof r.stargazers_count !== 'number') throw new Error('unexpected JSON shape');
    const lic = r.license as { spdx_id?: unknown } | null | undefined;
    const spdx = str(lic?.spdx_id);
    const [owner = ''] = full.split('/');
    return {
      owner,
      name: r.name,
      slug: r.name,
      description: str(r.description) ?? '',
      url: str(r.html_url) ?? `https://github.com/${full}`,
      homepage: str(r.homepage),
      stars: r.stargazers_count,
      languages: Object.entries(langs as Record<string, unknown>)
        .filter((e): e is [string, number] => typeof e[1] === 'number')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([l]) => l),
      updatedAt: str(r.pushed_at),
      license: spdx && spdx !== 'NOASSERTION' ? spdx : null,
      source: 'api',
    };
  } catch (e) {
    console.warn(`[github] ${full}: using fallback (${e instanceof Error ? e.message : 'unknown error'})`);
    return fromFallback(full);
  }
}

/** Never rejects: any failure per repo yields its fallback entry. */
export function fetchProjects(repos: string[], opts: Options = {}): Promise<Project[]> {
  const o = { token: opts.token, fetchImpl: opts.fetchImpl ?? fetch, timeoutMs: opts.timeoutMs ?? 8000 };
  return Promise.all(repos.map((r) => fetchOne(r, o)));
}

let memo: Promise<Project[]> | undefined;

export function getProjects(): Promise<Project[]> {
  memo ??= (async () => {
    let token: string | undefined;
    try {
      const { getSecret } = await import('astro:env/server');
      token = getSecret('GITHUB_TOKEN');
    } catch {
      token = undefined;
    }
    return fetchProjects(featuredRepos, { token });
  })();
  return memo;
}
