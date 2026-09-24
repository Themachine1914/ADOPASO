interface YearFilterProps {
  value: number
  years: number[]
  onChange: (year: number) => void
}

export function YearFilter({ value, years, onChange }: YearFilterProps) {
  if (years.length === 0) return null

  return (
    <label className="inline-flex items-center gap-2">
      <span className="typo-label">Año</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Filtrar por año"
        className="typo-btn min-w-[7rem] rounded-[12px] border border-border bg-surface px-3 py-2.5 text-ink transition-colors duration-200 focus:border-gold/50 focus:outline-none"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  )
}
