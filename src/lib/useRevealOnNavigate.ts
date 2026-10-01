import { useEffect, useRef } from 'react'

/**
 * Expands a collapsed region when something navigates to an item inside it.
 *
 * Archived items are kept out of the DOM entirely, which is what makes the
 * default page short. The catch: an anchor that isn't rendered can't be scrolled
 * to, so a search result or a shared link pointing at an archived item would
 * silently do nothing. This watches the hash and reveals first, then scrolls.
 *
 * @param hiddenIds ids that are currently not rendered. Must be a stable
 *                  reference — build it with useMemo.
 * @param reveal    called when the hash targets one of them.
 */
export function useRevealOnNavigate(hiddenIds: readonly string[], reveal: () => void) {
  // Held in a ref so a caller passing an inline arrow doesn't re-run the effect
  // on every render.
  const revealRef = useRef(reveal)
  revealRef.current = reveal

  useEffect(() => {
    if (hiddenIds.length === 0) return

    const check = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ''))
      if (!id || !hiddenIds.includes(id)) return

      revealRef.current()

      // The element doesn't exist until the reveal has rendered, so wait a frame.
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' })
      })
    }

    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [hiddenIds])
}
