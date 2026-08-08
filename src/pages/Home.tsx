import { Link } from 'react-router-dom'
import { HorseCard } from '../components/HorseCard'
import { StatSummary } from '../components/StatSummary'
import { getCompetitionsByYear, getNextCompetition } from '../data/competitions'
import { getRanking, horses } from '../data/horses'
import { formatDate } from '../lib/format'

export function Home() {
  const ranking = getRanking(2026)
  const top3 = ranking.slice(0, 3)
  const next = getNextCompetition()
  const completed2026 = getCompetitionsByYear(2026).filter((c) => c.status === 'completed').length

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,45,98,0.55), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(206,17,38,0.12), transparent 50%), linear-gradient(180deg, #0f1f38 0%, #0a1628 100%)',
          }}
        />
        <div className="container-app relative py-10 md:py-16 lg:py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <img
              src="/logo-adopaso.png"
              alt="ADOPASO — Asociación Dominicana de Caballos de Paso"
              className="fade-up mb-6 w-[min(100%,22rem)] max-w-full rounded-[20px] object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)] sm:w-[26rem] md:mb-8 md:w-[30rem] lg:w-[34rem]"
            />
            <p className="fade-up fade-up-delay-1 mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Asociación Dominicana de Caballos de Paso
            </p>
            <h1 className="fade-up fade-up-delay-1 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl lg:text-6xl">
              Ranking Oficial Adopaso 2026
            </h1>
            <p className="fade-up fade-up-delay-2 mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
              El tablero de puntuaciones de los mejores caballos de Paso Fino
              de la República Dominicana.
            </p>
            <div className="fade-up fade-up-delay-3 mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/ranking"
                className="inline-flex items-center justify-center rounded-[12px] bg-gold px-6 py-3 text-sm font-semibold text-bg transition-all duration-200 hover:bg-gold-soft"
              >
                Ver ranking completo
              </Link>
              <Link
                to="/competencias"
                className="inline-flex items-center justify-center rounded-[12px] border border-border bg-transparent px-6 py-3 text-sm font-semibold text-ink transition-all duration-200 hover:border-gold/40 hover:text-gold"
              >
                Competencias
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-app py-14 md:py-20">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Podio
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink md:text-4xl">
              Top 3 del año
            </h2>
          </div>
          <Link
            to="/ranking"
            className="text-sm font-medium text-muted transition-colors duration-200 hover:text-gold"
          >
            Ver todos →
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {top3.map((horse, index) => (
            <div
              key={horse.id}
              className={[
                'fade-up',
                index === 0 ? '' : index === 1 ? 'fade-up-delay-1' : 'fade-up-delay-2',
                index === 0 ? 'md:-mt-4' : '',
              ].join(' ')}
            >
              <HorseCard horse={horse} featured />
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface/40">
        <div className="container-app py-14 md:py-16">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Resumen
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink">
              Temporada 2026
            </h2>
          </div>
          <StatSummary
            items={[
              { label: 'Caballos en ranking', value: String(horses.length) },
              { label: 'Competencias realizadas', value: String(completed2026) },
              {
                label: 'Próxima competencia',
                value: next ? formatDate(next.date).replace(/ de \d{4}$/, '') : '—',
              },
            ]}
          />
          {next && (
            <p className="mt-6 text-sm text-muted">
              Próximo evento:{' '}
              <span className="font-medium text-ink">{next.name}</span> · {next.location}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
