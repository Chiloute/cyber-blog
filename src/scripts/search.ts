// Pagefind JS API search. Excerpts carry <mark>; they are rebuilt as DOM nodes, never injected as HTML.
export {}; // make this file a module (top-level names would collide with other scripts)
interface PfData { url: string; excerpt: string; meta: { title?: string } }
interface Pf {
  init(): Promise<void>;
  search(q: string): Promise<{ results: { data(): Promise<PfData> }[] }>;
  debouncedSearch(q: string, o?: object, ms?: number): Promise<{ results: { data(): Promise<PfData> }[] } | null>;
}

const form = document.querySelector<HTMLFormElement>('#search-form')!;
const input = form.querySelector<HTMLInputElement>('input')!;
const live = document.querySelector<HTMLElement>('#search-status')!;
const list = document.querySelector<HTMLOListElement>('#search-results')!;
const MAX = 20;

let pf: Promise<Pf> | undefined;
function load(): Promise<Pf> {
  // Variable path: Vite must not bundle the generated index.
  const path = '/pagefind/pagefind.js';
  return (pf ??= import(/* @vite-ignore */ path).then(async (m: Pf) => { await m.init(); return m; }));
}

function excerptNodes(html: string): Node[] {
  // Only <mark> is honoured; everything else is plain text (entities decoded via a detached textarea-free parse).
  return html.split(/(<mark>.*?<\/mark>)/gs).filter(Boolean).map((part) => {
    const m = /^<mark>(.*)<\/mark>$/s.exec(part);
    const text = decode(m?.[1] ?? part);
    if (!m) return document.createTextNode(text);
    const el = document.createElement('mark');
    el.textContent = text;
    return el;
  });
}
// DOMParser on text/html never executes scripts or loads resources; we read textContent only.
function decode(s: string): string {
  return new DOMParser().parseFromString(s, 'text/html').documentElement.textContent ?? '';
}

function say(msg: string, error = false) {
  live.textContent = msg;
  live.classList.toggle('text-warning', error);
}

async function run(q: string, immediate: boolean) {
  q = q.trim();
  if (!q) { list.replaceChildren(); say(''); return; }
  try {
    const api = await load();
    const res = immediate ? await api.search(q) : await api.debouncedSearch(q, {}, 300);
    if (!res) return; // superseded by a newer keystroke
    const items = await Promise.all(res.results.slice(0, MAX).map((r) => r.data()));
    list.replaceChildren(...items.map((d) => {
      const a = document.createElement('a');
      a.href = d.url;
      a.textContent = d.meta.title || d.url;
      const h = document.createElement('h2');
      h.append(a);
      const p = document.createElement('p');
      p.append(...excerptNodes(d.excerpt));
      const art = document.createElement('article');
      art.append(h, p);
      const li = document.createElement('li');
      li.append(art);
      return li;
    }));
    const n = res.results.length;
    say(n ? `${n} result${n === 1 ? '' : 's'} for “${q}”` : `No results for “${q}”`);
  } catch {
    pf = undefined;
    list.replaceChildren();
    say('Search is unavailable: the search index could not be loaded. Build the site to generate it.', true);
  }
}

form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value, true); });
input.addEventListener('input', () => run(input.value, false));

const q0 = new URLSearchParams(location.search).get('q');
if (q0) { input.value = q0; run(q0, true); }
