interface ChipOption<T extends string> {
  value: T
  label: string
}

interface FilterChipsProps<T extends string> {
  label: string
  value: T
  options: ChipOption<T>[]
  onChange: (value: T) => void
}

export function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: FilterChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={[
              'typo-btn rounded-[10px] border px-3.5 py-2 transition-all duration-200',
              active
                ? 'border-gold/50 bg-gold text-bg'
                : 'border-border bg-surface text-muted hover:border-gold/30 hover:text-ink',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
