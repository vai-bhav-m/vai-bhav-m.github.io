import { useEffect, useState } from 'react'
import type { Theme } from '../lib/theme'
import {
  getTheme,
  nextTheme,
  resolveTheme,
  setTheme,
  watchSystemTheme,
} from '../lib/theme'

const LABEL: Record<Theme, string> = {
  system: 'Theme: follows your system',
  light: 'Theme: light',
  dark: 'Theme: dark',
}

export default function ThemeToggle() {
  // Initial state is READ from what index.html already decided, not decided here.
  // Deciding it here is what causes the flash.
  const [theme, setThemeState] = useState<Theme>(getTheme)

  useEffect(() => {
    // While on 'system', follow the OS if the visitor changes it mid-visit.
    if (theme !== 'system') return
    return watchSystemTheme(() => setTheme('system'))
  }, [theme])

  function cycle() {
    const next = nextTheme(theme)
    setTheme(next)
    setThemeState(next)
  }

  const resolved = typeof window === 'undefined' ? 'light' : resolveTheme(theme)

  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[theme]}
      aria-label={LABEL[theme]}
      className="grid size-9 place-items-center rounded-lg border border-neutral-200
                 text-neutral-600 transition hover:bg-neutral-100 focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-sky-500
                 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      {theme === 'system' ? (
        <MonitorIcon />
      ) : resolved === 'dark' ? (
        <MoonIcon />
      ) : (
        <SunIcon />
      )}
    </button>
  )
}

/* Inline SVGs rather than an icon package — three icons isn't worth a dependency. */

const svg = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function SunIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...svg}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg {...svg}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}
