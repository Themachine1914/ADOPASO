import { Link } from 'react-router-dom'
import type { EntradaRanking } from '../types/publico'
import { formatPoints, placeLabel } from '../lib/format'

interface RankTableProps {
  horses: EntradaRanking[]
  year: number
  showPlace?: boolean
}

function Meta({ horse }: { horse: EntradaRanking }) {
  const bits = [horse.owner !== '—' ? horse.owner : '', horse.stable !== '—' ? horse.stable : ''].filter(
    Boolean,
  )
  return bits.length ? bits.join(' · ') : 'Sin expositor registrado'
}

export function RankTable({ horses, year, showPlace = false }: RankTableProps) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {horses.map((horse) => (
          <Link
            key={horse.id}
            to={`/caballo/${encodeURIComponent(horse.id)}?year=${year}`}
            className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-3 transition-colors duration-200 hover:border-gold/50 hover:bg-surface-elevated"
          >
            <span className="w-8 shrink-0 text-center font-display text-xl font-semibold text-gold">
              {horse.position}
            </span>
            <div className="min-w-0 flex-1">
              <p className="typo-name truncate text-base">{horse.name}</p>
              <p className="typo-caption truncate">
                <Meta horse={horse} />
              </p>
            </div>
            <div className="text-right">
              <p className="typo-points">{formatPoints(horse.points)}</p>
              <p className="typo-caption">
                {showPlace && horse.mejorPuesto ? placeLabel(horse.mejorPuesto) : 'pts'}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[12px] border border-border md:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-surface">
            <tr className="border-b border-border">
              <th className="typo-label px-5 py-3 font-medium">Pos</th>
              <th className="typo-label px-5 py-3 font-medium">Caballo</th>
              <th className="typo-label px-5 py-3 font-medium">Expositor / Criador</th>
              <th className="typo-label px-5 py-3 text-right font-medium">Salidas</th>
              <th className="typo-label px-5 py-3 text-right font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody className="bg-bg">
            {horses.map((horse) => (
              <tr
                key={horse.id}
                className="group border-b border-border/70 transition-colors duration-200 last:border-b-0 hover:bg-surface-elevated"
              >
                <td className="px-5 py-3">
                  <span className="font-display text-lg font-semibold text-gold">{horse.position}</span>
                </td>
                <td className="px-5 py-3">
                  <Link
                    to={`/caballo/${encodeURIComponent(horse.id)}?year=${year}`}
                    className="typo-name text-base transition-colors duration-200 group-hover:text-gold"
                    aria-label={`Ver ficha de ${horse.name}, posición ${horse.position}, ${formatPoints(horse.points)} puntos`}
                  >
                    {horse.name}
                    {horse.campeonatos > 0 ? (
                      <span className="typo-caption ml-2 font-medium text-gold">
                        {horse.campeonatos === 1 ? '1 campeonato' : `${horse.campeonatos} campeonatos`}
                      </span>
                    ) : null}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <p className="typo-meta text-ink">{horse.owner}</p>
                  <p className="typo-caption">{horse.stable}</p>
                </td>
                <td className="px-5 py-3 text-right typo-meta">{horse.salidas}</td>
                <td className="px-5 py-3 text-right">
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
