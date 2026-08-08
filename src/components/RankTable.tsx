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
      <div className="space-y-3 md:hidden">
        {horses.map((horse) => (
          <Link
            key={horse.id}
            to={`/caballo/${horse.id}?year=${year}`}
            className="flex items-center gap-3 rounded-[12px] border border-border bg-surface p-3 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-surface-elevated hover:shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
          >
            <span className="typo-meta w-8 text-center font-bold text-gold">
              {horse.position}
            </span>
            <img
              src={horse.photo}
              alt=""
              loading="lazy"
              className="h-14 w-14 rounded-[10px] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="typo-name truncate text-base">{horse.name}</p>
              <p className="typo-caption truncate">
                {horse.owner} · {horse.stable}
              </p>
            </div>
            <div className="text-right">
              <p className="typo-points">{formatPoints(horse.points)}</p>
              <p className="typo-caption">pts</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[12px] border border-border md:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-surface">
            <tr className="border-b border-border">
              <th className="typo-label px-5 py-4 font-medium">Pos</th>
              <th className="typo-label px-5 py-4 font-medium">Caballo</th>
              <th className="typo-label px-5 py-4 font-medium">Dueño / Criadero</th>
              <th className="typo-label px-5 py-4 text-right font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody className="bg-bg">
            {horses.map((horse) => (
              <tr
                key={horse.id}
                className="group border-b border-border/70 transition-all duration-200 last:border-b-0 hover:bg-surface-elevated"
              >
                <td className="px-5 py-4">
                  <span className="typo-meta inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-border font-bold text-gold transition-colors group-hover:border-gold/40">
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
                      className="h-12 w-12 rounded-[10px] object-cover ring-0 transition-all duration-200 group-hover:ring-2 group-hover:ring-gold/30"
                    />
                    <span className="typo-name text-base transition-colors duration-200 group-hover:text-gold">
                      {horse.name}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <p className="typo-meta text-ink">{horse.owner}</p>
                  <p className="typo-caption">{horse.stable}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="typo-points transition-colors group-hover:text-gold">
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
