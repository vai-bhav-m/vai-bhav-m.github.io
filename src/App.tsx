import Nav from './components/Nav'
import About from './components/About'
import Projects from './components/Projects'
import Experience from './components/Experience'
import Contact from './components/Contact'
import { getAbout } from './lib/content'

export default function App() {
  const about = getAbout()

  return (
    <div className="min-h-dvh bg-white text-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
      <Nav />

      <main className="mx-auto max-w-3xl px-5">
        <About />
        <Experience />
        <Projects />
        <Contact />
      </main>

      <footer
        className="mx-auto max-w-3xl border-t border-neutral-200 px-5 py-8 text-sm
                   text-neutral-500 dark:border-neutral-800"
      >
        © {new Date().getFullYear()} {about.name}
      </footer>
    </div>
  )
}
