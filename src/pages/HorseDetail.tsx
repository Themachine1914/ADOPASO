import { Link, useParams, useSearchParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { getCompetitionById } from '../data/competitions'
import { getHorseById, getRanking } from '../data/horses'
import { formatDate, formatPoints, placeLabel } from '../lib/format'
import { sexLabel, virusCertificateStatus } from '../lib/health'
import type { Year } from '../types'

function parseYear(value: string | null): Year {
  return value === '2025' ? 2025 : 2026
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4">
      <dt className="typo-label">{label}</dt>
      <dd className="typo-name mt-1 text-base">{value || '—'}</dd>
    </div>
  )
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
      <div className="container-app page-shell text-center">
        <h1 className="typo-page">Caballo no encontrado</h1>
        <Link to="/caballos" className="typo-meta mt-6 inline-block font-medium text-gold hover:text-gold-soft">
          Volver al directorio
        </Link>
      </div>
    )
  }

  const yearPoints = horse.pointsByYear[year] ?? 0
  const virusStatus = virusCertificateStatus(horse.virusCertificate)

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
              className="typo-meta mb-4 font-medium transition-colors hover:text-gold"
            >
              ← Volver al directorio
            </Link>
            {position ? (
              <span className="typo-meta mb-3 inline-flex w-fit items-center rounded-[10px] border border-gold/40 bg-bg px-3 py-1 font-bold text-gold">
                #{position} en {year}
              </span>
            ) : (
              <span className="typo-meta mb-3 inline-flex w-fit items-center rounded-[10px] border border-border bg-bg px-3 py-1">
                Sin puntuación en {year}
              </span>
            )}
            <h1 className="typo-page">{horse.name}</h1>
            <p className="typo-lead mt-3">
              {sexLabel(horse.sex)}
              {horse.color ? ` · ${horse.color}` : ''}
              {' · '}
              {horse.stable}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-[10px] border border-border bg-bg px-3 py-2">
                <span className="typo-caption">Cert. virus</span>
                <StatusBadge status={virusStatus} />
              </div>
            </div>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoCard label="Dueño" value={horse.owner} />
              <InfoCard label={`Puntos ${year}`} value={formatPoints(yearPoints)} />
              <InfoCard label="Sexo" value={sexLabel(horse.sex)} />
              <InfoCard label="Nacimiento" value={formatDate(horse.birthDate)} />
            </dl>
          </div>
        </div>
      </section>

      <section className="container-app page-shell">
        <h2 className="typo-section">Identidad y pedigrí</h2>
        <p className="typo-meta mt-2">
          Datos de identificación y línea genética del ejemplar.
        </p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Color" value={horse.color} />
          <InfoCard label="Padre" value={horse.sireName} />
          <InfoCard label="Madre" value={horse.damName} />
          <InfoCard label="Abuelo paterno" value={horse.paternalGrandsire} />
          <InfoCard label="Abuelo materno" value={horse.maternalGrandsire} />
          <InfoCard label="Criadero" value={horse.stable} />
        </dl>
      </section>

      <section className="border-t border-border bg-surface/30">
        <div className="container-app page-shell">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="typo-section">Certificado de virus</h2>
              <p className="typo-meta mt-2">
                Prueba EIA (anemia infecciosa equina). Requerido para competencias.
              </p>
            </div>
            <StatusBadge status={virusStatus} />
          </div>

          {!horse.virusCertificate ? (
            <div className="rounded-[12px] border border-border bg-surface px-6 py-10 text-center">
              <p className="typo-name">Sin certificado registrado</p>
              <p className="typo-meta mt-2">
                Este caballo no tiene certificado de virus vigente en el sistema.
              </p>
            </div>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                label="Fecha de prueba"
                value={formatDate(horse.virusCertificate.testedAt)}
              />
              <InfoCard
                label="Válido hasta"
                value={formatDate(horse.virusCertificate.validUntil)}
              />
              <InfoCard
                label="Resultado"
                value={
                  horse.virusCertificate.result === 'negativo' ? 'Negativo' : 'Positivo'
                }
              />
              <InfoCard label="Laboratorio" value={horse.virusCertificate.lab} />
              <InfoCard
                label="Nº de certificado"
                value={horse.virusCertificate.certificateNumber}
              />
            </dl>
          )}
        </div>
      </section>

      <section className="container-app page-shell">
        <h2 className="typo-section">Historial de competencias</h2>
        <p className="typo-meta mt-2">
          Resultados registrados y puntos obtenidos en cada evento.
        </p>

        {history.length === 0 ? (
          <div className="mt-8 rounded-[12px] border border-border bg-surface px-6 py-10 text-center">
            <p className="typo-name">Sin competencias registradas</p>
            <p className="typo-meta mt-2">
              Este caballo aún no tiene resultados en el historial oficial.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[12px] border border-border">
            <div className="divide-y divide-border">
              {history.map((entry) => (
                <div
                  key={`${entry.competitionId}-${entry.place}`}
                  className="flex flex-col gap-3 bg-bg/40 px-5 py-4 transition-colors duration-200 hover:bg-surface-elevated sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="typo-name text-base">{entry.competition!.name}</p>
                    <p className="typo-meta mt-1">
                      {formatDate(entry.competition!.date)} · {entry.competition!.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-left sm:text-right">
                      <p className="typo-label">Lugar</p>
                      <p className="typo-name text-base">{placeLabel(entry.place)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="typo-label">Puntos</p>
                      <p className="typo-points text-gold">
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
