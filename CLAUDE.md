# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:4321
npm run build     # build to ./dist/
npm run preview   # preview production build locally
npx astro check  # type-check .astro files
```

No test runner or linter is configured. Node.js >=22.12.0 is required.

## Architecture

This is an **Astro 6** static site for a Traditional Chinese travel blog ("重來的旅人" / Comeback Traveler) deployed to Firebase Hosting via GitHub Actions. The site focuses on eSIM comparisons and travel deal guides.

**Key tech stack:**
- Astro 6 with MDX and sitemap integrations
- Tailwind CSS v4 (configured via `@tailwindcss/vite` Vite plugin — no `tailwind.config.js`)
- Sharp for OG image generation (`generate-og.mjs`)
- Deployment: `FirebaseExtended/action-hosting-deploy@v0` via `.github/workflows/deploy.yml`

**No content collections** — all pages are `.astro` files under `src/pages/`. There is no `src/content/` directory.

**Single layout:** `src/layouts/BlogLayout.astro` accepts `title`, `description`, `keywords?`, and `ogImage?` props. It sets `lang="zh-TW"`, generates canonical URLs, Open Graph meta tags, and includes Adotone tracking scripts.

**Design system** — CSS custom properties defined inline per page (no shared design tokens file):
- Colors: `--ink`, `--ink-light`, `--paper`, `--paper-warm`, `--accent` (#c0392b red), `--gold`, `--border`
- Fonts: Noto Serif TC (`--serif`) and Noto Sans TC (`--sans`) loaded from Google Fonts

**Page structure:**
- `src/pages/index.astro` — homepage with hero, story box, eSIM article cards, Klook coupon cards
- `src/pages/esim.astro` — eSIM brand comparison table
- `src/pages/esim/japan.astro`, `korea.astro`, `install.astro` — individual destination/guide pages

All page-specific styles are written as `<style>` blocks inside the `.astro` files. Tailwind utility classes are used minimally; most styling uses custom CSS with the design tokens above.

## Deployment

Production site: `https://comebacktraveler.com` (configured in `astro.config.mjs`)

Firebase project: `comeback-traveler-web` (default `web.app` URL: `https://comeback-traveler-web.web.app`). Hosting config lives in `firebase.json` (publish dir: `dist`) and `.firebaserc`.

CI/CD pushes to `main` branch trigger the GitHub Actions workflow which builds and deploys to Firebase Hosting using the `FIREBASE_SERVICE_ACCOUNT_COMEBACK_TRAVELER_WEB` repo secret. Manual deploys can be run with `firebase deploy --only hosting`.

DNS is managed at Porkbun (NS: `*.ns.porkbun.com`) with apex A record pointing to `199.36.158.100` and `www` CNAME redirecting to apex via Firebase.
