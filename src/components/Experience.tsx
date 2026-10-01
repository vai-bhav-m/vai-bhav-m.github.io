import { useMemo, useState } from 'react'
import { getExperience } from '../lib/content'
import type { ExperienceEntry } from '../lib/content'
import { useRevealOnNavigate } from '../lib/useRevealOnNavigate'
import Prose from './Prose'
import ShowMore from './ShowMore'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** '2024-06' -> 'Jun 2024'. Anything else is passed through unchanged. */
function formatDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return value
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : value
}

export default function Experience() {
  const entries = useMemo(() => getExperience(), [])
  const [showArchived, setShowArchived] = useState(false)

  const current = useMemo(() => entries.filter((e) => !e.archived), [entries])
  const archived = useMemo(() => entries.filter((e) => e.archived), [entries])

  const visible = showArchived ? entries : current

  const hiddenIds = useMemo(
    () => (showArchived ? [] : archived.map((e) => e.slug)),
    [showArchived, archived],
  )
  useRevealOnNavigate(hiddenIds, () => setShowArchived(true))

  return (
    <section
      id="experience"
      className="border-t border-neutral-200 py-20 dark:border-neutral-800"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Experience
      </h2>

      <ol className="mt-8 space-y-10">
        {visible.map((entry) => (
          <Entry key={entry.slug} entry={entry} />
        ))}
      </ol>

      {archived.length > 0 && (
        <ShowMore
          count={archived.length}
          expanded={showArchived}
          noun="earlier role"
          onToggle={() => setShowArchived((v) => !v)}
        />
      )}
    </section>
  )
}

function Entry({ entry }: { entry: ExperienceEntry }) {
  return (
    <li
      id={entry.slug}
      className="relative border-l border-neutral-200 pl-6 dark:border-neutral-800"
    >
      <span
        className="absolute -left-[4.5px] top-2 size-2 rounded-full bg-neutral-300
                   dark:bg-neutral-600"
        aria-hidden
      />

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
          {entry.role}
          <span className="font-normal text-neutral-500"> · {entry.org}</span>
        </h3>
        <span className="text-sm whitespace-nowrap text-neutral-400">
          {formatDate(entry.start)} – {formatDate(entry.end)}
        </span>
      </div>

      {entry.location && (
        <p className="mt-0.5 text-sm text-neutral-400">{entry.location}</p>
      )}

      <p className="mt-3 text-neutral-600 dark:text-neutral-400">{entry.summary}</p>

      {entry.body && (
        <div className="mt-3 text-sm">
          <Prose>{entry.body}</Prose>
        </div>
      )}
    </li>
  )
}
