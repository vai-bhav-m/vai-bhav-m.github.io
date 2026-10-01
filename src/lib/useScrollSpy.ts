import { useEffect, useState } from 'react'

/**
 * Returns the id of the section currently being read.
 *
 * Uses IntersectionObserver rather than a scroll handler — scroll events fire
 * constantly and are a classic source of janky pages.
 *
 * @param ids Section ids in document order. Must be a stable reference
 *            (module-level constant), not an array built during render.
 */
export function useScrollSpy(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }

        // Whichever visible section comes first in document order wins. Without
        // this, two sections straddling the band fight and the highlight flickers.
        const first = ids.find((id) => visible.has(id))
        if (first) setActive(first)
      },
      {
        // Shrink the detection band to a strip near the top of the viewport, so a
        // section activates when it reaches reading position rather than when its
        // first pixel appears.
        rootMargin: '-20% 0px -70% 0px',
      },
    )

    for (const section of sections) observer.observe(section)

    // The last section is usually too short to reach that band, so it would never
    // activate. Treat "scrolled to the bottom" as meaning the final section.
    const onScroll = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) setActive(ids[ids.length - 1])
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [ids])

  return active
}
