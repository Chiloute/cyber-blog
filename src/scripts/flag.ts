let n = 0;

function upgrade(root: HTMLElement) {
  const code = root.querySelector('code');
  if (!code) return;
  const label = (root.dataset.label ?? 'Flag').toLowerCase();
  const id = `flag-${++n}`;
  code.id = id;
  code.hidden = true;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  button.textContent = `Reveal ${label}`;
  button.className =
    'target-min cursor-pointer rounded border border-border-ui bg-surface px-3 py-1 font-bold text-text';

  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    code.hidden = !open;
    button.textContent = `${open ? 'Hide' : 'Reveal'} ${label}`;
    status.textContent = open ? `${label[0]?.toUpperCase()}${label.slice(1)} revealed` : `${label[0]?.toUpperCase()}${label.slice(1)} hidden`;
  });

  code.classList.add('ml-2');
  root.replaceChildren(button, code, status);
}

function init() {
  document.querySelectorAll<HTMLElement>('[data-flag]').forEach(upgrade);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
export {};
