import { Link } from 'react-router-dom'
import type { RankedHorse } from '../types'
import { formatPoints } from '../lib/format'

interface HorseCardProps {
  horse: RankedHorse
  featured?: boolean
}

export function HorseCard({ horse, featured = false }: HorseCardProps) {
  return (
    <Link
      to={`/caballo/${horse.id}?year=2026`}
      className="group block rounded-[12px] bg-surface transition-transform duration-200 hover:-translate-y-1"
    >
      <div
        className={[
          'overflow-hidden rounded-t-[12px]',
          featured ? 'aspect-[4/3]' : 'aspect-[5/4]',
        ].join(' ')}
      >
        <img
          src={horse.photo}
          alt={horse.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-[10px] bg-bg px-2 text-sm font-bold text-gold">
            #{horse.position}
          </span>
          <span className="text-lg font-bold tabular-nums text-ink md:text-xl">
            {formatPoints(horse.points)}
            <span className="ml-1 text-xs font-medium text-muted">pts</span>
          </span>
        </div>

        <h3
          className={[
            'font-semibold tracking-tight text-ink transition-colors duration-200 group-hover:text-gold',
            featured ? 'text-xl md:text-2xl' : 'text-lg',
          ].join(' ')}
        >
          {horse.name}
        </h3>
        <p className="mt-1 text-sm text-muted">{horse.stable}</p>
        <p className="mt-0.5 text-xs text-muted/80">{horse.owner}</p>
      </div>
    </Link>
  )
}
