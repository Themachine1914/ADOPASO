import { Link } from 'react-router-dom'
import type { EntradaRanking } from '../types/publico'
import { formatPoints } from '../lib/format'

interface HorseCardProps {
  horse: EntradaRanking
  year: number
  featured?: boolean
}

export function HorseCard({ horse, year, featured = false }: HorseCardProps) {
  const accent =
    horse.position === 1
      ? 'border-gold/50'
      : horse.position === 2
        ? 'border-border'
        : 'border-flag-blue/40'

  return (
    <Link
      to={`/caballo/${encodeURIComponent(horse.id)}?year=${year}`}
      className={[
        'group flex overflow-hidden rounded-[12px] border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]',
        accent,
      ].join(' ')}
    >
      <div className="flex w-16 shrink-0 items-center justify-center border-r border-border bg-bg font-display text-3xl font-semibold text-gold">
        {horse.position}
      </div>
      <div className="min-w-0 flex-1 p-5">
        <p className="typo-label">{horse.position === 1 ? 'Primero' : horse.position === 2 ? 'Segundo' : 'Tercero'}</p>
        <h3
          className={[
            'mt-2 tracking-tight text-ink transition-colors duration-200 group-hover:text-gold',
            featured ? 'typo-name-lg' : 'typo-name',
          ].join(' ')}
        >
          {horse.name}
        </h3>
        <p className="typo-meta mt-1 truncate">{horse.stable !== '—' ? horse.stable : horse.owner}</p>
        {horse.stable !== '—' && horse.owner !== '—' ? (
          <p className="typo-caption truncate">{horse.owner}</p>
        ) : null}
        <p className="typo-points mt-4">
          {formatPoints(horse.points)}
          <span className="typo-caption ml-1 font-medium">pts</span>
        </p>
      </div>
    </Link>
  )
}
