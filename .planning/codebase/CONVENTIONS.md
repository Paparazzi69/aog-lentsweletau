# Coding Conventions

**Analysis Date:** 2026-04-15

## Naming Conventions

### Files

- Content files use `lowercase-kebab` with `.md` extension: `about.md`, `give.md`, `events.md`
- Section index files are named `_index.md`
- Template files use `kebab-case.html`: `baseof.html`, `single.html`, `events.html`, `whatsapp-button.html`
- Static assets use `kebab-case` with lowercase extension: `hero-bg.jpg`, `church-community.jpg`, `gallery-1.jpg`
- CSS files use `kebab-case.css`: `style.css`, `lightbox.css`
- JS files use `kebab-case.js`: `lightbox.js`
- Data files use `kebab-case.yaml`: `services.yaml`
- i18n files are named by language code: `en.yaml`, `tn.yaml`

**Critical:** Image filenames and extensions must be lowercase. The git history records a case-sensitivity incident (`church-community.JPG` vs `church-community.jpg`) that caused broken images on the Linux-based Cloudflare Pages host. Always use lowercase extensions.

### Directories

- Content directories match language codes: `content/en/`, `content/tn/`
- Theme directory follows Hugo convention: `themes/aog-theme/`
- Static assets under `static/` are served at the root: `static/images/` → `/images/`, `static/css/` → `/css/`, `static/js/` → `/js/`
- Theme static assets in `themes/aog-theme/static/` are merged with `static/` at build time

### Hugo Content

- Content filenames are the URL slug: `about.md` → `/en/about/`
- Filenames must match in both language directories: `content/en/about.md` mirrors `content/tn/about.md`

---

## i18n Pattern

All user-visible strings live in `i18n/en.yaml` and `i18n/tn.yaml`. Templates never hardcode English text.

**Key file locations:**
- `i18n/en.yaml` — English strings
- `i18n/tn.yaml` — Setswana translations (keys must be identical to `en.yaml`)

**Usage in templates:**
```html
{{ i18n "welcome_message" }}
{{ i18n "footer_tagline" }}
{{ i18n "service_times" }}
```

**Key naming:** `snake_case`, grouped by section with YAML comments:
```yaml
# Navigation
nav_home: "Home"
nav_about: "About"

# Service Times
service_times: "Service Times"
sunday_service: "Sunday Worship"
```

**Do not add user-visible text to templates without a corresponding entry in both `en.yaml` and `tn.yaml`.**

The `data/services.yaml` file stores structured bilingual data (service names and days) accessed via `hugo.Data.services` in templates. This handles content that is both translatable and used programmatically:
```yaml
sunday:
  name_en: Sunday Worship
  name_tn: Tirelo ya Sontaga
  day_en: Sunday
  day_tn: Sontaga
  time: 9:30 AM
```

Templates access data language conditionally:
```html
{{ if eq .Lang "tn" }}{{ $svc.sunday.name_tn }}{{ else }}{{ $svc.sunday.name_en }}{{ end }}
```

---

## Multilingual Content Pattern

The site is fully bilingual (English / Setswana). Hugo's `languages` config maps each language to its own content directory.

**Config (`hugo.toml`):**
```toml
[languages.en]
  contentDir = "content/en"
[languages.tn]
  contentDir = "content/tn"
```

**Content structure — each page exists in both languages with identical filenames:**
```
content/
  en/
    _index.md       # English homepage
    about.md
    events.md
    gallery.md
    give.md
  tn/
    _index.md       # Setswana homepage
    about.md
    events.md
    gallery.md
    give.md
```

**Language switcher logic in `themes/aog-theme/layouts/partials/header.html`:**
The header constructs the translated URL by replacing the language prefix and using `.File.ContentBaseName` to keep the same slug:
```html
{{ $translatedURL = printf "/%s/%s/" $otherLang .ContentBaseName }}
```

**URL structure:** `/en/about/` and `/tn/about/` — language code is always the first path segment. `defaultContentLanguage = "en"` and `defaultContentLanguageInSubdir = true` mean even English gets the `/en/` prefix.

**Menus are defined per-language** in `hugo.toml` — do not use a shared menu definition.

---

## Frontmatter Conventions

All content files use YAML frontmatter (delimited by `---`).

**Standard fields used across pages:**
```yaml
---
title: "Page Title"
subtitle: "Shown below h1 in page hero"
description: "Used for <meta name=description> and Open Graph"
layout: "single"
---
```

**`layout` field values:**
- `"single"` — standard page layout (`_default/single.html`)
- `"events"` — events layout with structured frontmatter arrays (`_default/events.html`)
- Omit `layout` on `_index.md` to use the list layout

**Events page uses structured arrays in frontmatter** (not separate content files):
```yaml
layout: events
regular_services:
  - title: Sunday Worship Service
    schedule: Every Sunday
    time: 9:30 AM
    location: Main Church Building
    description: "..."
special_events:
  - title: All-Night Prayer Meeting
    schedule: Monthly
    time: 9:00 PM
    ...
```

**`_index.md` frontmatter** (`title` + `description` only — no `layout` or `subtitle`):
```yaml
---
title: "Welcome to Assemblies of God Lentsweletau"
description: "A Spirit-filled community..."
---
```

---

## CSS Naming Patterns

CSS lives in `themes/aog-theme/static/css/style.css` (served as `/css/style.css`). There is no framework — all CSS is hand-written, mobile-first.

**Naming convention: BEM-influenced hyphenated classes**

- Block/component: `.site-header`, `.site-footer`, `.hero`, `.nav-menu`, `.service-card`, `.event-card`, `.give-card`, `.gallery-grid`, `.pastor-card`, `.belief-card`, `.ministry-card`
- Element: `.hero-content`, `.hero-subtitle`, `.hero-buttons`, `.footer-grid`, `.footer-links`, `.footer-tagline`, `.nav-link`, `.nav-active`, `.section-title`, `.section-cta`, `.contact-icon`, `.contact-item`
- State/modifier: `.nav-open` (JS-toggled), `.nav-active` (current page), `.lang-active` (current language), `.btn-primary`, `.btn-secondary`, `.btn-facebook`

**CSS custom properties (design tokens) in `:root`:**
```css
--bg: #FFF8F0        /* warm off-white page background */
--gold: #D4A017      /* primary accent */
--brown: #2C1810     /* text / dark backgrounds */
--green: #4A7C59     /* secondary accent */
--fire: #CC3300      /* CTA red-orange */
--white: #FFFFFF
--light-gold: #F5E6C8
--light-gray: #F0EBE3
--shadow: 0 2px 8px rgba(44, 24, 16, 0.1)
--radius: 8px
```

Always use these variables rather than hardcoding colour values.

**Breakpoints:**
- Mobile-first base styles (no breakpoint)
- `@media (min-width: 640px)` — tablet
- `@media (min-width: 960px)` — desktop (nav switches from hamburger to inline)

**Button classes:** Use `.btn` as the base class, plus one of `.btn-primary`, `.btn-secondary`, or `.btn-facebook`. Never create one-off button styles.

**Supplemental CSS** (feature-specific, loaded globally):
- `static/css/lightbox.css` — overlay and image trigger styles

---

## Image Conventions

**Location:** All images go in `static/images/`. They are referenced in templates and content as `/images/filename.jpg`.

**Current images:**
- `hero-bg.jpg` — homepage hero background (referenced in CSS `background-image`)
- `church-community.jpg` — about section image on homepage
- `gallery-1.jpg` through `gallery-8.jpg` — gallery page images
- `pastor.jpg` — pastor card on about page
- `ag-logo.svg` — header and footer logo (referenced in theme templates)

**Naming rules:**
- Always lowercase filename and extension
- Use descriptive kebab-case names: `gallery-1.jpg`, `church-community.jpg`
- Sequential gallery images: `gallery-N.jpg` where N is a number
- Extension must be lowercase (`.jpg` not `.JPG`) — the host (Cloudflare Pages) runs Linux and is case-sensitive

**Attributes:** All images use `loading="lazy"` except the logo (`loading="eager"`). Include `width` and `height` attributes on above-the-fold images to prevent layout shift.

---

## Git Workflow

**Branch strategy:** Single branch — all changes commit directly to `main`.

**Deployment:** Every push to `main` triggers `deploy.yml` which runs `hugo --minify` and deploys to Cloudflare Pages via wrangler.

**Two commit sources:**
1. **Direct commits via Claude Code / developer** — conversational commit messages: `add universal lightbox (vanilla JS, zero deps)`, `fix: use lowercase .jpg extension for church-community image`
2. **CMS commits via GitHub API (Decap CMS)** — automatic messages in the form: `Update Pages (English) "give_en"`, `Update Matlhakore a Setswana "gallery_tn"`, `Update Service Times "services"`

No pull requests, no feature branches, no staging environment. Changes are live immediately after the CI build completes (~1-2 minutes).

---

## Template Conventions

**Template hierarchy:**
- `themes/aog-theme/layouts/_default/baseof.html` — HTML shell, loads CSS/JS, Schema.org markup
- `themes/aog-theme/layouts/index.html` — homepage sections
- `themes/aog-theme/layouts/_default/single.html` — standard content pages
- `themes/aog-theme/layouts/_default/events.html` — events page with structured data
- `themes/aog-theme/layouts/_default/list.html` — section list pages
- `themes/aog-theme/layouts/partials/header.html` — sticky nav, language switcher
- `themes/aog-theme/layouts/partials/footer.html` — footer grid
- `themes/aog-theme/layouts/partials/whatsapp-button.html` — floating WhatsApp button

**Hugo template rules followed:**
- Use `{{ .Lang }}` (not hardcoded `"en"`) when constructing internal URLs: `href="/{{ .Lang }}/about/"`
- Use `{{ i18n "key" }}` for all user-visible strings
- Use `{{ .Site.Params.phone }}`, `{{ .Site.Params.facebook }}` etc. for contact details — never hardcode
- Use `{{ .Site.Params.whatsapp }}` (number only, no `+`) for WhatsApp links: `https://wa.me/{{ .Site.Params.whatsapp }}`
- External links always include `target="_blank" rel="noopener"`
- `unsafe = true` is set in `[markup.goldmark.renderer]` — raw HTML in Markdown content files is intentional and used extensively

---

*Convention analysis: 2026-04-15*
