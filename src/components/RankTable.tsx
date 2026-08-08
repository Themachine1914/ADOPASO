import { Link } from 'react-router-dom'
import type { RankedHorse, Year } from '../types'
import { formatPoints } from '../lib/format'

interface RankTableProps {
  horses: RankedHorse[]
  year: Year
}

export function RankTable({ horses, year }: RankTableProps) {
  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {horses.map((horse) => (
          <Link
            key={horse.id}
            to={`/caballo/${horse.id}?year=${year}`}
            className="flex items-center gap-3 rounded-[12px] border border-border bg-surface p-3 transition-all duration-200 hover:border-gold/40"
          >
            <span className="w-8 text-center text-sm font-bold text-gold">
              {horse.position}
            </span>
            <img
              src={horse.photo}
              alt=""
              loading="lazy"
              className="h-14 w-14 rounded-[10px] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{horse.name}</p>
              <p className="truncate text-xs text-muted">
                {horse.owner} · {horse.stable}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums text-ink">{formatPoints(horse.points)}</p>
              <p className="text-[11px] text-muted">pts</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[12px] border border-border md:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-surface">
            <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
              <th className="px-5 py-4 font-medium">Pos</th>
              <th className="px-5 py-4 font-medium">Caballo</th>
              <th className="px-5 py-4 font-medium">Dueño / Criadero</th>
              <th className="px-5 py-4 text-right font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody className="bg-bg">
            {horses.map((horse) => (
              <tr
                key={horse.id}
                className="group border-b border-border/70 transition-colors duration-200 last:border-b-0 hover:bg-surface-elevated"
              >
                <td className="px-5 py-4">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-border text-sm font-bold text-gold">
                    {horse.position}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <Link
                    to={`/caballo/${horse.id}?year=${year}`}
                    className="flex items-center gap-3"
                    aria-label={`Ver ficha de ${horse.name}, posición ${horse.position}, ${formatPoints(horse.points)} puntos`}
                  >
                    <img
                      src={horse.photo}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 rounded-[10px] object-cover"
                    />
                    <span className="font-semibold text-ink transition-colors duration-200 group-hover:text-gold">
                      {horse.name}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-ink">{horse.owner}</p>
                  <p className="text-xs text-muted">{horse.stable}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="text-lg font-bold tabular-nums text-ink">
                    {formatPoints(horse.points)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
