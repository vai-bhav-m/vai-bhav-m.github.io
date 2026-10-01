import { getAbout } from '../lib/content'
import Prose from './Prose'

export default function About() {
  const about = getAbout()

  return (
    <section id="about" className="py-20 sm:py-28">
      <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-100">
        {about.name}
      </h1>

      <p className="mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
        {about.tagline}
      </p>

      {about.location && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{about.location}</p>
      )}

      <div className="mt-6 max-w-2xl">
        <Prose>{about.body}</Prose>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {about.resume && (
          <a
            href={about.resume}
            download
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white
                       transition hover:bg-neutral-700 focus-visible:outline-2
                       focus-visible:outline-offset-2 focus-visible:outline-sky-500
                       dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Download resume
          </a>
        )}

        {about.socials.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium
                       text-neutral-700 transition hover:bg-neutral-100
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-sky-500 dark:border-neutral-800
                       dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {s.label}
          </a>
        ))}
      </div>
    </section>
  )
}
