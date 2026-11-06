import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublished } from '../../lib/publishable';
import { renderOg } from '../../lib/og';
import { isoDate } from '../../lib/dates';

export const getStaticPaths = (async () => {
  const writeups = (await getPublished('writeups')).map((e) => ({
    params: { slug: `writeups/${e.id}` },
    props: { title: e.data.title, kicker: `${e.data.category} · ${e.data.difficulty}`, meta: `${e.data.ctf} · ${isoDate(e.data.date)}` },
  }));
  const notes = (await getPublished('notes')).map((e) => ({
    params: { slug: `notes/${e.id}` },
    props: { title: e.data.title, kicker: 'note', meta: isoDate(e.data.date) },
  }));
  return [...writeups, ...notes];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as { title: string; kicker: string; meta: string });
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png' } });
};
