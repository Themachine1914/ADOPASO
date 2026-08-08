import type { Year } from '../types'

const years: Year[] = [2026, 2025]

interface YearFilterProps {
  value: Year
  onChange: (year: Year) => void
}

export function YearFilter({ value, onChange }: YearFilterProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-[12px] border border-border bg-surface p-1"
      role="radiogroup"
      aria-label="Filtrar por año"
    >
      {years.map((year) => {
        const active = year === value
        return (
          <button
            key={year}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(year)}
            className={[
              'min-w-[4.5rem] rounded-[10px] px-4 py-2 text-sm font-semibold transition-all duration-200',
              active
                ? 'bg-gold text-bg shadow-[0_0_0_1px_rgba(212,175,55,0.35)]'
                : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {year}
          </button>
        )
      })}
    </div>
  )
}
