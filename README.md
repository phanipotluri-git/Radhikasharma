# Dr. Radhika's Allergy & Lung Clinic — website

Static site for [allergylungclinic.com](https://www.allergylungclinic.com/).
No framework, no database, no server to maintain: a small Python script
assembles plain HTML files, and a host serves them.

## Layout

```
src/layout.html      the shared page shell (head, header, menu, footer)
src/pages/*.html     the body of each page — this is where the words live
src/assets/          stylesheet, script, icons, share image
build.py             stitches layout + pages -> dist/
dist/                the built site (generated; not committed)
```

## Building

```bash
python3 build.py            # writes dist/
python3 build.py --serve    # builds, then serves it on http://localhost:8000
```

No dependencies beyond the Python standard library.

## Editing content

Page text lives in `src/pages/`. To change the immunotherapy page, edit
`src/pages/immunotherapy.html` and rebuild — the header, footer and menu come
from `src/layout.html` and are applied to every page automatically.

Page titles, meta descriptions and URLs are in the `P` and `ARTICLES` tables
near the top of `build.py`. Adding a page means adding a fragment in
`src/pages/` and one row to the relevant table; the sitemap updates itself.

## Deploying

The site is a folder of static files. Any static host works.

**Netlify or Cloudflare Pages** (recommended — free tier, HTTPS included,
redeploys on every push): connect this repository and use

- build command: `python3 build.py`
- publish directory: `dist`

`netlify.toml` already sets this, plus cache and security headers.

**GitHub Pages**: `.github/workflows/deploy.yml` builds and publishes on every
push to the default branch. Enable it under Settings → Pages → Source →
GitHub Actions.

After the first deploy, point the `allergylungclinic.com` DNS at the host and
enable HTTPS.

## Still to do

These need information only the clinic has:

- **A higher-resolution photograph.** The current `src/assets/portrait.webp` is
  400×533, cropped from the only source available. It is sharp enough at the
  size it is displayed, but soft on high-density screens. If a larger original
  exists, crop it 3:4 and replace the file — nothing else needs changing.
- **Fee range.** `priceRange` is omitted from `CLINIC_SCHEMA` rather than
  guessed at. Add it if the clinic is willing to publish a band.
- **Google Business Profile.** Claim it if not already done; for a local clinic
  it typically drives more patients than organic search.
- **Analytics.** Nothing is installed and nothing tracks visitors today. If you
  want visit numbers, add a privacy-friendly tag (Plausible, Fathom) or GA4 to
  `src/layout.html`.
- **A privacy policy**, once anything on the site collects data. Note also that
  the pages currently pull webfonts from Google, which discloses visitor IP
  addresses to Google; self-hosting the two font files removes that.
- **A medico-legal read-through.** The copy is factual and restrained, but NMC
  advertising rules constrain what a registered physician may publish. Worth an
  hour of a healthcare lawyer's time before launch.
