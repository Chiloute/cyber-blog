import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import rehypeExternalLinks from 'rehype-external-links';
import { SITE_URL } from './src/config/site.ts';
import { checkConfig } from './src/lib/warn-config.ts';
import { shikiCss, shikiToClass } from './src/integrations/shiki-css.mjs';
import { loadLastmods } from './src/lib/frontmatter-dates.mjs';

const lastmods = loadLastmods();
const EXCLUDED = ['/404', '/search'];

const configChecks = {
  name: 'config-checks',
  hooks: {
    'astro:config:done': ({ logger }) => checkConfig((m) => logger.warn(m)),
  },
};

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !EXCLUDED.some((p) => new URL(page).pathname.replace(/\/$/, '') === p),
      serialize(item) {
        const d = lastmods.get(new URL(item.url).pathname);
        return d ? { ...item, lastmod: d } : item;
      },
    }),
    configChecks,
    shikiCss,
  ],
  vite: {
    plugins: [tailwindcss()],
    build: { sourcemap: false },
  },
  markdown: {
    // unified() is required: the default Satteri processor does not run rehype plugins.
    processor: unified({
      rehypePlugins: [[rehypeExternalLinks, { rel: ['noopener', 'noreferrer'] }]],
    }),
    shikiConfig: {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      defaultColor: false,
      transformers: [shikiToClass],
    },
  },
  security: {
    csp: {
      // Resources replace the defaults, so 'self' must be repeated. Needed by Pagefind (WebAssembly).
      scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] },
    },
  },
  env: {
    schema: {
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
