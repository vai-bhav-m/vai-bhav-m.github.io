# Deployment

Push to `main`, and a few minutes later the site is live. That's the whole loop once
this is set up.

## The repo name is load-bearing

For a **user site** — served at `https://<username>.github.io/` — the repo must be
named **exactly** `<username>.github.io`, all lowercase, matching your GitHub username.

- `vaibhav.github.io` ✅
- `Vaibhav.github.io` — works, but normalise to lowercase anyway
- `vaibhav.github.com` ❌ — `.io`, not `.com`
- `portfolio` ❌ — that's a *project site*, served at
  `https://<username>.github.io/portfolio/`, which needs `base: '/portfolio/'` in
  `vite.config.ts` or every asset 404s

You get one user site per account. Renaming the repo later is fine and instant — GitHub
redirects the old URL.

Because a user site is served from `/`, Vite's default `base: '/'` is already correct
and you don't need to touch it. That's one entire category of "why are all my images
broken" that you get to skip.

## One-time setup

1. **Create the repo** on GitHub named `<username>.github.io`. Public — Pages requires
   it on free accounts.
2. **Connect your local repo:**
   ```powershell
   git remote add origin https://github.com/<username>/<username>.github.io.git
   git branch -M main
   git push -u origin main
   ```
3. **Add the workflow** at `.github/workflows/deploy.yml` (below).
4. **Turn Pages on:** repo → **Settings** → **Pages** → **Source** → select
   **GitHub Actions**.

   This step is the one people miss — **and it did happen here.** With Source left on
   "Deploy from a branch", Pages served the repository verbatim: `/src/main.tsx` came
   back as raw TypeScript the browser could not execute, so the site rendered a blank
   white page. The workflow was green the whole time. If the deployed HTML references
   `/src/main.tsx` instead of `/assets/index-*.js`, this is the cause.
5. Push. Watch the **Actions** tab.

## The workflow

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:        # lets you re-run manually from the Actions tab

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Things in there that aren't decoration:

- **`permissions`** — without `pages: write` and `id-token: write`, the deploy step
  fails with an opaque authentication error. This block is required, not optional.
- **`concurrency`** — two pushes in quick succession would otherwise race, and the
  older one can win. `cancel-in-progress: false` lets the first finish rather than
  leaving a half-published state.
- **`npm ci`** (not `npm install`) — installs exactly what's in `package-lock.json`, so
  CI builds what you tested. **Commit your lockfile**, or `npm ci` fails outright.
- **No Python step.** The embedding index (from
  [Phase 4](04-roadmap.md#phase-4--semantic-search-the-ml-layer)) is generated locally
  and committed. Installing PyTorch here would add minutes to every deploy and be the
  most likely thing to break it. If you ever move it into CI, use the CPU-only wheel
  (`pip install torch --index-url https://download.pytorch.org/whl/cpu`) — the default
  is a ~2 GB download — and cache pip.

## What to expect the first time

- The Actions run takes ~1–2 minutes.
- **The very first deploy can take up to ~10 minutes to appear** after the run goes
  green, and often shows a 404 in the meantime. This is normal, one-time DNS and CDN
  propagation. Don't start debugging a working deploy.
- Afterwards, updates appear within a minute or two.
- HTTPS is automatic and free.

## Deep links 404

**Only relevant if you add `react-router` in Phase 3.** The single-page design in
Phase 1 uses `#anchors`, which are handled entirely in the browser and never hit the
server — so this doesn't apply yet.

The problem: GitHub Pages serves files. When someone opens
`username.github.io/projects/foo` directly, Pages looks for a file at that path, finds
nothing, and returns 404. It never reaches React. This works fine while you click
around the site (the router handles navigation client-side) and breaks the moment
someone opens a link in a fresh tab — which is exactly what happens when you share one.

The fix is to make the 404 page *be* your app. Pages serves `404.html` for any unmatched
path, so copy your built `index.html` to it:

```jsonc
"build": "tsc --noEmit && vite build && copy dist\\index.html dist\\404.html"
```

React Router reads `window.location` on load and renders the right route. The URL stays
correct; the visitor sees no redirect.

> On the Linux CI runner that `copy` command doesn't exist. Use a cross-platform
> approach — a tiny Node script, or the `cpy-cli` / `shx` package — rather than
> discovering this when the deploy fails.

## Other things worth knowing

**`.nojekyll`** — GitHub Pages historically ran content through Jekyll, which ignores
files and folders starting with `_`. The Actions-based deploy above skips Jekyll
entirely, so you don't need it. Adding an empty `.nojekyll` in `public/` is free
insurance if you ever see unexplained missing assets.

**Everything is public.** The repo, the built site, and every file in `public/` —
including your resume PDF, which search engines will index. Check what's on it.

**Custom domain**, if you get one later: add it under Settings → Pages, create a
`CNAME` file in `public/` containing the domain, and point your DNS at GitHub's IPs.
Enable "Enforce HTTPS" after the certificate provisions (can take an hour).

**Build failures block deploys.** The previous version stays live — a broken build
never takes your site down. Still, catch it locally with `npm run build` first; reading
the error in your own terminal is far nicer than in an Actions log.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Workflow green, site still 404 | Settings → Pages → Source isn't set to "GitHub Actions". Or it's the first deploy — wait 10 minutes. |
| `npm ci` fails: "lock file not found" | `package-lock.json` isn't committed. Commit it. |
| Deploy step fails on permissions | The `permissions:` block is missing or incomplete. |
| Site loads, all assets 404 | `base` in `vite.config.ts` is set to something other than `/`. A user site is served from the root. |
| Old version still showing | Browser cache. Hard-refresh (Ctrl+Shift+R) or try a private window before assuming the deploy failed. |
| Build fails in CI, works locally | Usually a filename case mismatch. Windows is case-insensitive, the Linux runner is not — `import Nav from './nav'` works on your machine and fails in CI. |
| Search finds nothing on the live site | `src/data/search-index.json` wasn't regenerated or wasn't committed. |

That case-sensitivity one catches nearly everyone exactly once. When a build passes
locally and fails in CI with a "module not found" for a file you can plainly see,
check the capitalisation first.
