import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { StatSummary } from '../components/StatSummary'
import { YearFilter } from '../components/YearFilter'
import { formatDate, formatNombre, formatPoints } from '../lib/format'
import { ROLES_PERSONA, cargarHistorialPersona, esRolPersona } from '../lib/publico'
import { supabaseConfigurado } from '../lib/supabase'
import type { HistorialPersona } from '../types/publico'

export function PersonaDetalle() {
  const { rol: rolParam, nombre } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const persona = nombre ? decodeURIComponent(nombre) : ''
  const rol = esRolPersona(rolParam) ? rolParam : null
  const rolInfo = ROLES_PERSONA.find((r) => r.value === rol)

  const [historial, setHistorial] = useState<HistorialPersona[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigurado || !rol || !persona) {
      setLoading(false)
      setError(!rol || !persona ? 'Persona no encontrada' : 'Falta la conexión con Supabase.')
      return
    }
    let cancel = false
    setLoading(true)
    cargarHistorialPersona(rol, persona)
      .then((filas) => {
        if (!cancel) setHistorial(filas)
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
  }, [rol, persona])

  const porAnio = useMemo(() => {
    const mapa = new Map<number, { puntos: number; competencias: Set<string>; primeros: number }>()
    for (const h of historial) {
      const actual = mapa.get(h.anio) ?? { puntos: 0, competencias: new Set<string>(), primeros: 0 }
      actual.puntos += h.puntos
      actual.competencias.add(`${h.fecha}|${h.lugar}`)
      actual.primeros += h.primeros
      mapa.set(h.anio, actual)
    }
    return [...mapa.entries()]
      .map(([anio, v]) => ({ anio, puntos: v.puntos, competencias: v.competencias.size, primeros: v.primeros }))
      .sort((a, b) => b.anio - a.anio)
  }, [historial])

  const anios = porAnio.map((a) => a.anio)
  const yearParam = Number(searchParams.get('year'))
  const year = anios.includes(yearParam) ? yearParam : anios[0] ?? null
  const resumen = porAnio.find((a) => a.anio === year)
  const filas = historial.filter((h) => h.anio === year)
  const totalHistorico = porAnio.reduce((sum, a) => sum + a.puntos, 0)

  if (loading) {
    return (
      <div className="container-app page-shell">
        <p className="typo-meta">Cargando puntos…</p>
      </div>
    )
  }

  if (error || historial.length === 0) {
    return (
      <div className="container-app page-shell text-center">
        <h1 className="typo-page">{persona ? formatNombre(persona) : 'Persona no encontrada'}</h1>
        <p className="typo-meta mt-3">{error ?? 'No hay competencias registradas con este nombre.'}</p>
        <Link to="/ranking" className="typo-meta mt-6 inline-block font-medium text-gold hover:text-gold-soft">
          Volver al ranking
        </Link>
      </div>
    )
  }

  return (
    <div>
      <section className="border-b border-border bg-surface/30">
        <div className="container-app py-10 md:py-14">
          <Link to="/ranking" className="typo-meta mb-4 inline-block font-medium transition-colors hover:text-gold">
            ← Volver al ranking
          </Link>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="typo-caption capitalize">{rolInfo?.singular}</p>
              <h1 className="typo-page mt-2">{formatNombre(persona)}</h1>
              <p className="typo-meta mt-2">{formatPoints(totalHistorico)} puntos en total</p>
            </div>
            {year ? (
              <YearFilter
                value={year}
                years={anios}
                onChange={(y) => setSearchParams({ year: String(y) }, { replace: true })}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="container-app page-shell space-y-8">
        {resumen ? (
          <StatSummary
            items={[
              { label: `Puntos en ${resumen.anio}`, value: formatPoints(resumen.puntos) },
              { label: 'Competencias', value: String(resumen.competencias) },
              { label: 'Primeros lugares', value: String(resumen.primeros) },
            ]}
          />
        ) : null}

        <div>
          <h2 className="typo-section">Puntos por competencia</h2>
          <p className="typo-meta mt-2">Cada competencia de {year}, de la más reciente a la más antigua.</p>
          <div className="mt-6 overflow-hidden rounded-[12px] border border-border">
            <div className="divide-y divide-border">
              {filas.map((f) => (
                <div
                  key={`${f.fecha}-${f.lugar}-${f.categoria ?? ''}`}
                  className="flex flex-col gap-3 bg-bg/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="typo-name text-base">{f.lugar}</p>
                    <p className="typo-meta mt-1">
                      {formatDate(f.fecha)}
                      {f.categoria ? ` · ${f.categoria}` : ''}
                      {` · ${f.salidas} ${f.salidas === 1 ? 'salida' : 'salidas'}`}
                      {f.primeros > 0 ? ` · ${f.primeros} ${f.primeros === 1 ? 'primer lugar' : 'primeros lugares'}` : ''}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="typo-label">Puntos</p>
                    <p className="typo-points text-gold">{formatPoints(f.puntos)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="typo-section">Resumen por año</h2>
          <div className="mt-6 overflow-hidden rounded-[12px] border border-border">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface">
                <tr className="border-b border-border">
                  <th className="typo-label px-5 py-3 font-medium">Año</th>
                  <th className="typo-label px-5 py-3 text-right font-medium">Competencias</th>
                  <th className="typo-label px-5 py-3 text-right font-medium">1.er lugar</th>
                  <th className="typo-label px-5 py-3 text-right font-medium">Puntos</th>
                </tr>
              </thead>
              <tbody className="bg-bg">
                {porAnio.map((a) => (
                  <tr key={a.anio} className="border-b border-border/70 last:border-b-0">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setSearchParams({ year: String(a.anio) }, { replace: true })}
                        className={`typo-name text-base transition-colors hover:text-gold ${a.anio === year ? 'text-gold' : ''}`}
                      >
                        {a.anio}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right typo-meta">{a.competencias}</td>
                    <td className="px-5 py-3 text-right typo-meta">{a.primeros}</td>
                    <td className="px-5 py-3 text-right typo-points">{formatPoints(a.puntos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
