import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformerStyleToClass } from '@shikijs/transformers';

// Layout must add: <link rel="stylesheet" href={SHIKI_CSS_PATH} />
export const SHIKI_CSS_PATH = '/shiki.css';

// Converts Shiki inline styles to classes (CSP forbids style attributes).
export const shikiToClass = transformerStyleToClass({ classPrefix: 'sh-' });

export const shikiCss = {
  name: 'shiki-css',
  hooks: {
    // Dev: serve the CSS live (rules accumulate as pages render; reload after first render).
    'astro:server:setup': ({ server }) => {
      server.middlewares.use(SHIKI_CSS_PATH, (_req, res) => {
        res.setHeader('Content-Type', 'text/css');
        res.end(shikiToClass.getCSS());
      });
    },
    // Build: all pages are rendered, so the registry is complete.
    'astro:build:done': ({ dir }) => {
      writeFileSync(fileURLToPath(new URL('shiki.css', dir)), shikiToClass.getCSS());
    },
  },
};
