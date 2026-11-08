import { getEducation } from '../lib/content'
import type { EducationEntry } from '../lib/content'
import Prose from './Prose'

export default function Education() {
  const entries = getEducation()

  return (
    <section
      id="education"
      className="border-t border-neutral-200 py-20 dark:border-neutral-800"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Education
      </h2>

      <ul className="mt-8 max-w-3xl space-y-8">
        {entries.map((entry) => (
          <Entry key={entry.slug} entry={entry} />
        ))}
      </ul>
    </section>
  )
}

function Entry({ entry }: { entry: EducationEntry }) {
  return (
    <li id={entry.slug}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{entry.degree}</h3>
        <span className="text-sm whitespace-nowrap text-neutral-600 dark:text-neutral-400">
          {entry.end}
        </span>
      </div>

      <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
        {entry.school}
        {entry.location && <span className="text-sm"> · {entry.location}</span>}
      </p>

      {entry.grade && (
        <p className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {entry.grade}
        </p>
      )}

      {entry.body && (
        <div className="mt-2 text-sm">
          <Prose>{entry.body}</Prose>
        </div>
      )}
    </li>
  )
}
