# Decisions and rationale

Every choice below is written as *decision → why → what it costs you*. If you later
want to change one, the "what it costs you" line tells you what you're trading.

---

## The constraint that shaped everything

**GitHub Pages serves static files only.** It is a file server. It will hand a
browser your HTML, CSS, JS, images and JSON, and nothing else. There is no Python
runtime, no process, no way to run Flask there.

A repo named exactly `<username>.github.io` is a *user site* and is served at
`https://<username>.github.io/`. (Note `.io`, not `.com`.) That root path is
convenient — project sites are served from a subpath like
`/repo-name/` and need extra build configuration to avoid broken asset links.
A user site avoids that entirely.

So the question became: where does the search run? Three options existed, and we
picked the third.

1. **Flask on a free host (Render/Fly), frontend on Pages.** Real backend, but free
   tiers sleep after ~15 minutes idle. The first search after a quiet period takes
   30–50 seconds to wake the server. On a portfolio, where most visits are a single
   recruiter clicking once, *every* visit hits a cold start. This is the worst
   possible traffic shape for a sleeping backend.
2. **Everything on Render, Flask serving the React build too.** One deploy, simple
   mental model, but same cold-start problem and you lose the `github.io` URL.
3. **Fully static, Python at build time.** ✅ Chosen.

---

## Decision: semantic search runs in the browser, Python runs at build time

**Decision.** A Python script in the repo reads your content, computes embeddings,
and writes `search-index.json`. The browser downloads that file and does the
similarity math itself. Query embedding also happens in the browser, via
`transformers.js`.

**Why.** Search on a portfolio site is a *read-only query against a corpus that only
changes when you edit the site*. Every expensive part — loading a model, embedding
documents — can therefore happen once, ahead of time, instead of per request. What's
left at request time (embedding one short query, and a few hundred dot products) is
small enough to do on the visitor's machine. Once you notice that, the server has
nothing left to do.

You still write the Python and the ML code. It just runs on your laptop or in CI
instead of on a server you pay for.

**What it costs you.**
- A ~25 MB model download the first time a visitor opens search. Cached by the
  browser afterwards. Mitigated by lazy-loading it and shipping instant keyword
  search as a first layer — see [05-search-design.md](05-search-design.md).
- You cannot do anything that requires secrets. No API keys, ever — anything shipped
  to the browser is public. This is a hard boundary, not a preference.
- Index regeneration is a step you have to remember (or automate — see
  [07-deployment.md](07-deployment.md)).

---

## Decision: no vector database

**Decision.** The index is a JSON file. Similarity is a `for` loop.

**Why.** Vector databases exist to make nearest-neighbour search fast over millions of
vectors. You will have one vector per project and per experience entry — call it 25.
Comparing a query against 25 vectors of 384 dimensions is 9,600 multiply-adds, which
JavaScript does in microseconds. An approximate-nearest-neighbour index would take
longer to initialise than the thing it's meant to speed up.

**What it costs you.** Nothing, until you have roughly 10,000+ items. You are nearly
three orders of magnitude away. If you ever get there, the fix is swapping the loop for
a library, not rearchitecting.

> This is worth internalising generally: "which database" is usually the wrong first
> question. "How much data, actually?" is the right one.

---

## Decision: content lives in Markdown files in the repo

**Decision.** `content/*.md`. React renders from it; the Python script indexes from it.
Single source of truth.

**Why.** You said "maybe later" on a database. Markdown files give you the *option*
without the cost: no schema, no migrations, no admin UI, no hosting. You edit a file,
push, and the site redeploys. And because both the renderer and the indexer read the
same files, your search index can never drift out of sync with what's on the page.

**What it costs you.** You can't edit content from your phone without a git client.
Realistically not a problem for a portfolio you touch monthly.

**Migration path if you change your mind.** Keep all content access behind
`src/lib/content.js`. If a database ever appears, that one file changes from "read
local files" to "fetch from an API" and nothing else in the app notices.

---

## Where Flask went

Flask is a genuinely good choice — for problems that need a server. Phase 1 doesn't
have one. Putting it in anyway would mean a second deploy pipeline, CORS
configuration, and cold starts, in exchange for nothing a visitor can perceive.

Add Flask the moment you hit any of these, and not before:

| Trigger | Why it needs a server |
| --- | --- |
| ~~A contact form~~ | **Resolved without Flask** — a custom-styled form POSTing to Google Forms. See [03-features-and-ui.md](03-features-and-ui.md#the-form--google-forms-and-its-one-catch). |
| An API key of any kind (LLM, third-party data) | A key shipped to the browser is a published key. This is the most common real trigger. |
| Emailing yourself directly, with delivery confirmation | Needs an SMTP or mail-API credential, which is the same problem. |
| A model too large to ship to a browser | Anything past ~50 MB is a bad visitor experience. |
| Content editable without a deploy | Needs a database and something to talk to it. |
| Per-visitor state (auth, saved items, analytics you own) | Needs somewhere to write. |

When that day comes: Flask goes on Render/Fly as a separate service, the React app
calls it over HTTPS, and GitHub Pages keeps serving the frontend unchanged. The
architecture in [02-architecture.md](02-architecture.md) is deliberately shaped so
this is an addition, not a rewrite.

---

## Smaller decisions

| Decision | Why | Reconsider if |
| --- | --- | --- |
| **Vite** (not Create React App) | CRA is deprecated and unmaintained. Vite is the default now: faster, less config. | Never. This one's settled. |
| **TypeScript** | Nearly every React example you'll find online is TS, and mismatched examples are confusing when you're learning. `any` is always available when types get in the way. | You find yourself fighting the compiler more than writing features — switching a small site back to JS is an afternoon. |
| **Tailwind CSS** | You write styles next to the markup instead of maintaining a parallel CSS file and inventing class names. Fewer concepts to hold at once. | You already know CSS well and find Tailwind noisy. |
| **No router** | Single-page with scrollable sections, which is what you asked for anyway. Routers also add a real GitHub Pages gotcha (see [07-deployment.md](07-deployment.md#deep-links-404)). | You add a writing/blog section, or want a shareable URL per project — Phase 3. |
| **System theme + manual toggle**, three states | A two-state toggle strands anyone who clicks it once — they can never get back to following their OS. Three states (`system`/`light`/`dark`) costs one extra branch. | Never; this is just the correct shape. |
| **Search opens an overlay**, nav box is a trigger | A live input in the nav has nowhere good to put results, especially on mobile. One overlay is one code path at every screen size. | Never for this layout. |
| **One vector per project/experience**, not per paragraph | ~25 items instead of ~300 chunks. No chunking code, no 256-token truncation trap, and a tight summary embeds more distinctly than a long document. | Individual projects grow long enough that people search for details *inside* one. |
| **`all-MiniLM-L6-v2`** as the embedding model | 384 dimensions, ~25 MB quantized, widely used, and has both a Python and a browser build producing compatible vectors. | Search quality disappoints after real tuning. Options in [05-search-design.md](05-search-design.md#if-quality-disappoints). |
| **Semantic search deferred to Phase 4** | Keyword search covers most real queries on a 25-item site and ships in an afternoon. The seams that make embeddings a drop-in go in during Phase 2. | Never — deferring it is the plan, not a compromise. |
| **Generate the index locally, commit the JSON** | Installing PyTorch in CI takes minutes and would be the most likely thing to break your deploy. Deploys stay automatic; only indexing is manual. | Adding content gets frequent enough that forgetting to re-index becomes a real bug. |

---

## Decisions made during implementation

These were not in the original plan. They came out of measurement, and several look
arbitrary until you know what they are avoiding.

| Decision | Why | Evidence |
| --- | --- | --- |
| **Chunk per bullet, not per item** | One vector per body averages every claim away. Each bullet is a distinct assertion and deserves its own vector. | "heart and medical scans" 0.420 → 0.504; "kalman filter" 0.321 → 0.415 |
| **Keyword-index the body too** | Rare literal terms living only in a body were invisible to *both* layers — embeddings diluted them, MiniSearch never saw them. | `docker`, `cozypose`, `kalman`, `graphrag` all went from zero results to correct hits |
| **Exclude About from search** | General-purpose bio prose matched everything weakly and crowded out real results. | scored 0.336 on "fluid dynamics", 0.317 on "kalman filter" |
| **Score floor of 0.25** | Similarity search always returns *something*; without a floor you get confident garbage. | nonsense query peaked at 0.148, real matches cleared 0.26 |
| **Self-host the model** | Removes the last third-party runtime dependency. The ONNX runtime was already bundled locally. | ~22.6 MB committed to `public/models/` |
| **Filter on `domain`, not `tags`** | 26 tags across 9 projects, 20 used exactly once. A chip matching one item is a label, not a filter. | 26 chips → 4 |
| **`archived: true` for older work** | Keeps the default page short without hiding anything from search. Deep links expand the section first, then scroll. | `useRevealOnNavigate.ts` |
| **`robots.txt` allows every AI crawler** | This is a job-seeking site; being found is the point. LinkedIn blocks crawlers to protect a data moat — opposite incentives. | see `public/robots.txt` |

---

## Known gaps, deliberately left

- **No service worker.** Self-hosting the model removed the *third-party* dependency,
  not the *network* one. True offline was judged not worth the cache-invalidation
  complexity.
- **No per-project routes.** Single page with anchors; the GitHub Pages deep-link 404
  problem never had to be solved.
- **No analytics.**
- **Contact form unconfigured.** `FORM_ID` is empty, so the section renders a setup
  note rather than a broken form.
