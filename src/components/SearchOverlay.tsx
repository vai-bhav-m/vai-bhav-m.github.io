import { useEffect, useRef, useState } from 'react'
import { getCorpusSummary, mergeResults, searchKeyword, searchSemantic } from '../lib/search'
import type { Result } from '../lib/search'
import { warmUpEmbedder } from '../lib/embedder'

const KIND_LABEL: Record<Result['item']['kind'], string> = {
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
        // The input is now genuinely the only focusable element in the dialog
        // (backdrop is a div, results are <li>), so this is a real trap.
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
      {/* A div, not a button: as a button it sat in the tab order but could
          never be reached, because Tab is trapped below. Escape is the keyboard
          route out, so the backdrop is pointer-only and hidden from AT. */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
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
            // aria-autocomplete / aria-activedescendant are defined on combobox,
            // not textbox. Without the role, screen readers ignore them and
            // arrow-key navigation announces nothing.
            role="combobox"
            aria-expanded={results.length > 0}
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={
              results[selected] ? `search-result-${selected}` : undefined
            }
            className="h-14 flex-1 bg-transparent text-base outline-none focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-sky-500
                       placeholder:text-neutral-600 dark:placeholder:text-neutral-400
                       dark:text-neutral-100"
          />
          <kbd
            className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px]
                       text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
          >
            Esc
          </kbd>
        </div>

        {query.trim() === '' ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
            Search {corpus.projects} projects and {corpus.experience} roles.
          </p>
        ) : results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
            No matches for “{query.trim()}”.
          </p>
        ) : (
          <ul
            ref={listRef}
            id="search-results"
            role="listbox"
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {/* The <li> IS the option. A listbox may only own option children,
                and an option may not contain interactive descendants — the
                previous <li><button role="option"> broke both, so
                aria-activedescendant could not resolve. Keyboard activation
                lives on the input's Enter handler; this is pointer-only. */}
            {results.map((result, i) => (
              <li
                key={result.item.id}
                id={`search-result-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === selected}
                onClick={() => go(result)}
                onMouseMove={() => setSelected(i)}
                className={`cursor-pointer rounded-lg px-3 py-2.5 transition ${
                  i === selected
                    ? 'bg-neutral-100 dark:bg-neutral-800'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {result.item.title}
                  </span>
                  <span className="text-[10px] tracking-wide text-neutral-600 uppercase dark:text-neutral-300">
                    {KIND_LABEL[result.item.kind]}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {result.item.summary}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div
          className="flex items-center gap-4 border-t border-neutral-200 px-4 py-2
                     text-[11px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
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
