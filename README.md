# Chikit — Coming Soon

The page visitors see at **https://chikit.in** until the store opens. Plain HTML, CSS and JavaScript: no build
step, no dependencies, nothing to install. It is published by **GitHub Pages** straight from this branch (`master`).

The full store (React + Node + MySQL) lives on the `redesign/ui-from-scratch` branch and is not served from here.

## What is on the page

- A full-screen Ayurveda photo that fades softly into the shop's cream around the middle, with film grain and drifting gold dust.
- The official Chikit logo, untouched, sitting directly on the page (the logo is plum, so the page around it is light).
- "Preparing for launch / Coming Soon", a plum loader bar with its percentage, and a short tagline.
- A loading screen (logo + progress line) that fades away, then the page rises in.
- Brand fonts (Poppins), self-hosted: nothing is loaded from other websites.
- Works from 320px phones to wide monitors, in landscape, with JavaScript off, and respects "reduce motion".
- Lighthouse: Performance 99-100, Accessibility 100, Best Practices 100, SEO 100. About 135-170 KB in total.

No date and no email address are shown on the page.

## How the loader bar works

The bar fills in step with the days leading up to the opening. The dates are only used to work out how far along
the bar is; they are never displayed. Edit the `CONFIG` block at the top of `assets/script.js`:

```js
const CONFIG = {
  progressStart: "2026-09-29T00:00:00+05:30",
  progressEnd: "2026-10-30T00:00:00+05:30",
  floor: 8,       // the bar is never emptier than this (%)
  ceiling: 96,    // ...and never completes until the real opening
};
```

## Run it on your computer

Open `index.html`, or serve the folder so root-relative links (`/assets/...`) work:

```bash
npx serve .
```

## Files

```
index.html           page markup, loading-screen styles, share/SEO tags
404.html             branded "page not found"
assets/style.css     layout, theme, animations
assets/script.js     loader bar, floating light, loading screen
assets/brand/        official logo (webp)
assets/fonts/        Poppins, self-hosted
assets/images/       hero photo in three sizes (webp)
og-image.png         picture shown when the link is shared
site.webmanifest, favicon*, apple-touch-icon.png, robots.txt, sitemap.xml
CNAME                custom domain for GitHub Pages (chikit.in) - do not delete
.nojekyll            tells GitHub Pages to publish the files exactly as they are
```

## Publishing

Every push to `master` updates the live site within a minute or two (Settings → Pages: "Deploy from a branch",
`master`, `/ (root)`). Keep the `CNAME` file: removing it disconnects the chikit.in domain.
DNS for the domain is managed at GoDaddy and should keep pointing at GitHub Pages while this page is live.

## When the store opens

Replace this page by deploying the store (see the `redesign/ui-from-scratch` branch) and then pointing the
domain at its hosting. Do not change the GoDaddy DNS records before the new hosting is ready.
