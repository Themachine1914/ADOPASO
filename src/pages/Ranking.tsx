import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RankTable } from '../components/RankTable'
import { YearFilter } from '../components/YearFilter'
import { getRanking } from '../data/horses'
import type { Year } from '../types'

export function Ranking() {
  const [year, setYear] = useState<Year>(2026)
  const ranking = useMemo(() => getRanking(year), [year])

  return (
    <div className="container-app py-12 md:py-16">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Leaderboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-5xl">
            Ranking Completo
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Clasificación oficial de puntuaciones acumuladas en la temporada {year}.
          </p>
          <p className="mt-2 text-sm text-muted">
            ¿Buscas un caballo que no aparece?{' '}
            <Link to="/caballos" className="font-medium text-gold hover:text-gold-soft">
              Ir al directorio
            </Link>
          </p>
        </div>
        <YearFilter value={year} onChange={setYear} />
      </div>

      <RankTable horses={ranking} year={year} />
    </div>
  )
}
