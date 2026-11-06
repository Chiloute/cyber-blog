// Progressive enhancement: filters the writeup list via data-* attributes, synced to ?category=web&...
const form = document.querySelector<HTMLFormElement>('form[data-filters]');
const list = document.querySelector<HTMLElement>('[data-list]');
const count = document.querySelector<HTMLElement>('[data-count]');
const empty = document.querySelector<HTMLElement>('[data-empty]');

if (form && list && count && empty) {
  const items = [...list.querySelectorAll<HTMLElement>('[data-post]')];
  const selects = [...form.querySelectorAll<HTMLSelectElement>('select')];

  const apply = (writeUrl: boolean) => {
    const params = new URLSearchParams();
    for (const s of selects) if (s.value) params.set(s.name, s.value);
    let shown = 0;
    for (const li of items) {
      const ok = selects.every((s) => !s.value || li.dataset[s.name] === s.value);
      li.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = `Showing ${shown} of ${items.length} writeups`;
    empty.hidden = shown > 0;
    if (writeUrl) {
      const qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
    }
  };

  // Restore from URL; ignore values not present in the select.
  const q = new URLSearchParams(location.search);
  for (const s of selects) {
    const v = q.get(s.name);
    if (v && [...s.options].some((o) => o.value === v)) s.value = v;
  }
  form.hidden = false;
  count.hidden = false;
  form.addEventListener('change', () => apply(true));
  form.addEventListener('submit', (e) => e.preventDefault());
  // reset restores defaults after the event, so apply on next tick
  form.addEventListener('reset', () => setTimeout(() => apply(true), 0));
  apply(false);
}
export {};
