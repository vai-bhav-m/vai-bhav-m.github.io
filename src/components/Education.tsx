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
      {/* Degree and school on the left; graduation date with the grade beneath it,
          right-aligned, so the numbers read as one column down the section. Phones
          stack them under the school for every entry, so short and long degree names
          lay out the same way. */}
      <div className="flex flex-col gap-y-1 sm:flex-row sm:justify-between sm:gap-x-6">
        <div className="min-w-0">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{entry.degree}</h3>
          <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">
            {entry.school}
            {entry.location && <span className="text-sm"> · {entry.location}</span>}
          </p>
        </div>

        <div className="text-sm sm:text-right">
          <p className="whitespace-nowrap text-neutral-600 dark:text-neutral-400">{entry.end}</p>
          {entry.grade && (
            <p className="mt-0.5 whitespace-nowrap font-medium text-neutral-700 dark:text-neutral-300">
              {entry.grade}
            </p>
          )}
        </div>
      </div>

      {entry.body && (
        <div className="mt-2 text-sm">
          <Prose>{entry.body}</Prose>
        </div>
      )}
    </li>
  )
}
