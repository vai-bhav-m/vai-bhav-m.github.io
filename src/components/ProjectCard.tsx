import type { Project } from '../lib/content'
import { linkIcon } from './Icons'
import Prose from './Prose'

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article
      id={project.slug}
      className="rounded-xl border border-neutral-200 p-6 transition
                 hover:border-neutral-300 dark:border-neutral-800
                 dark:hover:border-neutral-700"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {project.title}
        </h3>
        {project.period && (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{project.period}</span>
        )}
      </div>

      <p className="mt-2 text-neutral-600 dark:text-neutral-400">{project.summary}</p>

      {project.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium
                         text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      {project.body && (
        <div className="mt-5 border-t border-neutral-100 pt-5 text-sm dark:border-neutral-800">
          <Prose>{project.body}</Prose>
        </div>
      )}

      {project.links.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {project.links.map((link) => {
            const Icon = linkIcon(link.label, link.url)
            return (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200
                             px-3 py-1.5 text-sm font-medium text-neutral-700 transition
                             hover:bg-neutral-100 focus-visible:outline-2
                             focus-visible:outline-offset-2 focus-visible:outline-sky-500
                             dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Icon className="size-3.5 shrink-0" />
                  {link.label}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
