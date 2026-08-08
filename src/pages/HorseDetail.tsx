import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getCompetitionById } from '../data/competitions'
import { getHorseById, getRanking } from '../data/horses'
import { formatDate, formatPoints, placeLabel } from '../lib/format'
import type { Year } from '../types'

function parseYear(value: string | null): Year {
  return value === '2025' ? 2025 : 2026
}

export function HorseDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const year = parseYear(searchParams.get('year'))
  const horse = id ? getHorseById(id) : undefined
  const ranking = getRanking(year)
  const position = ranking.find((h) => h.id === horse?.id)?.position

  if (!horse) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Caballo no encontrado</h1>
        <Link to="/caballos" className="mt-6 inline-block text-gold hover:text-gold-soft">
          Volver al directorio
        </Link>
      </div>
    )
  }

  const yearPoints = horse.pointsByYear[year] ?? 0
  const history = [...horse.history]
    .map((entry) => ({
      ...entry,
      competition: getCompetitionById(entry.competitionId),
    }))
    .filter((e) => e.competition)
    .sort((a, b) => (b.competition!.date > a.competition!.date ? 1 : -1))

  return (
    <div>
      <section className="border-b border-border bg-surface/30">
        <div className="container-app grid gap-8 py-10 md:grid-cols-[1.1fr_1fr] md:gap-12 md:py-14">
          <div className="overflow-hidden rounded-[12px] border border-border">
            <img
              src={horse.photo}
              alt={horse.name}
              className="aspect-[4/3] w-full object-cover md:aspect-[5/4]"
            />
          </div>

          <div className="flex flex-col justify-center">
            <Link
              to="/caballos"
              className="mb-4 text-sm font-medium text-muted transition-colors hover:text-gold"
            >
              ← Volver al directorio
            </Link>
            {position ? (
              <span className="mb-3 inline-flex w-fit items-center rounded-[10px] border border-gold/40 bg-bg px-3 py-1 text-sm font-bold text-gold">
                #{position} en {year}
              </span>
            ) : (
              <span className="mb-3 inline-flex w-fit items-center rounded-[10px] border border-border bg-bg px-3 py-1 text-sm font-medium text-muted">
                Sin puntuación en {year}
              </span>
            )}
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              {horse.name}
            </h1>
            <p className="mt-3 text-lg text-muted">{horse.stable}</p>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[12px] border border-border bg-surface p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">Dueño</dt>
                <dd className="mt-1 font-semibold text-ink">{horse.owner}</dd>
              </div>
              <div className="rounded-[12px] border border-border bg-surface p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">Puntos {year}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-gold">
                  {formatPoints(yearPoints)}
                </dd>
              </div>
              <div className="rounded-[12px] border border-border bg-surface p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">Sexo</dt>
                <dd className="mt-1 font-semibold capitalize text-ink">{horse.sex}</dd>
              </div>
              <div className="rounded-[12px] border border-border bg-surface p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">Año de nacimiento</dt>
                <dd className="mt-1 font-semibold text-ink">{horse.birthYear}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="container-app py-12 md:py-16">
        <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
          Historial de competencias
        </h2>
        <p className="mt-2 text-sm text-muted">
          Resultados registrados y puntos obtenidos en cada evento.
        </p>

        {history.length === 0 ? (
          <div className="mt-8 rounded-[12px] border border-border bg-surface px-6 py-10 text-center">
            <p className="font-semibold text-ink">Sin competencias registradas</p>
            <p className="mt-2 text-sm text-muted">
              Este caballo aún no tiene resultados en el historial oficial.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[12px] border border-border">
            <div className="divide-y divide-border">
              {history.map((entry) => (
                <div
                  key={`${entry.competitionId}-${entry.place}`}
                  className="flex flex-col gap-3 bg-surface/40 px-5 py-4 transition-colors duration-200 hover:bg-surface-elevated sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-ink">{entry.competition!.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(entry.competition!.date)} · {entry.competition!.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-left sm:text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted">Lugar</p>
                      <p className="font-bold text-ink">{placeLabel(entry.place)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted">Puntos</p>
                      <p className="text-lg font-bold tabular-nums text-gold">
                        {formatPoints(entry.points)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
