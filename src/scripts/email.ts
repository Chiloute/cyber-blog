const rev = (s: string) => [...s].reverse().join('');

document.querySelectorAll<HTMLElement>('[data-email]').forEach((el) => {
  const addr = `${rev(el.dataset.u ?? '')}@${rev(el.dataset.d ?? '')}`;
  const a = document.createElement('a');
  a.href = `mailto:${addr}`;
  a.textContent = addr;
  el.replaceWith(a);
});
