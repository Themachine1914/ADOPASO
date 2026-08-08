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
      className="group block rounded-[12px] bg-surface shadow-none transition-all duration-200 hover:-translate-y-1 hover:bg-surface-elevated hover:shadow-[0_14px_36px_rgba(0,0,0,0.28)]"
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
          <span className="typo-meta inline-flex h-8 min-w-8 items-center justify-center rounded-[10px] bg-bg px-2 font-bold text-gold">
            #{horse.position}
          </span>
          <span className="typo-points">
            {formatPoints(horse.points)}
            <span className="typo-caption ml-1 font-medium">pts</span>
          </span>
        </div>

        <h3
          className={[
            'tracking-tight text-ink transition-colors duration-200 group-hover:text-gold',
            featured ? 'typo-name-lg' : 'typo-name',
          ].join(' ')}
        >
          {horse.name}
        </h3>
        <p className="typo-meta mt-1">{horse.stable}</p>
        <p className="typo-caption mt-0.5">{horse.owner}</p>
      </div>
    </Link>
  )
}
