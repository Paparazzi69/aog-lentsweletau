# Codebase Concerns

**Analysis Date:** 2026-04-15

---

## Cloudflare WAF Restrictions (Platform Hard Limits)

**"admin" path blocked by WAF:**
- Risk: Any URL whose path contains the word "admin" returns HTTP 500 on the Cloudflare Free plan — an un-skippable WAF rule.
- Files: `static/cms.html`, `public/admin/` (legacy artifact — see below)
- Impact: CMS cannot live at `/admin/` or any sub-path containing "admin".
- Current mitigation: CMS is served at `/cms.html` instead.
- Important: `public/admin/config.yml` and `public/admin/index.html` exist as legacy build artifacts in the `public/` directory (which is gitignored). These files are NOT in `static/` and are therefore not deployed. If the `public/` gitignore is ever relaxed or those files are manually copied to `static/admin/`, the deployed `/admin/` path would trigger HTTP 500 for every visitor.

**YAML files blocked by WAF:**
- Risk: Any `.yml` or `.yaml` file served to the browser returns HTTP 500 — same WAF rule cause.
- Files: `data/services.yaml`, `i18n/en.yaml`, `i18n/tn.yaml`
- Impact: CMS cannot use an external `config.yml`; Hugo data/i18n YAML files must never be exposed as static assets.
- Current mitigation: CMS config is inlined as a JS object in `static/cms.html` (line 13 onward). Changes to CMS field definitions require a code deploy, not a CMS edit.

---

## Image Placeholder Files (Broken Content)

**Gallery images are stubs — not real photos:**
- Files: `static/images/gallery-1.jpg` through `static/images/gallery-8.jpg`
- Evidence: Every file is exactly 12 bytes, containing only the ASCII string `placeholder\n`.
- Impact: The homepage gallery preview section (`themes/aog-theme/layouts/index.html` lines 106–109) and the full gallery page (`content/en/gallery.md`, `content/tn/gallery.md`) display broken images to all visitors.
- Fix: Replace all eight files with real JPEG photos using lowercase extensions.

**Pastor photo is a stub:**
- File: `static/images/pastor.jpg`
- Evidence: 12 bytes, `placeholder\n` content.
- Impact: The pastor card in `content/en/about.md` and `content/tn/about.md` renders a broken image.
- Fix: Replace with the real pastor photograph using a lowercase `.jpg` extension.

**Hero background image is a stub:**
- File: `static/images/hero-bg.jpg`
- Evidence: 12 bytes, `placeholder\n` content.
- Impact: The hero section CSS background (`themes/aog-theme/static/css/style.css`) will show no background image on the homepage.
- Fix: Replace with a real hero image using a lowercase `.jpg` extension.

**church-community.jpg is real but very large:**
- File: `static/images/church-community.jpg`
- Evidence: 12.6 MB JPEG, 5083×3389 px (Nikon Z50, Photoshop-edited, dated 2026-04-14).
- Impact: No resizing or compression has been applied. This will significantly slow the About Brief section on the homepage for visitors on mobile or slow connections. Cloudflare Pages does not resize images automatically on the Free plan.
- Fix: Resize to approximately 1200×800 px and compress before commit. Target under 200 KB.

---

## Image Case-Sensitivity Risk

**Linux filesystem is case-sensitive:**
- Risk: `.JPG` and `.jpg` are different filenames on Linux (Cloudflare Pages runs Linux). A file uploaded with an uppercase extension will resolve to a broken image when referenced with a lowercase path.
- History: `static/images/church-community.JPG` was committed, causing a broken image. Fixed in commit `263f049` by re-uploading as `church-community.jpg`.
- Pattern: Images uploaded via Decap CMS land as lowercase. Images uploaded directly to GitHub (drag-and-drop or web upload) preserve the original case from the local filesystem.
- Rule: Always use lowercase file extensions (`.jpg`, `.png`, `.svg`) for all image files in `static/images/`.

---

## CMS Risks

**No rate-limiting or brute-force protection on CMS access:**
- File: `static/cms.html`
- Risk: `/cms.html` is publicly accessible with no IP restriction. Authentication relies entirely on GitHub OAuth. Anyone can attempt OAuth flows.
- Current mitigation: GitHub OAuth is the only guard. An attacker without GitHub credentials cannot commit.
- Recommendation: Consider adding a Cloudflare Access rule to restrict `/cms.html` to known IPs or require a Cloudflare One login for additional defence-in-depth.

**`CMS_MANUAL_INIT=true` must not be removed:**
- File: `static/cms.html` line 10
- Risk: Decap CMS auto-initialises from any `config.yml` it finds in the same directory. If `CMS_MANUAL_INIT=true` is removed, the CMS will attempt to initialise twice — once from the external config and once from the inline JS call — causing a `removeChild` DOM crash that prevents the CMS from loading at all.
- Fix approach: Never remove line 10 (`window.CMS_MANUAL_INIT = true;`).

**CMS config is inlined — schema changes require code deploys:**
- File: `static/cms.html` lines 13–267
- Impact: Adding or modifying CMS collections, fields, or backend settings requires editing `static/cms.html` and deploying. This cannot be done through the CMS itself.
- This is intentional (to work around the YAML WAF restriction) but must be understood by anyone maintaining the site.

**CMS `gallery_images` collection targets a non-existent folder:**
- File: `static/cms.html` line 243
- The `gallery_images` collection is configured with `folder: "static/images/gallery"`. The directory `static/images/gallery/` does not exist in the repository.
- Impact: If a CMS user attempts to create a gallery image entry, Decap CMS will try to commit a new markdown file into a folder that does not exist. Depending on the GitHub API behaviour, it may silently create the folder or fail with an unclear error. The committed markdown files are also not read by any Hugo template — no layout renders `static/images/gallery/` content.
- Fix: Either create the folder and build a Hugo template to consume the collection, or remove the `gallery_images` collection from the CMS config to prevent confusion.

---

## Hugo Version Pinning Inconsistency

**GitHub Actions uses `hugo-version: 'latest'` — no pin:**
- File: `.github/workflows/deploy.yml` line 16
- Risk: When Hugo releases a new version, the next CI build will use it automatically. Hugo has a history of breaking changes between minor versions (e.g., template function removals, changed render behaviour). A silent Hugo upgrade could break the build or change rendered output without any code change.
- Contrast: `netlify.toml` line 9 correctly pins `HUGO_VERSION = "0.139.0"`.
- Fix: Change `.github/workflows/deploy.yml` to pin `hugo-version: '0.139.0'` to match `netlify.toml`.

---

## Git Workflow Risks

**CMS commits can conflict with local commits:**
- Risk: Decap CMS commits directly to `main` via the GitHub web API. If a developer has local commits not yet pushed, a CMS-triggered commit will cause a non-fast-forward divergence. Pushing without pulling first will either fail or require a force-push.
- Practice: Always run `git pull --rebase origin main` before any local `git push` to account for CMS activity.

**No CI checks beyond build success:**
- File: `.github/workflows/deploy.yml`
- The CI pipeline runs `hugo --minify` then deploys. There are no linting, link-checking, HTML validation, image optimisation, or test steps.
- Impact: Broken internal links, missing alt text, oversized images, and Hugo template warnings are silently deployed.

---

## Dependency Risks

**Decap CMS loaded from unpkg CDN without integrity hash:**
- File: `static/cms.html` line 11
- `<script src="https://unpkg.com/decap-cms@3.4.0/dist/decap-cms.js"></script>`
- Risks:
  1. If unpkg CDN is unavailable, the CMS is completely non-functional.
  2. No `integrity="sha384-..."` attribute — a compromised CDN response would execute arbitrary code in the CMS context (which holds a GitHub token with `repo` scope).
- Fix: Add a `integrity` SRI hash attribute, or self-host the Decap CMS bundle in `static/js/`.

**OAuth proxy hosted on a third-party worker subdomain:**
- File: `static/cms.html` line 19, `cf-workers/wrangler.toml`
- `base_url: "https://aog-oauth.glebpodsivaka.workers.dev"` — this is hosted under a personal Cloudflare account subdomain (`glebpodsivaka`), not the church's own account or domain.
- Risk: If that Cloudflare account is closed, suspended, or the worker is deleted, GitHub OAuth will break and the CMS will be completely inaccessible.
- Fix: Deploy `cf-workers/oauth-proxy.js` to the church's own Cloudflare account and update `base_url` to point to it.

---

## Security Considerations

**OAuth proxy uses `postMessage` with `"*"` target origin:**
- File: `cf-workers/oauth-proxy.js` lines 92–97
- The OAuth callback page posts the GitHub access token using `window.opener.postMessage(..., "*")`. The wildcard target means any window that opened the popup can receive the token.
- Risk: Low in practice (the popup is opened by the CMS page itself), but technically any cross-origin script that opens the same popup URL could intercept the token.
- Recommendation: Replace `"*"` with the explicit Cloudflare Pages domain (e.g., `"https://aog-lentsweletau.pages.dev"`) to restrict token delivery.

**`markup.goldmark.renderer.unsafe = true` in Hugo config:**
- File: `hugo.toml` line 14
- Hugo's Goldmark renderer strips raw HTML from Markdown by default. `unsafe = true` disables this protection and is required for the inline `<div>` blocks used in `content/en/about.md`, `content/en/gallery.md`, and other content files.
- Risk: Any CMS user who can edit Markdown content can inject arbitrary HTML — including `<script>` tags — into the rendered pages.
- Current mitigation: CMS access requires GitHub OAuth; the attack surface is limited to authorised editors.
- Recommendation: Document this explicitly so future maintainers understand why it is set and do not assume content is sanitised.

**No Content Security Policy header:**
- File: `static/_headers`
- The `_headers` file sets `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options` but does not include a `Content-Security-Policy` header.
- Risk: No CSP means XSS attacks via injected content have no browser-level mitigation.

---

## Missing Assets

**No favicon:**
- Reference: `themes/aog-theme/layouts/_default/baseof.html` line 17 — `<link rel="icon" href="/images/favicon.ico">`
- File: `static/images/favicon.ico` does not exist.
- Impact: Browsers show a default blank icon in tabs and bookmarks; a 404 request is fired on every page load.
- Fix: Add a `favicon.ico` (and optionally `apple-touch-icon.png`) to `static/images/`.

**No Open Graph image:**
- File: `themes/aog-theme/layouts/_default/baseof.html`
- The `<head>` template includes `og:title`, `og:description`, `og:type`, and `og:url` but no `og:image`.
- Impact: When pages are shared on Facebook, WhatsApp, or other platforms, no preview image appears.
- Fix: Add `<meta property="og:image" content="/images/church-community.jpg">` (or a dedicated share image) to `baseof.html`.

---

*Concerns audit: 2026-04-15*
