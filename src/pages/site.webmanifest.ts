import type { APIRoute } from 'astro';
import { AUTHOR, themeColors } from '../config/site.ts';

export const GET: APIRoute = () => {
  const manifest = {
    name: AUTHOR,
    short_name: AUTHOR,
    lang: 'en',
    start_url: '/',
    display: 'minimal-ui',
    background_color: themeColors.light,
    theme_color: themeColors.light,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
};
