import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site!;
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${new URL('sitemap-index.xml', base)}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
