# Technology Stack

**Analysis Date:** 2026-04-15

## Languages

**Primary:**
- Go Templates (Hugo) - All HTML layout/template files in `themes/aog-theme/layouts/`
- TOML - Site configuration (`hugo.toml`, `wrangler.toml`, `netlify.toml`, `cf-workers/wrangler.toml`)
- YAML - i18n strings (`i18n/en.yaml`, `i18n/tn.yaml`), data files (`data/services.yaml`)
- Markdown - Content files (`content/en/*.md`, `content/tn/*.md`)

**Secondary:**
- JavaScript (ES5-compatible, IIFE pattern) - `static/js/lightbox.js`
- CSS (custom, no preprocessor) - `themes/aog-theme/static/css/style.css`, `static/css/lightbox.css`
- JavaScript (ES module) - `cf-workers/oauth-proxy.js` (Cloudflare Worker)

## Runtime

**Environment:**
- Hugo Extended 0.139.0 (minimum 0.120.0 per `themes/aog-theme/theme.toml`)
- Node.js / Wrangler CLI — only required for deploying the Cloudflare Worker (`cf-workers/`)

**Package Manager:**
- None for the Hugo site itself — no `package.json`, no lockfile
- Wrangler CLI used directly for Worker deployment

## Frameworks

**Core:**
- Hugo 0.139.0 - Static site generator; configured in `hugo.toml`
- Theme: `aog-theme` - Custom, bespoke theme in `themes/aog-theme/`; not a third-party theme

**Testing:**
- None — no test framework detected

**Build/Dev:**
- Hugo CLI (`hugo --minify`) - Produces output in `public/`
- Wrangler CLI - For deploying `cf-workers/oauth-proxy.js` independently

## Key Dependencies

**Critical:**
- Hugo 0.139.0 - The sole build tool; changing version may break Goldmark/i18n behaviour
- Decap CMS 3.4.0 - Loaded at runtime via CDN (see INTEGRATIONS.md); drives the `/cms.html` editor

**Infrastructure:**
- No npm packages; no Go modules beyond Hugo itself

## Configuration

**Environment:**
- No `.env` file used by Hugo itself
- Cloudflare Worker secrets (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) are set via `wrangler secret put` and stored in the Cloudflare dashboard — never in files

**Build:**
- `hugo.toml` — master site config: `baseURL`, theme, languages (en + tn), menus, site params (colours, phone, social links), Goldmark `unsafe = true` (allows raw HTML in Markdown), output formats
- `netlify.toml` — declares Hugo 0.139.0, build command `hugo --minify`, publish dir `public`; also usable as Cloudflare Pages build config
- `wrangler.toml` (root) — points bucket `./public` for potential Wrangler Pages deployment (name: `aog-lentsweletau`)
- `cf-workers/wrangler.toml` — Worker-specific config (name: `aog-oauth`, entry: `oauth-proxy.js`)
- `themes/aog-theme/theme.toml` — Theme metadata; sets `min_version = "0.120.0"`

## CSS Approach

Custom hand-written CSS only. No CSS framework (no Tailwind, Bootstrap, etc.).

- `themes/aog-theme/static/css/style.css` — Primary stylesheet. Mobile-first with CSS custom properties (variables) defined on `:root`. System font stack (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto`). Colour palette driven by Hugo params mirrored as CSS vars: `--bg #FFF8F0`, `--gold #D4A017`, `--brown #2C1810`, `--green #4A7C59`, `--fire #CC3300`.
- `static/css/lightbox.css` — Lightbox overlay styles (no framework dependency).

Both stylesheets are linked unconditionally from `themes/aog-theme/layouts/_default/baseof.html`.

## JavaScript Approach

Zero external JS dependencies at runtime (except Decap CMS on the `/cms.html` page).

- `static/js/lightbox.js` — Vanilla JS, IIFE, ES5-compatible. Auto-initialises on `DOMContentLoaded`. Skips logos/icons by class name heuristics and rendered size. No bundler, loaded via a plain `<script src="/js/lightbox.js">` tag in `baseof.html`.
- No jQuery, no Alpine, no React. Inline SVG icons are used throughout templates.

## Multilingual Setup

Hugo's built-in i18n system:

- Two languages: `en` (English, weight 1) and `tn` (Setswana, weight 2)
- Content directories: `content/en/` and `content/tn/`
- Translation strings: `i18n/en.yaml` and `i18n/tn.yaml`
- `defaultContentLanguage = "en"`, `defaultContentLanguageInSubdir = true` (URLs: `/en/`, `/tn/`)
- Language switching is handled in templates via `.Lang` variable

## Platform Requirements

**Development:**
- Hugo 0.139.0+ installed locally
- `wrangler` CLI (for Worker changes only)

**Production:**
- Cloudflare Pages (static hosting of `public/`)
- Cloudflare Workers (OAuth proxy, separate deployment)

---

*Stack analysis: 2026-04-15*
