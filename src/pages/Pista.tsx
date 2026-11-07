import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { hojaDeComputo, LUGARES_PUESTO } from '../lib/computo'
import {
  EXCUSAS,
  estadoPista,
  etiquetaAcceso,
  etiquetaExcusa,
  etiquetaFase,
  faltantesParaFase,
  FASES,
  juezFinalizo,
  limpiarCodigo,
  MAXIMO_FORMATO_A,
  mayoriaJueces,
  pistaAsistencia,
  pistaElegirClase,
  pistaEscoger,
  pistaExcusaVoto,
  pistaFase,
  pistaFinalizarVotacion,
  pistaFormatoA,
  pistaReabrirVotacion,
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
    <div className="min-h-screen bg-bg px-4 py-6 text-ink print:hidden">
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
  const [actaId, setActaId] = useState<string | null>(null)

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

  // Imprime el acta elegida en cuanto está en la página.
  useEffect(() => {
    if (!actaId) return
    const espera = window.setTimeout(() => window.print(), 100)
    const listo = () => setActaId(null)
    window.addEventListener('afterprint', listo)
    return () => {
      window.clearTimeout(espera)
      window.removeEventListener('afterprint', listo)
    }
  }, [actaId])

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
  const activa = visibles.find((item) => item.id === estado.claseActiva) ?? null
  const enCurso = activa && activa.fase !== 'cerrada' ? activa : null
  const acta = actaId ? visibles.find((item) => item.id === actaId) ?? null : null

  return (
    <>
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
            {activa ? (
              <div className="mt-4 rounded-[12px] border border-gold/60 bg-surface px-4 py-3">
                <p className="typo-label">{activa.fase === 'cerrada' ? 'Categoría finalizada' : 'En pista'}</p>
                <p className="typo-name mt-1 text-lg">{activa.categoria}</p>
                <p className="typo-meta mt-1">
                  {etiquetaFase(activa.fase)}
                  {activa.fase !== 'cerrada' ? ' · No se cambia de categoría hasta que la mesa técnica la finalice.' : ''}
                </p>
              </div>
            ) : null}

            {aviso ? <p className="typo-meta mt-3 text-flag-red">{aviso}</p> : null}

            {estado.rol === 'mesa' ? (
              <div className="mt-6 space-y-8">
                {!enCurso ? <ElegirCategoria estado={estado} codigo={codigo} hacer={hacer} /> : null}
                {activa ? (
                  <Mesa clase={activa} estado={estado} codigo={codigo} hacer={hacer} onActa={() => setActaId(activa.id)} />
                ) : null}
                <Actas clases={visibles} onActa={setActaId} />
              </div>
            ) : enCurso ? (
              <div className="mt-6">
                {estado.rol === 'prepista' ? <PrePista clase={enCurso} codigo={codigo} hacer={hacer} /> : null}
                {estado.rol === 'juez' ? <Juez clase={enCurso} estado={estado} codigo={codigo} hacer={hacer} /> : null}
              </div>
            ) : (
              <p className="typo-meta mt-8">
                {activa ? 'Esta categoría ya se finalizó. Gracias. ' : ''}
                Esperando a que la mesa técnica saque la siguiente categoría a pista. Esta pantalla se actualiza sola.
              </p>
            )}
          </>
        )}
      </Marco>
      {acta && estado.rol === 'mesa' ? createPortal(<Acta clase={acta} estado={estado} />, document.body) : null}
    </>
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

function nombreJuez(estado: EstadoPista, puesto: number): string {
  const nombre = estado.jueces.find((j) => j.puesto === puesto)?.nombre
  return nombre ? `Juez ${puesto} · ${formatNombre(nombre)}` : `Juez ${puesto}`
}

function CheckConfirmado() {
  return (
    <svg className="h-5 w-5 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" role="img" aria-label="Participante confirmado">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 12.2 10.6 15.3 16.5 8.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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
      <h2 className="typo-name text-lg">Confirmar participantes</h2>
      <p className="typo-meta mt-1">
        {presentes} de {lista.length} participantes confirmados.
        {abierta ? '' : ` La clase está en ${etiquetaFase(clase.fase).toLowerCase()}; ya no se confirma.`}
      </p>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
        {lista.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-10 text-center font-display text-2xl font-semibold text-gold">{item.numero}</span>
              <div>
                <span className="typo-name flex items-center gap-2 text-sm">
                  {formatNombre(item.nombre)}
                  {item.asistio === true ? <CheckConfirmado /> : null}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {item.asistio === true ? null : (
                <Boton
                  activo={false}
                  disabled={!abierta}
                  onClick={() => void hacer(() => pistaAsistencia(codigo, item.id!, true))}
                >
                  Confirmar participante
                </Boton>
              )}
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

function FinalizarVotacion({
  clase,
  codigo,
  hacer,
  finalizado,
  titulo,
}: {
  clase: ClasePista
  codigo: string
  hacer: Hacer
  finalizado: boolean
  titulo: string
}) {
  if (finalizado) {
    return (
      <p className="typo-meta mt-6 rounded-[12px] border border-gold/60 bg-surface px-4 py-3 text-gold">
        {titulo} finalizado. Ya llegó a la mesa técnica. Si necesita corregir, pídale a la mesa que se lo reabra.
      </p>
    )
  }
  return (
    <button
      type="button"
      className="typo-btn mt-6 w-full rounded-[10px] bg-gold px-4 py-3 text-bg"
      onClick={() => {
        if (window.confirm(`¿Finalizar ${titulo.toLowerCase()}? Después no podrá cambiarlo.`)) {
          void hacer(() => pistaFinalizarVotacion(codigo, clase.id))
        }
      }}
    >
      Finalizar votación
    </button>
  )
}

/** El juez vota excusar; queda excusado cuando lo vota la mayoría de los jueces. */
function ExcusasJuez({
  clase,
  estado,
  codigo,
  hacer,
  bloqueado,
}: {
  clase: ClasePista
  estado: EstadoPista
  codigo: string
  hacer: Hacer
  bloqueado: boolean
}) {
  const lista = numerados(clase).filter((item) => item.asistio !== false)
  const mios = new Map(clase.excusasVotos.map((v) => [v.numero, v.motivo]))
  const mayoria = mayoriaJueces(estado.jueces.length)
  return (
    <details className="mt-6 rounded-[12px] border border-border bg-surface p-4" open={mios.size > 0}>
      <summary className="typo-label cursor-pointer">Excusar un ejemplar</summary>
      <p className="typo-meta mt-2">
        Queda excusado si lo votan {mayoria} de {estado.jueces.length} jueces.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {lista.map((item) => (
          <li key={item.numero} className="flex flex-wrap items-center justify-between gap-3 py-2">
            <span className="font-display text-2xl font-semibold text-gold">
              {item.numero}
              {item.excusa ? <span className="typo-caption ml-2 text-flag-red">Excusado · {etiquetaExcusa(item.excusa)}</span> : null}
            </span>
            <select
              aria-label={`Excusa del ${item.numero}`}
              value={mios.get(item.numero!) ?? ''}
              disabled={bloqueado}
              onChange={(e) => {
                const motivo = (e.target.value || null) as Excusa | null
                void hacer(() => pistaExcusaVoto(codigo, clase.id, item.numero!, motivo))
              }}
              className="rounded-[8px] border border-border bg-bg px-2 py-2 text-ink"
            >
              <option value="">No excusar</option>
              {EXCUSAS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </details>
  )
}

function Juez({ clase, estado, codigo, hacer }: { clase: ClasePista; estado: EstadoPista; codigo: string; hacer: Hacer }) {
  const puesto = estado.juezPuesto ?? 0

  if (clase.fase === 'formato_a') {
    const finalizado = juezFinalizo(clase, puesto, 'formato_a')
    const marcados = new Set(clase.formatoA.map((m) => m.numero))
    const lleno = marcados.size >= MAXIMO_FORMATO_A
    const lista = numerados(clase).filter(enPista)
    return (
      <section>
        <h2 className="typo-name text-lg">Formato A</h2>
        <p className="typo-meta mt-1">
          Toque los números que quiere ver en el recorrido individual. Máximo {MAXIMO_FORMATO_A}.
        </p>
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {lista.map((item) => {
            const activo = marcados.has(item.numero!)
            return (
              <button
                key={item.numero}
                type="button"
                aria-pressed={activo}
                disabled={finalizado || (lleno && !activo)}
                onClick={() => void hacer(() => pistaFormatoA(codigo, clase.id, item.numero!, !activo))}
                className={[
                  'aspect-square rounded-[12px] border-2 font-display text-3xl font-semibold disabled:opacity-40',
                  activo ? 'border-gold bg-gold text-bg disabled:opacity-100' : 'border-border bg-surface text-ink',
                ].join(' ')}
              >
                {item.numero}
              </button>
            )
          })}
        </div>
        <p className="typo-meta mt-4">
          Marcados {marcados.size} de {MAXIMO_FORMATO_A}: {[...marcados].sort((a, b) => a - b).join(', ') || 'ninguno'}.
          {lleno && !finalizado ? ' Llegó al máximo; desmarque uno para cambiarlo.' : ''}
        </p>
        <ExcusasJuez clase={clase} estado={estado} codigo={codigo} hacer={hacer} bloqueado={finalizado} />
        <FinalizarVotacion clase={clase} codigo={codigo} hacer={hacer} finalizado={finalizado} titulo="Formato A" />
      </section>
    )
  }

  if (clase.fase === 'individual') {
    return (
      <section>
        <h2 className="typo-name text-lg">Recorrido individual</h2>
        <p className="typo-meta mt-1">
          Pasan: {numerados(clase).filter((item) => item.escogido && !item.excusa).map((item) => item.numero).join(' · ') || '—'}.
          La votación final se abre cuando la mesa técnica lo indique.
        </p>
        <ExcusasJuez clase={clase} estado={estado} codigo={codigo} hacer={hacer} bloqueado={false} />
      </section>
    )
  }

  if (clase.fase === 'votacion') {
    const finalizado = juezFinalizo(clase, puesto, 'votacion')
    const escogidos = numerados(clase).filter((item) => item.escogido && !item.excusa)
    const porLugar = new Map(clase.votos.map((v) => [v.lugar, v.numero]))
    return (
      <section>
        <h2 className="typo-name text-lg">Votación final</h2>
        <p className="typo-meta mt-1">Elija el número para cada lugar. Un número no puede repetirse.</p>
        <div className="mt-4 space-y-4">
          {LUGARES_PUESTO.slice(0, Math.max(1, Math.min(LUGARES_PUESTO.length, escogidos.length))).map((lugar) => (
            <div key={lugar} className="rounded-[12px] border border-border bg-surface p-3">
              <p className="typo-label">{lugar}.º lugar</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {escogidos.map((item) => {
                  const activo = porLugar.get(lugar) === item.numero
                  return (
                    <Boton
                      key={item.numero}
                      activo={activo}
                      disabled={finalizado}
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
        <ExcusasJuez clase={clase} estado={estado} codigo={codigo} hacer={hacer} bloqueado={finalizado} />
        <FinalizarVotacion clase={clase} codigo={codigo} hacer={hacer} finalizado={finalizado} titulo="Votación final" />
      </section>
    )
  }

  return <p className="typo-meta">La clase está en pre-pista. El formato A se abre cuando la mesa técnica lo indique.</p>
}

// ---------------------------------------------------------------------------
// Mesa técnica
// ---------------------------------------------------------------------------

function ElegirCategoria({ estado, codigo, hacer }: { estado: EstadoPista; codigo: string; hacer: Hacer }) {
  const pendientes = estado.clases.filter((clase) => clase.fase !== 'inscripcion' && clase.fase !== 'cerrada')
  const [elegida, setElegida] = useState('')
  const valor = pendientes.some((c) => c.id === elegida) ? elegida : (pendientes[0]?.id ?? '')
  if (pendientes.length === 0) {
    return <p className="typo-meta">No quedan categorías por juzgar.</p>
  }
  return (
    <section className="rounded-[12px] border border-border bg-surface p-4">
      <h2 className="typo-name text-lg">Sacar la siguiente categoría a pista</h2>
      <p className="typo-meta mt-1">
        Cuando la elija, nadie podrá cambiarla hasta que usted la finalice. Jueces y pre-pista la verán en su pantalla.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          aria-label="Categoría"
          value={valor}
          onChange={(e) => setElegida(e.target.value)}
          className="min-w-0 flex-1 rounded-[10px] border border-border bg-bg px-3 py-3 text-ink"
        >
          {pendientes.map((clase) => (
            <option key={clase.id} value={clase.id}>
              {clase.categoria} · {numerados(clase).length} ejemplares
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!valor}
          className="typo-btn rounded-[10px] bg-gold px-4 py-3 text-bg disabled:opacity-50"
          onClick={() => {
            const clase = pendientes.find((c) => c.id === valor)
            if (clase && window.confirm(`¿Sacar a pista ${clase.categoria}?`)) {
              void hacer(() => pistaElegirClase(codigo, clase.id))
            }
          }}
        >
          Sacar a pista
        </button>
      </div>
    </section>
  )
}

function Actas({ clases, onActa }: { clases: ClasePista[]; onActa: (id: string) => void }) {
  const cerradas = clases.filter((clase) => clase.fase === 'cerrada')
  if (cerradas.length === 0) return null
  return (
    <section>
      <h2 className="typo-name text-lg">Actas de categorías finalizadas</h2>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
        {cerradas.map((clase) => (
          <li key={clase.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
            <span className="text-sm">{clase.categoria}</span>
            <button type="button" className="typo-meta underline" onClick={() => onActa(clase.id)}>
              Imprimir acta (PDF)
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Mesa({
  clase,
  estado,
  codigo,
  hacer,
  onActa,
}: {
  clase: ClasePista
  estado: EstadoPista
  codigo: string
  hacer: Hacer
  onActa: () => void
}) {
  const lista = numerados(clase)
  const puestos = estado.jueces.map((j) => j.puesto)
  const fases = FASES.filter((f) => f.value !== 'inscripcion')
  const [bloqueo, setBloqueo] = useState<{ fase: Fase; faltan: string[] } | null>(null)
  useEffect(() => setBloqueo(null), [clase.id, clase.fase])
  const escogen = clase.fase === 'formato_a' || clase.fase === 'individual'
  const pasan = lista.filter((item) => item.escogido && !item.excusa).map((item) => item.numero)
  const cerrada = clase.fase === 'cerrada'
  const computo = hojaDeComputo(
    lista.map((item) => ({ numero: item.numero!, nombre: item.nombre ?? '', escogido: item.escogido && !item.excusa })),
    puestos,
    clase.votos.map((v) => ({ juezPuesto: v.juezPuesto, lugar: v.lugar, ejemplarNumero: v.numero })),
  ).sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99) || a.numero - b.numero)

  function abrir(destino: Fase) {
    const faltan = faltantesParaFase(clase, puestos, destino)
    if (faltan.length > 0) {
      setBloqueo({ fase: destino, faltan })
      return false
    }
    setBloqueo(null)
    return true
  }

  // Reglamento: para seguir en competencia basta con que un juez lo marque en su formato A.
  function pasarMarcados() {
    void hacer(async () => {
      for (const item of lista) {
        if (!item.id) continue
        const marcado = clase.formatoA.some((m) => m.numero === item.numero)
        const debe = marcado && enPista(item)
        if (debe !== item.escogido) await pistaEscoger(codigo, item.id, debe)
      }
    })
  }

  const faseJuez: 'formato_a' | 'votacion' | null =
    clase.fase === 'formato_a' ? 'formato_a' : clase.fase === 'votacion' ? 'votacion' : null

  return (
    <div className="space-y-8">
      <section>
        <p className="typo-label">Fase de la categoría</p>
        <div className="mt-3 overflow-x-auto">
          <ol className="flex items-start">
            {fases.map((fase, indice) => {
              const orden = fases.findIndex((item) => item.value === clase.fase)
              const hecho = indice < orden
              const activo = fase.value === clase.fase
              return (
                <li key={fase.value} className="flex min-w-0 flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    <span className={['h-px flex-1', indice === 0 ? 'bg-transparent' : hecho || activo ? 'bg-gold' : 'bg-border'].join(' ')} />
                    <button
                      type="button"
                      aria-current={activo ? 'step' : undefined}
                      aria-label={fase.label}
                      onClick={() => {
                        if (fase.value === clase.fase) {
                          setBloqueo(null)
                          return
                        }
                        if (fase.value === 'cerrada' && !window.confirm(`¿Finalizar ${clase.categoria}?`)) return
                        if (abrir(fase.value)) void hacer(() => pistaFase(codigo, clase.id, fase.value))
                      }}
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                        activo ? 'border-gold bg-gold text-bg' : hecho ? 'border-gold text-gold' : 'border-border text-muted',
                      ].join(' ')}
                    >
                      {hecho ? '✓' : indice + 1}
                    </button>
                    <span className={['h-px flex-1', indice === fases.length - 1 ? 'bg-transparent' : indice < orden ? 'bg-gold' : 'bg-border'].join(' ')} />
                  </div>
                  <span className={['typo-caption mt-2 px-1 text-center', activo ? 'text-gold' : 'text-muted'].join(' ')}>
                    {fase.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
        {bloqueo ? (
          <div role="alert" className="mt-4 rounded-[12px] border border-gold/60 bg-surface p-4">
            <p className="typo-label">Para abrir {etiquetaFase(bloqueo.fase)} falta</p>
            <ul className="typo-meta mt-2 list-disc space-y-1 pl-5">
              {bloqueo.faltan.map((texto, indice) => (
                <li key={`${indice}-${texto}`}>{texto}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {clase.fase === 'votacion' ? (
            <button
              type="button"
              className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg"
              onClick={() => {
                if (!window.confirm(`¿Finalizar ${clase.categoria}? Después podrá sacar la siguiente a pista.`)) return
                if (abrir('cerrada')) void hacer(() => pistaFase(codigo, clase.id, 'cerrada'))
              }}
            >
              Finalizar categoría
            </button>
          ) : null}
          {cerrada ? (
            <button type="button" className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg" onClick={onActa}>
              Imprimir acta (PDF)
            </button>
          ) : null}
        </div>
        {cerrada ? (
          <p className="typo-meta mt-2">
            Imprima el acta para que la firmen los jueces y la mesa técnica. En la ventana de impresión puede elegir
            «Guardar como PDF».
          </p>
        ) : null}
      </section>

      {puestos.length > 0 ? (
        <section>
          <h2 className="typo-name text-lg">Jueces</h2>
          {puestos.length % 2 === 0 ? (
            <p className="typo-meta mt-1 text-flag-red">
              Hay {puestos.length} jueces. Con un número impar (3 o 5) la mayoría para excusar es más clara.
            </p>
          ) : null}
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
            {puestos.map((puesto) => {
              const fa = juezFinalizo(clase, puesto, 'formato_a')
              const vf = juezFinalizo(clase, puesto, 'votacion')
              const reabrible = faseJuez != null && juezFinalizo(clase, puesto, faseJuez)
              return (
                <li key={puesto} className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
                  <div>
                    <p className="typo-name text-sm">{nombreJuez(estado, puesto)}</p>
                    <p className="typo-meta">
                      Formato A: {fa ? 'finalizado ✓' : 'pendiente'} · Votación final: {vf ? 'finalizada ✓' : 'pendiente'}
                    </p>
                  </div>
                  {reabrible ? (
                    <button
                      type="button"
                      className="typo-meta underline"
                      onClick={() => {
                        if (window.confirm(`¿Devolverle la votación al juez ${puesto} para que la corrija?`)) {
                          void hacer(() => pistaReabrirVotacion(codigo, clase.id, puesto))
                        }
                      }}
                    >
                      Reabrir
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-[12px] border border-gold/60 bg-surface p-4">
        <p className="typo-label">Para el narrador · pasan al recorrido individual</p>
        <p className="mt-2 font-display text-3xl font-semibold text-gold">{pasan.join(' · ') || '—'}</p>
        {escogen ? (
          <button type="button" className="typo-meta mt-3 underline" onClick={pasarMarcados}>
            Pasar a todos los que marcó algún juez en el formato A
          </button>
        ) : null}
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
                const excusas = clase.excusasVotos.filter((v) => v.numero === item.numero)
                return (
                  <tr key={item.id} className={item.asistio === false || item.excusa ? 'opacity-50' : ''}>
                    <td className="px-3 py-2 font-display text-xl font-semibold text-gold">{item.numero}</td>
                    <td className="px-3 py-2">
                      {formatNombre(item.nombre)}
                      {item.montador ? <span className="typo-meta block">{formatNombre(item.montador)}</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      {item.asistio === true ? 'Confirmado' : item.asistio === false ? 'No asistió' : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {jueces.length > 0 ? (
                        <>
                          <strong>
                            {jueces.length}/{puestos.length}
                          </strong>
                          <span className="typo-meta block">J{jueces.sort((a, b) => a - b).join(', J')}</span>
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
                      {item.excusa ? <strong className="text-flag-red">{etiquetaExcusa(item.excusa)}</strong> : null}
                      {excusas.length > 0 ? (
                        <span className="typo-meta block">
                          {excusas.length}/{puestos.length} votos:{' '}
                          {excusas.map((v) => `J${v.juezPuesto} ${etiquetaExcusa(v.motivo).toLowerCase()}`).join(', ')}
                        </span>
                      ) : item.excusa ? null : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="typo-meta mt-2">
          Las excusas las votan los jueces desde su pantalla. Queda excusado con {mayoriaJueces(puestos.length)} de{' '}
          {puestos.length} votos.
        </p>
      </section>

      <TablaVotos clase={clase} estado={estado} />

      <section>
        <h2 className="typo-name text-lg">Hoja de cómputo</h2>
        <p className="typo-meta mt-1">Suma de los lugares de cada juez. La suma más baja queda primera.</p>
        <TablaComputo computo={computo} puestos={puestos} />
        {computo.length === 0 ? <p className="typo-meta mt-2">Todavía no hay ejemplares en el recorrido individual.</p> : null}
      </section>
    </div>
  )
}

function TablaVotos({ clase, estado, impresa }: { clase: ClasePista; estado: EstadoPista; impresa?: boolean }) {
  const puestos = estado.jueces.map((j) => j.puesto)
  return (
    <section>
      <h2 className={impresa ? 'mt-6 text-base font-bold' : 'typo-name text-lg'}>Votación final</h2>
      {puestos.length === 0 ? (
        <p className="typo-meta mt-2">La competencia todavía no tiene jueces con código.</p>
      ) : (
        <div className={impresa ? 'mt-2' : 'mt-3 overflow-x-auto rounded-[12px] border border-border'}>
          <table className={impresa ? 'w-full border-collapse text-center text-sm' : 'w-full min-w-[28rem] text-center text-sm'}>
            <thead className={impresa ? '' : 'typo-caption'}>
              <tr className={impresa ? '' : 'border-b border-border'}>
                <th className={impresa ? CELDA_IMPRESA : 'px-3 py-2 text-left'}>Lugar</th>
                {puestos.map((p) => (
                  <th key={p} className={impresa ? CELDA_IMPRESA : 'px-3 py-2'}>
                    {nombreJuez(estado, p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={impresa ? '' : 'divide-y divide-border'}>
              {LUGARES_PUESTO.map((lugar) => (
                <tr key={lugar}>
                  <th className={impresa ? CELDA_IMPRESA : 'px-3 py-2 text-left'}>{lugar}.º</th>
                  {puestos.map((p) => (
                    <td key={p} className={impresa ? CELDA_IMPRESA : 'px-3 py-2 font-semibold'}>
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
  )
}

function TablaComputo({
  computo,
  puestos,
  impresa,
}: {
  computo: ReturnType<typeof hojaDeComputo>
  puestos: number[]
  impresa?: boolean
}) {
  const celda = impresa ? CELDA_IMPRESA : 'px-3 py-2'
  return (
    <div className={impresa ? 'mt-2' : 'mt-3 overflow-x-auto rounded-[12px] border border-border'}>
      <table className={impresa ? 'w-full border-collapse text-center text-sm' : 'w-full min-w-[28rem] text-center text-sm'}>
        <thead className={impresa ? '' : 'typo-caption'}>
          <tr className={impresa ? '' : 'border-b border-border'}>
            <th className={`${celda} text-left`}>No.</th>
            {puestos.map((p) => (
              <th key={p} className={celda}>
                J{p}
              </th>
            ))}
            <th className={celda}>Total</th>
            <th className={celda}>Puesto</th>
          </tr>
        </thead>
        <tbody className={impresa ? '' : 'divide-y divide-border'}>
          {computo.map((fila) => (
            <tr key={fila.numero}>
              <th className={`${celda} text-left`}>
                {fila.numero}
                <span className={impresa ? 'block text-xs font-normal' : 'typo-meta block font-normal'}>{formatNombre(fila.nombre)}</span>
              </th>
              {fila.porJuez.map((n, i) => (
                <td key={i} className={celda}>
                  {n ?? ''}
                </td>
              ))}
              <td className={`${celda} font-semibold`}>{fila.total ?? ''}</td>
              <td className={`${celda} font-semibold ${impresa ? '' : 'text-gold'}`}>{fila.puesto ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CELDA_IMPRESA = 'border border-black px-2 py-1'

/** Acta de la categoría para imprimir y firmar (jueces y mesa técnica). */
function Acta({ clase, estado }: { clase: ClasePista; estado: EstadoPista }) {
  const lista = numerados(clase)
  const puestos = estado.jueces.map((j) => j.puesto)
  const computo = hojaDeComputo(
    lista.map((item) => ({ numero: item.numero!, nombre: item.nombre ?? '', escogido: item.escogido && !item.excusa })),
    puestos,
    clase.votos.map((v) => ({ juezPuesto: v.juezPuesto, lugar: v.lugar, ejemplarNumero: v.numero })),
  ).sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99) || a.numero - b.numero)

  return (
    <div className="hidden bg-white p-6 text-black print:block">
      <div className="flex items-center gap-4 border-b-2 border-black pb-3">
        <img src="/logo-adopaso.png" alt="ADOPASO" className="h-14 w-auto" />
        <div>
          <p className="text-xs uppercase tracking-widest">ADOPASO · Acta de juzgamiento</p>
          <h1 className="text-xl font-bold">{clase.categoria}</h1>
          <p className="text-sm">
            {estado.competencia.nombre} · {formatFechaEmision(estado.competencia.fecha)}
            {estado.competencia.lugar ? ` · ${estado.competencia.lugar}` : ''}
            {estado.competencia.simulacion ? ' · SIMULACIÓN (no oficial)' : ''}
          </p>
        </div>
      </div>

      <h2 className="mt-4 text-base font-bold">Ejemplares</h2>
      <table className="mt-2 w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className={CELDA_IMPRESA}>No.</th>
            <th className={CELDA_IMPRESA}>Caballo</th>
            <th className={CELDA_IMPRESA}>Propietario</th>
            <th className={CELDA_IMPRESA}>Montador</th>
            <th className={CELDA_IMPRESA}>Pre-pista</th>
            <th className={CELDA_IMPRESA}>Formato A</th>
            <th className={CELDA_IMPRESA}>Pasa</th>
            <th className={CELDA_IMPRESA}>Excusa</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((item) => (
            <tr key={item.id}>
              <td className={CELDA_IMPRESA}>{item.numero}</td>
              <td className={CELDA_IMPRESA}>{formatNombre(item.nombre)}</td>
              <td className={CELDA_IMPRESA}>{formatNombre(item.propietario)}</td>
              <td className={CELDA_IMPRESA}>{formatNombre(item.montador)}</td>
              <td className={CELDA_IMPRESA}>
                {item.asistio === true ? 'Confirmado' : item.asistio === false ? 'No asistió' : '—'}
              </td>
              <td className={CELDA_IMPRESA}>
                {clase.formatoA.filter((m) => m.numero === item.numero).length || '—'}
              </td>
              <td className={CELDA_IMPRESA}>{item.escogido && !item.excusa ? 'Sí' : ''}</td>
              <td className={CELDA_IMPRESA}>{item.excusa ? etiquetaExcusa(item.excusa) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <TablaVotos clase={clase} estado={estado} impresa />

      <h2 className="mt-6 text-base font-bold">Hoja de cómputo</h2>
      <TablaComputo computo={computo} puestos={puestos} impresa />

      <h2 className="mt-8 text-base font-bold">Firmas</h2>
      <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-12 text-sm">
        {puestos.map((p) => (
          <div key={p} className="border-t border-black pt-1">
            {nombreJuez(estado, p)}
          </div>
        ))}
        <div className="border-t border-black pt-1">Mesa técnica</div>
      </div>
      <p className="mt-10 text-xs">Impreso el {new Date().toLocaleString('es-DO')}</p>
    </div>
  )
}
