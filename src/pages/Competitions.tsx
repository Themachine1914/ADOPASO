import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { YearFilter } from '../components/YearFilter'
import { RankTableSkeleton } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { formatDate, formatDateParts, formatPoints, placeLabel } from '../lib/format'
import { supabaseConfigurado } from '../lib/supabase'
import {
  cargarAniosPublicos,
  cargarCalendario,
  cargarRankingCompetencia,
} from '../lib/publico'
import type { CompetenciaResumen, EntradaRanking } from '../types/publico'

function placeTone(place: number): string {
  if (place === 1) return 'bg-gold/20 text-gold border-gold/40'
  if (place === 2) return 'bg-border/80 text-ink border-border'
  if (place === 3) return 'bg-flag-blue/40 text-ink border-flag-blue/50'
  return 'bg-bg text-muted border-border'
}

export function Competitions() {
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState<number | null>(null)
  const [list, setList] = useState<CompetenciaResumen[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [results, setResults] = useState<EntradaRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setLoading(false)
      setError('Falta la conexión con Supabase.')
      return
    }
    let cancel = false
    cargarAniosPublicos()
      .then((anios) => {
        if (cancel) return
        const yearsList = anios.map((a) => a.anio)
        setYears(yearsList)
        const thisYear = new Date().getFullYear()
        setYear(yearsList.includes(thisYear) ? thisYear : yearsList[0] ?? thisYear)
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message)
      })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (!year) return
    let cancel = false
    setLoading(true)
    cargarCalendario(year)
      .then((filas) => {
        if (cancel) return
        setList(filas)
        setYears((prev) => (prev.includes(year) ? prev : [...prev, year].sort((a, b) => b - a)))
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message)
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [year])

  useEffect(() => {
    setExpandedId(null)
    setResults([])
  }, [year])

  const expanded = useMemo(
    () => list.find((c) => c.id === expandedId) ?? null,
    [list, expandedId],
  )

  useEffect(() => {
    if (!expanded || expanded.resultados === 0 || !year) {
      setResults([])
      return
    }
    let cancel = false
    setLoadingResults(true)
    cargarRankingCompetencia(year, expanded.fecha, expanded.lugarClave)
      .then((filas) => {
        if (!cancel) setResults(filas)
      })
      .catch(() => {
        if (!cancel) setResults([])
      })
      .finally(() => {
        if (!cancel) setLoadingResults(false)
      })
    return () => {
      cancel = true
    }
  }, [expanded, year])

  return (
    <div className="container-app page-shell">
      <PageHeader
        eyebrow="Calendario"
        title="Competencias"
        description={
          year
            ? `Calendario de ${year}.`
            : 'Eventos del circuito y el ranking de cada fecha.'
        }
        action={year ? <YearFilter value={year} years={years} onChange={setYear} /> : null}
      />

      {error ? (
        <EmptyState title="No se pudo cargar el calendario" description={error} />
      ) : loading ? (
        <RankTableSkeleton />
      ) : list.length === 0 ? (
        <EmptyState
          title="No hay competencias en este año"
          description="Elige otro año del circuito para ver fechas y resultados."
        />
      ) : (
        <div className="space-y-4">
          {list.map((competition) => {
            const open = expandedId === competition.id
            const panelId = `competition-panel-${competition.id}`
            const buttonId = `competition-btn-${competition.id}`
            const hasResults = competition.resultados > 0
            const upcoming = competition.status === 'upcoming'
            const dateParts = formatDateParts(competition.fecha)
            const totalPoints = results.reduce((sum, r) => sum + r.points, 0)
            const actionLabel = hasResults
              ? open
                ? 'Ocultar resultados'
                : 'Ver ranking'
              : open
                ? 'Ocultar detalle'
                : 'Ver detalle'

            return (
              <article
                key={competition.id}
                className={[
                  'overflow-hidden rounded-[12px] border transition-all duration-200',
                  upcoming
                    ? 'border-gold/35 bg-gradient-to-br from-surface via-surface to-gold/5 hover:border-gold/55 hover:shadow-[0_10px_28px_rgba(212,175,55,0.12)]'
                    : 'border-border bg-surface hover:border-gold/35 hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]',
                ].join(' ')}
              >
                <button
                  type="button"
                  id={buttonId}
                  className="flex w-full gap-4 p-4 text-left sm:items-center sm:justify-between md:p-6"
                  onClick={() => setExpandedId(open ? null : competition.id)}
                  aria-expanded={open}
                  aria-controls={panelId}
                >
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                    <div
                      className={[
                        'flex h-[4.5rem] w-14 shrink-0 flex-col items-center justify-center rounded-[12px] border sm:h-20 sm:w-16',
                        upcoming ? 'border-gold/40 bg-gold/10' : 'border-border bg-bg',
                      ].join(' ')}
                    >
                      <span className={['typo-label leading-none', upcoming ? 'text-gold' : 'text-muted'].join(' ')}>
                        {dateParts.month}
                      </span>
                      <span
                        className={[
                          'mt-1 text-2xl font-bold leading-none tracking-tight',
                          upcoming ? 'text-gold' : 'text-ink',
                        ].join(' ')}
                      >
                        {dateParts.day}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            'typo-label rounded-[8px] px-2.5 py-1',
                            hasResults
                              ? 'bg-flag-blue/35 text-ink'
                              : upcoming
                                ? 'bg-gold/20 text-gold'
                                : 'bg-border/60 text-muted',
                          ].join(' ')}
                        >
                          {hasResults ? 'Con resultados' : upcoming ? 'Próxima' : 'Sin resultados'}
                        </span>
                        {competition.caballos > 0 ? (
                          <span className="typo-caption text-muted">
                            {competition.caballos} caballos
                          </span>
                        ) : null}
                      </div>
                      <h2 className="typo-name-lg leading-snug">{competition.nombre}</h2>
                      <p className="typo-meta mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-ink">{competition.lugar}</span>
                        <span className="text-muted">·</span>
                        <span className="text-muted">{formatDate(competition.fecha)}</span>
                      </p>
                    </div>
                  </div>

                  <span className="typo-meta shrink-0 font-medium text-gold sm:self-center">
                    {actionLabel}
                  </span>
                </button>

                {open && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="border-t border-border bg-bg/60 px-4 py-4 md:px-6 md:py-5"
                  >
                    {hasResults ? (
                      loadingResults ? (
                        <p className="typo-meta">Cargando ranking…</p>
                      ) : results.length === 0 ? (
                        <p className="typo-meta">Aún no hay resultados publicados para esta fecha.</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-3">
                            <div className="rounded-[10px] border border-border bg-surface px-3 py-2">
                              <p className="typo-caption">Participantes</p>
                              <p className="typo-name mt-0.5 text-base">{results.length}</p>
                            </div>
                            <div className="rounded-[10px] border border-border bg-surface px-3 py-2">
                              <p className="typo-caption">Puntos repartidos</p>
                              <p className="typo-name mt-0.5 text-base">{formatPoints(totalPoints)}</p>
                            </div>
                            <div className="rounded-[10px] border border-border bg-surface px-3 py-2">
                              <p className="typo-caption">Va más adelante</p>
                              <p className="typo-name mt-0.5 truncate text-base text-gold">
                                {results[0]?.name ?? '—'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {results.map((result) => (
                              <Link
                                key={result.id}
                                to={`/caballo/${encodeURIComponent(result.id)}?year=${year}`}
                                className="flex items-center gap-3 rounded-[12px] border border-transparent bg-surface/80 px-2.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/35 hover:bg-surface-elevated hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] sm:px-3"
                              >
                                <span
                                  className={[
                                    'typo-meta inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border font-bold',
                                    placeTone(result.position),
                                  ].join(' ')}
                                >
                                  {placeLabel(result.position)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="typo-name truncate text-base">{result.name}</p>
                                  <p className="typo-caption truncate">
                                    {result.owner}
                                    {result.mejorPuesto ? ` · puesto ${placeLabel(result.mejorPuesto)}` : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="typo-points">{formatPoints(result.points)}</p>
                                  <p className="typo-caption">pts</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="rounded-[12px] border border-gold/25 bg-gold/5 px-4 py-4">
                        <p className="typo-name text-base">Evento por realizarse</p>
                        <p className="typo-meta mt-2 max-w-xl">
                          El ranking se publicará al finalizar la competencia en{' '}
                          <span className="text-ink">{competition.lugar}</span> el{' '}
                          <span className="text-ink">{formatDate(competition.fecha)}</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}