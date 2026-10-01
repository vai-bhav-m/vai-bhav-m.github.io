/**
 * Ranking lives here. The overlay renders what comes back and knows nothing
 * about MiniSearch, embeddings, or how the two get merged.
 *
 * Two layers, deliberately kept permanently rather than one replacing the other:
 *
 *   keyword  - instant, no download, great at exact terms, names and typos
 *   semantic - needs a ~25 MB model, great at meaning and paraphrase
 *
 * They fail in opposite directions, so the merged result beats either alone.
 *
 * See docs/05-search-design.md
 */

import MiniSearch from 'minisearch'
import { getSearchItems } from './content'
import type { SearchItem } from './content'
import { embedQuery } from './embedder'

export type Result = {
  item: SearchItem
  score: number
  via: 'keyword' | 'semantic' | 'both'
}

const MAX_RESULTS = 8

/**
 * Similarity search always returns something — the nearest item is still the
 * nearest even when it's irrelevant. Calibrated against the Python probe, where
 * deliberate nonsense topped out at 0.121 and every real match cleared 0.26.
 */
const SCORE_FLOOR = 0.25

/* ---------------------------------------------------------------- keyword -- */

let index: MiniSearch<SearchItem> | null = null
let byId = new Map<string, SearchItem>()

function getIndex(): MiniSearch<SearchItem> {
  if (index) return index

  const items = getSearchItems()
  byId = new Map(items.map((i) => [i.id, i]))

  index = new MiniSearch<SearchItem>({
    idField: 'id',
    fields: ['title', 'summary', 'tags', 'text'],
    extractField: (doc, field) =>
      field === 'tags' ? doc.tags.join(' ') : String(doc[field as keyof SearchItem] ?? ''),
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      // `text` is unboosted: a term in the body is a weaker signal than one in
      // the title, but it still needs to be findable at all.
      boost: { title: 3, tags: 2, summary: 1.5 },
    },
  })

  index.addAll(items)
  return index
}

/** Instant, synchronous. Runs on every keystroke with no download. */
export function searchKeyword(query: string): Result[] {
  const q = query.trim()
  if (!q) return []

  const hits = getIndex().search(q)
  const top = hits[0]?.score ?? 1

  return hits.slice(0, MAX_RESULTS).flatMap((hit) => {
    const item = byId.get(String(hit.id))
    // MiniSearch scores are unbounded, so normalise against the best hit to put
    // them on roughly the same 0-1 footing as cosine similarity before merging.
    return item ? [{ item, score: hit.score / top, via: 'keyword' as const }] : []
  })
}

/* --------------------------------------------------------------- semantic -- */

/**
 * Each item contributes several chunks — a "card" (title + summary + tags) and
 * one per section of its body. Only the owning item id and the vector ship;
 * titles and urls already live in the bundle via content.ts.
 */
type IndexFile = {
  model: string
  dim: number
  normalized: boolean
  chunks: { item: string; vector: number[] }[]
}

let vectors: Promise<IndexFile> | null = null

function getVectors(): Promise<IndexFile> {
  // Dynamic import so Vite splits the JSON into its own chunk — it never
  // touches first paint for visitors who don't search.
  vectors ??= import('../data/search-index.json').then((m) => m.default as IndexFile)
  return vectors
}

/**
 * Needs the embedding model, so the first call per session takes a few seconds.
 * Throws if the index was built with a different model than the browser loads —
 * mismatched vectors compare without erroring and return confident nonsense,
 * which is a genuinely nasty bug to chase.
 */
export async function searchSemantic(query: string): Promise<Result[]> {
  const q = query.trim()
  if (!q) return []

  const [file, queryVector] = await Promise.all([getVectors(), embedQuery(q)])

  if (queryVector.length !== file.dim) {
    throw new Error(
      `Embedding size ${queryVector.length} does not match index dim ${file.dim}. ` +
        `Rebuild with: npm run build:index`,
    )
  }

  getIndex() // ensures byId is populated

  // An item's score is its best-matching chunk, not an average. A query that
  // nails one specific section should rank the item highly even if the rest of
  // it is about something else — averaging would dilute exactly that signal.
  const best = new Map<string, number>()

  for (const chunk of file.chunks) {
    // Both sides are unit length, so cosine similarity is just a dot product.
    let score = 0
    for (let i = 0; i < queryVector.length; i++) {
      score += queryVector[i] * chunk.vector[i]
    }

    const current = best.get(chunk.item)
    if (current === undefined || score > current) best.set(chunk.item, score)
  }

  const scored: Result[] = []

  for (const [id, score] of best) {
    if (score < SCORE_FLOOR) continue
    const item = byId.get(id)
    if (!item) continue // content changed since the index was last built
    scored.push({ item, score, via: 'semantic' })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
}

/* ------------------------------------------------------------------ merge -- */

/**
 * An item found by both layers ranks above one found by either alone —
 * agreement between two independent signals is real evidence.
 */
export function mergeResults(keyword: Result[], semantic: Result[]): Result[] {
  const merged = new Map<string, Result>()

  for (const r of keyword) merged.set(r.item.id, { ...r })

  for (const r of semantic) {
    const existing = merged.get(r.item.id)
    if (existing) {
      merged.set(r.item.id, {
        item: r.item,
        score: existing.score + r.score + 0.25, // agreement bonus
        via: 'both',
      })
    } else {
      merged.set(r.item.id, { ...r })
    }
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
}

/* ----------------------------------------------------------------- corpus -- */

/** Counts for the overlay's empty state, so it can say what's searchable. */
export function getCorpusSummary(): { projects: number; experience: number } {
  const items = getSearchItems()
  return {
    projects: items.filter((i) => i.kind === 'project').length,
    experience: items.filter((i) => i.kind === 'experience').length,
  }
}
