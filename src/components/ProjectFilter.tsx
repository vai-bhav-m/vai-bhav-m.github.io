export default function ProjectFilter({
  domains,
  active,
  total,
  onChange,
}: {
  domains: { name: string; count: number }[]
  active: string | null
  total: number
  onChange: (domain: string | null) => void
}) {
  return (
    <div
      className="mt-6 flex flex-wrap gap-2"
      role="group"
      aria-label="Filter projects by area"
    >
      <Chip
        label="All"
        count={total}
        selected={active === null}
        onClick={() => onChange(null)}
      />
      {domains.map((d) => (
        <Chip
          key={d.name}
          label={d.name}
          count={d.count}
          selected={active === d.name}
          onClick={() => onChange(active === d.name ? null : d.name)}
        />
      ))}
    </div>
  )
}

function Chip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string
  count: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-sky-500 ${
                    selected
                      ? 'border-neutral-900 bg-neutral-900 font-medium text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600'
                  }`}
    >
      {label}
      <span className={selected ? 'ml-1.5 opacity-60' : 'ml-1.5 text-neutral-600 dark:text-neutral-400'}>
        {count}
      </span>
    </button>
  )
}
