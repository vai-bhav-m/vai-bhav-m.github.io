import Markdown from 'react-markdown'

/**
 * Renders a Markdown body with explicit component styles.
 *
 * Mapping components by hand rather than pulling in a typography plugin — there
 * are six elements here and this way the styles sit where you can see them.
 */
export default function Prose({ children }: { children: string }) {
  return (
    <div className="space-y-4 text-neutral-600 dark:text-neutral-400">
      <Markdown
        components={{
          h2: ({ children }) => (
            <h3 className="pt-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="pt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1.5 pl-5 marker:text-neutral-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1.5 pl-5 marker:text-neutral-400">
              {children}
            </ol>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-sky-600 underline underline-offset-2 hover:text-sky-500
                         dark:text-sky-400"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code
              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[0.9em]
                         text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {children}
            </code>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-neutral-900 dark:text-neutral-200">
              {children}
            </strong>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
