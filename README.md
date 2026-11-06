# chiloute.fr

Static blog for CTF writeups, security notes and small projects. Author: chiloute. The site is built with Astro in static mode (`output: 'static'`): no backend, no database, no accounts.

## Overview

| Area | Choice |
|---|---|
| Framework | Astro `^7.4.7` (static output) |
| Content | MDX via `@astrojs/mdx` `^8.1.3`, content collections with Zod |
| Styling | Tailwind CSS `^4.3.4` (`@tailwindcss/vite`) and `@tailwindcss/typography` |
| Code highlighting | Shiki dual themes (`github-light-default` / `github-dark-default`), styles moved to classes |
| Search | Pagefind `^1.6.0`, run after the Astro build |
| Feeds, sitemap | `@astrojs/rss`, `@astrojs/sitemap` |
| Social images | `satori` + `@resvg/resvg-js` (`src/pages/og/[...slug].png.ts`) |
| Tests | Node test runner (`src/**/*.test.ts`), Playwright + axe-core (`tests/`) |
| Language | TypeScript `^6.0.3` |

Why Astro 7 and not 6: Astro 7 is the current stable release, and the installed version is `7.4.7` (see `docs/api-verification.md`).

Markdown processor note: Astro 7 uses Satteri by default, which does not run rehype plugins. The site needs `rehype-external-links` (`rel="noopener noreferrer"` on external links), so `astro.config.mjs` sets `markdown.processor: unified(...)` from `@astrojs/markdown-remark`. MDX inherits this setting. Details and evidence: `docs/api-verification.md`.

### Build pipeline

```mermaid
flowchart LR
  C[src/content] --> G[getPublished]
  G --> P[Pages, RSS, sitemap, OG images]
  P --> D[dist]
  D --> F[pagefind --site dist]
  F --> E[check:embargo]
  E --> H[Deploy]
```

`getPublished` (`src/lib/publishable.ts`) is the single gate for drafts and embargoed entries. `npm run build` covers content to Pagefind; `npm run check:embargo` is a separate step (run in CI after the build).

## Requirements

- Node.js 24 (`.nvmrc` contains `24`); `package.json` `engines.node` is `>=22.23.4`.
- npm (a `package-lock.json` is committed).

## Install and develop

```sh
npm ci
npm run dev
```

The dev server runs at `http://localhost:4321`.

### Nix / direnv (optional)

`flake.nix` provides a dev shell with Node 24 (no need for `nvm`), and `.envrc` loads it through direnv:

```sh
direnv allow   # once; or `nix develop` without direnv
```

Entering the shell installs the git hooks automatically (`.pre-commit-config.yaml` is generated and git-ignored). Pre-commit runs `eslint`, the unit tests, JSON and merge-conflict checks, the `ripsecrets` secret scanner (this repo is security-focused), and `actionlint` + `zizmor` on changes under `.github/`. Pre-push runs `astro check`. On Linux the shell also sets `PW_CHROMIUM_PATH` to the nixpkgs Chromium, so `npm run test:a11y` works on NixOS without a downloaded browser; on macOS Playwright uses its own browser. `nix flake check` runs only the cheap hooks, since the npm hooks need `node_modules`.

`shiki.css` (syntax highlighting colours) is generated at build time into `dist/shiki.css` (`src/integrations/shiki-css.mjs`). In dev, a middleware serves `/shiki.css` live, but rules accumulate as pages are rendered: reload a page after its first render to get code colours. Search (Pagefind) only works after `npm run build`, because the index is built from `dist`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | `astro dev`, development server |
| `npm run build` | `astro build && pagefind --site dist`: static site into `dist/`, then the search index |
| `npm run preview` | `astro preview`, serves `dist/` |
| `npm run check` | `astro check`, type and Astro diagnostics |
| `npm run lint` | `eslint .` |
| `npm test` | `node --test 'src/**/*.test.ts'`, unit tests |
| `npm run build:test` | Test-only build into `dist-test/` with drafts included (`BLOG_TEST_DRAFTS=1`, embargo still applied). Never deploy it |
| `npm run test:a11y` | `playwright test`: axe-core on sample pages in both themes, plus behaviour tests. Needs a prior `npm run build:test` (the Playwright web server runs `astro preview --outDir dist-test`) |
| `npm run check:embargo` | `node scripts/check-embargo.mjs`: fails if a draft or embargoed entry leaks into `dist/` |
| `npm run check:contrast` | `node scripts/check-contrast.mjs`: WCAG contrast of the tokens in `src/styles/global.css` (`--markdown` prints the table used in `docs/contrast.md`) |

One-off script, not in `package.json`: `node scripts/generate-icons.mjs` regenerates the icons in `public/` (output is committed).

Playwright needs a browser: `npx playwright install chromium`. Set `PW_CHROMIUM_PATH` to use a system Chromium instead.

## Project structure

```
src/
  config/        site.ts, projects.ts, hosting.ts
  content/       writeups/, notes/, projects/ (MDX)
  content.config.ts   collection schemas
  components/    Astro components; mdx/ holds Callout, Flag, Terminal, Spoiler
  layouts/       BaseLayout, PostLayout, LegalLayout
  pages/         routes, RSS, OG images, robots.txt, .well-known/security.txt
  lib/           publishable, github, jsonld, dates, warn-config, ...
  integrations/  shiki-css.mjs
  scripts/       client scripts (theme, filters, search, copy, flag, ...)
  data/          projects.fallback.json
scripts/         check-embargo, check-contrast, generate-icons
tests/           Playwright specs
docs/            security, contrast, api-verification, manual a11y checklist
public/          static files, including _headers and _redirects
.github/         CI workflows, shared setup action, Dependabot
```

## Configuration

### Contact email

Set `CONTACT_EMAIL` in `src/config/site.ts` (it is `TODO@example.invalid` until then). While it is the placeholder, `npm run build` prints a warning (`src/lib/warn-config.ts`). It is used in:

- `ContactEmail` component (obfuscated, assembled client-side by `src/scripts/email.ts`), shown on the legal notice, privacy, accessibility and about pages and in the footer;
- `/.well-known/security.txt` (`src/pages/.well-known/security.txt.ts`).

The JSON-LD (`src/lib/jsonld.ts`) does not currently include the email.

### Domain and other constants

`SITE_URL`, `AUTHOR`, `SITE_TITLE`, `SITE_DESCRIPTION` in `src/config/site.ts`. `SITE_URL` feeds Astro's `site`, the sitemap, feeds and canonical URLs. Also in `site.ts`, each marked `TODO`:

- `socialLinks`: confirm the GitHub URL.
- `ctfProfiles`: set `url` and `enabled: true` per platform (Root-Me, HackTheBox, TryHackMe, CTFtime).
- `certifications`: replace the placeholder entry and set `enabled: true`.
- `cv`: set `path` (for example `/cv.pdf`) after adding the PDF to `public/`.

### Hosting identity

`src/config/hosting.ts` holds the host name, address, phone and website shown in the legal notice. All are `TODO` until a provider is chosen (`isHostPlaceholder`).

### Licences

`licenses` in `src/config/site.ts`: content CC BY-NC-SA 4.0, code MIT. The `LICENSE` file covers the code.

## Writing a writeup

Create `src/content/writeups/<slug>.mdx`. The file name is the URL slug (`/writeups/<slug>/`). The collection only loads `*.mdx` files.

### Frontmatter (writeups)

From `src/content.config.ts`:

| Field | Type | Required | Default |
|---|---|---|---|
| `title` | string | yes | |
| `description` | string | yes | |
| `ctf` | string | yes | |
| `date` | date (`z.coerce.date()`, for example `2026-10-12`) | yes | |
| `updated` | date | no | |
| `category` | `web` \| `pwn` \| `crypto` \| `forensic` \| `reverse` \| `misc` \| `osint` | yes | |
| `difficulty` | `easy` \| `medium` \| `hard` \| `insane` | yes | |
| `points` | number | no | |
| `tags` | array of strings | no | `[]` |
| `team` | string | no | |
| `draft` | boolean | no | `false` |
| `publishAfter` | date | no | |
| `cover` | object `{ image, alt, decorative }` | no | |

`cover` sub-fields: `image` is an Astro image (relative path), `alt` is a required string, `decorative` is a boolean defaulting to `false`. An empty `alt` is only valid with `decorative: true`; otherwise the build fails. The schema accepts `cover`, but no page renders it at the moment (only the schema references it).

### Draft and embargo

- `draft: true` excludes the entry from every listing, feed, sitemap, OG image and JSON-LD of `npm run build`. Drafts stay visible in `npm run dev` (and in the test-only `npm run build:test`), so you can preview them locally. Project MDX files (`src/content/projects/`) accept `draft` too.
- `publishAfter: <date>` excludes the entry until that date. It is evaluated at build time (`isPublishable`: published when `draft` is not `true` and `publishAfter` is unset or `<= now`). The site does not change by itself: the Publish workflow runs a daily scheduled build (`cron: '17 5 * * *'` in `.github/workflows/publish.yml`), and the first build after the date publishes the entry. Until a deploy job is enabled, that build does not reach a host (see Deployment).
- `npm run check:embargo` fails the build if a blocked entry (slug or title) appears in `dist/`.

### Body

- Start headings at `h2` (`##`); the page title is the `h1`.
- Images and covers need alt text; use `decorative: true` only for purely decorative covers.
- Import the components at the top of the file, after the frontmatter:

```mdx
import { Callout, Flag, Terminal, Spoiler } from '../../components/mdx';
```

Components (`src/components/mdx/`):

```mdx
<Callout type="warning" title="Scope">Text, with [links](https://example.org).</Callout>
```

`type`: `info` (default), `warning` or `tip`. `title` is optional.

```mdx
<Terminal
  title="Initial recon"
  prompt="$"
  commands={[
    { cmd: "curl -sI http://challenge.example.test/", output: "HTTP/1.1 200 OK" },
    { cmd: "id" },
  ]}
/>
```

`commands` is required; `output`, `title` and `prompt` (default `$`) are optional. The copy button copies commands only.

```mdx
<Spoiler title="Hint">Hidden until opened.</Spoiler>

<Flag value="EXAMPLE{flag_here}" label="Flag" />
```

`Spoiler` `title` defaults to `Spoiler`. `Flag` takes a required `value` and an optional `label` (default `Flag`). Without JavaScript the flag is a native `<details>`.

Fenced code blocks are highlighted by Shiki. See `src/content/writeups/example-web-ssti.mdx` for a full example, and `draft-example.mdx` / `embargoed-example.mdx` for the two gates.

## Adding a note

Create `src/content/notes/<slug>.mdx`. Frontmatter from the schema:

| Field | Type | Required | Default |
|---|---|---|---|
| `title` | string | yes | |
| `description` | string | yes | |
| `date` | date | yes | |
| `updated` | date | no | |
| `tags` | array of strings | no | `[]` |
| `draft` | boolean | no | `false` |
| `publishAfter` | date | no | |

Same body rules as writeups. Example: `src/content/notes/linux-privesc-cheatsheet.mdx`.

## Adding a project

1. Add `owner/name` to `featuredRepos` in `src/config/projects.ts`.
2. Add a fallback entry under the same key in `src/data/projects.fallback.json` (`description`, `homepage`, `stars`, `languages`, `updatedAt`, `license`). It is used when the GitHub API is unavailable; fetching never fails the build (`src/lib/github.ts`).
3. Optional: enrich the project page with `src/content/projects/<repo-name>.mdx` (file name = repository name). Frontmatter:

| Field | Type | Required |
|---|---|---|
| `repo` | string matching `owner/name` | yes |
| `draft` | boolean, default `false` (hidden from `npm run build`, shown in `npm run dev`) | no |
| `title` | string | no |
| `demo` | URL | no |
| `cover` | `{ image, alt, decorative }`, same rules as writeups | no |

Example: `src/content/projects/example-repo-1.mdx`.

### GitHub token

Without a token the build uses unauthenticated API calls (rate limited) and falls back to the JSON data. For reliable data, create a fine-grained personal access token, read-only, public repositories only. Store it as the repository secret `GH_PROJECTS_TOKEN` (CI maps it to `GITHUB_TOKEN`) and as a secret on the host. Locally, put `GITHUB_TOKEN=...` in `.env` (git-ignored; `.env.example` documents the variable). Never commit it. The variable is declared server-side and secret in `astro.config.mjs`, so it cannot reach client code.

## Security

Summary (full rationale and host equivalents in `docs/security.md`):

- CSP in two parts: a `<meta>` policy generated by Astro (`security.csp`, hashed inline scripts and styles, `'wasm-unsafe-eval'` for Pagefind) and a header policy in `public/_headers` (`frame-ancestors`, `connect-src`, `object-src`, and so on).
- Other headers in `public/_headers`: HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, COOP, CORP, X-Frame-Options. `public/_redirects` redirects `/sitemap.xml` to `/sitemap-index.xml`.
- No inline styles and no `unsafe-inline`: Shiki output is converted to classes.
- No source maps (`vite.build.sourcemap: false`).
- Embargo check: `npm run check:embargo`.
- The headers have not been tested on a host yet; `docs/security.md` has the post-deploy checklist.

## Accessibility

The target is WCAG 2.2 AA in both themes (see `/accessibility/`, `src/pages/accessibility.astro`). The status is partial conformance pending a full audit.

- Automated: `npm run test:a11y` (axe-core with Playwright, Chromium only, light and dark) and `npm run check:contrast` (see `docs/contrast.md`).
- Manual: `docs/manual-a11y-checklist.md` (keyboard, NVDA + Firefox, VoiceOver + Safari, zoom and reflow, text spacing, reduced motion, forced colours).

## Deployment

The hosting provider is not chosen yet.

- `public/_headers` and `public/_redirects` are read natively by Cloudflare Pages and Netlify. Vercel and Nginx equivalents are in `docs/security.md`. Netlify's handling of overlapping `_headers` rules is untested.
- CI workflows (`.github/workflows/`):
  - `ci.yml` (pull requests, pushes to `main`): `static` (lint, `astro check`, unit tests, `check:contrast`) must pass before `build` and `e2e` start. `build` (`build.yml`) runs the production build and `check:embargo`, then keeps `dist/` as the `site` artifact (30 days). `e2e` runs the Playwright a11y tests on the draft-inclusive test build. `ci-ok` fails if any of them failed or was skipped. On `main`, `deploy` ships the `site` artifact.
  - `publish.yml` (daily cron, manual): `build.yml` then `deploy.yml`, so embargoed entries go live without a new commit.
  - `deploy.yml` (reusable): downloads the `site` artifact and ships it as is, never rebuilds. `environment: production`, one deploy at a time. Rollback: re-run the `deploy` job of an older run (its artifact is kept 30 days).
  - `security.yml`: `npm audit --audit-level=high` on lockfile changes and weekly.
  - `workflows-lint.yml`: actionlint and zizmor on changes under `.github/`.
- The deploy job is off and only contains an outline. To enable it: add the provider steps and the `production` environment secrets, then create the repository variable `DEPLOY_ENABLED=true`.
- GitHub settings to enable manually: Dependabot alerts and Dependabot security updates; branch protection (or a ruleset) on `main` requiring the `ci-ok` status check, so a pull request cannot be merged unless `astro check`, the build and `check:embargo` passed.

## Yearly maintenance

- Renew security.txt: update `securityTxt.expires` in `src/config/site.ts`. The build warns when fewer than 30 days remain and fails once it has expired. Keep the value under one year ahead. Also replace `public/pgp-key.txt` (currently a `TODO` placeholder) with the real ASCII-armored public key, and update it when the key changes.
- Review and merge Dependabot pull requests (`.github/dependabot.yml`: npm and GitHub Actions, weekly, grouped, versions younger than 7 days skipped).
- Re-run the manual accessibility checklist and update the accessibility statement date.

## Commit convention

Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`. Dependabot uses `chore(deps)`.

## License

Code: MIT (`LICENSE`). Content (writeups, notes, text): CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/).
