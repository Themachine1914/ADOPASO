import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchHorses } from '../data/horses'
import { formatPoints } from '../lib/format'
import type { Year } from '../types'

const YEAR: Year = 2026

export function Horses() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchHorses(query), [query])

  return (
    <div className="container-app py-12 md:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Directorio
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-5xl">
          Caballos
        </h1>
        <p className="mt-3 text-muted">
          Busca cualquier caballo registrado en ADOPASO, esté o no en el ranking
          de la temporada.
        </p>
      </div>

      <label className="mb-8 block">
        <span className="sr-only">Buscar caballos</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, dueño o criadero…"
          className="w-full rounded-[12px] border border-border bg-surface px-4 py-3.5 text-ink placeholder:text-muted/70 transition-colors duration-200 focus:border-gold/50 focus:outline-none md:max-w-xl"
        />
      </label>

      <p className="mb-4 text-sm text-muted">
        {results.length} {results.length === 1 ? 'caballo' : 'caballos'}
        {query.trim() ? ' encontrados' : ' registrados'}
      </p>

      {results.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink">Sin resultados</p>
          <p className="mt-2 text-sm text-muted">
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
                    <h2 className="font-semibold text-ink transition-colors group-hover:text-gold">
                      {horse.name}
                    </h2>
                    <span
                      className={[
                        'shrink-0 rounded-[8px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]',
                        inRanking
                          ? 'bg-gold/15 text-gold'
                          : 'bg-border/60 text-muted',
                      ].join(' ')}
                    >
                      {inRanking ? `${formatPoints(points)} pts` : 'Sin ranking'}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{horse.stable}</p>
                  <p className="mt-0.5 text-xs text-muted/80">{horse.owner}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
