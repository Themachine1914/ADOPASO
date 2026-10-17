import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HorseCard } from '../components/HorseCard'
import { StatSummary } from '../components/StatSummary'
import { FilterChips } from '../components/FilterChips'
import { SEXOS, etiquetaCampeonato, etiquetaModalidad, type SexoEjemplar } from '../lib/campeonato'
import { formatDate, formatPoints } from '../lib/format'
import { supabaseConfigurado } from '../lib/supabase'
import {
  anioPorDefecto,
  cargarAniosRanking,
  cargarProximaCompetencia,
  cargarRankingCampeonato,
} from '../lib/publico'
import type { AnioRanking, CompetenciaResumen, EntradaRanking } from '../types/publico'

export function Home() {
  const [anio, setAnio] = useState<number | null>(null)
  const [top3, setTop3] = useState<EntradaRanking[]>([])
  const [sexo, setSexo] = useState<SexoEjemplar>('M')
  const [resumen, setResumen] = useState<AnioRanking | null>(null)
  const [next, setNext] = useState<CompetenciaResumen | null>(null)

  useEffect(() => {
    if (!supabaseConfigurado) return
    let cancel = false
    Promise.all([cargarAniosRanking(), cargarProximaCompetencia()])
      .then(([anios, proxima]) => {
        if (cancel) return
        const elegido = anioPorDefecto(anios)
        setAnio(elegido)
        setResumen(anios.find((a) => a.anio === elegido) ?? null)
        setNext(proxima)
      })
      .catch(() => {
        /* el ranking vacío se ve como estado inicial */
      })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigurado || !anio) return
    let cancel = false
    cargarRankingCampeonato(anio, 'paso_fino', sexo, 'general')
      .then((filas) => {
        if (!cancel) setTop3(filas.slice(0, 3))
      })
      .catch(() => {
        if (!cancel) setTop3([])
      })
    return () => {
      cancel = true
    }
  }, [anio, sexo])

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-border bg-bg">
        {/* Foto fija de portada: el caballo queda a la derecha y el cielo cubre el texto. */}
        <img
          src="/horses/hero-paso-fino.jpg"
          alt=""
          className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-[96%_42%] sm:object-[88%_48%] md:w-[70%] md:object-[78%_58%]"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
          style={{
            background:
              'linear-gradient(90deg, #0a1628 0%, #0a1628 30%, rgba(10,22,40,0.78) 44%, rgba(10,22,40,0.22) 58%, transparent 70%), linear-gradient(180deg, transparent 62%, rgba(10,22,40,0.55) 100%), radial-gradient(ellipse 50% 60% at 0% 0%, rgba(0,45,98,0.4), transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 md:hidden"
          style={{
            background:
              'linear-gradient(90deg, rgba(10,22,40,0.92) 0%, rgba(10,22,40,0.78) 38%, rgba(10,22,40,0.28) 62%, rgba(10,22,40,0.08) 100%), linear-gradient(180deg, rgba(10,22,40,0.2) 0%, transparent 28%, rgba(10,22,40,0.55) 100%)',
          }}
        />

        <div className="container-app relative flex min-h-[32rem] items-center py-14 md:min-h-[36rem] md:py-20 lg:min-h-[40rem]">
          <div className="w-full min-w-0 max-w-xl">
            <img
              src="/logo-adopaso.png"
              alt="ADOPASO — Asociación Dominicana de Caballos de Paso"
              className="fade-up mb-8 h-16 w-auto rounded-[12px] object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.45)] md:h-20"
            />
            <p className="typo-eyebrow fade-up fade-up-delay-1 mb-3">Puntuaciones oficiales</p>
            <h1 className="typo-hero fade-up fade-up-delay-1">Ranking de caballos ADOPASO</h1>
            <p className="typo-lead fade-up fade-up-delay-2 mt-5 max-w-lg">
              Quiénes van más adelante en puntos, por modalidad, ranking de edad, sexo y categoría
              (Funcional, Bellas formas, A la cuerda y Libre).
            </p>

            {top3[0] && anio ? (
              <Link
                to={`/caballo/${encodeURIComponent(top3[0].id)}?year=${anio}`}
                className="fade-up fade-up-delay-2 group mt-8 inline-flex max-w-full items-center gap-4 rounded-[14px] border border-gold/40 bg-bg/70 py-3 pl-3 pr-5 backdrop-blur-md transition-colors duration-200 hover:border-gold"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-gold font-display text-xl font-semibold text-bg">
                  1
                </span>
                <span className="min-w-0">
                  <span className="typo-label block">Líder {anio}</span>
                  <span className="block truncate font-display text-lg font-semibold text-ink transition-colors duration-200 group-hover:text-gold">
                    {top3[0].name}
                  </span>
                </span>
                <span className="typo-points ml-2 shrink-0">
                  {formatPoints(top3[0].points)}
                  <span className="typo-caption ml-1 font-medium">pts</span>
                </span>
              </Link>
            ) : null}

            <div className="fade-up fade-up-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/ranking"
                className="typo-btn inline-flex items-center justify-center rounded-[12px] bg-gold px-6 py-3 text-bg transition-colors duration-200 hover:bg-gold-soft"
              >
                Ver ranking completo
              </Link>
              <Link
                to="/competencias"
                className="typo-btn inline-flex items-center justify-center rounded-[12px] border border-border bg-bg/40 px-6 py-3 text-ink backdrop-blur-sm transition-colors duration-200 hover:border-gold/40 hover:text-gold"
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
            <p className="typo-eyebrow">Podio</p>
            <h2 className="typo-section mt-2">
              Top 3{anio ? ` de ${anio}` : ''}
            </h2>
            <p className="typo-meta mt-2">
              {etiquetaModalidad('paso_fino')} · Ranking {etiquetaCampeonato('general')}
            </p>
          </div>
          <Link
            to="/ranking"
            className="typo-meta font-medium transition-colors duration-200 hover:text-gold"
          >
            Ver todos →
          </Link>
        </div>

        <div className="mb-6">
          <FilterChips label="Sexo del podio" value={sexo} options={SEXOS} onChange={setSexo} />
        </div>

        {top3.length === 0 ? (
          <p className="typo-meta">Aún no hay puntuaciones para mostrar.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {top3.map((horse, index) => (
              <div
                key={horse.id}
                className={[
                  'fade-up',
                  index === 0 ? '' : index === 1 ? 'fade-up-delay-1' : 'fade-up-delay-2',
                ].join(' ')}
              >
                <HorseCard horse={horse} year={anio ?? horse.position} featured />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-surface/40">
        <div className="container-app py-14 md:py-16">
          <div className="mb-8">
            <p className="typo-eyebrow">Resumen</p>
            <h2 className="typo-section mt-2">{anio ? `Temporada ${anio}` : 'Temporada'}</h2>
          </div>
          <StatSummary
            items={[
              {
                label: 'Caballos con puntos',
                value: resumen ? String(resumen.conPuntos) : '—',
              },
              {
                label: 'Puntos repartidos',
                value: resumen ? String(resumen.puntos) : '—',
              },
              {
                label: 'Próxima competencia',
                value: next ? formatDate(next.fecha).replace(/ de \d{4}$/, '') : '—',
              },
            ]}
          />
          {next && (
            <p className="typo-meta mt-6">
              Próximo evento: <span className="font-medium text-ink">{next.nombre}</span> ·{' '}
              {next.lugar}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}