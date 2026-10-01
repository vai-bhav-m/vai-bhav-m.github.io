export default function ShowMore({
  count,
  expanded,
  noun,
  onToggle,
}: {
  count: number
  expanded: boolean
  /** Singular. Pluralised with a trailing s. */
  noun: string
  onToggle: () => void
}) {
  const plural = count === 1 ? noun : `${noun}s`

  return (
    <div className="mt-8 flex items-center gap-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600
                   transition hover:text-neutral-900 focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-sky-500
                   dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {expanded ? `Hide ${count} earlier` : `Show ${count} ${plural}`}
      </button>

      <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden />
    </div>
  )
}
