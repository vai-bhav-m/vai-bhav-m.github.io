import type { Project } from '../lib/content'
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

      {(project.repo || project.demo) && (
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Source →
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-500 dark:text-sky-400"
            >
              Live demo →
            </a>
          )}
        </div>
      )}
    </article>
  )
}
