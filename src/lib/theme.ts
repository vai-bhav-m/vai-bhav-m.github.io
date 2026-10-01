/**
 * Theme state. Deliberately framework-free — no React in here.
 *
 * Three states, not two. A boolean toggle strands anyone who clicks it once:
 * they can never get back to "follow my OS". Storing 'system' as the absence of
 * a stored value keeps that free.
 */

export type Theme = 'system' | 'light' | 'dark'
export type Resolved = 'light' | 'dark'

const KEY = 'theme'
const QUERY = '(prefers-color-scheme: dark)'

/** Reads the stored override, if any. Falls back to following the system. */
export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage throws in some privacy modes. Following the system is a fine
    // fallback, so there is nothing to handle here.
  }
  return 'system'
}

/** What a given theme actually means right now. */
export function resolveTheme(theme: Theme): Resolved {
  if (theme !== 'system') return theme
  return window.matchMedia(QUERY).matches ? 'dark' : 'light'
}

/** Applies the theme to <html> and persists the choice. */
export function setTheme(theme: Theme): Resolved {
  const resolved = resolveTheme(theme)
  document.documentElement.classList.toggle('dark', resolved === 'dark')

  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // Not persisting is survivable; the theme still applies for this page view.
  }

  return resolved
}

/** system -> light -> dark -> system */
export function nextTheme(theme: Theme): Theme {
  return theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
}

/**
 * Calls back when the OS theme changes, so a visitor on 'system' follows along
 * without reloading. Returns an unsubscribe function.
 */
export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
