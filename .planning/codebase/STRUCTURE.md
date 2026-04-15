# Codebase Structure

**Analysis Date:** 2026-04-15

## Directory Layout

```
aog-website/
├── hugo.toml                      # Hugo site configuration (languages, menus, params)
├── content/                       # All page content (Markdown + YAML front matter)
│   ├── en/                        # English content tree
│   │   ├── _index.md              # English homepage front matter
│   │   ├── about.md               # About page (EN)
│   │   ├── events.md              # Events page with structured service data (EN)
│   │   ├── gallery.md             # Gallery page with inline HTML (EN)
│   │   └── give.md                # Give / donations page (EN)
│   └── tn/                        # Setswana content tree (mirrors EN structure)
│       ├── _index.md
│       ├── about.md
│       ├── events.md
│       ├── gallery.md
│       └── give.md
├── data/                          # Shared structured data (consumed by templates)
│   └── services.yaml              # Bilingual service times (sunday/wednesday/friday)
├── i18n/                          # UI string translations
│   ├── en.yaml                    # ~100 English translation keys
│   └── tn.yaml                    # ~100 Setswana translation keys
├── themes/
│   └── aog-theme/                 # Custom Hugo theme
│       ├── layouts/
│       │   ├── index.html         # Homepage template (fills "main" block)
│       │   ├── _default/
│       │   │   ├── baseof.html    # Base shell: <head>, header, footer, scripts
│       │   │   ├── single.html    # Generic content page template
│       │   │   ├── events.html    # Events-specific template (reads front-matter lists)
│       │   │   └── list.html      # Section list template
│       │   ├── partials/
│       │   │   ├── header.html    # Site header: logo, lang switcher, nav, phone
│       │   │   ├── footer.html    # Site footer: logo, quick links, contact
│       │   │   └── whatsapp-button.html  # Floating WhatsApp FAB
│       │   └── shortcodes/        # (directory exists, no shortcodes yet)
│       └── static/
│           ├── css/
│           │   └── style.css      # Primary site stylesheet
│           └── images/
│               └── ag-logo.svg    # Assemblies of God denomination logo
├── static/                        # Project-level static files (override theme)
│   ├── _redirects                 # Cloudflare Pages redirect rules (/ → /en/)
│   ├── _headers                   # Cloudflare Pages response headers (security/cache)
│   ├── cms.html                   # Decap CMS SPA entry point for content editors
│   ├── css/
│   │   └── lightbox.css           # Lightbox overlay styles
│   ├── js/
│   │   └── lightbox.js            # Vanilla JS universal lightbox (zero dependencies)
│   └── images/                    # Church photos served at /images/
│       ├── .gitkeep
│       ├── hero-bg.jpg            # Homepage hero background
│       ├── church-community.jpg   # Homepage about-brief section photo
│       ├── pastor.jpg             # Pastor photo used on about page
│       └── gallery-1.jpg … gallery-8.jpg  # Gallery page photos
├── cf-workers/                    # Cloudflare Worker: GitHub OAuth proxy for Decap CMS
│   ├── oauth-proxy.js             # Worker source (handles GitHub OAuth token exchange)
│   └── wrangler.toml              # Worker deployment config (name: aog-oauth)
├── .github/
│   └── workflows/
│       └── deploy.yml             # CI/CD: Hugo build + Cloudflare Pages deploy on push to main
├── .claude/
│   ├── settings.local.json        # Claude Code local settings
│   └── launch.json
├── .planning/
│   └── codebase/                  # Architecture/planning documents (this directory)
└── public/                        # Hugo build output (generated, not source of truth)
    ├── en/                        # Built English pages
    ├── tn/                        # Built Setswana pages
    ├── css/, js/, images/         # Merged static assets
    └── admin/                     # CMS admin artifact (index.html + config.yml)
```

## Directory Purposes

**`content/en/` and `content/tn/`:**
- Purpose: Page content for each language. The two trees are structurally identical — every file in `en/` has a counterpart in `tn/` with the same filename.
- Contains: Markdown files. Pages use YAML front matter for title, subtitle, description, and structured data fields (especially `events.md`). The body (after `---`) is Markdown, which may include raw HTML (goldmark `unsafe: true` is enabled).
- Key files: `_index.md` is the homepage for each language; `events.md` is the most data-rich page, containing `regular_services` and `special_events` front-matter arrays.

**`data/`:**
- Purpose: Structured data consumed by templates at build time via `hugo.Data.*`.
- Contains: `services.yaml` — the canonical record of service times, referenced by the homepage template.
- Note: Any `.yaml`, `.json`, or `.toml` file added here becomes accessible as `hugo.Data.<filename>`. This is the right place for site-wide structured content that is not page-specific.

**`i18n/`:**
- Purpose: All user-visible strings in the UI, keyed by identifier. Templates never hardcode display text.
- Contains: `en.yaml` and `tn.yaml`. Each key appears in both files. Used via `{{ i18n "key_name" }}` in templates.
- Note: The `site_title` key appears in `<title>` tags; navigation labels and section headings come from here rather than from menu config.

**`themes/aog-theme/layouts/`:**
- Purpose: All Hugo templates. Hugo resolves templates by looking in the project `layouts/` directory first, then `themes/aog-theme/layouts/`. Currently there is no project-level `layouts/` directory, so the theme is the sole source of templates.
- Key files: `_default/baseof.html` is the root of every rendered page. `index.html` handles the homepage. `_default/events.html` is the only section-specific override.

**`themes/aog-theme/static/`:**
- Purpose: Base static files provided by the theme. Hugo merges this with `static/` at the project root into `public/`.
- Contains: `css/style.css` (primary styles) and `images/ag-logo.svg`.
- Merge rule: A file at `static/css/lightbox.css` in the project root becomes `/css/lightbox.css` in `public/`, alongside the theme's `style.css`.

**`static/`:**
- Purpose: Project-level static assets and Cloudflare-specific config files.
- Notable non-image files:
  - `_redirects` — processed by Cloudflare Pages for URL redirects
  - `_headers` — processed by Cloudflare Pages for HTTP response headers
  - `cms.html` — the Decap CMS entry point, served at `/cms`

**`cf-workers/`:**
- Purpose: Source and deployment config for the GitHub OAuth proxy Cloudflare Worker.
- This worker is deployed independently of the Hugo site (via `wrangler deploy` from this directory). It is not part of the Hugo build.
- The deployed URL (`https://aog-oauth.glebpodsivaka.workers.dev`) is hardcoded in `static/cms.html` as the `base_url` for Decap CMS authentication.

**`public/`:**
- Purpose: Hugo build output. Committed to the repo but regenerated on every build. Do not edit files here directly.
- The `public/admin/config.yml` is an artifact from a prior static admin setup and is not the source of truth for the CMS configuration (which lives in `static/cms.html`).

## Key Files and What They Do

| File | Role |
|---|---|
| `hugo.toml` | Defines `baseURL`, languages (`en`/`tn`), `defaultContentLanguageInSubdir = true`, site params (phone, social links, brand colours), and per-language main menu entries |
| `themes/aog-theme/layouts/_default/baseof.html` | HTML shell for every page: `<head>` with meta/OG/Schema.org, includes header/footer/whatsapp partials, loads `style.css`, `lightbox.css`, `lightbox.js` |
| `themes/aog-theme/layouts/index.html` | Homepage sections: hero, service times (from `data/services.yaml`), about teaser, events preview, gallery preview, give brief, Facebook CTA |
| `themes/aog-theme/layouts/_default/events.html` | Renders `regular_services` and `special_events` arrays from `events.md` front matter as event cards |
| `themes/aog-theme/layouts/partials/header.html` | Language switcher logic (constructs `/{otherLang}/{page}/` URL), hamburger menu toggle, nav loop from `site.Menus.main` |
| `data/services.yaml` | Single source of truth for service days and times; edited via Decap CMS `service_times` collection |
| `i18n/en.yaml` | All English UI strings (~100 keys); must have a matching key in `i18n/tn.yaml` for every string |
| `static/cms.html` | Decap CMS SPA with full collection config inline; this is the canonical CMS configuration |
| `static/_redirects` | Cloudflare Pages: `/ /en/ 302` |
| `static/_headers` | Cloudflare Pages: security headers on all routes; 1-year cache on `/css/*` and `/images/*` |
| `static/js/lightbox.js` | Vanilla JS lightbox — loaded globally; activates on any `<img>` inside `.gallery-grid` or `.gallery-grid-small` |
| `.github/workflows/deploy.yml` | On push to `main`: checks out, installs Hugo (extended, latest), runs `hugo --minify`, deploys `public/` to Cloudflare Pages |
| `cf-workers/oauth-proxy.js` | Cloudflare Worker handling GitHub OAuth code↔token exchange for Decap CMS |
| `cf-workers/wrangler.toml` | Worker name (`aog-oauth`), entry point, compatibility date |

## Content Organisation

**Adding or editing a page:**
- Both `content/en/<page>.md` and `content/tn/<page>.md` must be kept in sync.
- Front matter fields: `title`, `subtitle`, `description` (SEO), `layout` (optional override).
- Body: Markdown with raw HTML allowed (goldmark unsafe mode is on).
- If the page needs a new layout, add a template to `themes/aog-theme/layouts/_default/`.

**Adding an event or service time:**
- Service times: Edit `data/services.yaml` (or use Decap CMS `Service Times` collection). The homepage reads this file; the events pages have their own front-matter lists in `content/*/events.md`.
- Events page entries: Edit the `regular_services` or `special_events` arrays in `content/en/events.md` and `content/tn/events.md` (or use Decap CMS `Events` collections).

**i18n strings:**
- Add the key to both `i18n/en.yaml` and `i18n/tn.yaml`.
- Reference in templates as `{{ i18n "key_name" }}`.

## Static Assets Organisation

**Images (`static/images/`):**
- All images are served at `/images/<filename>`.
- Named files: `hero-bg.jpg`, `church-community.jpg`, `pastor.jpg`, `gallery-1.jpg` through `gallery-8.jpg`, `ag-logo.svg` (comes from theme).
- Gallery images are referenced directly by name in `content/en/gallery.md` and `content/tn/gallery.md`.
- The Decap CMS `gallery_images` collection is configured to upload to `static/images/gallery/` (a subdirectory that does not yet exist on disk).

**CSS:**
- `themes/aog-theme/static/css/style.css` — base site styles, served at `/css/style.css`
- `static/css/lightbox.css` — lightbox overlay styles, served at `/css/lightbox.css`
- Both are linked from `baseof.html`; there is no bundler or preprocessor.

**JavaScript:**
- `static/js/lightbox.js` — single JS file, vanilla, no dependencies, served at `/js/lightbox.js`
- Loaded globally from `baseof.html` on every page.

## Theme Layout Organisation

Template resolution order (Hugo looks here first, then theme):
1. `layouts/` (project root) — does not exist; no project-level overrides
2. `themes/aog-theme/layouts/` — all templates live here

Layout lookup for a given page:
- Hugo checks `layout` front-matter field first, then falls back to content type/section defaults.
- `layout: events` → `_default/events.html`
- `layout: single` → `_default/single.html`
- `_index.md` → `layouts/index.html` (homepage)
- List pages (section index) → `_default/list.html`

**Adding a new partial:**
- Create `themes/aog-theme/layouts/partials/<name>.html`
- Include with `{{ partial "<name>.html" . }}` in any template

**Adding a new page type:**
- Create `themes/aog-theme/layouts/_default/<type>.html` defining `{{ define "main" }}...{{ end }}`
- Reference it in content front matter as `layout: <type>`

## Where to Add New Code

**New content page (both languages):**
- `content/en/<slug>.md` with front matter `layout: single` (or custom)
- `content/tn/<slug>.md` with translated content
- Add menu entries to both `[[languages.en.menus.main]]` and `[[languages.tn.menus.main]]` in `hugo.toml`

**New site-wide photo:**
- `static/images/<filename>.jpg`

**New CSS styles:**
- For theme-level styles: `themes/aog-theme/static/css/style.css`
- For project-level additions: `static/css/<new-file>.css` and link from `baseof.html`

**New i18n string:**
- Add key to `i18n/en.yaml` AND `i18n/tn.yaml`

**New structured data:**
- Add a YAML/JSON file to `data/`
- Access in templates as `hugo.Data.<filename>`

**New CMS collection:**
- Edit the `collections` array in `static/cms.html`
- Rebuild and redeploy (or let CI handle it on commit to `main`)

## Special Directories

**`public/`:**
- Purpose: Hugo build output
- Generated: Yes (by `hugo --minify`)
- Committed: Yes (currently tracked in git, but treated as generated)

**`cf-workers/`:**
- Purpose: Separate Cloudflare Worker project
- Generated: No
- Committed: Yes (source of truth for the OAuth proxy)

**`.planning/codebase/`:**
- Purpose: Architecture and planning documents for AI-assisted development
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-15*
