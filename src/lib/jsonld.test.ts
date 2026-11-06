import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializeJsonLd, personJsonLd, blogPostingJsonLd, breadcrumbJsonLd } from './jsonld.ts';

test('serializeJsonLd escapes "<" so </script> cannot break out', () => {
  const out = serializeJsonLd({ headline: 'x</script><script>alert(1)</script>' });
  assert.ok(!out.includes('<'));
  assert.deepEqual(JSON.parse(out), { headline: 'x</script><script>alert(1)</script>' });
});

test('Person sameAs excludes disabled profiles and has no email', () => {
  const p = personJsonLd();
  const same = p['sameAs'] as string[];
  assert.ok(same.includes('https://github.com/chiloute'));
  assert.ok(!same.some((u) => u.includes('TODO')));
  assert.ok(!('email' in p));
});

test('BlogPosting defaults dateModified and omits empty keywords', () => {
  const b = blogPostingJsonLd({ title: 't', description: 'd', url: 'https://chiloute.fr/a/', image: 'https://chiloute.fr/i.png', datePublished: '2026-01-01' });
  assert.equal(b['dateModified'], '2026-01-01');
  assert.ok(!('keywords' in b));
});

test('BreadcrumbList uses absolute URLs and 1-based positions', () => {
  const b = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Notes', path: '/notes/' }]);
  const l = b['itemListElement'] as { position: number; item: string }[];
  assert.equal(l[1]?.position, 2);
  assert.equal(l[1]?.item, 'https://chiloute.fr/notes/');
});
