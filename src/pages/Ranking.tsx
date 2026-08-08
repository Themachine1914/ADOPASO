import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { RankTable } from '../components/RankTable'
import { YearFilter } from '../components/YearFilter'
import { getRanking } from '../data/horses'
import type { Year } from '../types'

export function Ranking() {
  const [year, setYear] = useState<Year>(2026)
  const ranking = useMemo(() => getRanking(year), [year])

  return (
    <div className="container-app page-shell">
      <PageHeader
        eyebrow="Leaderboard"
        title="Ranking Completo"
        description={`Clasificación oficial de puntuaciones acumuladas en la temporada ${year}.`}
        action={<YearFilter value={year} onChange={setYear} />}
      >
        <p className="typo-meta mt-3">
          ¿Buscas un caballo que no aparece?{' '}
          <Link to="/caballos" className="font-medium text-gold hover:text-gold-soft">
            Ir al directorio
          </Link>
        </p>
      </PageHeader>

      <RankTable horses={ranking} year={year} />
    </div>
  )
}
