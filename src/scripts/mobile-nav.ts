const btn = document.querySelector<HTMLButtonElement>('[data-mobile-nav-button]');
const list = btn && document.getElementById(btn.getAttribute('aria-controls') ?? '');

if (btn && list) {
  // data-collapsed + max-md:data-collapsed:hidden (header classes) hides the list only below md.
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    list.toggleAttribute('data-collapsed', !open);
  };
  btn.hidden = false;
  set(false);
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      set(false);
      btn.focus();
    }
  });
}
