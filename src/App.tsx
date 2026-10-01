import { useCallback, useEffect, useRef, useState } from 'react'
import Nav from './components/Nav'
import About from './components/About'
import Projects from './components/Projects'
import Experience from './components/Experience'
import Contact from './components/Contact'
import SearchOverlay from './components/SearchOverlay'
import { getAbout } from './lib/content'

export default function App() {
  const about = getAbout()

  const [searchOpen, setSearchOpen] = useState(false)
  // Whatever had focus when search opened, so it can be handed back on close.
  const triggerRef = useRef<HTMLElement | null>(null)

  const openSearch = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement | null
    setSearchOpen(true)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault() // Ctrl+K is "focus address bar" in some browsers
        openSearch()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  return (
    <div className="min-h-dvh bg-white text-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
      <Nav onSearchClick={openSearch} />

      <main className="mx-auto max-w-5xl px-5">
        <About />
        <Experience />
        <Projects />
        <Contact />
      </main>

      <footer
        className="mx-auto max-w-5xl border-t border-neutral-200 px-5 py-8 text-sm
                   text-neutral-500 dark:border-neutral-800"
      >
        © {new Date().getFullYear()} {about.name}
      </footer>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </div>
  )
}
