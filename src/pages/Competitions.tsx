import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { YearFilter } from '../components/YearFilter'
import { getCompetitionsByYear } from '../data/competitions'
import { getResultsForCompetition } from '../data/horses'
import { formatDate, formatPoints, placeLabel } from '../lib/format'
import type { Year } from '../types'

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
          const results =
            competition.status === 'completed'
              ? getResultsForCompetition(competition.id)
              : []

          const actionLabel =
            competition.status === 'completed'
              ? open
                ? 'Ocultar resultados'
                : 'Ver resultados'
              : open
                ? 'Ocultar detalle'
                : 'Ver detalle'

          return (
            <article
              key={competition.id}
              className="overflow-hidden rounded-[12px] border border-border bg-surface transition-colors duration-200 hover:border-gold/30"
            >
              <button
                type="button"
                id={buttonId}
                className="flex w-full flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between md:p-6"
                onClick={() => setExpandedId(open ? null : competition.id)}
                aria-expanded={open}
                aria-controls={panelId}
              >
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        'typo-label rounded-[8px] px-2.5 py-1',
                        competition.status === 'completed'
                          ? 'bg-flag-blue/30 text-ink'
                          : 'bg-gold/15 text-gold',
                      ].join(' ')}
                    >
                      {competition.status === 'completed' ? 'Finalizada' : 'Próxima'}
                    </span>
                  </div>
                  <h2 className="typo-name-lg">{competition.name}</h2>
                  <p className="typo-meta mt-1">
                    {formatDate(competition.date)} · {competition.location}
                  </p>
                </div>
                <span className="typo-meta font-medium text-gold">{actionLabel}</span>
              </button>

              {open && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="border-t border-border bg-bg/60 px-5 py-4 md:px-6"
                >
                  {competition.status === 'completed' ? (
                    <div className="space-y-2">
                      {results.map((result) => (
                        <Link
                          key={result.horse.id}
                          to={`/caballo/${result.horse.id}?year=${year}`}
                          className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors duration-200 hover:bg-surface-elevated"
                        >
                          <span className="typo-meta w-8 font-bold text-gold">
                            {placeLabel(result.place)}
                          </span>
                          <img
                            src={result.horse.photo}
                            alt=""
                            loading="lazy"
                            className="h-10 w-10 rounded-[8px] object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="typo-meta truncate font-semibold text-ink">
                              {result.horse.name}
                            </p>
                            <p className="typo-caption truncate">{result.horse.stable}</p>
                          </div>
                          <p className="typo-points">
                            {formatPoints(result.points)}
                            <span className="typo-caption ml-1 font-normal">pts</span>
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="typo-meta">
                      Los resultados se publicarán al finalizar el evento.
                    </p>
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
