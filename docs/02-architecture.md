# Architecture

## The whole system in one picture

```
  YOUR LAPTOP                            GITHUB                      VISITOR'S BROWSER
  -----------                            ------                      -----------------

  content/*.md ---+
                  |
                  +--> ml/build_index.py        <-- LATER PHASE
                  |     (sentence-transformers)     one vector per
                  |          |                      project / experience
                  |          v
                  |    src/data/search-index.json
                  |          |
                  +----------+--> git push --> GitHub Actions
                                                 |  npm ci
                                                 |  npm run build
                                                 |      |
                                                 |      v
                                                 |    dist/
                                                 |      |
                                                 +------+--> GitHub Pages
                                                                |
                                                                |  HTTPS
                                                                v
                                                       username.github.io
                                                                |
                                          +---------------------+----------------+
                                          |  React app renders content           |
                                          |  Visitor types a query               |
                                          |    |- keyword search  (instant)      |
                                          |    +- semantic search (later phase)  |
                                          |                                      |
                                          +--------------------------------------+
```

Read that as three columns with a clean handoff between each. Nothing in the middle
column runs code you wrote *at request time* — GitHub Pages only hands over files.
All of your logic runs either on the left (build time) or the right (the browser).

## The two halves, and why the split matters

|  | Build time (Python) | Request time (JavaScript) |
| --- | --- | --- |
| Runs on | Your laptop, or a CI runner | The visitor's machine |
| Runs how often | When you change content | Every search |
| Can be slow | Yes — seconds are fine | No — must feel instant |
| Can be large | Yes — PyTorch is 2 GB, who cares | No — every byte is a download |
| Has secrets | Could, but doesn't need any | **Never.** Everything here is public. |

Every design question in this project resolves to: *which column does this belong in?*
Expensive, rare, and private goes left. Cheap, frequent, and public goes right.

## Repo layout

```
<username>.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml           # builds and publishes on push to main
├── content/                     # the single source of truth for site text
│   ├── about.md
│   ├── projects/
│   │   ├── project-one.md
│   │   └── project-two.md
│   └── notes/
│       └── some-writeup.md
├── docs/                        # these planning docs
├── ml/                          # scaffolded in v1, filled in later
│   ├── build_index.py           # reads content/, writes src/data/search-index.json
│   └── requirements.txt
├── public/                      # copied to the site root verbatim
│   ├── Vaibhav-Resume.pdf
│   └── favicon.svg
├── src/
│   ├── main.tsx                 # entry point
│   ├── App.tsx                  # page composition
│   ├── components/
│   │   ├── Nav.tsx              # sticky nav, scroll-spy, search box, theme toggle
│   │   ├── SearchOverlay.tsx    # the search UI
│   │   ├── ThemeToggle.tsx      # system / light / dark
│   │   ├── About.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectFilter.tsx    # tag filtering
│   │   ├── Experience.tsx
│   │   └── Contact.tsx          # links + Google Form
│   ├── data/
│   │   └── search-index.json    # GENERATED (later phase) - committed, not hand-edited
│   ├── lib/
│   │   ├── content.ts           # ALL content access goes through here
│   │   ├── search.ts            # ranking, scoring, result merging
│   │   ├── embedder.ts          # transformers.js model loading (later phase)
│   │   └── theme.ts             # theme state + persistence
│   └── styles.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Two files that carry the architecture

**`src/lib/content.ts`** is the seam between "where content comes from" and "how it
gets displayed". In Phase 1 it reads Markdown from disk at build time:

```ts
const files = import.meta.glob('../../content/**/*.md', {
  query: '?raw', import: 'default', eager: true,
})
```

If content ever moves to a Flask + Postgres backend, this file becomes a `fetch()`
and every component above it is untouched. That is the whole reason it exists as a
separate file rather than being inlined into components — it is the designated place
for that change to happen.

**`ml/build_index.py`** is the seam between content and search. It is the only thing
that knows how text becomes vectors. Its output contract — the shape of
`search-index.json` — is what `src/lib/search.ts` depends on, *not* the model or the
library. Swap the model, keep the contract, and the frontend doesn't change.

## The searchable-item contract

The seam between content and search is a single list of items — one entry per project
or experience entry, not per paragraph:

```ts
export type SearchItem = {
  id: string
  kind: 'project' | 'experience' | 'about'
  title: string
  summary: string
  tags: string[]
  url: string        // '#semantic-search' — where a result scrolls to
}

export function getSearchItems(): SearchItem[]
```

Everything downstream consumes this shape. In v1, MiniSearch indexes it directly. In a
later phase, `ml/build_index.py` embeds the same list into
`src/data/search-index.json` — adding a `vector` per item and nothing else.

That's roughly 10–25 items total. The full rationale for one-vector-per-item, and the
index file format, are in [05-search-design.md](05-search-design.md).

## Data flow when someone searches

**v1:**

1. Visitor hits Ctrl+K or clicks the nav search box. The overlay opens.
2. They type. MiniSearch scores the item list. Results render on every keystroke.
3. Enter scrolls to `item.url`.

**After the semantic layer lands** — steps 1–3 are unchanged, plus:

4. Opening the overlay kicks off a lazy `import()` of the embedding model.
5. When it's ready, the query is embedded and dot-producted against every item vector.
6. Semantic and keyword results merge, deduped by `id`, and re-render in place.

Step 2 is the load-bearing one for user experience. It means search is *never* broken
or blank while the model loads — it just gets smarter a few seconds in, and if the
model never loads at all, search still works.

## What this architecture deliberately does not do

- **No server.** Nothing to deploy twice, nothing to wake up, nothing to pay for.
- **No database.** No schema to migrate, no connection string to leak.
- **No secrets.** There is nowhere to put one, so there is nowhere to leak one from.
- **No ML in CI (Phase 1).** The deploy pipeline stays a plain Node build, which is
  the most reliable thing GitHub Actions does.

Each of those is a thing that cannot break, because it isn't there. For a site whose
job is to be online and fast when a stranger clicks a link, that is the feature.
