import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublished } from '../../lib/publishable';
import { renderOg } from '../../lib/og';

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export const getStaticPaths = (async () => {
  const writeups = (await getPublished('writeups')).map((e) => ({
    params: { slug: `writeups/${e.id}` },
    props: { title: e.data.title, kicker: `${e.data.category} · ${e.data.difficulty}`, meta: `${e.data.ctf} · ${fmt(e.data.date)}` },
  }));
  const notes = (await getPublished('notes')).map((e) => ({
    params: { slug: `notes/${e.id}` },
    props: { title: e.data.title, kicker: 'note', meta: fmt(e.data.date) },
  }));
  return [...writeups, ...notes];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as { title: string; kicker: string; meta: string });
  return new Response(png as BodyInit, { headers: { 'Content-Type': 'image/png' } });
};
