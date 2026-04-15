# External Integrations

**Analysis Date:** 2026-04-15

## Cloudflare Pages (Hosting)

**Purpose:** Static site hosting for the Hugo-built output.

- Build command: `hugo --minify` (declared in `netlify.toml` and usable directly in the Cloudflare Pages dashboard)
- Publish directory: `public/`
- Hugo version pinned: `0.139.0` via `HUGO_VERSION` env var in `netlify.toml`
- Production environment variable: `HUGO_ENV = "production"`

**WAF / Firewall Quirks — important for CMS access:**

1. **.yml files blocked by WAF**: Cloudflare's default WAF rules block direct HTTP requests to `.yml` files. This is why the Decap CMS configuration is NOT served as `static/admin/config.yml` (the standard Decap pattern). Instead, the entire CMS config is inlined as a JavaScript object inside `static/cms.html` using the `CMS_MANUAL_INIT` pattern (see Decap CMS section below).

2. **"admin" path blocked**: Cloudflare also blocks the `/admin/` path by default. This is why the CMS is served at `/cms.html` rather than the conventional `/admin/` or `/admin/index.html`.

These two constraints together explain the non-standard CMS setup.

## Cloudflare Workers (OAuth Proxy)

**Purpose:** Acts as a server-side OAuth broker between Decap CMS and GitHub. Required because GitHub OAuth requires a server-side secret exchange that cannot happen in a purely static browser environment.

- Worker name: `aog-oauth`
- Deployed URL: `https://aog-oauth.glebpodsivaka.workers.dev`
- Source: `cf-workers/oauth-proxy.js`
- Worker config: `cf-workers/wrangler.toml`
- Compatibility date: `2024-01-01`

**Endpoints exposed by the Worker:**

| Path | Method | Behaviour |
|------|--------|-----------|
| `/auth` | GET | Redirects to GitHub's OAuth authorization page with `repo,user` scopes |
| `/callback` | GET | Receives OAuth `code`, exchanges it for an access token via GitHub API, returns an HTML page that calls `window.opener.postMessage("authorization:github:success:…", "*")` back to the CMS window |
| `OPTIONS *` | OPTIONS | Returns CORS preflight headers (`Access-Control-Allow-Origin: *`) |

**Secrets (stored in Cloudflare dashboard, never in files):**
- `GITHUB_CLIENT_ID` — set via `wrangler secret put GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET` — set via `wrangler secret put GITHUB_CLIENT_SECRET`

**Deploying the Worker:**
```bash
cd cf-workers
wrangler deploy
```

## Decap CMS

**Version:** 3.4.0

**Access URL:** `/cms.html` (not `/admin/` — see Cloudflare WAF note above)

**Script source (CDN):**
```html
<script src="https://unpkg.com/decap-cms@3.4.0/dist/decap-cms.js"></script>
```
Loaded from `unpkg.com`. No local copy; requires internet access to reach the CMS.

**Initialisation pattern — `CMS_MANUAL_INIT`:**

```html
<script>window.CMS_MANUAL_INIT = true;</script>
<script src="https://unpkg.com/decap-cms@3.4.0/dist/decap-cms.js"></script>
<script>
  CMS.init({ config: { … } });
</script>
```

Setting `window.CMS_MANUAL_INIT = true` before loading the CMS script prevents Decap from auto-initialising and fetching `config.yml` from the server (which would be blocked by Cloudflare WAF). The full config is instead passed as a plain JS object to `CMS.init()`.

**CMS configuration (inlined in `static/cms.html`):**

| Setting | Value |
|---------|-------|
| `backend.name` | `github` |
| `backend.repo` | `Paparazzi69/aog-lentsweletau` |
| `backend.branch` | `main` |
| `backend.base_url` | `https://aog-oauth.glebpodsivaka.workers.dev` |
| `media_folder` | `static/images` |
| `public_folder` | `/images` |

**Collections managed via CMS:**

| Collection | Type | Target file |
|------------|------|-------------|
| `service_times` | File (single) | `data/services.yaml` |
| `en_events` | File (single) | `content/en/events.md` |
| `tn_events` | File (single) | `content/tn/events.md` |
| `en_pages` | Files (about, gallery, give) | `content/en/about.md`, `content/en/gallery.md`, `content/en/give.md` |
| `tn_pages` | Files (about, gallery, give) | `content/tn/about.md`, `content/tn/gallery.md`, `content/tn/give.md` |
| `gallery_images` | Folder (create enabled) | `static/images/gallery/` |

## GitHub OAuth App

**Purpose:** Provides the OAuth credentials that allow Decap CMS to authenticate editors and commit content changes to the GitHub repository.

- App registered on GitHub under the account that owns `Paparazzi69/aog-lentsweletau`
- Required OAuth App settings:
  - Homepage URL: `https://lentsweletau.com`
  - Authorization callback URL: `https://aog-oauth.glebpodsivaka.workers.dev/callback`
- Client ID and Secret are stored as Cloudflare Worker secrets (not in any file in this repo)

**Auth flow summary:**
1. Editor opens `/cms.html`
2. Decap CMS redirects to Worker `/auth` endpoint
3. Worker redirects to GitHub OAuth
4. GitHub redirects back to Worker `/callback` with a `code`
5. Worker exchanges `code` for an access token via GitHub API
6. Worker posts token back to the CMS window via `postMessage`
7. CMS stores token in-browser and uses it for GitHub API calls (read content, commit changes)

## Data Storage

**Databases:** None. No external database.

**Content storage:** GitHub repository (`Paparazzi69/aog-lentsweletau`, `main` branch). CMS edits result in Git commits made via the GitHub API using the OAuth token.

**File storage:** Local to the repo — `static/images/` for all images. No external object storage (no S3, no Cloudflare R2).

**Caching:** None configured explicitly. Cloudflare Pages provides edge caching automatically for static assets.

## Monitoring & Observability

**Error tracking:** None configured.

**Logs:** Cloudflare Workers logs available via the Wrangler CLI (`wrangler tail`) or the Cloudflare dashboard. No structured logging framework.

## External Scripts / CDN Dependencies

| Resource | Source | Used in |
|----------|--------|---------|
| `decap-cms@3.4.0/dist/decap-cms.js` | `https://unpkg.com` | `static/cms.html` |

No other external scripts. All CSS and JS for the public site is self-hosted.

## Social / Contact Links

These are configured in `hugo.toml` `[params]` and referenced in templates. They are outbound links, not API integrations:

- Facebook page: `https://www.facebook.com/profile.php?id=61556569117681`
- WhatsApp: `https://wa.me/26773000896` (rendered on homepage and footer)
- AG national website: `https://ag.org` (footer link)

## Webhooks & Callbacks

**Incoming:** `https://aog-oauth.glebpodsivaka.workers.dev/callback` — GitHub OAuth callback (Worker endpoint, not a Hugo route).

**Outgoing:** None from the static site. The Worker posts to `https://github.com/login/oauth/access_token` during the OAuth exchange.

---

*Integration audit: 2026-04-15*
