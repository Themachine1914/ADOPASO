import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { YearFilter } from '../components/YearFilter'
import { getCompetitionsByYear } from '../data/competitions'
import { getResultsForCompetition } from '../data/horses'
import { formatDate, formatDateParts, formatPoints, placeLabel } from '../lib/format'
import type { Year } from '../types'

function placeTone(place: number): string {
  if (place === 1) return 'bg-gold/20 text-gold border-gold/40'
  if (place === 2) return 'bg-border/80 text-ink border-border'
  if (place === 3) return 'bg-flag-blue/40 text-ink border-flag-blue/50'
  return 'bg-bg text-muted border-border'
}

export function Competitions() {
  const [year, setYear] = useState<Year>(2026)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const list = useMemo(() => getCompetitionsByYear(year), [year])

  return (
    <div className="container-app page-shell">
      <PageHeader
        eyebrow="Calendario"
        title="Competencias"
        description={`Eventos oficiales de la temporada ${year} y sus resultados.`}
        action={<YearFilter value={year} onChange={setYear} />}
      />

      <div className="space-y-4">
        {list.map((competition) => {
          const open = expandedId === competition.id
          const panelId = `competition-panel-${competition.id}`
          const buttonId = `competition-btn-${competition.id}`
          const completed = competition.status === 'completed'
          const results = completed ? getResultsForCompetition(competition.id) : []
          const dateParts = formatDateParts(competition.date)
          const totalPoints = results.reduce((sum, r) => sum + r.points, 0)

          const actionLabel = completed
            ? open
              ? 'Ocultar resultados'
              : 'Ver resultados'
            : open
              ? 'Ocultar detalle'
              : 'Ver detalle'

          return (
            <article
              key={competition.id}
              className={[
                'overflow-hidden rounded-[12px] border transition-all duration-200',
                completed
                  ? 'border-border bg-surface hover:border-gold/35 hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)]'
                  : 'border-gold/35 bg-gradient-to-br from-surface via-surface to-gold/5 hover:border-gold/55 hover:shadow-[0_10px_28px_rgba(212,175,55,0.12)]',
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
                      completed
                        ? 'border-border bg-bg'
                        : 'border-gold/40 bg-gold/10',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'typo-label leading-none',
                        completed ? 'text-muted' : 'text-gold',
                      ].join(' ')}
                    >
                      {dateParts.month}
                    </span>
                    <span
                      className={[
                        'mt-1 text-2xl font-bold leading-none tracking-tight',
                        completed ? 'text-ink' : 'text-gold',
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
                          completed
                            ? 'bg-flag-blue/35 text-ink'
                            : 'bg-gold/20 text-gold',
                        ].join(' ')}
                      >
                        {completed ? 'Finalizada' : 'Próxima'}
                      </span>
                      {completed && results.length > 0 ? (
                        <span className="typo-caption text-muted">
                          {results.length} resultados
                        </span>
                      ) : null}
                    </div>
                    <h2 className="typo-name-lg leading-snug">{competition.name}</h2>
                    <p className="typo-meta mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 text-ink">
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-gold"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          />
                          <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.7" />
                        </svg>
                        {competition.location}
                      </span>
                      <span className="text-muted">·</span>
                      <span className="text-muted">{formatDate(competition.date)}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={[
                    'typo-meta shrink-0 font-medium sm:self-center',
                    completed ? 'text-gold' : 'text-gold',
                  ].join(' ')}
                >
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
                  {completed ? (
                    results.length === 0 ? (
                      <p className="typo-meta">Aún no hay resultados publicados.</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                          <div className="rounded-[10px] border border-border bg-surface px-3 py-2">
                            <p className="typo-caption">Participantes</p>
                            <p className="typo-name mt-0.5 text-base">{results.length}</p>
                          </div>
                          <div className="rounded-[10px] border border-border bg-surface px-3 py-2">
                            <p className="typo-caption">Puntos repartidos</p>
                            <p className="typo-name mt-0.5 text-base">
                              {formatPoints(totalPoints)}
                            </p>
                          </div>
                          <div className="rounded-[10px] border border-border bg-surface px-3 py-2">
                            <p className="typo-caption">Campeón</p>
                            <p className="typo-name mt-0.5 truncate text-base text-gold">
                              {results[0]?.horse.name ?? '—'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {results.map((result) => (
                            <Link
                              key={result.horse.id}
                              to={`/caballo/${result.horse.id}?year=${year}`}
                              className="flex items-center gap-3 rounded-[12px] border border-transparent bg-surface/80 px-2.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/35 hover:bg-surface-elevated hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] sm:px-3"
                            >
                              <span
                                className={[
                                  'typo-meta inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border font-bold',
                                  placeTone(result.place),
                                ].join(' ')}
                              >
                                {placeLabel(result.place)}
                              </span>
                              <img
                                src={result.horse.photo}
                                alt=""
                                loading="lazy"
                                className="h-12 w-12 rounded-[10px] object-cover sm:h-14 sm:w-14"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="typo-name truncate text-base">
                                  {result.horse.name}
                                </p>
                                <p className="typo-caption truncate">
                                  {result.horse.owner} · {result.horse.stable}
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
                        Los resultados se publicarán al finalizar la competencia en{' '}
                        <span className="text-ink">{competition.location}</span> el{' '}
                        <span className="text-ink">{formatDate(competition.date)}</span>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
