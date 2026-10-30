import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  deshacerSincronizacion,
  etiquetaFase,
  resultadosCompetencia,
  sincronizarCompetencia,
  type Competencia,
  type ResultadoEjemplar,
} from '../../lib/competencia'
import { formatNombre } from '../../lib/format'

interface Categoria {
  claseId: string
  categoria: string
  fase: ResultadoEjemplar['fase']
  filas: ResultadoEjemplar[]
}

/** Revisión de resultados y sincronización con Resultados y el ranking. */
export function ResultadosCompetencia({
  competencia,
  onCambio,
}: {
  competencia: Competencia
  onCambio: () => Promise<void>
}) {
  const [filas, setFilas] = useState<ResultadoEjemplar[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setFilas(await resultadosCompetencia(competencia.id))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron calcular los resultados.')
    }
  }, [competencia.id])

  useEffect(() => {
    void cargar()
  }, [cargar, competencia.sincronizadoEn])

  const categorias = useMemo(() => {
    const mapa = new Map<string, Categoria>()
    for (const fila of filas ?? []) {
      const actual = mapa.get(fila.claseId) ?? { claseId: fila.claseId, categoria: fila.categoria, fase: fila.fase, filas: [] }
      actual.filas.push(fila)
      mapa.set(fila.claseId, actual)
    }
    return [...mapa.values()]
  }, [filas])

  if (!filas) return error ? <p className="typo-meta text-flag-red">{error}</p> : null
  if (categorias.length === 0) return null

  const abiertas = categorias.filter((c) => c.fase !== 'cerrada')
  const sinGanador = categorias.filter((c) => c.fase === 'cerrada' && !c.filas.some((f) => f.puesto === 1))
  const premiados = filas.filter((f) => f.puntos > 0)
  const sinMontador = premiados.filter((f) => !f.montador)
  const participantes = filas.filter((f) => f.asistio !== false).length
  const sincronizada = Boolean(competencia.sincronizadoEn)
  const puede = !competencia.simulacion && !sincronizada && abiertas.length === 0

  async function correr(accion: () => Promise<string>) {
    setOcupado(true)
    setError(null)
    setAviso(null)
    try {
      setAviso(await accion())
      await onCambio()
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar.')
    }
    setOcupado(false)
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="typo-section">Resultados</h2>
          <p className="typo-meta mt-1">
            Revise el puesto y los puntos de cada categoría. Al sincronizar pasan a «Resultados» y al ranking: 1.º 10
            puntos, 2.º 7 y 3.º 5, para el caballo, el propietario, el criador y el montador.
          </p>
        </div>
        {sincronizada ? (
          <button
            type="button"
            disabled={ocupado}
            className="typo-btn rounded-[10px] border border-border px-4 py-2.5 disabled:opacity-50"
            onClick={() => {
              if (!window.confirm('¿Quitar estos resultados del ranking? Podrá corregir y volver a sincronizar.')) return
              void correr(async () => `Se quitaron ${await deshacerSincronizacion(competencia.id)} resultados del ranking.`)
            }}
          >
            Deshacer sincronización
          </button>
        ) : (
          <button
            type="button"
            disabled={!puede || ocupado}
            className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg disabled:opacity-50"
            onClick={() => {
              const texto = `¿Sincronizar ${participantes} participaciones de ${categorias.length} categorías con el ranking?`
              if (!window.confirm(texto)) return
              void correr(async () => `Listo: ${await sincronizarCompetencia(competencia.id)} resultados pasaron al ranking.`)
            }}
          >
            {ocupado ? 'Sincronizando…' : 'Sincronizar con el ranking'}
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {sincronizada ? (
          <Aviso tono="ok">
            Sincronizada el {new Date(competencia.sincronizadoEn!).toLocaleString('es-DO')}. Ya está en Resultados y en el
            ranking.
          </Aviso>
        ) : null}
        {competencia.simulacion ? (
          <Aviso tono="info">Es una simulación: se ve lo que pasaría al ranking, pero no se puede sincronizar.</Aviso>
        ) : null}
        {abiertas.length > 0 ? (
          <Aviso tono="pendiente">
            Falta que la mesa técnica cierre: {abiertas.map((c) => `${c.categoria} (${etiquetaFase(c.fase)})`).join(', ')}.
          </Aviso>
        ) : null}
        {sinGanador.length > 0 ? (
          <Aviso tono="alerta">
            Cerradas sin ganador, revise que todos los jueces votaron: {sinGanador.map((c) => c.categoria).join(', ')}.
          </Aviso>
        ) : null}
        {sinMontador.length > 0 ? (
          <Aviso tono="alerta">
            Sin montador, ese montador no recibirá puntos: {sinMontador.map((f) => `${f.numero} ${formatNombre(f.caballoNombre)}`).join(', ')}.
            Anótelo en «Categorías e inscritos» antes de sincronizar.
          </Aviso>
        ) : null}
        {aviso ? <Aviso tono="ok">{aviso}</Aviso> : null}
        {error ? <Aviso tono="alerta">{error}</Aviso> : null}
      </ul>

      <div className="mt-4 space-y-4">
        {categorias.map((c) => {
          const conPuesto = c.filas.filter((f) => f.puesto != null).sort((a, b) => a.puesto! - b.puesto!)
          return (
            <div key={c.claseId} className="overflow-hidden rounded-[12px] border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3">
                <p className="typo-name text-base">{c.categoria}</p>
                <span className="typo-caption text-gold">{etiquetaFase(c.fase)}</span>
              </div>
              {conPuesto.length === 0 ? (
                <p className="typo-meta px-4 py-3">Sin puestos todavía.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="typo-caption">
                      <tr className="border-b border-border">
                        <th className="px-4 py-2">Puesto</th>
                        <th className="px-4 py-2">No.</th>
                        <th className="px-4 py-2">Caballo</th>
                        <th className="px-4 py-2">Propietario</th>
                        <th className="px-4 py-2">Criador</th>
                        <th className="px-4 py-2">Montador</th>
                        <th className="px-4 py-2 text-right">Suma</th>
                        <th className="px-4 py-2 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {conPuesto.map((f) => (
                        <tr key={`${c.claseId}-${f.numero}`}>
                          <td className="px-4 py-2 font-semibold text-gold">{f.puesto}.º</td>
                          <td className="px-4 py-2">{f.numero}</td>
                          <td className="px-4 py-2">{formatNombre(f.caballoNombre)}</td>
                          <td className="px-4 py-2">{formatNombre(f.propietario)}</td>
                          <td className="px-4 py-2">{formatNombre(f.criador)}</td>
                          <td className="px-4 py-2">
                            {f.montador ? formatNombre(f.montador) : <span className="text-flag-red">Sin montador</span>}
                          </td>
                          <td className="px-4 py-2 text-right">{f.total}</td>
                          <td className="px-4 py-2 text-right font-semibold">{f.puntos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="typo-meta border-t border-border px-4 py-2">
                {c.filas.filter((f) => f.asistio !== false).length} participaron
                {c.filas.some((f) => f.asistio === false) ? ` · ${c.filas.filter((f) => f.asistio === false).length} no asistieron` : ''}
                {c.filas.some((f) => f.excusa) ? ` · ${c.filas.filter((f) => f.excusa).length} excusados` : ''}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const TONOS = {
  ok: 'border-gold/60 text-gold',
  info: 'border-border text-muted',
  pendiente: 'border-border text-muted',
  alerta: 'border-flag-red/60 text-flag-red',
}

function Aviso({ tono, children }: { tono: keyof typeof TONOS; children: ReactNode }) {
  return <li className={`typo-meta rounded-[10px] border px-3 py-2 ${TONOS[tono]}`}>{children}</li>
}
