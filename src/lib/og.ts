import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { darkTokens as C, SITE_URL } from '../config/site.ts';

const dir = join(process.cwd(), 'node_modules/@fontsource/jetbrains-mono/files');
const font = (w: 400 | 700) => readFileSync(join(dir, `jetbrains-mono-latin-${w}-normal.woff`));
let fonts: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | undefined;

export interface OgInput { title: string; kicker: string; meta?: string; prompt: string }

const el = (style: Record<string, unknown>, children: unknown) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

export async function renderOg({ title, kicker, meta = '', prompt }: OgInput): Promise<Uint8Array> {
  fonts ??= ([400, 700] as const).map((weight) => ({ name: 'JetBrains Mono', data: font(weight), weight, style: 'normal' as const }));
  const size = title.length > 70 ? 48 : title.length > 40 ? 58 : 70;
  const tree = el({ width: 1200, height: 630, background: C.bg, flexDirection: 'column', justifyContent: 'space-between', padding: 72, fontFamily: 'JetBrains Mono', borderLeft: `12px solid ${C.accent}` }, [
    el({ flexDirection: 'column' }, [
      el({ fontSize: 30, color: C.accent }, prompt),
      el({ fontSize: 28, color: C.muted, marginTop: 28 }, kicker),
      el({ fontSize: size, fontWeight: 700, color: C.text, marginTop: 24, lineHeight: 1.2, wordBreak: 'break-word' }, title),
    ]),
    el({ fontSize: 28, color: C.muted, justifyContent: 'space-between' }, [el({}, meta), el({ color: C.accent }, new URL(SITE_URL).host)]),
  ]);
  // satori's types want ReactNode; the plain object tree is valid at runtime.
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts });
  return new Resvg(svg).render().asPng();
}
