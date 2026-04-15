# Testing Patterns

**Analysis Date:** 2026-04-15

## Test Framework

**Runner:** None

**Assertion Library:** None

**Test Files:** None found

There are no automated tests of any kind in this project. No test runner config, no `*.test.*` files, no `*.spec.*` files, and no test-related entries in any package manifest (there is no `package.json`). This is a Hugo static site with no JavaScript build pipeline — only two vanilla JS files exist (`static/js/lightbox.js` and `static/css/lightbox.css`).

---

## How the Site Is Manually Verified

### Local Development Server

The site is run locally via Hugo's built-in development server.

**Config:** `.claude/launch.json`
```json
{
  "configurations": [
    {
      "name": "aog-website",
      "runtimeExecutable": "C:/Users/user/AppData/Local/Microsoft/WinGet/Links/hugo.exe",
      "runtimeArgs": ["server", "--bind", "0.0.0.0"],
      "port": 1313,
      "autoPort": true
    }
  ]
}
```

**Command:**
```bash
hugo server --bind 0.0.0.0
```

**Access:** `http://localhost:1313`

Hugo's dev server provides live reload on file saves. All language routes are available locally:
- `http://localhost:1313/en/` — English homepage
- `http://localhost:1313/tn/` — Setswana homepage
- `http://localhost:1313/en/about/`, `/en/events/`, `/en/gallery/`, `/en/give/`
- `http://localhost:1313/tn/about/`, `/tn/events/`, `/tn/gallery/`, `/tn/give/`

### Claude Code Preview Panel

The `mcp__Claude_Preview__preview_start` permission in `.claude/settings.local.json` enables the Claude Code preview panel. This renders the live local server visually during development sessions, allowing visual verification without opening a separate browser.

### Production Build Verification

To confirm the site builds without errors before pushing:
```bash
hugo --minify
```

This produces the `public/` output directory. A successful exit (no errors in stdout) confirms:
- All templates render without Hugo errors
- All i18n keys referenced in templates exist in both `en.yaml` and `tn.yaml`
- All content frontmatter is valid YAML
- Hugo version compatibility

The CI pipeline (`deploy.yml`) runs `hugo --minify` on every push to `main`. A failed build blocks deployment. Build output is visible in the GitHub Actions log.

---

## Current Manual Verification Checklist

These are the checks performed manually after changes:

**After content edits:**
- [ ] Open `http://localhost:1313/en/[page]` — confirm content renders
- [ ] Open `http://localhost:1313/tn/[page]` — confirm Setswana translation renders
- [ ] Language switcher links navigate correctly between `/en/` and `/tn/` versions

**After i18n changes (`en.yaml` / `tn.yaml`):**
- [ ] Both files have identical keys (no missing key in either file)
- [ ] Run `hugo server` and check the page that uses the changed key

**After image uploads:**
- [ ] Verify filename is lowercase (both name and extension)
- [ ] Confirm image loads at `http://localhost:1313/images/filename.jpg`
- [ ] Check the page that references the image for broken-image rendering

**After template changes:**
- [ ] Run `hugo --minify` to catch template syntax errors
- [ ] Check both language versions of affected pages
- [ ] Verify mobile layout at narrow viewport (hamburger menu)

**After CSS changes:**
- [ ] Test at three viewport widths: mobile (<640px), tablet (640–959px), desktop (960px+)
- [ ] Confirm sticky header and floating WhatsApp button remain functional

---

## Known Testing Gaps

The following areas have no verification coverage and are at risk of silent regressions:

### High Priority

**Missing i18n key detection**
- Risk: A key referenced via `{{ i18n "key" }}` in a template but absent from one YAML file silently renders as an empty string in that language.
- Fix approach: Add a script or Hugo build check that compares keys between `i18n/en.yaml` and `i18n/tn.yaml` and fails if they differ.

**Broken image links**
- Risk: Image filenames in content (`/images/gallery-1.jpg`) or templates could silently 404 if files are renamed or deleted. The case-sensitivity bug in git history (`church-community.JPG` vs `.jpg`) demonstrates this has already happened.
- Fix approach: A post-build link checker (e.g., `htmltest` or `muffet`) run against the `public/` directory would catch broken image and anchor links.

**Language parity**
- Risk: A new page added to `content/en/` may not have a matching file in `content/tn/`, causing the language switcher to 404.
- Fix approach: A script comparing `ls content/en/` and `ls content/tn/` filenames as a pre-commit check.

### Medium Priority

**Build output smoke test**
- Risk: `hugo --minify` succeeds but the output HTML is malformed or missing sections.
- Fix approach: A simple HTML validation pass on `public/en/index.html` checking for expected elements (`.hero`, `.section-title`, `<footer>`).

**Events frontmatter structure**
- Risk: The events page uses structured YAML arrays in frontmatter (`regular_services`, `special_events`). A malformed list item (e.g., missing `time:` field) will silently render an incomplete event card.
- Fix approach: Schema validation of `content/en/events.md` and `content/tn/events.md` frontmatter before build.

**Data file integrity**
- Risk: `data/services.yaml` drives service times displayed on the homepage. A missing key (`sunday.time`, `wednesday.name_tn`) would render blank.
- Fix approach: Include `data/services.yaml` in a YAML schema validation step.

### Low Priority

**JavaScript lightbox regression**
- `static/js/lightbox.js` is vanilla JS with no tests. Breakage would only be caught visually.
- Fix approach: A simple Playwright or Puppeteer test clicking a gallery image and asserting `#lightbox-overlay` becomes visible.

**CSS regression**
- No visual regression tests. Layout breakage at a specific breakpoint could go unnoticed.
- Fix approach: Percy or BackstopJS snapshots of the homepage at 375px, 640px, and 1200px widths.

---

## Recommended First Testing Step

Given the site's simplicity, the highest-value, lowest-effort improvement is a **post-build link checker**. After running `hugo --minify`, run an HTML link checker against the `public/` directory to catch:
- Broken image `src` attributes (catches case-sensitivity issues)
- Internal 404s (catches missing language-pair pages)
- Malformed internal hrefs

This can be added as a step in `.github/workflows/deploy.yml` between the `Build` and `Deploy` steps.

---

*Testing analysis: 2026-04-15*
