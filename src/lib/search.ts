/**
 * Ranking lives here, behind one function. The overlay calls `search()` and
 * renders what comes back — it knows nothing about MiniSearch, embeddings, or
 * how results get merged.
 *
 * That's deliberate. In Phase 4 the semantic layer changes the body of this
 * function and nothing else. See docs/05-search-design.md
 */

import MiniSearch from 'minisearch'
import { getSearchItems } from './content'
import type { SearchItem } from './content'

export type Result = {
  item: SearchItem
  score: number
  via: 'keyword' | 'semantic'
}

const MAX_RESULTS = 8

let index: MiniSearch<SearchItem> | null = null
let byId = new Map<string, SearchItem>()

/** Built once per session, lazily — nothing happens until someone searches. */
function getIndex(): MiniSearch<SearchItem> {
  if (index) return index

  const items = getSearchItems()
  byId = new Map(items.map((i) => [i.id, i]))

  index = new MiniSearch<SearchItem>({
    idField: 'id',
    fields: ['title', 'summary', 'tags'],
    // MiniSearch indexes strings; tags arrive as an array, so flatten them.
    extractField: (doc, field) =>
      field === 'tags' ? doc.tags.join(' ') : String(doc[field as keyof SearchItem] ?? ''),
    searchOptions: {
      prefix: true, // match as you type, before the word is finished
      fuzzy: 0.2, // tolerate roughly one typo in five characters
      boost: { title: 3, tags: 2 },
    },
  })

  index.addAll(items)
  return index
}

/**
 * Async despite MiniSearch being synchronous.
 *
 * This is the seam: the semantic layer needs to await a model, and having the
 * signature already be a Promise means adding it later doesn't touch a single
 * component.
 */
export async function search(query: string): Promise<Result[]> {
  const q = query.trim()
  if (!q) return []

  return getIndex()
    .search(q)
    .slice(0, MAX_RESULTS)
    .flatMap((hit) => {
      const item = byId.get(String(hit.id))
      return item ? [{ item, score: hit.score, via: 'keyword' as const }] : []
    })
}

/** Counts for the overlay's empty state, so it can say what's searchable. */
export function getCorpusSummary(): { projects: number; experience: number } {
  const items = getSearchItems()
  return {
    projects: items.filter((i) => i.kind === 'project').length,
    experience: items.filter((i) => i.kind === 'experience').length,
  }
}
