import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { searchHorses } from '../data/horses'
import { formatPoints } from '../lib/format'
import type { Year } from '../types'

const YEAR: Year = 2026

type RankingFilter = 'all' | 'ranked' | 'unranked'

const rankingOptions: { value: RankingFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ranked', label: 'Con ranking' },
  { value: 'unranked', label: 'Sin ranking' },
]

export function Horses() {
  const [query, setQuery] = useState('')
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>('all')
  const deferredQuery = useDeferredValue(query)

  const results = useMemo(() => {
    return searchHorses(deferredQuery).filter((horse) => {
      const points = horse.pointsByYear[YEAR] ?? 0
      if (rankingFilter === 'ranked') return points > 0
      if (rankingFilter === 'unranked') return points <= 0
      return true
    })
  }, [deferredQuery, rankingFilter])

  const isFiltering = Boolean(query.trim()) || rankingFilter !== 'all'
  const searching = query !== deferredQuery

  return (
    <div className="container-app page-shell">
      <PageHeader
        eyebrow="Directorio"
        title="Caballos"
        description="Busca cualquier caballo registrado en ADOPASO, esté o no en el ranking de la temporada."
      />

      <div className="mb-6 space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Buscar caballos"
          placeholder="Nombre, dueño, criadero o pedigrí…"
        />
        <FilterChips
          label="Filtro de ranking"
          value={rankingFilter}
          options={rankingOptions}
          onChange={setRankingFilter}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="typo-meta">
          {searching
            ? 'Buscando…'
            : `${results.length} ${results.length === 1 ? 'caballo' : 'caballos'}`}
          {!searching && isFiltering ? ' con estos filtros' : !searching ? ' registrados' : ''}
        </p>
        {isFiltering ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setRankingFilter('all')
            }}
            className="typo-meta font-medium text-gold transition-colors hover:text-gold-soft"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No encontramos caballos"
          description="Prueba con otro nombre, dueño o criadero, o cambia el filtro de ranking."
          action={
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setRankingFilter('all')
              }}
              className="typo-btn rounded-[12px] bg-gold px-5 py-2.5 text-bg transition-colors hover:bg-gold-soft"
            >
              Ver todos los caballos
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {results.map((horse) => {
            const points = horse.pointsByYear[YEAR] ?? 0
            const inRanking = points > 0

            return (
              <Link
                key={horse.id}
                to={`/caballo/${horse.id}?year=${YEAR}`}
                className="group flex overflow-hidden rounded-[12px] border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-surface-elevated hover:shadow-[0_12px_32px_rgba(0,0,0,0.28)] sm:block"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden sm:aspect-[5/3] sm:h-auto sm:w-full">
                  <img
                    src={horse.photo}
                    alt={horse.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-3 sm:p-4">
                  <div className="mb-1 flex items-start justify-between gap-2 sm:mb-2">
                    <h2 className="typo-name truncate text-base transition-colors group-hover:text-gold sm:text-[1.05rem]">
                      {horse.name}
                    </h2>
                    <span
                      className={[
                        'typo-label shrink-0 rounded-[8px] px-2 py-0.5 normal-case tracking-[0.08em]',
                        inRanking
                          ? 'bg-gold/15 text-gold'
                          : 'bg-border/60 text-muted',
                      ].join(' ')}
                    >
                      {inRanking ? `${formatPoints(points)} pts` : 'Sin ranking'}
                    </span>
                  </div>
                  <p className="typo-meta truncate">{horse.stable}</p>
                  <p className="typo-caption mt-0.5 truncate">{horse.owner}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
