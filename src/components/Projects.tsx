import { useMemo, useState } from 'react'
import { getDomains, getProjects } from '../lib/content'
import { useRevealOnNavigate } from '../lib/useRevealOnNavigate'
import ProjectCard from './ProjectCard'
import ProjectFilter from './ProjectFilter'
import ShowMore from './ShowMore'

export default function Projects() {
  const projects = useMemo(() => getProjects(), [])
  const domains = useMemo(() => getDomains(), [])

  const [active, setActive] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const current = useMemo(() => projects.filter((p) => !p.archived), [projects])
  const archived = useMemo(() => projects.filter((p) => p.archived), [projects])

  // Picking a domain is an explicit request, so it searches everything —
  // archived included. Hiding matches behind a second toggle after someone asked
  // for that area would just look like the filter was broken.
  const visible = active
    ? projects.filter((p) => p.domain === active)
    : showArchived
      ? projects
      : current

  const hiddenIds = useMemo(
    () => (active || showArchived ? [] : archived.map((p) => p.slug)),
    [active, showArchived, archived],
  )
  useRevealOnNavigate(hiddenIds, () => setShowArchived(true))

  return (
    <section
      id="projects"
      className="border-t border-neutral-200 py-20 dark:border-neutral-800"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Projects
      </h2>

      <ProjectFilter
        domains={domains}
        active={active}
        total={projects.length}
        onChange={setActive}
      />

      <p className="mt-4 text-sm text-neutral-500" aria-live="polite">
        {active
          ? `${visible.length} of ${projects.length} projects in ${active}`
          : `Showing ${visible.length} of ${projects.length} projects`}
      </p>

      <div className="mt-6 space-y-5">
        {visible.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>

      {!active && archived.length > 0 && (
        <ShowMore
          count={archived.length}
          expanded={showArchived}
          noun="earlier project"
          onToggle={() => setShowArchived((v) => !v)}
        />
      )}
    </section>
  )
}
