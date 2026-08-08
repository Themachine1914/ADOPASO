import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { searchHorses } from '../data/horses'
import { formatPoints } from '../lib/format'
import type { Year } from '../types'

const YEAR: Year = 2026

export function Horses() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchHorses(query), [query])

  return (
    <div className="container-app page-shell">
      <PageHeader
        eyebrow="Directorio"
        title="Caballos"
        description="Busca cualquier caballo registrado en ADOPASO, esté o no en el ranking de la temporada."
      />

      <label className="mb-8 block">
        <span className="sr-only">Buscar caballos</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, dueño o criadero…"
          className="typo-body w-full rounded-[12px] border border-border bg-surface px-4 py-3.5 text-ink placeholder:text-muted/70 transition-colors duration-200 focus:border-gold/50 focus:outline-none md:max-w-xl"
        />
      </label>

      <p className="typo-meta mb-4">
        {results.length} {results.length === 1 ? 'caballo' : 'caballos'}
        {query.trim() ? ' encontrados' : ' registrados'}
      </p>

      {results.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface px-6 py-12 text-center">
          <p className="typo-name">Sin resultados</p>
          <p className="typo-meta mt-2">
            Prueba con otro nombre, dueño o criadero.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((horse) => {
            const points = horse.pointsByYear[YEAR] ?? 0
            const inRanking = points > 0

            return (
              <Link
                key={horse.id}
                to={`/caballo/${horse.id}?year=${YEAR}`}
                className="group overflow-hidden rounded-[12px] border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/40"
              >
                <div className="aspect-[5/3] overflow-hidden">
                  <img
                    src={horse.photo}
                    alt={horse.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="typo-name transition-colors group-hover:text-gold">
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
                  <p className="typo-meta">{horse.stable}</p>
                  <p className="typo-caption mt-0.5">{horse.owner}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
