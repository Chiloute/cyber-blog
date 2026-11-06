// Run manually, output is committed:  node scripts/generate-icons.mjs
// Writes public/{favicon.svg,favicon.ico,apple-touch-icon.png,icon-192.png,icon-512.png,og-default.png}
import { writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

mkdirSync('public', { recursive: true });
const glyph = (bg, fg, rx) => `<rect width="64" height="64" rx="${rx}" fill="${bg}"/><path d="M14 20l14 12-14 12" fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 46h18" stroke="${fg}" stroke-width="6" stroke-linecap="round"/>`;
const svg = (body, style = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${style}${body}</svg>`;

// Adaptive favicon: light background in light mode, dark in dark mode.
writeFileSync('public/favicon.svg', svg(
  '<rect class="b" width="64" height="64" rx="12"/><path class="f" d="M14 20l14 12-14 12M34 46h18" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
  '<style>.b{fill:#faf8f3}.f{stroke:#0b5a87}@media (prefers-color-scheme:dark){.b{fill:#0b0f14}.f{stroke:#5fd0a0}}</style>'));

// Opaque dark variant, no rounding (platforms mask it).
const solid = svg(glyph('#0b0f14', '#5fd0a0', 0));
const png = (s, w) => new Resvg(s, { fitTo: { mode: 'width', value: w } }).render().asPng();
writeFileSync('public/apple-touch-icon.png', png(solid, 180));
writeFileSync('public/icon-192.png', png(solid, 192));
writeFileSync('public/icon-512.png', png(solid, 512));

// ICO = 6-byte header + 16-byte entry + embedded PNG.
const p32 = png(svg(glyph('#0b0f14', '#5fd0a0', 12)), 32);
const h = Buffer.alloc(22);
h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4);       // type icon, 1 image
h[6] = 32; h[7] = 32;                               // width, height
h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12);    // planes, bpp
h.writeUInt32LE(p32.length, 14); h.writeUInt32LE(22, 18);
writeFileSync('public/favicon.ico', Buffer.concat([h, p32]));

// Resolve from the repo root; .ts is loaded through Node's type stripping.
const { renderOg } = await import('../src/lib/og.ts');
writeFileSync('public/og-default.png', await renderOg({ title: 'chiloute', kicker: 'security notes & CTF writeups', meta: '', prompt: '~ $' }));
