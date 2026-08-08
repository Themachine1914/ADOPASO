interface StatItem {
  label: string
  value: string
}

interface StatSummaryProps {
  items: StatItem[]
}

export function StatSummary({ items }: StatSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[12px] border border-border bg-surface px-5 py-6 transition-colors duration-200 hover:border-gold/30"
        >
          <p className="text-3xl font-bold tracking-tight text-ink md:text-4xl">{item.value}</p>
          <p className="mt-2 text-sm text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
