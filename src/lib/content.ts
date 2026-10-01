/**
 * The seam between "where content comes from" and "how it is displayed".
 *
 * Right now it reads Markdown files from the repo at build time. If content ever
 * moves to a Flask + Postgres backend, the bodies of these functions become fetch
 * calls and nothing else in the app changes. That is the entire reason this file
 * exists instead of components importing Markdown directly.
 *
 * See docs/02-architecture.md
 */

// Named import, not default: js-yaml's ESM build has no default export, and a
// default import type-checks but fails at bundle time.
import { load as parseYaml } from 'js-yaml'

/* ------------------------------------------------------------------ types -- */

export type Social = { label: string; url: string }

export type About = {
  name: string
  tagline: string
  location?: string
  email: string
  resume: string
  socials: Social[]
  body: string
}

export type Project = {
  slug: string
  title: string
  summary: string
  /**
   * Single broad bucket, used for the filter chips. Deliberately separate from
   * `tags`: a filter needs a handful of mutually-exclusive options, while tags
   * are free-form signal for a reader scanning for a specific technology.
   */
  domain: string
  tags: string[]
  repo?: string
  demo?: string
  period?: string
  featured: boolean
  /** Kept out of the default view, but still indexed and searchable. */
  archived: boolean
  order: number
  body: string
}

export type ExperienceEntry = {
  slug: string
  role: string
  org: string
  start: string
  end: string
  location?: string
  summary: string
  tags: string[]
  /** Kept out of the default view, but still indexed and searchable. */
  archived: boolean
  body: string
}

/**
 * One searchable thing. Both the keyword index (Phase 2) and the Python embedding
 * script (Phase 4) consume exactly this shape — one definition of "what is
 * searchable", used by both.
 */
export type SearchItem = {
  id: string
  kind: 'about' | 'project' | 'experience'
  title: string
  summary: string
  tags: string[]
  url: string
}

/* ---------------------------------------------------------------- parsing -- */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

type Parsed = { data: Record<string, unknown>; body: string }

function parse(raw: string, path: string): Parsed {
  const match = raw.match(FRONTMATTER)
  if (!match) {
    throw new Error(
      `${path}: missing frontmatter. Every content file needs a --- block at the top.`,
    )
  }

  const data = parseYaml(match[1])
  if (typeof data !== 'object' || data === null) {
    throw new Error(`${path}: frontmatter did not parse to an object.`)
  }

  return { data: data as Record<string, unknown>, body: raw.slice(match[0].length).trim() }
}

/** Filename without extension, used as the anchor id. */
function slugOf(path: string): string {
  return path.split('/').pop()!.replace(/\.md$/, '')
}

function str(data: Record<string, unknown>, key: string, path: string): string {
  const v = data[key]
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`${path}: frontmatter field "${key}" is required and must be text.`)
  }
  return v.trim()
}

function optStr(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key]
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}

function strList(data: Record<string, unknown>, key: string): string[] {
  const v = data[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

/* ------------------------------------------------------------------ about -- */

const aboutFiles = import.meta.glob('../../content/about.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export function getAbout(): About {
  const [path, raw] = Object.entries(aboutFiles)[0]
  const { data, body } = parse(raw, path)

  const socials = Array.isArray(data.socials)
    ? (data.socials as unknown[]).flatMap((s) => {
        if (typeof s !== 'object' || s === null) return []
        const { label, url } = s as Record<string, unknown>
        if (typeof label !== 'string' || typeof url !== 'string') return []
        return [{ label, url }]
      })
    : []

  return {
    name: str(data, 'name', path),
    tagline: str(data, 'tagline', path),
    location: optStr(data, 'location'),
    email: str(data, 'email', path),
    resume: optStr(data, 'resume') ?? '/resume.pdf',
    socials,
    body,
  }
}

/* --------------------------------------------------------------- projects -- */

const projectFiles = import.meta.glob('../../content/projects/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export function getProjects(): Project[] {
  return Object.entries(projectFiles)
    .map(([path, raw]) => {
      const { data, body } = parse(raw, path)
      return {
        slug: optStr(data, 'slug') ?? slugOf(path),
        title: str(data, 'title', path),
        summary: str(data, 'summary', path),
        domain: str(data, 'domain', path),
        tags: strList(data, 'tags'),
        repo: optStr(data, 'repo'),
        demo: optStr(data, 'demo'),
        period: optStr(data, 'period'),
        featured: data.featured === true,
        archived: data.archived === true,
        order: typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
        body,
      }
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

/**
 * Domains in use, with how many projects each holds — busiest first, then
 * alphabetical. Derived from the files, never a hand-kept list, so a new domain
 * appears the moment a project declares one.
 */
export function getDomains(): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of getProjects()) {
    counts.set(p.domain, (counts.get(p.domain) ?? 0) + 1)
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Every tag in use, deduped. Display and search only — not the filter. */
export function getTags(): string[] {
  const seen = new Set<string>()
  for (const p of getProjects()) for (const t of p.tags) seen.add(t)
  return [...seen].sort()
}

/* ------------------------------------------------------------- experience -- */

const experienceFiles = import.meta.glob('../../content/experience/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export function getExperience(): ExperienceEntry[] {
  return Object.entries(experienceFiles)
    .map(([path, raw]) => {
      const { data, body } = parse(raw, path)
      return {
        slug: optStr(data, 'slug') ?? slugOf(path),
        role: str(data, 'role', path),
        org: str(data, 'org', path),
        // YAML turns an unquoted 2024-06 into a Date, so normalise to text.
        start: String(data.start ?? ''),
        end: String(data.end ?? 'Present'),
        location: optStr(data, 'location'),
        summary: str(data, 'summary', path),
        tags: strList(data, 'tags'),
        archived: data.archived === true,
        body,
      }
    })
    .sort((a, b) => b.start.localeCompare(a.start)) // most recent first
}

/* ----------------------------------------------------------------- search -- */

/**
 * One entry per project and experience item — roughly 10–25 in total, which is
 * why a for-loop beats a vector database. See docs/05-search-design.md
 */
export function getSearchItems(): SearchItem[] {
  const about = getAbout()

  return [
    {
      id: 'about',
      kind: 'about' as const,
      title: about.name,
      summary: about.tagline,
      tags: [],
      url: '#about',
    },
    ...getProjects().map((p) => ({
      id: `projects/${p.slug}`,
      kind: 'project' as const,
      title: p.title,
      summary: p.summary,
      tags: p.tags,
      url: `#${p.slug}`,
    })),
    ...getExperience().map((e) => ({
      id: `experience/${e.slug}`,
      kind: 'experience' as const,
      title: `${e.role} — ${e.org}`,
      summary: e.summary,
      tags: e.tags,
      url: `#${e.slug}`,
    })),
  ]
}
