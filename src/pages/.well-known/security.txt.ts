import type { APIRoute } from 'astro';
import { CONTACT_EMAIL, SITE_URL, isEmailPlaceholder, securityTxt } from '../../config/site.ts';

export const GET: APIRoute = () => {
  const lines: string[] = [];
  if (isEmailPlaceholder()) lines.push('# WARNING: contact email not configured');
  lines.push(
    `Contact: mailto:${CONTACT_EMAIL}`,
    `Expires: ${new Date(securityTxt.expires).toISOString()}`,
    `Encryption: ${new URL(securityTxt.pgpKeyPath, SITE_URL).href}`,
    'Preferred-Languages: en, fr',
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
  );
  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
