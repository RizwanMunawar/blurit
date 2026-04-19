# BlurKit

Free, private, one-click blur tool for photos. AI auto-detects faces. Runs 100% in your browser — images never leave the user's device.

## Project structure

```
blurkit/
├── index.html          # Main page
├── css/
│   └── style.css       # All styles
├── js/
│   └── app.js          # All logic
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── vercel.json         # Vercel config (caching, security headers)
├── package.json
├── .gitignore
└── README.md
```

## Local development

```bash
npm run dev
# opens at http://localhost:3000
```

Or just open `index.html` directly in a browser.

## Deploy to Vercel (3 steps)

### Option A — via GitHub (recommended)

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Click **Deploy**. No build settings needed — it's a static site.

Vercel auto-detects it as a static project. First deploy takes ~20 seconds.

### Option B — via Vercel CLI

```bash
npm i -g vercel
cd blurkit
vercel
# follow prompts; pick defaults for everything
vercel --prod    # promote to production
```

### Option C — drag & drop

1. Zip this folder.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Drag the zip onto the page.

## Custom domain

After deploying:
1. In Vercel dashboard → your project → Settings → Domains.
2. Add `blurkit.app` (or your domain).
3. Update DNS at your registrar with the CNAME Vercel provides.

Then update these files to match your actual domain:
- `index.html` — `<link rel="canonical">`, Open Graph tags, JSON-LD
- `public/robots.txt` — sitemap URL
- `public/sitemap.xml` — loc URL

## Theme customization

All colors are CSS variables at the top of `css/style.css`:

```css
:root {
  --bg:      #0a1024;   /* background */
  --bg-elev: #141e32;   /* cards */
  --accent:  #00e0ff;   /* cyan highlight */
  --ink:     #f5f7fa;   /* primary text */
  /* ... */
}
```

Change one value, everything updates. To match a different dashboard aesthetic, just swap `--accent` and `--bg` values.

## SEO checklist (already done)

- Meta title, description, keywords
- Open Graph + Twitter Card
- Canonical URL
- JSON-LD structured data (WebApplication schema)
- robots.txt
- sitemap.xml
- Semantic HTML (`<main>`, `<article>`, `<aside>`, ARIA labels)
- Proper heading hierarchy

## What's NOT included (add if needed)

- Analytics — add Plausible / Fathom / Vercel Analytics as preferred
- Error tracking — add Sentry if you want crash reports
- OG image — `og-image.png` for nicer link previews (1200×630)
- PWA manifest — if you want it installable
- Cookie banner — not needed (no cookies are set)

## Tech notes

- Face detection via [@vladmandic/face-api](https://github.com/vladmandic/face-api) (MIT, maintained fork of face-api.js)
- Model loaded lazily from jsDelivr CDN on first upload (~200KB, cached after)
- Canvas-based blur processing, no WebAssembly
- Pure vanilla JS — no framework, no build step

## License

MIT — do what you want.
