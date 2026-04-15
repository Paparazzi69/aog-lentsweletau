# Architecture

**Analysis Date:** 2026-04-15

## Pattern Overview

**Overall:** Hugo static site generator with multilingual content, custom theme, Git-backed headless CMS, and Cloudflare Pages hosting.

**Key Characteristics:**
- All pages are pre-rendered at build time — no server-side runtime
- Dual-language (English / Setswana) with language-prefixed URL paths enforced by `defaultContentLanguageInSubdir = true`
- Content is edited via Decap CMS (browser-based), which commits directly to GitHub, triggering an automatic rebuild
- A single custom theme (`aog-theme`) provides all layouts and base CSS; the project layer adds overrides

## Layers

**Content Layer:**
- Purpose: Raw page content and structured front-matter data
- Location: `content/en/` and `content/tn/`
- Contains: Markdown files with YAML front matter; pages are flat (no sub-sections)
- Depends on: Nothing — pure data
- Used by: Hugo build process, Decap CMS

**Data Layer:**
- Purpose: Shared structured data consumed by templates at build time
- Location: `data/`
- Contains: `services.yaml` — bilingual service-time records (sunday, wednesday, friday)
- Depends on: Nothing
- Used by: `themes/aog-theme/layouts/index.html` via `hugo.Data.services`

**i18n Layer:**
- Purpose: All UI string translations keyed by identifier
- Location: `i18n/en.yaml`, `i18n/tn.yaml`
- Contains: ~100 translation keys covering navigation, section headings, body copy, CTAs, footer strings
- Depends on: Nothing
- Used by: Every layout template via the `i18n "key"` function

**Theme / Layout Layer:**
- Purpose: HTML templates, base styling, and the AG logo SVG
- Location: `themes/aog-theme/`
- Contains: `layouts/`, `static/css/style.css`, `static/images/ag-logo.svg`
- Depends on: Content layer (`.Content`, `.Params`), i18n layer, data layer, static assets
- Used by: Hugo build

**Static Assets Layer:**
- Purpose: Client-side files copied verbatim into `public/`
- Location: `static/`
- Contains: `images/` (photos), `css/lightbox.css`, `js/lightbox.js`, `_redirects`, `_headers`, `cms.html`
- Depends on: Nothing
- Used by: Browsers; `_redirects` and `_headers` are interpreted by Cloudflare Pages

**CMS Layer:**
- Purpose: Browser UI for content editors to update site content without touching Git directly
- Location: `static/cms.html` (source), served at `/cms` on the live site
- Contains: Decap CMS SPA loaded from CDN (`decap-cms@3.4.0`), configured via inline JS
- Depends on: GitHub OAuth proxy (`cf-workers/oauth-proxy.js`) and the GitHub repo
- Used by: Content editors

**OAuth Proxy Layer:**
- Purpose: GitHub OAuth flow for Decap CMS (browsers cannot hold GitHub client secrets)
- Location: `cf-workers/oauth-proxy.js`, deployed as Cloudflare Worker at `https://aog-oauth.glebpodsivaka.workers.dev`
- Depends on: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` Cloudflare Worker secrets
- Used by: Decap CMS during editor login

## Routing and URL Structure

Hugo is configured with `defaultContentLanguageInSubdir = true`, which means every URL is language-prefixed:

| Route | File | Notes |
|---|---|---|
| `/` | — | Redirected to `/en/` via `static/_redirects` (`/ /en/ 302`) |
| `/en/` | `content/en/_index.md` | English home (rendered by `layouts/index.html`) |
| `/en/about/` | `content/en/about.md` | Uses `layout: single` |
| `/en/events/` | `content/en/events.md` | Uses `layout: events` (custom) |
| `/en/gallery/` | `content/en/gallery.md` | Uses `layout: single` |
| `/en/give/` | `content/en/give.md` | Uses `layout: single` |
| `/tn/` | `content/tn/_index.md` | Setswana home |
| `/tn/about/` | `content/tn/about.md` | Same layouts, different strings |
| `/tn/events/` | `content/tn/events.md` | Same layouts, different strings |
| `/tn/gallery/` | `content/tn/gallery.md` | Same layouts, different strings |
| `/tn/give/` | `content/tn/give.md` | Same layouts, different strings |
| `/cms` | `static/cms.html` | Decap CMS editor UI |

The language switcher in `header.html` constructs the counterpart URL as `/{otherLang}/{.File.ContentBaseName}/`, providing symmetric EN↔TN switching on all pages.

## Content Model

**Page types:**

| Type | Layout used | Key front-matter fields |
|---|---|---|
| Home (`_index.md`) | `layouts/index.html` | `title`, `description` |
| Standard page | `_default/single.html` | `title`, `subtitle`, `description`, `layout: single` |
| Events page | `_default/events.html` | `title`, `subtitle`, `regular_services[]`, `special_events[]`, `layout: events` |

**`regular_services` and `special_events` items** (defined in `content/*/events.md` front matter):
- `title` — service or event name
- `schedule` — human-readable recurrence (e.g. "Every Sunday")
- `time` — clock time string
- `location` — venue name
- `description` — paragraph text

**Data files:**

`data/services.yaml` — three top-level keys (`sunday`, `wednesday`, `friday`), each with bilingual name/day/location fields and a shared `time`. Consumed directly by `index.html` to render service-time cards on the homepage.

## Theme Architecture

All HTML rendering flows through a single base template:

```
themes/aog-theme/layouts/_default/baseof.html
  ├── <head> — meta, OG tags, Schema.org Church JSON-LD (home only), CSS links
  ├── {{ partial "header.html" . }}     — logo, language switcher, nav, phone
  ├── <main>
  │     {{ block "main" . }}{{ end }}   — filled by child template
  └── {{ partial "footer.html" . }}     — logo, quick links, contact links
      {{ partial "whatsapp-button.html" . }}  — floating WhatsApp FAB
      <script src="/js/lightbox.js">    — universal lightbox (vanilla JS)
```

**Child templates that fill the `main` block:**

| Template | Path | Handles |
|---|---|---|
| Home | `layouts/index.html` | Full homepage with hero, service times, about teaser, events preview, gallery preview, give section, Facebook CTA |
| Single | `layouts/_default/single.html` | Generic content page — page hero + `{{ .Content }}` |
| Events | `layouts/_default/events.html` | Renders `regular_services` and `special_events` lists from front matter, then appends `{{ .Content }}` |
| List | `layouts/_default/list.html` | Page hero + content + child page listing (used for future sections) |

**Service times** on the homepage are rendered by reading `hugo.Data.services` and branching on `{{ if eq .Lang "tn" }}` inline — no separate partial.

**Language-aware links** always use `{{ .Lang }}` as the first path segment (e.g. `href="/{{ .Lang }}/about/"`).

**Theme static assets:**
- `themes/aog-theme/static/css/style.css` — all site styles (merged into `public/css/` by Hugo)
- `themes/aog-theme/static/images/ag-logo.svg` — AG denomination logo

**Project-level static overrides** (in `static/`) take precedence over theme static files:
- `static/css/lightbox.css` — extends the theme CSS
- `static/js/lightbox.js` — vanilla JS lightbox, loaded globally from `baseof.html`

## CMS Architecture

Decap CMS is used as a Git-backed headless CMS. No server renders pages at request time; the CMS only pushes commits to GitHub.

**Edit flow:**
1. Editor navigates to `https://lentsweletau.com/cms`
2. Decap CMS SPA loads from CDN (`decap-cms@3.4.0`) configured inline in `static/cms.html`
3. Editor authenticates via GitHub OAuth; the OAuth token exchange is handled by the Cloudflare Worker at `https://aog-oauth.glebpodsivaka.workers.dev` (source: `cf-workers/oauth-proxy.js`)
4. Editor changes content in the browser UI
5. On save, Decap CMS commits the changed file(s) directly to the `main` branch of `Paparazzi69/aog-lentsweletau`
6. The GitHub push triggers `.github/workflows/deploy.yml`, which rebuilds and redeploys the site

**CMS collections (what editors can change):**

| Collection | Target file(s) | What it edits |
|---|---|---|
| `service_times` | `data/services.yaml` | Bilingual service times shown on homepage |
| `en_events` | `content/en/events.md` | English events page regular services + special events |
| `tn_events` | `content/tn/events.md` | Setswana events page |
| `en_pages` | `content/en/about.md`, `gallery.md`, `give.md` | English page content |
| `tn_pages` | `content/tn/about.md`, `gallery.md`, `give.md` | Setswana page content |
| `gallery_images` | `static/images/gallery/` | Gallery image uploads (creates new files) |

**Note:** The CMS config exists in two forms — `static/cms.html` (the live version, config inline in JS) and `public/admin/config.yml` (an artifact of a prior static-admin approach; the `public/admin/` directory is a build artifact and not the source of truth).

## Deployment Pipeline

```
Editor saves in Decap CMS
        ↓
Commit pushed to GitHub (main branch)  ← also: developer git push
        ↓
.github/workflows/deploy.yml triggered
        ↓
ubuntu-latest runner
  1. actions/checkout@v4
  2. peaceiris/actions-hugo@v3 (latest extended)
  3. hugo --minify  →  output: public/
  4. cloudflare/wrangler-action@v3
     wrangler pages deploy public --project-name=aog-lentsweletau
        ↓
Cloudflare Pages serves public/ globally
  - static/_redirects  →  Cloudflare redirect rules
  - static/_headers    →  Cloudflare response headers (security + cache)
```

**Secrets required in GitHub Actions:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

**Build output:** `public/` directory (committed to repo but generated; not the source of truth).

## Error Handling

**Routing:** Root (`/`) redirects to `/en/` via Cloudflare Pages `_redirects`. No 404 template is defined; Cloudflare Pages serves its default 404.

**Language fallback:** Hugo does not fall back to English if a Setswana page is missing — each language's `contentDir` is independent and must have matching files.

## Cross-Cutting Concerns

**Internationalisation:** Every UI string goes through `i18n "key"` — never hardcoded in templates. Language-specific content is in separate `content/en/` and `content/tn/` trees. Service time labels in `data/services.yaml` carry `_en` / `_tn` field pairs; templates branch with `{{ if eq .Lang "tn" }}`.

**SEO:** Schema.org `Church` JSON-LD injected on home page in `baseof.html`. Open Graph tags on every page. `enableRobotsTXT = true` generates `robots.txt`.

**Security headers:** Applied globally via `static/_headers` — `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`. Long-lived cache headers on `/css/*` and `/images/*`.

**Analytics:** None configured.

---

*Architecture analysis: 2026-04-15*
