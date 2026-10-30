import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hojaDeComputo, LUGARES_PUESTO } from '../lib/computo'
import {
  EXCUSAS,
  estadoPista,
  etiquetaAcceso,
  etiquetaExcusa,
  etiquetaFase,
  FASES,
  limpiarCodigo,
  pistaAsistencia,
  pistaEscoger,
  pistaExcusar,
  pistaFase,
  pistaFormatoA,
  pistaVotar,
  type ClasePista,
  type EjemplarPista,
  type EstadoPista,
  type Excusa,
  type Fase,
} from '../lib/competencia'
import { formatFechaEmision, formatNombre } from '../lib/format'

const GUARDADO = 'adopaso-pista-codigo'
/** Cada cuánto se refresca la pantalla para ver lo que marcan los demás puestos. */
const REFRESCO_MS = 4000

/** Acceso de jueces, pre-pista y mesa técnica con el código de la competencia. */
export function Pista() {
  const { codigo: enRuta } = useParams()
  const navigate = useNavigate()
  const codigo = enRuta ? limpiarCodigo(enRuta) : null

  useEffect(() => {
    if (codigo) return
    const guardado = window.localStorage.getItem(GUARDADO)
    if (guardado) navigate(`/pista/${guardado}`, { replace: true })
  }, [codigo, navigate])

  if (!codigo) return <Entrar onEntrar={(nuevo) => navigate(`/pista/${nuevo}`)} />
  return (
    <Sala
      codigo={codigo}
      onSalir={() => {
        window.localStorage.removeItem(GUARDADO)
        navigate('/pista', { replace: true })
      }}
    />
  )
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-6 text-ink">
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  )
}

function Entrar({ onEntrar }: { onEntrar: (codigo: string) => void }) {
  const [texto, setTexto] = useState('')
  function enviar(event: FormEvent) {
    event.preventDefault()
    const limpio = limpiarCodigo(texto)
    if (limpio) onEntrar(limpio)
  }
  return (
    <Marco>
      <form onSubmit={enviar} className="mx-auto mt-16 max-w-sm text-center">
        <img src="/logo-adopaso.png" alt="ADOPASO" className="mx-auto mb-6 h-16 w-auto rounded-[12px]" />
        <p className="typo-eyebrow">Pista</p>
        <h1 className="typo-section mt-2">Código de acceso</h1>
        <p className="typo-meta mt-2">Lo entrega la administración de la competencia.</p>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Código de acceso"
          className="mt-6 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-center font-mono text-xl tracking-[0.25em] text-ink"
        />
        <button type="submit" className="typo-btn mt-4 w-full rounded-[10px] bg-gold px-4 py-3 text-bg">
          Entrar
        </button>
      </form>
    </Marco>
  )
}

function Sala({ codigo, onSalir }: { codigo: string; onSalir: () => void }) {
  const [estado, setEstado] = useState<EstadoPista | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [claseId, setClaseId] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      const datos = await estadoPista(codigo)
      setEstado(datos)
      setError(null)
      window.localStorage.setItem(GUARDADO, codigo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la competencia.')
    }
  }, [codigo])

  useEffect(() => {
    void recargar()
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') void recargar()
    }, REFRESCO_MS)
    return () => window.clearInterval(intervalo)
  }, [recargar])

  const hacer = useCallback(
    async (accion: () => Promise<void>) => {
      setAviso(null)
      try {
        await accion()
      } catch (err) {
        setAviso(err instanceof Error ? err.message : 'No se pudo guardar.')
      }
      await recargar()
    },
    [recargar],
  )

  if (!estado) {
    return (
      <Marco>
        {error ? (
          <div className="mt-16 text-center">
            <p className="typo-meta text-flag-red">{error}</p>
            <button type="button" className="typo-btn mt-4 rounded-[10px] border border-border px-4 py-2" onClick={onSalir}>
              Usar otro código
            </button>
          </div>
        ) : (
          <p className="typo-meta mt-16 text-center">Cargando…</p>
        )}
      </Marco>
    )
  }

  const visibles = estado.clases.filter((clase) => clase.fase !== 'inscripcion')
  const clase =
    visibles.find((item) => item.id === claseId) ??
    visibles.find((item) => item.fase !== 'cerrada' && item.fase !== 'prepista') ??
    visibles.find((item) => item.fase !== 'cerrada') ??
    visibles[0]

  return (
    <Marco>
      <header className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="typo-eyebrow">
            {etiquetaAcceso(estado.rol, estado.juezPuesto)}
            {estado.nombre ? ` · ${formatNombre(estado.nombre)}` : ''}
          </p>
          <h1 className="typo-section mt-1">{estado.competencia.nombre}</h1>
          <p className="typo-meta mt-1">
            {formatFechaEmision(estado.competencia.fecha)}
            {estado.competencia.lugar ? ` · ${estado.competencia.lugar}` : ''}
          </p>
        </div>
        <button type="button" className="typo-meta shrink-0 underline" onClick={onSalir}>
          Salir
        </button>
      </header>

      {estado.competencia.simulacion ? (
        <p className="typo-caption mt-3 rounded-[10px] border border-gold/60 px-3 py-2 text-center text-gold">
          SIMULACIÓN · Competencia de práctica, no es oficial
        </p>
      ) : null}
      {error ? <p className="typo-meta mt-3 text-flag-red">Sin conexión: {error}</p> : null}

      {visibles.length === 0 ? (
        <p className="typo-meta mt-8">La inscripción todavía no se ha cerrado. Esta pantalla se actualiza sola.</p>
      ) : (
        <>
          <label className="mt-4 block">
            <span className="typo-label">Categoría</span>
            <select
              value={clase?.id ?? ''}
              onChange={(e) => setClaseId(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-ink"
            >
              {visibles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.categoria} · {etiquetaFase(item.fase)}
                </option>
              ))}
            </select>
          </label>

          {aviso ? <p className="typo-meta mt-3 text-flag-red">{aviso}</p> : null}

          {clase ? (
            <div className="mt-6">
              {estado.rol === 'prepista' ? <PrePista clase={clase} codigo={codigo} hacer={hacer} /> : null}
              {estado.rol === 'juez' ? <Juez clase={clase} codigo={codigo} hacer={hacer} /> : null}
              {estado.rol === 'mesa' ? <Mesa clase={clase} estado={estado} codigo={codigo} hacer={hacer} /> : null}
            </div>
          ) : null}
        </>
      )}
    </Marco>
  )
}

type Hacer = (accion: () => Promise<void>) => Promise<void>

function numerados(clase: ClasePista): EjemplarPista[] {
  return clase.ejemplares.filter((item) => item.numero != null)
}

/** En pista: no faltó y no fue excusado. */
function enPista(item: EjemplarPista): boolean {
  return item.asistio !== false && !item.excusa
}

function Boton({
  activo,
  onClick,
  children,
  disabled,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'typo-btn rounded-[10px] border px-3 py-2 disabled:opacity-40',
        activo ? 'border-gold bg-gold text-bg' : 'border-border text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Pre-pista
// ---------------------------------------------------------------------------

function PrePista({ clase, codigo, hacer }: { clase: ClasePista; codigo: string; hacer: Hacer }) {
  const abierta = clase.fase === 'prepista' || clase.fase === 'formato_a'
  const lista = numerados(clase)
  const presentes = lista.filter((item) => item.asistio === true).length
  return (
    <section>
      <h2 className="typo-name text-lg">Confirmar asistencia</h2>
      <p className="typo-meta mt-1">
        {presentes} de {lista.length} confirmados.
        {abierta ? '' : ` La clase está en ${etiquetaFase(clase.fase).toLowerCase()}; ya no se marca asistencia.`}
      </p>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
        {lista.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-10 text-center font-display text-2xl font-semibold text-gold">{item.numero}</span>
              <span className="typo-name text-sm">{formatNombre(item.nombre)}</span>
            </div>
            <div className="flex gap-2">
              <Boton
                activo={item.asistio === true}
                disabled={!abierta}
                onClick={() => void hacer(() => pistaAsistencia(codigo, item.id!, item.asistio === true ? null : true))}
              >
                Asistió
              </Boton>
              <Boton
                activo={item.asistio === false}
                disabled={!abierta}
                onClick={() => void hacer(() => pistaAsistencia(codigo, item.id!, item.asistio === false ? null : false))}
              >
                No asistió
              </Boton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Juez
// ---------------------------------------------------------------------------

function Juez({ clase, codigo, hacer }: { clase: ClasePista; codigo: string; hacer: Hacer }) {
  if (clase.fase === 'formato_a') {
    const marcados = new Set(clase.formatoA.map((m) => m.numero))
    const lista = numerados(clase).filter(enPista)
    return (
      <section>
        <h2 className="typo-name text-lg">Formato A</h2>
        <p className="typo-meta mt-1">Toque los números que quiere ver en el recorrido individual. Puede marcar varios.</p>
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {lista.map((item) => {
            const activo = marcados.has(item.numero!)
            return (
              <button
                key={item.numero}
                type="button"
                aria-pressed={activo}
                onClick={() => void hacer(() => pistaFormatoA(codigo, clase.id, item.numero!, !activo))}
                className={[
                  'aspect-square rounded-[12px] border-2 font-display text-3xl font-semibold',
                  activo ? 'border-gold bg-gold text-bg' : 'border-border bg-surface text-ink',
                ].join(' ')}
              >
                {item.numero}
              </button>
            )
          })}
        </div>
        <p className="typo-meta mt-4">
          Marcados: {[...marcados].sort((a, b) => a - b).join(', ') || 'ninguno'}. Se guarda al tocar.
        </p>
      </section>
    )
  }

  if (clase.fase === 'votacion') {
    const escogidos = numerados(clase).filter((item) => item.escogido && !item.excusa)
    const porLugar = new Map(clase.votos.map((v) => [v.lugar, v.numero]))
    return (
      <section>
        <h2 className="typo-name text-lg">Votación final</h2>
        <p className="typo-meta mt-1">Elija el número para cada lugar. Un número no puede repetirse.</p>
        <div className="mt-4 space-y-4">
          {LUGARES_PUESTO.map((lugar) => (
            <div key={lugar} className="rounded-[12px] border border-border bg-surface p-3">
              <p className="typo-label">{lugar}.º lugar</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {escogidos.map((item) => {
                  const activo = porLugar.get(lugar) === item.numero
                  return (
                    <Boton
                      key={item.numero}
                      activo={activo}
                      onClick={() => void hacer(() => pistaVotar(codigo, clase.id, lugar, activo ? null : item.numero))}
                    >
                      <span className="px-1 font-display text-xl">{item.numero}</span>
                    </Boton>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const mensajes: Partial<Record<Fase, string>> = {
    prepista: 'La clase está en pre-pista. El formato A se abre cuando la mesa técnica lo indique.',
    individual: 'Recorrido individual en curso. La votación final se abre cuando la mesa técnica lo indique.',
    cerrada: 'Esta clase ya cerró. Gracias.',
  }
  return <p className="typo-meta">{mensajes[clase.fase] ?? 'Espere indicaciones de la mesa técnica.'}</p>
}

// ---------------------------------------------------------------------------
// Mesa técnica
// ---------------------------------------------------------------------------

function Mesa({
  clase,
  estado,
  codigo,
  hacer,
}: {
  clase: ClasePista
  estado: EstadoPista
  codigo: string
  hacer: Hacer
}) {
  const lista = numerados(clase)
  const puestos = estado.jueces.map((j) => j.puesto)
  const escogen = clase.fase === 'formato_a' || clase.fase === 'individual'
  const excusan = clase.fase === 'formato_a' || clase.fase === 'individual' || clase.fase === 'votacion'
  const pasan = lista.filter((item) => item.escogido && !item.excusa).map((item) => item.numero)
  const computo = hojaDeComputo(
    lista.map((item) => ({ numero: item.numero!, nombre: item.nombre ?? '', escogido: item.escogido && !item.excusa })),
    puestos,
    clase.votos.map((v) => ({ juezPuesto: v.juezPuesto, lugar: v.lugar, ejemplarNumero: v.numero })),
  ).sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99) || a.numero - b.numero)

  return (
    <div className="space-y-8">
      <section>
        <p className="typo-label">Fase de la clase</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FASES.filter((f) => f.value !== 'inscripcion').map((f) => (
            <Boton
              key={f.value}
              activo={clase.fase === f.value}
              onClick={() => {
                if (clase.fase !== f.value) void hacer(() => pistaFase(codigo, clase.id, f.value))
              }}
            >
              {f.label}
            </Boton>
          ))}
        </div>
      </section>

      <section className="rounded-[12px] border border-gold/60 bg-surface p-4">
        <p className="typo-label">Para el narrador · pasan al recorrido individual</p>
        <p className="mt-2 font-display text-3xl font-semibold text-gold">{pasan.join(' · ') || '—'}</p>
      </section>

      <section>
        <h2 className="typo-name text-lg">Ejemplares</h2>
        <div className="mt-3 overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="typo-caption">
              <tr className="border-b border-border">
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">Caballo</th>
                <th className="px-3 py-2">Pre-pista</th>
                <th className="px-3 py-2">Formato A</th>
                <th className="px-3 py-2">Pasa</th>
                <th className="px-3 py-2">Excusa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((item) => {
                const jueces = clase.formatoA.filter((m) => m.numero === item.numero).map((m) => m.juezPuesto)
                return (
                  <tr key={item.id} className={item.asistio === false || item.excusa ? 'opacity-50' : ''}>
                    <td className="px-3 py-2 font-display text-xl font-semibold text-gold">{item.numero}</td>
                    <td className="px-3 py-2">
                      {formatNombre(item.nombre)}
                      {item.montador ? <span className="typo-meta block">{formatNombre(item.montador)}</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      {item.asistio === true ? 'Asistió' : item.asistio === false ? 'No asistió' : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {jueces.length > 0 ? (
                        <>
                          <strong>
                            {jueces.length}/{puestos.length}
                          </strong>
                          <span className="typo-meta block">J{jueces.sort().join(', J')}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Pasa el ${item.numero}`}
                        checked={item.escogido}
                        disabled={!escogen || !enPista(item)}
                        onChange={(e) => void hacer(() => pistaEscoger(codigo, item.id!, e.target.checked))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Excusa del ${item.numero}`}
                        value={item.excusa ?? ''}
                        disabled={!excusan}
                        onChange={(e) => {
                          const excusa = (e.target.value || null) as Excusa | null
                          const texto = excusa
                            ? `¿Excusar al ${item.numero} por «${etiquetaExcusa(excusa)}»? Se borran sus votos.`
                            : `¿Quitar la excusa del ${item.numero}?`
                          if (window.confirm(texto)) void hacer(() => pistaExcusar(codigo, item.id!, excusa))
                        }}
                        className="rounded-[8px] border border-border bg-bg px-2 py-1 text-ink"
                      >
                        <option value="">Sin excusa</option>
                        {EXCUSAS.map((e) => (
                          <option key={e.value} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {clase.fase === 'formato_a' ? (
          <p className="typo-meta mt-2">
            La columna Formato A muestra cuántos jueces marcaron cada número. Marque «Pasa» en los que van al recorrido
            individual.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="typo-name text-lg">Votación final</h2>
        {puestos.length === 0 ? (
          <p className="typo-meta mt-2">La competencia todavía no tiene jueces con código.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[12px] border border-border">
            <table className="w-full min-w-[28rem] text-center text-sm">
              <thead className="typo-caption">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left">Lugar</th>
                  {puestos.map((p) => (
                    <th key={p} className="px-3 py-2">
                      Juez {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {LUGARES_PUESTO.map((lugar) => (
                  <tr key={lugar}>
                    <th className="px-3 py-2 text-left">{lugar}.º</th>
                    {puestos.map((p) => (
                      <td key={p} className="px-3 py-2 font-semibold">
                        {clase.votos.find((v) => v.juezPuesto === p && v.lugar === lugar)?.numero ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="typo-name text-lg">Hoja de cómputo</h2>
        <p className="typo-meta mt-1">Suma de los lugares de cada juez. La suma más baja queda primera.</p>
        <div className="mt-3 overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full min-w-[28rem] text-center text-sm">
            <thead className="typo-caption">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left">No.</th>
                {puestos.map((p) => (
                  <th key={p} className="px-3 py-2">
                    J{p}
                  </th>
                ))}
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Puesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {computo.map((fila) => (
                <tr key={fila.numero}>
                  <th className="px-3 py-2 text-left">
                    {fila.numero}
                    <span className="typo-meta block font-normal">{formatNombre(fila.nombre)}</span>
                  </th>
                  {fila.porJuez.map((n, i) => (
                    <td key={i} className="px-3 py-2">
                      {n ?? ''}
                    </td>
                  ))}
                  <td className="px-3 py-2 font-semibold">{fila.total ?? ''}</td>
                  <td className="px-3 py-2 font-semibold text-gold">{fila.puesto ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {computo.length === 0 ? <p className="typo-meta mt-2">Todavía no hay ejemplares en el recorrido individual.</p> : null}
      </section>
    </div>
  )
}
