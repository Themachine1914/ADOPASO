import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CertificadoRegistro } from '../components/CertificadoRegistro'
import { Genealogia } from '../components/Genealogia'
import { formatDate, formatPoints, placeLabel } from '../lib/format'
import { generaciones, tieneGenealogia } from '../lib/genealogia'
import { cargarCaballo, cargarHistorialCaballo } from '../lib/publico'
import { supabaseConfigurado } from '../lib/supabase'
import type { CaballoPublico, ResultadoPublico } from '../types/publico'

export function HorseDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const yearParam = Number(searchParams.get('year'))
  const codigo = id ? decodeURIComponent(id) : ''

  const [horse, setHorse] = useState<CaballoPublico | null>(null)
  const [enRegistro, setEnRegistro] = useState(false)
  const [historial, setHistorial] = useState<ResultadoPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigurado || !codigo) {
      setLoading(false)
      if (!codigo) setError('Caballo no encontrado')
      else setError('Falta la conexión con Supabase.')
      return
    }
    let cancel = false
    setLoading(true)
    Promise.all([cargarCaballo(codigo), cargarHistorialCaballo(codigo)])
      .then(([ficha, resultados]) => {
        if (cancel) return
        if (!ficha && resultados.length === 0) {
          setHorse(null)
          setEnRegistro(false)
          setHistorial([])
          return
        }
        setEnRegistro(Boolean(ficha))
        setHorse(
          ficha ?? {
            codigo,
            nombre: resultados[0]?.caballoNombre || codigo,
            sexo: null,
            color: null,
            fechaNacimiento: null,
            lugarNacimiento: null,
            padre: null,
            madre: null,
            padreCodigo: null,
            madreCodigo: null,
            expositor: resultados[0]?.expositor ?? null,
            criador: resultados[0]?.criador ?? null,
            categoria: null,
            senas: null,
            adn: null,
            microchip: null,
            modalidad: null,
            fechaRegistro: null,
            ancestros: {},
          },
        )
        setHistorial(resultados)
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
  }, [codigo])

  const puntosAnio = useMemo(() => {
    const anio = Number.isFinite(yearParam) ? yearParam : null
    const lista = anio ? historial.filter((r) => r.anio === anio) : historial
    return lista.reduce((sum, r) => sum + r.puntos, 0)
  }, [historial, yearParam])

  const etiquetaAnio = Number.isFinite(yearParam) ? String(yearParam) : 'en total'

  if (loading) {
    return (
      <div className="container-app page-shell">
        <p className="typo-meta">Cargando ficha…</p>
      </div>
    )
  }

  if (error || !horse) {
    return (
      <div className="container-app page-shell text-center">
        <h1 className="typo-page">Caballo no encontrado</h1>
        <p className="typo-meta mt-3">{error ?? 'Este ejemplar no está en el registro público.'}</p>
        <Link to="/caballos" className="typo-meta mt-6 inline-block font-medium text-gold hover:text-gold-soft">
          Volver al directorio
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
              <p className="typo-caption">{horse.codigo}</p>
              <h1 className="typo-page mt-2">{horse.nombre}</h1>
            </div>
            <div className="rounded-[12px] border border-gold/40 bg-bg px-5 py-4 sm:text-right">
              <p className="typo-label">Puntos {etiquetaAnio}</p>
              <p className="typo-stat mt-1 text-gold">{formatPoints(puntosAnio)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-app page-shell space-y-8">
        {enRegistro ? (
          <CertificadoRegistro horse={horse} />
        ) : (
          <div className="rounded-[12px] border border-border bg-surface px-6 py-8">
            <p className="typo-name">Sin certificado en el libro de registro</p>
            <p className="typo-meta mt-2">Este ejemplar aparece por sus resultados de competencia.</p>
          </div>
        )}
        {tieneGenealogia(horse) ? (
          <Genealogia horseId={horse.codigo} columnas={generaciones(horse)} />
        ) : null}
      </section>

      <section className="container-app page-shell">
        <h2 className="typo-section">Historial de competencias</h2>
        <p className="typo-meta mt-2">Resultados con puesto y puntos, de la más reciente a la más antigua.</p>

        {historial.length === 0 ? (
          <div className="mt-8 rounded-[12px] border border-border bg-surface px-6 py-10 text-center">
            <p className="typo-name">Sin competencias registradas</p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[12px] border border-border">
            <div className="divide-y divide-border">
              {historial.map((entry, index) => (
                <div
                  key={`${entry.fecha}-${entry.clase}-${index}`}
                  className="flex flex-col gap-3 bg-bg/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="typo-name text-base">{entry.clase || entry.tipo || 'Competencia'}</p>
                    <p className="typo-meta mt-1">
                      {formatDate(entry.fecha)} · {entry.lugar}
                      {entry.tipo ? ` · ${entry.tipo}` : ''}
                      {entry.campeon ? ' · Campeón' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-left sm:text-right">
                      <p className="typo-label">Puesto</p>
                      <p className="typo-name text-base">
                        {entry.puesto ? placeLabel(entry.puesto) : '—'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="typo-label">Puntos</p>
                      <p className="typo-points text-gold">{formatPoints(entry.puntos)}</p>
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