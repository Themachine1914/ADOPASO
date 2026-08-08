import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { RankTable } from '../components/RankTable'
import { SearchInput } from '../components/SearchInput'
import { RankTableSkeleton } from '../components/Skeleton'
import { YearFilter } from '../components/YearFilter'
import { getRanking } from '../data/horses'
import { matchesSearch } from '../lib/normalize'
import type { Year } from '../types'

type PointsRange = 'all' | 'high' | 'mid' | 'low'

const pointsOptions: { value: PointsRange; label: string }[] = [
  { value: 'all', label: 'Todos los puntos' },
  { value: 'high', label: '200+ pts' },
  { value: 'mid', label: '100–199 pts' },
  { value: 'low', label: '1–99 pts' },
]

function inPointsRange(points: number, range: PointsRange): boolean {
  switch (range) {
    case 'high':
      return points >= 200
    case 'mid':
      return points >= 100 && points < 200
    case 'low':
      return points > 0 && points < 100
    default:
      return true
  }
}

export function Ranking() {
  const [year, setYear] = useState<Year>(2026)
  const [query, setQuery] = useState('')
  const [pointsRange, setPointsRange] = useState<PointsRange>('all')
  const [loading, setLoading] = useState(false)

  const deferredQuery = useDeferredValue(query)
  const ranking = useMemo(() => getRanking(year), [year])

  useEffect(() => {
    setLoading(true)
    const id = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(id)
  }, [year, pointsRange])

  const filtered = useMemo(() => {
    return ranking.filter((horse) => {
      if (!inPointsRange(horse.points, pointsRange)) return false
      return matchesSearch(
        `${horse.name} ${horse.owner} ${horse.stable}`,
        deferredQuery,
      )
    })
  }, [ranking, pointsRange, deferredQuery])

  const isFiltering = Boolean(query.trim()) || pointsRange !== 'all'
  const searching = query !== deferredQuery

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

      <div className="mb-6 space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Buscar en ranking"
          placeholder="Buscar por caballo, dueño o criadero…"
        />
        <FilterChips
          label="Rango de puntos"
          value={pointsRange}
          options={pointsOptions}
          onChange={setPointsRange}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="typo-meta">
          {loading || searching
            ? 'Actualizando resultados…'
            : `${filtered.length} ${filtered.length === 1 ? 'caballo' : 'caballos'}`}
          {!loading && !searching && isFiltering ? ' con estos filtros' : ''}
        </p>
        {isFiltering && !loading ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setPointsRange('all')
            }}
            className="typo-meta font-medium text-gold transition-colors hover:text-gold-soft"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {loading ? (
        <RankTableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No hay caballos con estos filtros"
          description="Prueba con otro nombre, dueño, criadero o cambia el rango de puntos / temporada."
          action={
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setPointsRange('all')
              }}
              className="typo-btn rounded-[12px] bg-gold px-5 py-2.5 text-bg transition-colors hover:bg-gold-soft"
            >
              Ver ranking completo
            </button>
          }
        />
      ) : (
        <RankTable horses={filtered} year={year} />
      )}
    </div>
  )
}
