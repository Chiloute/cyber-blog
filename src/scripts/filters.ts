// Progressive enhancement: filters the writeup list via data-* attributes, synced to ?category=web&...
// Each fieldset[data-filter] is a radio group; the empty value means "all".
const form = document.querySelector<HTMLFormElement>('form[data-filters]');
const list = document.querySelector<HTMLElement>('[data-list]');
const count = document.querySelector<HTMLElement>('[data-count]');
const empty = document.querySelector<HTMLElement>('[data-empty]');
const echo = document.querySelector<HTMLElement>('[data-echo]');
const clear = document.querySelector<HTMLButtonElement>('[data-clear]');

if (form && list && count && empty && echo && clear) {
  const items = [...list.querySelectorAll<HTMLElement>('[data-post]')];
  const names = [...form.querySelectorAll<HTMLElement>('[data-filter]')].map((f) => f.dataset.filter ?? '');
  const valueOf = (name: string) => form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
  const flag = (name: string, v: string) => `--${name}=${/\s/.test(v) ? `"${v}"` : v}`;

  const apply = (writeUrl: boolean) => {
    const active = names.map((n) => [n, valueOf(n)] as const).filter(([, v]) => v);
    let shown = 0;
    for (const li of items) {
      const ok = active.every(([n, v]) => li.dataset[n] === v);
      li.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = `Showing ${shown} of ${items.length} writeup${items.length === 1 ? '' : 's'}`;
    empty.hidden = shown > 0;

    // The listing command only appears once it says more than the page kicker.
    const prompt = document.createElement('span');
    prompt.className = 'text-accent';
    prompt.textContent = '$ ';
    const flags = document.createElement('span');
    flags.className = 'text-highlight';
    flags.textContent = active.map(([n, v]) => flag(n, v)).join(' ');
    echo.replaceChildren(prompt, 'ls -lt ~/writeups ', flags);
    echo.hidden = active.length === 0;

    // Keep focus somewhere sensible when the focused Clear button disappears.
    if (active.length === 0 && document.activeElement === clear) form.querySelector<HTMLInputElement>('input:checked')?.focus();
    clear.hidden = active.length === 0;

    if (writeUrl) {
      const params = new URLSearchParams(active as [string, string][]);
      const qs = params.toString();
      history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
    }
  };

  // Restore from URL; ignore values that have no matching chip.
  const q = new URLSearchParams(location.search);
  for (const n of names) {
    const v = q.get(n);
    const input = v ? [...form.querySelectorAll<HTMLInputElement>(`input[name="${n}"]`)].find((i) => i.value === v) : undefined;
    if (input) input.checked = true;
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
