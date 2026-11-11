# API verification (Astro 7.4.7)

Paths are relative to `node_modules/`. Verified by reading the installed `.d.ts`/`.js` files and by real builds.

| API | Evidence | Result |
|---|---|---|
| `security.csp` | `astro/dist/types/public/config.d.ts:781` (`csp?: boolean \| {...}`) | Exists. Hashes are generated automatically. Build output has `script-src 'self' 'wasm-unsafe-eval' 'sha256-...'; style-src 'self' 'sha256-...'`, no unsafe-inline/eval. |
| Add `'wasm-unsafe-eval'` | `config.d.ts:1031` (`scriptDirective`), `:1192` (`resources?: CspResourceEntry[]`); type at `astro/dist/core/csp/config.d.ts:33` | Use `scriptDirective.resources: ["'self'", "'wasm-unsafe-eval'"]`. Resources REPLACE defaults (doc at `config.d.ts:1119`), so `'self'` must be repeated. Quotes are part of the value. Verified in built HTML. `csp.directives` (`config.d.ts:845`) cannot be used: its allow-list (`core/csp/config.d.ts:61`) excludes `script-src`. |
| `astro:env` schema | `astro/dist/env/config.d.ts:5` (`envField.string`), `config.d.ts:2850` (`env.schema`), imported from `astro/config` (`astro/package.json:36`) | `envField.string({ context: 'server', access: 'secret', optional: true })`. Works. |
| Content layer glob loader | `astro/package.json:66` (`./loaders`), `astro/dist/content/loaders/glob.d.ts:39` | `import { glob } from 'astro/loaders'`. Works. |
| Zod import | `astro/package.json:72` (`./zod`), `astro/dist/zod.d.ts` (re-exports `zod/v4`) | `import { z } from 'astro/zod'`. This is Zod 4: use `z.url()`; `z.coerce.date()` works. |
| `image()` in schema | `astro/dist/content/config.d.ts:4` (`ImageFunction`), `:45` (`image` in the schema callback) | `schema: ({ image }) => ...`. `image()` returns a Zod object, so it is wrapped in `cover = { image, alt, decorative }` + `.refine` (empty alt only if `decorative`). |
| Shiki dual themes | `@astrojs/internal-helpers/dist/markdown.d.ts:13-18` (`themes`, `defaultColor?: ... \| false`); `config.d.ts:2348` (`markdown.shikiConfig`) | `themes: {light:'github-light', dark:'github-dark'}`, `defaultColor: false`. Output: `<pre class="astro-code astro-code-themes github-light github-dark" style="--shiki-light:...;--shiki-dark:...">`. CSS must switch `--shiki-*` variables. |
| Markdown engine / rehype | `config.d.ts:2573` (`markdown.processor`); `@astrojs/markdown-satteri/dist/processor.d.ts` (only `mdastPlugins`/`hastPlugins`, no rehype); `@astrojs/markdown-remark/dist/processor.d.ts:40` (`unified()`); `@astrojs/mdx/dist/index.js:110-155` | Default processor is Satteri and does NOT run rehype plugins (MDX warns "does not run remark/rehype plugins"). Use `markdown.processor: unified({ rehypePlugins })`; MDX inherits it (`extendMarkdownConfig` default true, `mdx/dist/index.js:56-59`). Verified: `.mdx` link got `rel="noopener noreferrer"`, no `target`. `.md` uses the same processor (`config.d.ts:2533`) but was not built in this task (no `.md` content); same pipeline by design. |
| `render()` / headings | `astro/templates/content/types.d.ts:84` (`render`), `astro/dist/content/runtime.d.ts:72-76` (`RenderResult`) | `import { render } from 'astro:content'`; `await render(entry)` returns `{ Content, headings, remarkPluginFrontmatter }`. Not exercised in a page here. |
| Sitemap `filter`/`serialize` | `@astrojs/sitemap/dist/index.d.ts:9,20` | Both exist. `serialize` returning `{...item, lastmod: Date}` works; verified `<lastmod>2026-03-04T00:00:00.000Z</lastmod>` from `updated` in a temp note. |
| TS config | `astro/tsconfigs/strictest.json` | Extended. |
| Node type stripping | `node --test 'src/**/*.test.ts'` on Node 24.22.1 | Works (quoted glob expanded by Node). |

## Deviations / open points

1. **Extra package `@astrojs/markdown-remark`** (direct dep): required to run rehype plugins (see above). It is an optional peer of Astro/MDX, not installed by default.
2. **Peer conflicts**: `eslint-plugin-jsx-a11y@6.10.2` declares peer eslint <=9 while `eslint-plugin-astro@3.2.1` needs eslint >=10. Resolved with an npm `overrides` entry in `package.json` (eslint 10 kept). Runtime compatibility of the jsx-a11y rules under eslint 10 is untested (lint config is a later task).
3. **TypeScript 6.0.3, not 7.0.2** (latest): `@astrojs/check` peers `^5 || ^6`, `typescript-eslint` peers `<6.1`. `npm outdated` lists only this.
4. **Shiki vs CSP (open, important)**: Astro warns "Shiki syntax highlighting uses inline styles that are not compatible with CSP". Dual-theme output puts `style="--shiki-..."` attributes on `<pre>`/`<span>`; the hash-based `style-src` does not cover style attributes, so browsers will block the colors. Options for the lead: Prism (`syntaxHighlight: 'prism'`), a Shiki transformer emitting classes, or `styleDirective.resources` with `{kind:'attribute'}` `'unsafe-inline'` (contradicts the no-unsafe-inline decision). Not changed here.
5. **Frontmatter dates**: `yaml` is only transitive, so `src/lib/frontmatter-dates.mjs` reads top-level `date`/`updated` scalar lines with a regex (no new dependency). Sitemap lastmod is keyed by `/writeups/<file>/` and `/notes/<file>/`: if the final URL scheme differs, adjust the key.
6. **Cover schema shape** is an object `{ image, alt, decorative }` (not flat `cover` + `coverAlt`).
7. The empty content folders make the glob loader warn "base directory does not exist"; harmless until content exists.
8. `astro.config.mjs` imports `.ts` files (`src/config/site.ts`, `src/lib/warn-config.ts`); works because Astro loads the config through Vite.
9. Sitemap filter excludes `/404` and `/search` only; add other utility pages when they exist.
10. `npm audit`: `postcss-selector-parser@6.0.10` (pinned by `@tailwindcss/typography`) fixed with a scoped `overrides` entry in `package.json`; moderate advisories on `fflate` (satori) and `minimatch` (eslint) remain, build/lint time only, no non-breaking fix.

## Shiki vs CSP resolution (T1b)

- `@shikijs/transformers@4.6.0` (same as bundled `shiki@4.6.0`); `transformerStyleToClass` typed in `@shikijs/transformers/dist/index.d.mts:231-259` (`getCSS()`).
- `astro.config.mjs`: `markdown.shikiConfig.transformers: [shikiToClass]` (MDX inherits the markdown config). The instance and a small integration live in `src/integrations/shiki-css.mjs`.
- Verified in a temp `.mdx` build: no `style="` in the HTML, `<pre class="astro-code astro-code-themes github-light github-dark sh-xxxx">`, token `<span class="sh-xxxx">`; no `unsafe-inline`.
- Stylesheet: `dist/shiki.css`, URL `/shiki.css` (export `SHIKI_CSS_PATH` from `src/integrations/shiki-css.mjs`). Written in `astro:build:done` (registry complete). The layout must add `<link rel="stylesheet" href="/shiki.css" />` (served from 'self', allowed by `style-src 'self'`). Note: this link is NOT yet added anywhere; layout task must do it.
- Variables produced: tokens `--shiki-light`, `--shiki-dark`; `<pre>` classes also `--shiki-light-bg`, `--shiki-dark-bg` (plus `overflow-x: auto`). Class names `sh-<hash>`. Consumer CSS must apply them, e.g. `[data-theme="dark"] .astro-code span { color: var(--shiki-dark) }`, light likewise, and `background-color` from the `-bg` vars on `pre`.
- Dev: a Vite middleware serves `/shiki.css` live; rules accumulate as pages are rendered, so reload after first render. The dev server was NOT tested (the dev start was blocked by the sandbox); only the build was verified. CSP is not enforced in dev anyway.
- Astro's "Shiki inline styles" CSP warning was not seen in the build output and nothing was suppressed.
