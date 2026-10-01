# Search design

**Scope note:** search *ships in v1 as keyword search*. The semantic/embedding layer is
a later addition. This doc covers both, and the "keeping room for it" section is the
part that matters right now — it's what makes the upgrade a drop-in rather than a
rewrite.

## What we're building, precisely

One vector per **item**, where an item is a project or an experience entry. A query is
embedded, compared against every item, and the best match is pointed to.

That's the whole design. No document chunking, no passage retrieval, no reranking, no
generated answers. The result of a search is "this project is what you're looking
for" — which is what a portfolio search is actually for.

This scale is worth stating out loud, because it makes most of the usual search
engineering irrelevant:

| | Count |
| --- | --- |
| Projects | maybe 6–15 |
| Experience entries | maybe 3–6 |
| About / misc | 1–2 |
| **Total items to index** | **~10–25** |

Twenty-five vectors. Not twenty-five thousand.

## The two layers

| | Ships | Cost | Good at | Bad at |
| --- | --- | --- | --- | --- |
| **Keyword** (MiniSearch) | v1 | ~10 KB | exact terms, tech names, acronyms, typos | synonyms, paraphrase |
| **Semantic** (embeddings) | later | ~25 MB model | meaning, related concepts | exact rare strings |

Keyword search alone is genuinely fine for a portfolio. Someone typing "pytorch" or
"kubernetes" gets the right project immediately. The semantic layer earns its place
for queries like "have you done anything with images?" matching a project whose text
says "computer vision" — real, but a nice-to-have.

Both stay permanently. They fail in opposite directions, so the merged result is
better than either.

---

## What gets embedded (and what doesn't)

**Do not embed the full project writeup.** Embed a short representative string built
from the frontmatter:

```
"Semantic Search Portfolio. A static portfolio site with in-browser semantic
search over projects. Tags: python, ml, react."
```

Title, summary, tags. Roughly 30–60 words.

Two reasons, and the first is a trap worth knowing about:

1. **The model truncates at 256 tokens (~190 words), silently.** No error, no warning.
   Embed an 800-word writeup and you get a vector representing only its opening
   paragraph, while believing you indexed the whole thing. Short inputs sidestep this
   completely.
2. **A summary embeds better than a full document.** Averaging a long, topic-varied
   document into one 384-dimension vector blurs it toward the average of everything it
   mentions. A tight summary produces a sharper, more distinctive vector.

So the thing that makes the index simple *also* makes it more accurate. The summary
field you'd write for the project card anyway is exactly the right input.

> Optional refinement if results feel thin: append the document's first paragraph,
> truncated to ~120 words. Measure before and after — don't assume it helps.

## The index file

```jsonc
{
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "dim": 384,
  "normalized": true,
  "generated": "2026-09-20T14:00:00Z",
  "items": [
    {
      "id": "projects/semantic-search",
      "kind": "project",              // or "experience" | "about"
      "title": "Semantic Search Portfolio",
      "summary": "A static portfolio site with in-browser semantic search.",
      "url": "/#semantic-search",
      "vector": [0.0123, -0.0456 /* ... 384 floats ... */]
    }
  ]
}
```

`model` is asserted against the model the browser loads. Vectors from two different
models compare without erroring and produce confident nonsense — a genuinely nasty bug
to chase, so fail loudly at load instead.

`normalized: true` means vectors are unit length, so cosine similarity is just a dot
product. No square roots at runtime, no divide-by-zero on empty text.

**Size:** 25 items × 384 floats ≈ 70 KB of JSON, ~30 KB gzipped. Small enough to
`import()` as a lazy chunk rather than `fetch()` — Vite code-splits it automatically
and it never touches first paint.

## Scoring

```ts
// vectors are unit length, so cosine similarity == dot product
let score = 0
for (let i = 0; i < query.length; i++) score += query[i] * item[i]
```

25 items × 384 dimensions = 9,600 multiply-adds per search. That is nothing. Run it on
every keystroke without debouncing the math (debounce the *embedding*, which is the
expensive part).

**Set a score floor around 0.25.** Similarity search always returns something — the
nearest item is still the nearest even when it's irrelevant. Below the floor, show an
honest empty state. Calibrate by typing deliberate nonsense and seeing what comes back.

---

## Keeping room for it: the v1 contract

This is the part to get right now, while building keyword search. Three seams, and if
they exist, adding embeddings later touches almost nothing.

### 1. `src/lib/content.ts` exposes searchable items

```ts
export type SearchItem = {
  id: string
  kind: 'project' | 'experience' | 'about'
  title: string
  summary: string
  tags: string[]
  url: string
}

export function getSearchItems(): SearchItem[]
```

Both the keyword index and the Python embedding script consume this same shape. One
definition of "what is searchable", used by both layers.

### 2. `src/lib/search.ts` owns ranking behind one function

```ts
export type Result = { item: SearchItem; score: number; via: 'keyword' | 'semantic' }

export async function search(query: string): Promise<Result[]>
```

The overlay component calls this and renders what comes back. It knows nothing about
MiniSearch, embeddings, or merging. When the semantic layer arrives, only the body of
this function changes.

### 3. The UI never blocks on search being ready

Build the overlay so results arrive asynchronously and can be *replaced*. In v1
keyword results resolve instantly, so this looks like pointless indirection. It is
what lets semantic results stream in a few seconds later without a rewrite of the
component.

Also: put `ml/` and a `npm run build:index` script placeholder in the repo from day
one, even empty. A directory that already exists gets used; one that has to be created
becomes a decision you keep postponing.

**If those three seams exist, the later work is:** write `build_index.py`, add
`embedder.ts`, and extend the body of `search()` to merge two score lists. No component
changes.

---

## Later: adding the semantic layer

### Build side (Python, on your machine)

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
texts = [f"{i['title']}. {i['summary']} Tags: {', '.join(i['tags'])}." for i in items]
vectors = model.encode(texts, normalize_embeddings=True)
```

`normalize_embeddings=True` is what makes the runtime a plain dot product. Don't skip
it and normalize in JavaScript instead.

Sanity-check in Python before touching the frontend: embed a test query, score it
against the index, print the top 3. If the ranking is wrong here it will be wrong in
the browser, and Python is a far easier place to debug it.

### Browser side

`all-MiniLM-L6-v2` has two builds that produce compatible vectors:

| Where | Package | Identifier |
| --- | --- | --- |
| Build time | `sentence-transformers` | `sentence-transformers/all-MiniLM-L6-v2` |
| Browser | `@huggingface/transformers` | `Xenova/all-MiniLM-L6-v2` |

The second is an ONNX export of the first. Verify the compatibility once by hand:
embed the same sentence in both and confirm the dot product is ~0.99. Quantization
makes it not exactly 1.0; that's expected.

```ts
let pipe: Promise<unknown> | null = null

export function getEmbedder() {
  if (!pipe) {
    pipe = import('@huggingface/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' })
    )
  }
  return pipe
}
```

- **Dynamic `import()`, never a top-level import.** A static import pulls the library
  into your main bundle and delays first paint for every visitor, including the ones
  who never search.
- **Start loading when the overlay opens**, not on page load. That's the first moment
  you know the visitor intends to search.
- **Cache the pipeline** in a module-level variable so it initializes once per session.
- Model weights download from the Hugging Face CDN on first use and the browser caches
  them. To drop that third-party runtime dependency, copy the model files into
  `public/models/` and point transformers.js there — costs ~25 MB in the repo.

> **Gotcha:** most tutorials use the older `@xenova/transformers`, whose options differ
> (`{ quantized: true }` vs `{ dtype: 'q8' }`). If you paste a snippet and the options
> silently do nothing, check which package it was written for.

### Merging

1. Keyword results render immediately.
2. Semantic results compute when the model is ready.
3. Dedupe by `id`. An item found by both ranks above one found by either alone —
   agreement between independent signals is real evidence.
4. Interleave the rest by score.

The visitor never sees a blocking spinner. They see results that quietly get better.

## If quality disappoints

In order — the cheap fixes are also the likely culprits.

1. **Read your summaries.** With one vector per item, search quality *is* summary
   quality. A vague summary is an unsearchable project. This is almost always the
   problem, and it's a writing fix, not a code fix.
2. **Check tags are included** in the embedded string. They carry a lot of signal for
   very little text.
3. **Tune the score floor.** Too high hides good results; too low shows noise.
4. **Weight keyword higher for short queries.** One or two words usually means someone
   wants an exact term, not a concept.
5. **Only then change the model.** `bge-small-en-v1.5` is a common same-size upgrade.
   Note it expects a query prefix ("Represent this sentence for searching relevant
   passages: ") — read the model card rather than assuming it's a drop-in. Both sides
   must change together, and the `model` field in the index is what catches you if they
   don't.
