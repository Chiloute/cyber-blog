# Security and cache policy

This document explains every security and cache directive the site sends, why it is there, and how to reproduce it on Vercel and Nginx. Production is self-hosted behind nginx (see the Nginx section and the README Deployment section). The reference configuration is `public/_headers` and `public/_redirects`, which both Cloudflare Pages and Netlify read natively. Astro copies `public/` verbatim into `dist/`.

## Threat model

- The site is a static build (`output: 'static'`). There is no backend, no database, no user accounts, no forms that store data, and no server-side rendering at request time.
- The main risks are therefore: script injection through a compromised dependency or a content mistake, clickjacking, data leaks through `Referer` or cross-origin reads, and supply-chain compromise of build dependencies or CI.
- A build-time secret (`GITHUB_TOKEN`) is the only credential. It must never reach the browser (see Secrets).
- Out of scope: server-side attacks, since there is no server code. The host's own security is outside this repository.

## Content Security Policy (CSP)

The policy is split across two places on purpose.

**Meta CSP (emitted by Astro).** `security.csp` in `astro.config.mjs` makes Astro add a `<meta http-equiv="Content-Security-Policy">` to each page, with per-page SHA-256 hashes for inline scripts and styles. Verified in the build output (see `docs/api-verification.md`):

| Directive | Value | Why |
|---|---|---|
| `script-src` | `'self' 'wasm-unsafe-eval' 'sha256-…'` (hashes generated per page) | Scripts only from the same origin, plus the specific inline scripts Astro emits. Hashes change per page, so they cannot be hardcoded in a header. |
| `script-src` `'wasm-unsafe-eval'` | keyword | Pagefind compiles WebAssembly. This keyword allows WebAssembly compilation only. It does not allow `eval()` or `new Function()`. The resource list replaces the defaults, so `'self'` is repeated. |
| `style-src` | `'self' 'sha256-…'` | Stylesheets from the same origin, plus hashed inline `<style>` blocks. |

Why there is no `'unsafe-inline'` and no `style=""` in the HTML: hashes cover `<script>` and `<style>` elements, but not `style` attributes. Shiki's default dual-theme output puts `style="--shiki-light:…"` attributes on every token, which the hashed `style-src` would block. `src/integrations/shiki-css.mjs` applies `transformerStyleToClass`, which moves those values into classes (`sh-<hash>`) in a stylesheet served from `/shiki.css`. That file is linked from `'self'`, so `style-src 'self'` covers it. The result is no inline styles and no `unsafe-inline` anywhere.

**Header CSP (sent by the host).** A `<meta>` CSP cannot carry `frame-ancestors`, `report-uri`, or `sandbox`. So `public/_headers` sends a second policy as an HTTP header. Browsers enforce both policies, and a resource is allowed only if both allow it (intersection).

The header policy must not contain `default-src`, `script-src` or `style-src`:
- `default-src` would fall back to `script-src` and `style-src`. Those would then apply to the header too, with no hashes, and would block Astro's hashed inline scripts.
- Without `script-src` and `style-src` in the header, the meta policy remains the only control for scripts and styles, which is the intended split.

Final header value, with the reason for each directive:

| Directive | Value | Why |
|---|---|---|
| `connect-src` | `'self'` | `fetch`, XHR and WebSocket only to the same origin. Pagefind loads its index chunks with `fetch`. |
| `img-src` | `'self' data:` | Same-origin images, plus `data:` URIs for small inline images. |
| `font-src` | `'self'` | Fonts are self-hosted (`@fontsource/jetbrains-mono`). No third-party font CDN. |
| `media-src` | `'self'` | Audio and video only from the same origin. |
| `object-src` | `'none'` | No `<object>`, `<embed>` or plugins. |
| `frame-src` | `'none'` | The site embeds no iframes. If an embed is ever added, this must change. |
| `worker-src` | `'self'` | Workers only from the same origin. |
| `manifest-src` | `'self'` | `/site.webmanifest` only from the same origin. |
| `base-uri` | `'self'` | Blocks injected `<base>` tags that would redirect relative URLs. |
| `form-action` | `'self'` | Forms can only submit to the same origin. Contact is by `mailto:`. |
| `frame-ancestors` | `'none'` | The site cannot be framed by any page (clickjacking). Only honoured in a header, not in a meta tag. |
| `upgrade-insecure-requests` | keyword | Mixed-content URLs are upgraded to HTTPS. |

## Other headers

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Two years of HTTPS-only. Subdomains included. `preload` is only a request for inclusion in browser preload lists; see the warning in the checklist before enabling it. |
| `X-Content-Type-Options` | `nosniff` | Browsers must honour the declared `Content-Type` and not guess (blocks MIME confusion). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Full URL sent to the same origin, only the origin to other sites, nothing on HTTPS→HTTP downgrade. |
| `Permissions-Policy` | `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()` | Disables sensors, device APIs and payments, which the site does not use. Empty list `()` means disabled for all origins. `interest-cohort` was removed: FLoC was retired in 2022 and the feature no longer exists. `browsing-topics` is the Topics API; unknown or retired features are ignored by browsers, so it is harmless if removed. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context group from cross-origin windows (Spectre-class and `window.opener` attacks). |
| `Cross-Origin-Resource-Policy` | `same-origin` | Other sites cannot load this site's resources with `no-cors` requests. |
| `X-Frame-Options` | `DENY` | Legacy fallback for `frame-ancestors 'none'` on browsers that ignore CSP for framing. |
| `Cache-Control` | `public, max-age=0, must-revalidate` | Default for HTML: always revalidate, so content updates are visible immediately. |

## Cache policy

| Path | `Cache-Control` | Why |
|---|---|---|
| `/*` (HTML and default) | `public, max-age=0, must-revalidate` | Pages change on every deploy. |
| `/_astro/*` | `public, max-age=31536000, immutable` | Astro names these files by content hash. Safe to cache forever. Fonts under `/_astro` are covered by this rule. |
| `/pagefind/*` | `public, max-age=3600` | Search index: regenerated per build, not hashed. One hour is a compromise. |
| `/shiki.css` | `public, max-age=3600` | Not hashed, changes only when the highlight palette changes. |
| `/sitemap-index.xml`, `/sitemap-0.xml` | `public, max-age=3600` | Sitemaps are regenerated per build. |
| `/rss.xml`, `/writeups/rss.xml`, `/notes/rss.xml` | `public, max-age=3600` | Feeds are regenerated per build. |

Content types set explicitly: `application/xml` for `/sitemap-index.xml` and `/sitemap-0.xml`, `application/rss+xml; charset=utf-8` for the three feeds, `application/manifest+json` for `/site.webmanifest`, and `text/plain; charset=utf-8` for `/.well-known/security.txt` and `/pgp-key.txt`.

No suffix-splat pattern (such as `/*.xml`) is used: it is not reliably supported across hosts, and it would also match nested feeds. Each XML file is listed explicitly. If the sitemap is ever split, `sitemap-1.xml` and later need their own block.

**Overlapping rules.** `/*` and `/_astro/*` both match a file under `/_astro/`. Cloudflare Pages documents that a `! Name` line detaches a header set by an earlier matching block, and `_headers` uses it in each override block (`! Cache-Control`) before setting the new value. Netlify's handling of overlapping rules and of `!` detach is NOT verified in this repository: treat it as untested. After deploy, check each path with `curl -I` and confirm exactly one `Cache-Control` value per path, on both hosts.

## Secrets

- `GITHUB_TOKEN` is declared in `astro.config.mjs` through `env.schema` as `envField.string({ context: 'server', access: 'secret', optional: true })`. `context: 'server'` means it is only readable in server-side code at build time. `access: 'secret'` means it is never exposed to client code and cannot be imported from `astro:env/client`.
- The value is never committed. `.env.example` documents the variable with an empty value. Real values live in the host's secret store (Cloudflare or Netlify environment variables) and the CI secret store.
- The token is a fine-grained, read-only, public-repositories-only personal access token (see `.env.example`).

## Supply chain

- `package-lock.json` is committed and used with `npm ci` in builds, so installed versions are reproducible.
- `npm audit --audit-level=high` runs in `.github/workflows/security.yml` (lockfile changes and weekly). At the time of writing it reports 2 moderate issues, both through `@tailwindcss/typography` → `postcss-selector-parser`. The only fix offered is a downgrade, so they are accepted and tracked in `docs/api-verification.md`.
- Dependabot updates npm and GitHub Actions weekly, with a 7-day cooldown on new versions.
- GitHub Actions in CI are pinned to full commit SHAs, not tags. Workflows default to `permissions: {}` and `npm ci` runs with `--ignore-scripts`. CI holds no secrets: the production build is the offline `nix build`.

## No source maps

`vite.build.sourcemap` is `false` in `astro.config.mjs`. Production builds ship no `.map` files, so original TypeScript and Astro sources are not published.

## 404 without information leak

The site is static, so there are no server stack traces or framework error pages. `/404` exists as a page but is excluded from the sitemap (`EXCLUDED` in `astro.config.mjs`). The 404 page must not show build versions, file paths or internal URLs. Hosts serve it for unknown paths automatically (`404.html` in `dist/`).

## Email anti-spam approach

The contact address is not in the HTML as plain text, and it is not a `mailto:` link in the HTML source.

- `src/components/ContactEmail.astro` writes the address reversed in `data-u` and `data-d` attributes and shows a readable fallback such as `name [at] domain [dot] tld`.
- `src/scripts/email.ts` runs in the browser, reverses the attributes back, and replaces the fallback with a real `mailto:` link.
- Without JavaScript, visitors see the fallback text, not a link. The address is still recoverable by a determined scraper that runs the script. This is a deterrent against simple harvesters, not a guarantee.
- When `CONTACT_EMAIL` is still the placeholder, the component renders "Contact address coming soon" instead.

## Equivalents

### Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "connect-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/_astro/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ],
  "redirects": [
    { "source": "/sitemap.xml", "destination": "/sitemap-index.xml", "permanent": true }
  ]
}
```

Vercel does not read `_headers`. This snippet omits the other overrides from the Cache policy and Content types sections (`/pagefind/*`, `/shiki.css`, sitemaps, feeds, `/site.webmanifest`, `/.well-known/security.txt`, `/pgp-key.txt`); add them the same way if needed. Check with `curl -I` after deploy how Vercel combines the `/(.*)` and `/_astro/(.*)` values.

### Nginx

Nginx replaces all `add_header` directives of a parent block as soon as a nested `location` declares any `add_header`. Put the shared headers in one include file and include it in each location that needs them.

`/etc/nginx/snippets/security-headers.conf`:

```nginx
add_header Content-Security-Policy "connect-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header X-Frame-Options "DENY" always;
```

Server block:

```nginx
server {
    # ... TLS and root configuration ...
    root /var/www/blog/dist;

    include /etc/nginx/snippets/security-headers.conf;
    add_header Cache-Control "public, max-age=0, must-revalidate" always;

    location = /sitemap.xml {
        return 301 /sitemap-index.xml;
    }

    location /_astro/ {
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location /pagefind/ {
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "public, max-age=3600" always;
    }

    location = /site.webmanifest {
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
        types { application/manifest+json webmanifest; }
    }
}
```

This example omits the other overrides from the Cache policy and Content types sections (`/shiki.css`, sitemaps, feeds, `/.well-known/security.txt`, `/pgp-key.txt`); add them the same way if needed.

Nginx serves `/_astro/` with `Cache-Control` from the nested block, so the parent's `max-age=0` does not apply there. Check the MIME mapping for `webmanifest` in your distribution's `mime.types`; the `types` line above sets it explicitly.

## Final verification checklist

None of the host configurations in this document (`public/_headers`, `public/_redirects`, the Vercel and Nginx examples) has been tested locally or on a host yet: there is no deploy. Run after the first deploy, on the production URL.

1. **Mozilla Observatory** (`https://developer.mozilla.org/en-US/observatory`): scan the production host. Target: grade A or higher.
2. **securityheaders.com**: scan the production host. Every header in the tables above must be present with the expected value.
3. **Browser console CSP check**: open each page type (home, a post, a note, search, 404) in a current Chrome and Firefox with DevTools open. There must be no `Refused to …` CSP violation. Check the Search page specifically, since Pagefind needs `'wasm-unsafe-eval'` and `connect-src 'self'`.
4. **Header verification with curl**: `curl -sI https://<host>/` and `curl -sI https://<host>/_astro/<any-file>.js`. Confirm exactly one `Cache-Control` value per path (see Overlapping rules).
5. **Feeds**: validate `/rss.xml` with the W3C Feed Validator (`https://validator.w3.org/feed/`). Confirm `Content-Type: application/rss+xml; charset=utf-8`.
6. **Sitemap**: validate `/sitemap-index.xml` and one `sitemap-0.xml` (sitemaps.org schema, all URLs return 200). Confirm `/sitemap.xml` returns `301` to `/sitemap-index.xml`.
7. **Rich Results Test** (`https://search.google.com/test/rich-results`): run on one post and on the home page. JSON-LD must be valid.
8. **Drafts check**: `npm run check:drafts` must pass before publishing (draft content must not appear in the build). The Nix build runs it.
9. **Accessibility in both themes**: run `npm run test:a11y` (axe via Playwright) with light and dark themes. No serious or critical violations.
10. **HSTS preload** (last, and only once HTTPS is confirmed):
    - Confirm HTTPS works on the apex domain and on every subdomain that will ever be used, with a valid certificate, and that HTTP redirects to HTTPS.
    - Only then submit the domain at `https://hstspreload.org`.
    - **Warning:** preload is hard to undo. Removing a domain from the browser preload list takes months and can break any subdomain that is later served over HTTP. The `preload` token in the header has no effect on its own; the list is only affected by this submission. Do not submit until this step is complete.
