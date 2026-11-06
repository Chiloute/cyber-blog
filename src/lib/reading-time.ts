const WPM = 220;
const CODE_WEIGHT = 0.3; // code is skimmed, not read: fenced words count at 30%

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** Estimated reading minutes (>= 1) at ~220 wpm. shortcut: raw MDX text, JSX tags count as words; fine for an estimate. */
export function readingMinutes(text: string): number {
  let prose = '';
  let code = 0;
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) code += words(line);
    else prose += line + '\n';
  }
  return Math.max(1, Math.ceil((words(prose) + code * CODE_WEIGHT) / WPM));
}
