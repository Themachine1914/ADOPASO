import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HorseCard } from '../components/HorseCard'
import { StatSummary } from '../components/StatSummary'
import { formatDate } from '../lib/format'
import { supabaseConfigurado } from '../lib/supabase'
import {
  anioPorDefecto,
  cargarAniosRanking,
  cargarProximaCompetencia,
  cargarRankingGeneral,
} from '../lib/publico'
import type { AnioRanking, CompetenciaResumen, EntradaRanking } from '../types/publico'

export function Home() {
  const [anio, setAnio] = useState<number | null>(null)
  const [top3, setTop3] = useState<EntradaRanking[]>([])
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
        if (elegido) {
          return cargarRankingGeneral(elegido).then((filas) => {
            if (!cancel) setTop3(filas.slice(0, 3))
          })
        }
      })
      .catch(() => {
        /* el ranking vacío se ve como estado inicial */
      })
    return () => {
      cancel = true
    }
  }, [])

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
            <p className="typo-eyebrow fade-up fade-up-delay-1 mb-3">Puntuaciones oficiales</p>
            <h1 className="typo-hero fade-up fade-up-delay-1">Ranking de caballos ADOPASO</h1>
            <p className="typo-lead fade-up fade-up-delay-2 mx-auto mt-5 max-w-xl">
              Quiénes van más adelante en puntos, por categoría (Funcional, Bellas formas, A la
              cuerda y Libre) y por cada competencia.
            </p>
            <div className="fade-up fade-up-delay-3 mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/ranking"
                className="typo-btn inline-flex items-center justify-center rounded-[12px] bg-gold px-6 py-3 text-bg transition-colors duration-200 hover:bg-gold-soft"
              >
                Ver ranking completo
              </Link>
              <Link
                to="/competencias"
                className="typo-btn inline-flex items-center justify-center rounded-[12px] border border-border bg-transparent px-6 py-3 text-ink transition-colors duration-200 hover:border-gold/40 hover:text-gold"
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
          </div>
          <Link
            to="/ranking"
            className="typo-meta font-medium transition-colors duration-200 hover:text-gold"
          >
            Ver todos →
          </Link>
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