# Search design

**Status: built and shipped.** This describes what exists, not a plan.

## What it does

Two layers, kept permanently because they fail in opposite directions:

| | Ships as | Cost | Good at | Bad at |
| --- | --- | --- | --- | --- |
| **Keyword** (MiniSearch) | ~10 KB | instant | exact terms, tech names, acronyms, typos | synonyms, paraphrase |
| **Semantic** (embeddings) | ~22 MB model | seconds on first use | meaning, related concepts | exact rare strings |

Keyword results render on the keystroke. Semantic results merge in when the model is ready. If
the model never loads, keyword search still works and the footer says "keyword only".

## The index

**67 chunks from 16 items**, 384 dimensions, 238 KB raw / ~73 KB gzipped.

Each item contributes:

- one **card** chunk — `"{title}. {summary} Tags: {tags}."` — so short queries land on the item
  as a whole;
- one chunk **per bullet** of its body.

### Why per bullet, and not one vector per item

This is the decision that made search work. With one vector per body, "Dockerized and deployed a
TensorRT engine on AWS EC2" gets averaged together with "DeepLabV3+ semantic segmentation" and
"Lidar-camera fusion" until none of the three is findable. Measured, splitting them:

```
heart and medical scans           0.420 → 0.504
kalman filter                     0.321 → 0.415
retrieval augmented generation    0.248 → 0.287   (crossed the floor)
```

"kalman filter" is the clearest case — that term exists *only* in a body bullet and was invisible
before.

Chunking lives in [`ml/chunking.py`](../ml/chunking.py). A bullet list becomes one chunk per
bullet; prose blocks only split when they exceed `MAX_WORDS` (150). Fragments under `MIN_WORDS`
(12) are glued to their neighbour, because a stub like "## Setup" embeds to a vague vector that
matches everything weakly.

### Every body chunk is prefixed with its title

Not for weighting — for context. A chunk reading *"It handles retries with exponential backoff"*
is unsearchable when the model has no idea what "it" refers to.

### About is deliberately not indexed

A general-purpose bio matches everything weakly. It scored 0.336 on "fluid dynamics" and 0.317 on
"kalman filter" — pure noise crowding out real results. And nobody searches to find the About
section; the nav links straight to it.

**This exclusion exists in two places and they must stay in sync:** `getSearchItems()` in
[`src/lib/content.ts`](../src/lib/content.ts) and `collect()` in
[`ml/build_index.py`](../ml/build_index.py).

### The truncation guard

`all-MiniLM-L6-v2` discards input past 256 tokens (~190 words) **silently** — no error, no
warning. `build_index.py` therefore **fails the build**, naming the file and word count, if any
chunk exceeds 185 words. Without it you would ship an index where half your content embedded to
nothing and never notice. Longest current chunk: 52 words.

## Index file format

```jsonc
{
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "dim": 384,
  "normalized": true,
  "generated": "2026-09-30T...Z",
  "chunks": [
    { "item": "projects/nafnet-deblur", "vector": [0.0123, -0.0456 /* ...384 */] }
  ]
}
```

Only the owning item id and the vector ship. Titles, summaries and urls already live in the bundle
via `content.ts`, and chunk text is never displayed.

`model` is asserted at load. Vectors from two different models compare without erroring and return
confident nonsense — a genuinely nasty bug to chase, so it fails loudly instead.

`normalized: true` means every vector is unit length, so cosine similarity reduces to a dot
product — no square roots at runtime, no divide-by-zero on empty text.

## Scoring

```ts
let score = 0
for (let i = 0; i < queryVector.length; i++) score += queryVector[i] * chunk.vector[i]
```

An item scores as its **best chunk, never an average**. A query that nails one bullet should rank
the item highly even if the rest is about something else.

67 chunks × 384 dims ≈ 26,000 multiply-adds — microseconds. **No vector database**, and none
needed until roughly 10,000 chunks.

**Score floor: 0.25.** Calibrated empirically, not guessed — deliberate nonsense (`asdkjh nonsense
qqq`) topped out at 0.148 while every real match cleared 0.26. Similarity search always returns
*something*, so without a floor you get confident garbage.

## Keyword layer indexes the body too

`title`, `summary`, `tags` **and `text`** (the full body), with `text` unboosted.

This was a real bug, found while chasing a query the embeddings couldn't handle. Rare literal
terms living only in a body were invisible to **both** layers at once — embeddings diluted them
across the bullet, and MiniSearch had never seen them. Measured before and after:

```
docker     (no results) → Scout Robotics
cozypose   (no results) → ABB Robotics
kalman     (no results) → UR5 Calibration
graphrag   (no results) → ABB Robotics
```

The lesson generalises: when one layer fails on a query, check whether the *other* layer should
have caught it before tuning the one that failed.

## Merging

1. Keyword results render immediately (`searchKeyword` is synchronous).
2. Semantic results compute when the model is ready.
3. Dedupe by item id. An item found by **both** gets a **+0.25 bonus** and ranks above one found by
   either alone — agreement between independent signals is real evidence.
4. MiniSearch scores are unbounded, so they're normalised against the top hit before merging, to
   sit on roughly the same 0–1 footing as cosine.

## The model, and where it's served from

| | Package | Identifier |
| --- | --- | --- |
| Build time | `sentence-transformers` | `sentence-transformers/all-MiniLM-L6-v2` |
| Browser | `@huggingface/transformers` | `Xenova/all-MiniLM-L6-v2` |

The second is an ONNX export of the first; they produce compatible vectors, which is the thing the
whole architecture rests on.

**The model is self-hosted**, in `public/models/Xenova/all-MiniLM-L6-v2/` (~22.6 MB). The ONNX
runtime WASM was already bundled locally by Vite, so there is now no third-party runtime
dependency at all.

```ts
env.allowLocalModels = true
env.allowRemoteModels = false              // ← load-bearing
env.localModelPath = `${import.meta.env.BASE_URL}models/`
```

`allowRemoteModels = false` is the important line. Without it, a missing local file **silently
falls back to the HF CDN** and self-hosting would appear to work while doing nothing.

`BASE_URL` rather than a hard-coded `/` so this survives a move to a project site.

> This removes a *third-party* dependency, not the *network* one. The site still has to be
> reachable. True offline would need a service worker caching the shell and model — not built.

### Loading

- **Dynamic `import()`, never a top-level import.** A static import pulls the library and WASM into
  the main bundle and delays first paint for every visitor, including those who never search.
- **Starts when the overlay opens** — the first moment you know the visitor intends to search.
- Pipeline cached in a module-level variable so it initialises once per session.

> **Gotcha:** most tutorials use the older `@xenova/transformers`, whose options differ
> (`{ quantized: true }` vs `{ dtype: 'q8' }`). If you paste a snippet and the options silently do
> nothing, check which package it was written for.

## Costs, honestly

| | |
| --- | --- |
| Index chunk | 238 KB raw, ~73 KB gzipped — lazy, never touches first paint |
| ONNX runtime WASM | 25.6 MB (bundled, served from this site) |
| Model weights | 22.6 MB (self-hosted) |

First search on a cold cache pulls ~48 MB. That is why keyword results render immediately rather
than waiting, and why nothing loads until the overlay opens.

## Known weak spots

- **"docker and cloud deployment" as a phrase** still scores 0.135 semantically. It works via the
  keyword layer, so single-word "docker" is fine, but the phrase is not.
- Search quality *is* summary and bullet quality. The biggest available improvement is editing
  content, not code.

## If quality disappoints

In order — the cheap fixes are also the likely culprits.

1. **Read the summaries and bullets.** Usually the content is vague, not the model.
2. **Check whether the other layer should have caught it.** See the body-indexing bug above.
3. **Tune the score floor** (0.25). Too high hides good results; too low shows noise.
4. **Only then change the model.** `bge-small-en-v1.5` is a common same-size upgrade, but expects a
   query prefix, so it is not a drop-in. Both sides must change together; the `model` field is what
   catches you if they don't.

## Rebuilding

```powershell
npm run build:index    # python ml/build_index.py
```

Run it whenever `content/` changes, and commit `src/data/search-index.json`. Forgetting means the
live site searches stale content — the page will show new text that search cannot find.
