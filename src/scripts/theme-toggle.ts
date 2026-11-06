type Pref = 'light' | 'dark' | 'system';
const root = document.documentElement;
const mq = matchMedia('(prefers-color-scheme: dark)');
const isPref = (v: unknown): v is Pref => v === 'light' || v === 'dark' || v === 'system';

function apply(pref: Pref): Pref {
  root.dataset.themePref = pref;
  root.dataset.theme = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref;
  return pref;
}

document.querySelectorAll<HTMLFieldSetElement>('[data-theme-toggle]').forEach((fs) => {
  const status = fs.querySelector<HTMLElement>('[data-theme-status]');
  const radios = fs.querySelectorAll<HTMLInputElement>('input[type=radio]');
  const sync = () => radios.forEach((r) => (r.checked = r.value === root.dataset.themePref));
  sync();
  radios.forEach((r) =>
    r.addEventListener('change', () => {
      if (!isPref(r.value)) return;
      try {
        localStorage.setItem('theme', r.value);
      } catch {}
      apply(r.value);
      document.querySelectorAll('[data-theme-toggle] input').forEach((o) => ((o as HTMLInputElement).checked = (o as HTMLInputElement).value === r.value));
      if (status) status.textContent = `Theme set to ${root.dataset.theme}${r.value === 'system' ? ' (system)' : ''}`;
    }),
  );
});

mq.addEventListener('change', () => {
  if (root.dataset.themePref === 'system') apply('system');
});
