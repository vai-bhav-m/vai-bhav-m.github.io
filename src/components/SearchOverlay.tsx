import { useEffect, useRef, useState } from 'react'
import { getCorpusSummary, mergeResults, searchKeyword, searchSemantic } from '../lib/search'
import type { Result } from '../lib/search'
import { warmUpEmbedder } from '../lib/embedder'

const KIND_LABEL: Record<Result['item']['kind'], string> = {
  about: 'About',
  project: 'Project',
  experience: 'Experience',
}

type SemanticState = 'idle' | 'loading' | 'ready' | 'error'

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [selected, setSelected] = useState(0)
  const [semantic, setSemantic] = useState<SemanticState>('idle')

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Opening the overlay is the first moment we know the visitor intends to
  // search, so that's when the model download starts — not on page load.
  useEffect(() => {
    if (!open) return

    warmUpEmbedder()
    inputRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSelected(0)
      setSemantic('idle')
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setSemantic('idle')
      return
    }

    // Keyword results are synchronous — they render on this keystroke.
    const keyword = searchKeyword(q)
    setResults(keyword)
    setSelected(0)
    setSemantic('loading')

    // A slow embedding call can resolve after a newer one. Without this flag
    // you'd type "robot" and see results for "rob".
    let cancelled = false

    searchSemantic(q)
      .then((sem) => {
        if (cancelled) return
        setResults(mergeResults(keyword, sem))
        setSemantic('ready')
      })
      .catch(() => {
        // Keyword results are already on screen and useful, so a model that
        // fails to load degrades rather than breaks.
        if (!cancelled) setSemantic('error')
      })

    return () => {
      cancelled = true
    }
  }, [query])

  // Merging can shrink the list under the cursor.
  useEffect(() => {
    setSelected((i) => Math.min(i, Math.max(results.length - 1, 0)))
  }, [results])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  function go(result: Result) {
    const id = result.item.url.replace(/^#/, '')
    onClose()

    // Setting an identical hash fires no hashchange, so an archived item would
    // never be revealed on a repeat visit. Assign, then scroll explicitly.
    if (window.location.hash === `#${id}`) {
      document.getElementById(id)?.scrollIntoView({ block: 'start' })
    } else {
      window.location.hash = id
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onClose()
        break
      case 'ArrowDown':
        event.preventDefault()
        setSelected((i) => (results.length ? (i + 1) % results.length : 0))
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelected((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
        break
      case 'Enter':
        event.preventDefault()
        if (results[selected]) go(results[selected])
        break
      case 'Tab':
        // Nothing else in here is focusable, so trapping focus is: don't leave.
        event.preventDefault()
        break
    }
  }

  const corpus = getCorpusSummary()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-neutral-900/40 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border
                   border-neutral-200 bg-white shadow-2xl dark:border-neutral-800
                   dark:bg-neutral-900"
      >
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects and experience…"
            aria-label="Search projects and experience"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={
              results[selected] ? `search-result-${selected}` : undefined
            }
            className="h-14 flex-1 bg-transparent text-base outline-none
                       placeholder:text-neutral-400 dark:text-neutral-100"
          />
          <kbd
            className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px]
                       text-neutral-400 dark:border-neutral-700 dark:text-neutral-500"
          >
            Esc
          </kbd>
        </div>

        {query.trim() === '' ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            Search across {corpus.projects} projects and {corpus.experience} roles —
            including archived ones.
          </p>
        ) : results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            No matches for “{query.trim()}”.
          </p>
        ) : (
          <ul
            ref={listRef}
            id="search-results"
            role="listbox"
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {results.map((result, i) => (
              <li key={result.item.id}>
                <button
                  type="button"
                  id={`search-result-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === selected}
                  onClick={() => go(result)}
                  onMouseMove={() => setSelected(i)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                    i === selected
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {result.item.title}
                    </span>
                    <span className="text-[10px] tracking-wide text-neutral-400 uppercase">
                      {KIND_LABEL[result.item.kind]}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">
                    {result.item.summary}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div
          className="flex items-center gap-4 border-t border-neutral-200 px-4 py-2
                     text-[11px] text-neutral-400 dark:border-neutral-800"
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>

          {/* Never a blocking spinner — keyword results are already on screen. */}
          <span className="ml-auto" aria-live="polite">
            {semantic === 'loading' && query.trim() !== '' && 'loading meaning search…'}
            {semantic === 'ready' && 'meaning search on'}
            {semantic === 'error' && 'keyword only'}
          </span>
        </div>
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="shrink-0 text-neutral-400"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
