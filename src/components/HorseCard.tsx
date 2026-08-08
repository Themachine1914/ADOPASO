import { Link } from 'react-router-dom'
import type { RankedHorse } from '../types'
import { formatPoints } from '../lib/format'

interface HorseCardProps {
  horse: RankedHorse
  featured?: boolean
}

const podiumAccent: Record<number, string> = {
  1: 'from-gold/30 via-transparent to-transparent border-gold/50',
  2: 'from-white/10 via-transparent to-transparent border-border',
  3: 'from-flag-red/20 via-transparent to-transparent border-flag-red/30',
}

export function HorseCard({ horse, featured = false }: HorseCardProps) {
  const accent = podiumAccent[horse.position] ?? 'from-transparent border-border'

  return (
    <Link
      to={`/caballo/${horse.id}?year=2026`}
      className={[
        'group relative overflow-hidden rounded-[12px] border bg-surface transition-all duration-200',
        'hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
        accent,
        featured ? 'bg-gradient-to-b' : '',
      ].join(' ')}
    >
      <div className={featured ? 'aspect-[4/3] overflow-hidden' : 'aspect-[5/4] overflow-hidden'}>
        <img
          src={horse.photo}
          alt={horse.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-[10px] border border-gold/40 bg-bg/60 px-2 text-sm font-bold text-gold">
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
