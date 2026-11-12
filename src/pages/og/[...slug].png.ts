import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublished } from '../../lib/publishable.ts';
import { renderOg, type OgInput } from '../../lib/og.ts';
import { isoDate } from '../../lib/dates.ts';
import { ogPath, type PostCollection } from '../../lib/urls.ts';

// Route param derived from ogPath so the URL stays defined in one place: /og/<slug>.png
const slug = (c: PostCollection, id: string) => ogPath(c, id).slice('/og/'.length, -'.png'.length);

export const getStaticPaths = (async () => {
  const writeups = (await getPublished('writeups')).map((e) => ({
    params: { slug: slug('writeups', e.id) },
    props: { title: e.data.title, prompt: '~/writeups $', kicker: `${e.data.category} · ${e.data.difficulty}`, meta: `${e.data.ctf} · ${isoDate(e.data.date)}` },
  }));
  const notes = (await getPublished('notes')).map((e) => ({
    params: { slug: slug('notes', e.id) },
    props: { title: e.data.title, prompt: '~/notes $', kicker: 'note', meta: isoDate(e.data.date) },
  }));
  return [...writeups, ...notes];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as OgInput);
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png' } });
};
