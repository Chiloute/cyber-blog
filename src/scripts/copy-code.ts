// Adds a Copy button to every pre.astro-code and Terminal block.
// Every pre gets tabindex="0" + aria-label always (simpler than detecting overflow).
const IDLE = 'Copy';
let live: HTMLElement | undefined;

function announce(msg: string) {
  if (!live) {
    live = document.createElement('div');
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.append(live);
  }
  live.textContent = '';
  // Re-set on next tick so identical messages are announced again.
  setTimeout(() => { if (live) live.textContent = msg; }, 50);
}

function textOf(pre: HTMLElement): string {
  const cmds = pre.querySelectorAll('[data-cmd]');
  return cmds.length ? [...cmds].map((c) => c.textContent).join('\n') : (pre.textContent ?? '');
}

function select(el: HTMLElement) {
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
}

function enhance(pre: HTMLElement) {
  if (!pre.hasAttribute('tabindex')) pre.tabIndex = 0;
  pre.setAttribute('role', 'region');
  pre.setAttribute('aria-label', labels.get(pre) ?? 'Code block');
  let wrap = pre.closest<HTMLElement>('[data-copy-wrap]');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.dataset.copyWrap = '';
    pre.replaceWith(wrap);
    wrap.append(pre);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'copy target-min cursor-pointer rounded border border-border-ui bg-surface px-2 text-sm text-text';
  btn.textContent = IDLE;
  btn.setAttribute('aria-label', 'Copy code to clipboard');

  let timer: number | undefined;
  const flash = (label: string, msg: string) => {
    btn.textContent = label;
    announce(msg);
    clearTimeout(timer);
    timer = window.setTimeout(() => { btn.textContent = IDLE; }, 2000);
  };

  btn.addEventListener('click', async () => {
    if (!navigator.clipboard) {
      select(pre);
      flash(IDLE, 'Press Ctrl+C to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(textOf(pre));
      flash('Copied', 'Copied');
    } catch {
      select(pre);
      flash('Failed', 'Copy failed');
    }
  });
  // Header bar above the pre: the button never overlaps code.
  const bar = document.createElement('div');
  bar.className = 'flex justify-end border border-b-0 border-border bg-surface p-1';
  bar.append(btn);
  pre.before(bar);
}

// Unique, useful landmark names (axe landmark-unique): "Code block N, lang"; repeated terminal titles get " N".
const labels = new Map<HTMLElement, string>();
function computeLabels(pres: HTMLElement[]) {
  const terms = pres.filter((p) => p.hasAttribute('data-terminal'));
  const seen = new Map<string, number>();
  terms.forEach((p) => seen.set(p.getAttribute('aria-label') ?? 'Terminal', 0));
  const total = (l: string) => terms.filter((p) => (p.getAttribute('aria-label') ?? 'Terminal') === l).length;
  let n = 0;
  for (const p of pres) {
    if (p.hasAttribute('data-terminal')) {
      const base = p.getAttribute('aria-label') ?? 'Terminal';
      const i = (seen.get(base) ?? 0) + 1;
      seen.set(base, i);
      labels.set(p, total(base) > 1 ? `${base} ${i}` : base);
    } else {
      const lang = p.dataset.language;
      labels.set(p, `Code block ${++n}${lang && lang !== 'plaintext' ? `, ${lang}` : ''}`);
    }
  }
}

function init() {
  const pres = [...document.querySelectorAll<HTMLElement>('pre.astro-code, pre[data-terminal]')];
  computeLabels(pres);
  pres.forEach(enhance);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
export {};
