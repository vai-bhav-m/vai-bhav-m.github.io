import { useState } from 'react'
import ThemeToggle from './ThemeToggle'
import { useScrollSpy } from '../lib/useScrollSpy'

// Order matters twice: it sets the nav order, and useScrollSpy relies on it being
// document order to break ties when two sections are visible at once. Keep this in
// sync with the section order in App.tsx.
export const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const

// Module-level so the reference is stable across renders — useScrollSpy depends on it.
const SECTION_IDS = SECTIONS.map((s) => s.id)

export default function Nav({ onSearchClick }: { onSearchClick: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const active = useScrollSpy(SECTION_IDS)

  return (
    <header
      className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80
                 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/80"
    >
      <nav className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-5">
        <a
          href="#about"
          aria-label="Back to top"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-neutral-700
                     transition hover:bg-neutral-100 focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-sky-500
                     dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <RobotIcon />
        </a>

        {/* Section links — hidden on narrow screens, where the hamburger takes over */}
        <ul className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? 'true' : undefined}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  active === s.id
                    ? 'font-medium text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <SearchTrigger onClick={onSearchClick} />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="grid size-9 place-items-center rounded-lg border border-neutral-200
                       text-neutral-600 md:hidden dark:border-neutral-800
                       dark:text-neutral-400"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
            >
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <ul className="border-t border-neutral-200 px-5 py-2 md:hidden dark:border-neutral-800">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-md px-3 py-2.5 text-sm ${
                  active === s.id
                    ? 'font-medium text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}

function RobotIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* antenna */}
      <path d="M12 2v3" />
      <circle cx="12" cy="1.6" r="1" fill="currentColor" stroke="none" />
      {/* head */}
      <rect x="4" y="5" width="16" height="13" rx="3.5" />
      {/* eyes */}
      <circle cx="9" cy="11" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1.35" fill="currentColor" stroke="none" />
      {/* ears */}
      <path d="M2 10.5v3M22 10.5v3" />
    </svg>
  )
}

/**
 * Looks like an input, behaves like a button — it opens the overlay rather than
 * accepting typing. A live input in the nav has nowhere good to put results,
 * especially on mobile. See docs/03-features-and-ui.md#search-box-placement
 */
function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <>
      {/* Desktop: a fake input with a keyboard hint */}
      <button
        type="button"
        onClick={onClick}
        className="hidden h-9 w-48 items-center gap-2 rounded-lg border border-neutral-200
                   px-3 text-left text-sm text-neutral-400 transition
                   hover:border-neutral-400 focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:flex
                   dark:border-neutral-800 dark:text-neutral-500
                   dark:hover:border-neutral-600"
      >
        <SearchIcon />
        <span>Search…</span>
        <kbd
          className="ml-auto rounded border border-neutral-200 px-1.5 py-0.5 font-sans
                     text-[10px] text-neutral-400 dark:border-neutral-700
                     dark:text-neutral-500"
        >
          Ctrl K
        </kbd>
      </button>

      {/* Mobile: icon only */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Search"
        className="grid size-9 place-items-center rounded-lg border border-neutral-200
                   text-neutral-500 transition hover:border-neutral-400 sm:hidden
                   dark:border-neutral-800 dark:text-neutral-400"
      >
        <SearchIcon />
      </button>
    </>
  )
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
