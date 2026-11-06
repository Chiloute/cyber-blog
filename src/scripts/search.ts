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
let ready = false;
function load(): Promise<Pf> {
  // Variable path: Vite must not bundle the generated index.
  const path = '/pagefind/pagefind.js';
  return (pf ??= import(/* @vite-ignore */ path).then(async (m: Pf) => { await m.init(); ready = true; return m; }));
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

// The query lives in ?q= so results can be shared, bookmarked and restored.
function syncUrl(q: string) {
  const url = new URL(location.href);
  if (q) url.searchParams.set('q', q);
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
}

async function run(q: string, immediate: boolean) {
  q = q.trim();
  syncUrl(q);
  if (!q) { list.replaceChildren(); say(''); return; }
  // Only the first query waits for the index (WASM); later ones are near-instant, so stay quiet.
  if (!ready) say('Searching…');
  try {
    const api = await load();
    const res = immediate ? await api.search(q) : await api.debouncedSearch(q, {}, 300);
    if (!res) return; // superseded by a newer keystroke
    const items = await Promise.all(res.results.slice(0, MAX).map((r) => r.data()));
    if (input.value.trim() !== q) return; // input changed (e.g. cleared) while this search ran
    list.replaceChildren(...items.map((d) => {
      const a = document.createElement('a');
      a.href = d.url;
      a.textContent = d.meta.title || d.url;
      a.className = 'font-semibold';
      const h = document.createElement('h2');
      h.className = 'm-0 text-lg';
      h.append(a);
      const p = document.createElement('p');
      p.className = 'm-0 mt-1 text-[0.9375rem] text-muted';
      p.append(...excerptNodes(d.excerpt));
      const art = document.createElement('article');
      art.className = 'py-4';
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
    say('Search is unavailable right now. Try again later, or browse the writeups and notes pages.', true);
  }
}

form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value, true); });
input.addEventListener('input', () => run(input.value, false));

const q0 = new URLSearchParams(location.search).get('q');
if (q0) { input.value = q0; run(q0, true); }
