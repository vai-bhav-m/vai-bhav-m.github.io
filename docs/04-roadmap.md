# Roadmap

Six phases. Each ends with something that works and that you can look at. That's
deliberate — the fastest way to stay unstuck in an unfamiliar stack is to never be
more than one working state away from the last thing that worked.

**Deploy at the end of Phase 1, before search exists.** Getting a URL live early means
that when something breaks later, you know it isn't the deployment. Debug one unknown
at a time.

| Phase | Outcome | Rough time |
| --- | --- | --- |
| [0](#phase-0--scaffold-and-local-preview) | React app running at `localhost:5173` | 1 evening |
| [1](#phase-1--the-real-site-live) | Your actual site, live at `username.github.io` | 1 weekend |
| [2](#phase-2--keyword-search) | Working search | 1 afternoon |
| [3](#phase-3--polish) | Tag filtering, scroll-spy, real design | ongoing |
| [4](#phase-4--semantic-search-the-ml-layer) | Embeddings, in-browser | later |
| [5](#phase-5--flask-only-when-triggered) | Backend, if a trigger fires | later, maybe never |

---

## Phase 0 — Scaffold and local preview

**Goal:** a React app you can see in a browser on your own machine. No content, no
styling. Just proof the toolchain works.

1. Install **Node.js LTS** and **Python 3.11+** if you don't have them. Verify:
   `node --version`, `python --version`.
2. Create the Vite app in this directory:
   ```powershell
   npm create vite@latest . -- --template react-ts
   npm install
   ```
   Say yes when it warns the directory isn't empty — `docs/` is preserved.
3. `npm run dev`, open `http://localhost:5173`.
4. Edit the heading in `src/App.tsx`. The browser should update without a refresh.
   That's hot module replacement; seeing it work confirms the dev server is wired up.
5. Add Tailwind:
   ```powershell
   npm install tailwindcss @tailwindcss/vite
   ```
   Register the plugin in `vite.config.ts`, and put this at the top of your CSS:
   ```css
   @import "tailwindcss";
   @custom-variant dark (&:where(.dark, .dark *));
   ```
   That second line is what makes `dark:` follow your theme class instead of only the
   OS setting. Adding it now saves a confusing debugging session in Phase 1.
6. Create the empty structure you'll grow into: `content/`, `ml/`, `src/lib/`,
   `src/components/`. Directories that already exist get used.
7. `git init`, commit.

**Done when:** `npm run dev` shows your edited page and a Tailwind class visibly
applies. If anything misbehaves, [06-local-development.md](06-local-development.md).

---

## Phase 1 — The real site, live

**Goal:** the actual portfolio, deployed. This is the phase that matters most. A plain
site that's live beats a sophisticated one that isn't.

### 1a. Content first

Write the Markdown before building components — the content shape should drive the
component shape, not the reverse.

- `content/about.md`
- `content/projects/*.md` — one per project
- `content/experience/*.md` — one per role

Frontmatter carries everything structured:

```markdown
---
title: Semantic Search Portfolio
slug: semantic-search
summary: One sentence a recruiter reads in three seconds.
tags: [python, ml, react]
repo: https://github.com/you/repo
demo: https://...
---

Longer description in Markdown.
```

Write the `summary` fields carefully. They're the project card text now, and in Phase 4
they become the thing that gets embedded — search quality will literally be summary
quality.

### 1b. The content layer

`src/lib/content.ts`, loading those files with `import.meta.glob` and parsing
frontmatter via `gray-matter`. Export `getProjects()`, `getExperience()`, `getAbout()`,
and `getSearchItems()` — the last one returning the flat `SearchItem[]` from
[02-architecture.md](02-architecture.md#the-searchable-item-contract), even though
nothing consumes it until Phase 2.

### 1c. Theme

Do this before building components, not after. Retrofitting dark mode onto colours
chosen only for light mode is genuinely painful.

1. The inline no-flash script in `index.html` — copy it from
   [03-features-and-ui.md](03-features-and-ui.md#the-flash-you-must-prevent). It has to
   be inline and blocking, not in a module.
2. `src/lib/theme.ts` — three states, `localStorage`, and a `matchMedia` listener so
   `system` follows live OS changes.
3. `ThemeToggle.tsx` in the nav.
4. Pick both palettes now. Check contrast in both.

### 1d. Components

- `Nav.tsx` — sticky, name on the left, section links, search box and theme toggle on
  the right, hamburger below 768px. The search box is a button that does nothing yet.
- `About.tsx` — bio, resume download button, social links.
- `ProjectCard.tsx` + the projects section.
- `Experience.tsx` — timeline.
- `Contact.tsx` — links and the Google Form (see
  [03-features-and-ui.md](03-features-and-ui.md#contact-section)). Submit a test
  message and confirm it lands in the responses sheet.
- `section { scroll-margin-top: 5rem }` so the sticky nav stops covering headings.

### 1e. Ship it

1. Drop `Vaibhav-Resume.pdf` in `public/`.
2. Check it at 390px wide. More than half your visitors are on a phone, and a portfolio
   that's broken there reads as careless.
3. `npm run build && npm run preview` — look at the *production* build locally before
   pushing. This catches a whole class of problems the dev server hides.
4. Deploy per [07-deployment.md](07-deployment.md).

**Done when:** `https://<username>.github.io` shows your site, on your phone, over
mobile data. Send it to someone.

> **Stop and enjoy this.** It's the hardest part. Everything after is additive.

---

## Phase 2 — Keyword search

**Goal:** working search. No ML. On a ~20-item site this is genuinely good, not a
placeholder.

1. `npm install minisearch` — ~10 KB, no dependencies.
2. `src/lib/search.ts`, with exactly this surface:
   ```ts
   export type Result = { item: SearchItem; score: number; via: 'keyword' | 'semantic' }
   export async function search(query: string): Promise<Result[]>
   ```
   Async and returning `Result[]` even though MiniSearch is synchronous. That's the
   seam that makes Phase 4 a change to one function body instead of a component
   rewrite. Index `title`, `summary` and `tags` with `prefix: true, fuzzy: 0.2`.
3. `SearchOverlay.tsx` — full-screen modal, opens on Ctrl+K or clicking the nav box.
   Arrow keys move, Enter navigates, Escape closes. Trap focus while open, and restore
   focus to the trigger on close.
4. Wire the nav search box to open it.
5. Empty states: nothing typed, and nothing found. Both need to look deliberate.

**Done when:** Ctrl+K, type a technology name, hit Enter, land on that project.

**Why this is its own phase:** you now have the entire search *interface* — overlay,
keyboard handling, result rendering, scroll-to-anchor — built and tested. Phase 4 only
changes where the scores come from.

---

## Phase 3 — Polish

Pick from these as you feel like it. None are blocking.

- **Tag filtering** on the projects section. Client-side array filtering; collect tags
  from the files, never a hand-maintained list. Only show the UI once you have enough
  projects for it to help.
- **Scroll-spy** nav highlighting via `IntersectionObserver` with the `rootMargin`
  trick in [03-features-and-ui.md](03-features-and-ui.md#scroll-spy-nav-highlighting).
  Don't use a scroll event listener.
- **Real design.** Typography, spacing, a considered dark palette, an OG image so links
  preview properly when shared.
- **Accessibility pass** against the checklist in
  [03-features-and-ui.md](03-features-and-ui.md#accessibility-and-polish-checklist).
- **Per-project pages**, if you want shareable URLs. Read
  [07-deployment.md](07-deployment.md#deep-links-404) first — GitHub Pages has a
  specific gotcha with client-side routes.
- **Analytics**, if you want them. Anything privacy-respecting and static-friendly.

---

## Phase 4 — Semantic search (the ML layer)

**Goal:** "have you done anything with images?" finds the project whose text says
"computer vision". Full design in [05-search-design.md](05-search-design.md).

Deferred on purpose. Do it when Phases 1–3 are live and you want to build the ML piece.

### 4a. Build the index (Python, your machine)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install sentence-transformers
pip freeze > ml/requirements.txt
```

`ml/build_index.py` reads the same items the frontend does, builds one short string per
item (`"{title}. {summary} Tags: {tags}."`), encodes with `normalize_embeddings=True`,
and writes `src/data/search-index.json`.

**Sanity-check in Python before touching the frontend.** Embed a test query, score it
against the index, print the top 3. If the ranking is wrong here it'll be wrong in the
browser, and Python is a far easier place to debug it.

Add `"build:index": "python ml/build_index.py"` to `package.json`.

### 4b. Query in the browser

1. `npm install @huggingface/transformers`
2. `src/lib/embedder.ts` — lazy `import()`, pipeline cached in a module-level variable.
3. Extend the body of `search()`: embed the query, dot-product against every item,
   merge with keyword results deduped by `id`.
4. A subtle indicator while the model loads. Never a blocking spinner — keyword results
   are already on screen and useful.
5. Assert the index's `model` field matches what you loaded. Mismatched models compare
   without erroring and return confident nonsense.

### 4c. Tune

Write down 10 real queries someone might type. Run each. Note whether the right thing
came back. That list is your regression test for every future change.

**Done when:** a query sharing no words with your content still finds the right project.

---

## Phase 5 — Flask, only when triggered

Don't build this speculatively. Build it the day a trigger from
[01-decisions.md](01-decisions.md#where-flask-went) actually fires — realistically,
the first time you want something that needs an API key.

1. Flask app in `server/`, deployed to Render or Fly as its own service.
2. Frontend calls it over HTTPS. CORS configured to allow your Pages origin only.
3. GitHub Pages keeps serving the frontend, unchanged.
4. Secrets in the host's environment variables. Never in the repo, never in anything
   the browser downloads.

The frontend work is small because `src/lib/content.ts` was always the only thing that
knew where data came from.
