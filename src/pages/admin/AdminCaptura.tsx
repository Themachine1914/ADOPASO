import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import {
  EXCUSAS,
  FASES,
  MAXIMO_FORMATO_A,
  cargarCompetencia,
  estadoPista,
  etiquetaExcusa,
  etiquetaJuez,
  faltantesParaFase,
  juezFinalizo,
  mayoriaJueces,
  pistaAsistencia,
  pistaElegirClase,
  pistaEscoger,
  pistaExcusaVoto,
  pistaFase,
  pistaFinalizarVotacion,
  pistaFormatoA,
  pistaLlevaFormatoA,
  pistaNumeroEjemplar,
  pistaReabrirVotacion,
  pistaVotar,
  type ClasePista,
  type EjemplarPista,
  type EstadoPista,
  type EstiloJueces,
  type Excusa,
  type Fase,
} from '../../lib/competencia'
import { LUGARES_PUESTO } from '../../lib/computo'
import { formatNombre } from '../../lib/format'

/** Una persona anota pre-pista, jueces y mesa. No muestra sumas ni quién narra. */
export function AdminCaptura() {
  const { perfil } = useAuth()
  const { id = '', claseId = '' } = useParams()
  const [estado, setEstado] = useState<EstadoPista | null>(null)
  const [codigosJuez, setCodigosJuez] = useState<Map<number, string>>(new Map())
  const [mesa, setMesa] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bloqueo, setBloqueo] = useState<string[] | null>(null)

  const recargar = useCallback(async () => {
    const datos = await cargarCompetencia(id)
    const codigoMesa = datos?.accesos.find((acceso) => acceso.rol === 'mesa')?.codigo ?? null
    const jueces = new Map<number, string>()
    for (const acceso of datos?.accesos ?? []) {
      if (acceso.rol === 'juez' && acceso.juezPuesto != null) jueces.set(acceso.juezPuesto, acceso.codigo)
    }
    setMesa(codigoMesa)
    setCodigosJuez(jueces)
    setEstado(codigoMesa ? await estadoPista(codigoMesa) : null)
  }, [id])

  useEffect(() => {
    if (perfil?.rol !== 'admin' || !id) return
    let vigente = true
    setCargando(true)
    recargar()
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : 'No se pudo abrir la captura.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [perfil?.rol, id, recargar])

  async function hacer(accion: () => Promise<void>) {
    setError(null)
    try {
      await accion()
      await recargar()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  if (perfil?.rol !== 'admin') return <Navigate to="/admin" replace />
  if (cargando) return <p className="typo-meta">Cargando la captura…</p>
  if (!mesa) {
    return (
      <Aviso id={id}>
        Esta competencia no tiene código de mesa técnica. Créelo en la competencia y vuelva a entrar.
      </Aviso>
    )
  }
  if (!estado) return <Aviso id={id}>{error ?? 'No se pudo leer la pista.'}</Aviso>

  const clase = estado.clases.find((item) => item.id === claseId)
  if (!clase) {
    return <Aviso id={id}>Esta categoría no tiene caballos inscritos, así que todavía no se puede capturar.</Aviso>
  }

  const enPista = estado.claseActiva === clase.id
  const estilo: EstiloJueces = estado.competencia.etiquetaJueces === 'letra' ? 'letra' : 'numero'
  const puestos = estado.jueces.map((juez) => juez.puesto)

  return (
    <div className="space-y-8">
      <div>
        <Link to={`/admin/competencias/${id}`} className="typo-meta font-medium text-gold hover:text-gold-soft">
          ← {estado.competencia.nombre}
        </Link>
        <p className="typo-eyebrow mt-4">Captura manual</p>
        <h1 className="typo-page mt-2">{clase.categoria}</h1>
        <p className="typo-lead mt-2">
          Una persona anota la pre-pista, el formato A, las excusas y la votación de cada juez. Aquí no se calculan
          sumas ni quién narra los lugares.
        </p>
        {error ? <p className="typo-meta mt-3 text-flag-red">{error}</p> : null}
      </div>

      {clase.fase === 'inscripcion' ? (
        <Aviso id={id}>Cierre y numere esta categoría en la competencia antes de capturarla.</Aviso>
      ) : !enPista && clase.fase === 'cerrada' ? (
        <Resumen clase={clase} estado={estado} estilo={estilo} />
      ) : !enPista ? (
        <Empezar clase={clase} mesa={mesa} hacer={hacer} />
      ) : (
        <>
          <Fases
            clase={clase}
            puestos={puestos}
            estilo={estilo}
            bloqueo={bloqueo}
            onBloqueo={setBloqueo}
            onFase={(fase) => hacer(() => pistaFase(mesa, clase.id, fase))}
          />
          <Participantes clase={clase} mesa={mesa} hacer={hacer} />
          {clase.conFormatoA && clase.fase !== 'prepista' ? (
            <FormatoA
              clase={clase}
              estado={estado}
              estilo={estilo}
              codigos={codigosJuez}
              hacer={hacer}
            />
          ) : null}
          {clase.fase === 'formato_a' || clase.fase === 'individual' ? (
            <QuienPasa clase={clase} mesa={mesa} hacer={hacer} />
          ) : null}
          {clase.fase === 'formato_a' || clase.fase === 'individual' || clase.fase === 'votacion' ? (
            <Excusas
              clase={clase}
              estado={estado}
              estilo={estilo}
              codigos={codigosJuez}
              mesa={mesa}
              hacer={hacer}
            />
          ) : null}
          {clase.fase === 'votacion' || clase.fase === 'cerrada' ? (
            <Votacion
              clase={clase}
              estado={estado}
              estilo={estilo}
              codigos={codigosJuez}
              mesa={mesa}
              hacer={hacer}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function Aviso({ id, children }: { id: string; children: string }) {
  return (
    <div className="space-y-3">
      <p className="typo-meta">{children}</p>
      <Link to={`/admin/competencias/${id}`} className="typo-meta font-medium text-gold underline">
        Volver a la competencia
      </Link>
    </div>
  )
}

function Empezar({
  clase,
  mesa,
  hacer,
}: {
  clase: ClasePista
  mesa: string
  hacer: (accion: () => Promise<void>) => Promise<void>
}) {
  const [preguntar, setPreguntar] = useState(false)
  return (
    <section className="rounded-[12px] border border-border bg-surface p-4">
      <h2 className="typo-name text-lg">Empezar la captura</h2>
      <p className="typo-meta mt-1">
        La categoría pasa a pista. Si otra categoría sigue abierta, primero hay que finalizarla.
      </p>
      <button
        type="button"
        className="typo-btn mt-3 rounded-[10px] bg-gold px-4 py-2.5 text-bg"
        onClick={() => setPreguntar(true)}
      >
        Empezar
      </button>
      {preguntar ? (
        <div className="mt-4 rounded-[12px] border border-gold bg-bg p-4">
          <p className="typo-name text-base">¿{clase.categoria} lleva Formato A?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg"
              onClick={() =>
                void hacer(async () => {
                  await pistaElegirClase(mesa, clase.id)
                  await pistaLlevaFormatoA(mesa, clase.id, true)
                })
              }
            >
              Sí, lleva Formato A
            </button>
            <button
              type="button"
              className="typo-btn rounded-[10px] border border-gold px-4 py-2 text-gold"
              onClick={() =>
                void hacer(async () => {
                  await pistaElegirClase(mesa, clase.id)
                  await pistaLlevaFormatoA(mesa, clase.id, false)
                })
              }
            >
              No, sin Formato A
            </button>
            <button type="button" className="typo-btn rounded-[10px] border border-border px-4 py-2" onClick={() => setPreguntar(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function Fases({
  clase,
  puestos,
  estilo,
  bloqueo,
  onBloqueo,
  onFase,
}: {
  clase: ClasePista
  puestos: number[]
  estilo: EstiloJueces
  bloqueo: string[] | null
  onBloqueo: (faltan: string[] | null) => void
  onFase: (fase: Fase) => Promise<void>
}) {
  const fases = FASES.filter((fase) => fase.value !== 'inscripcion' && (clase.conFormatoA || fase.value !== 'formato_a'))
  const orden = fases.findIndex((fase) => fase.value === clase.fase)
  const pasan = numerados(clase)
    .filter((item) => item.escogido && item.asistio !== false && !item.excusa)
    .map((item) => item.numero)

  function abrir(destino: Fase) {
    if (destino === clase.fase) {
      onBloqueo(null)
      return
    }
    if (destino === 'cerrada' && !window.confirm(`¿Finalizar ${clase.categoria}?`)) return
    const faltan = faltantesParaFase(clase, puestos, destino, estilo)
    if (faltan.length > 0) {
      onBloqueo(faltan)
      return
    }
    onBloqueo(null)
    void onFase(destino)
  }

  return (
    <section>
      <p className="typo-label">Fase de la categoría</p>
      <p className="typo-caption mt-1">{clase.conFormatoA ? 'Con Formato A' : 'Sin Formato A: pasan todos los confirmados'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {fases.map((fase) => {
          const activo = fase.value === clase.fase
          const hecho = fases.findIndex((item) => item.value === fase.value) < orden
          return (
            <button
              key={fase.value}
              type="button"
              aria-current={activo ? 'step' : undefined}
              onClick={() => abrir(fase.value)}
              className={[
                'typo-btn rounded-[10px] border px-3 py-2',
                activo ? 'border-gold bg-gold text-bg' : hecho ? 'border-gold text-gold' : 'border-border text-ink',
              ].join(' ')}
            >
              {fase.label}
            </button>
          )
        })}
      </div>
      {bloqueo && bloqueo.length > 0 ? (
        <div role="alert" className="mt-4 rounded-[12px] border border-gold/60 bg-surface p-4">
          <p className="typo-label">Para cambiar de fase falta</p>
          <ul className="typo-meta mt-2 list-disc space-y-1 pl-5">
            {bloqueo.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {clase.fase !== 'prepista' ? (
        <p className="mt-4 font-display text-3xl font-semibold text-gold">{pasan.join(' · ') || '—'}</p>
      ) : null}
      {clase.fase !== 'prepista' ? <p className="typo-caption">Pasan al recorrido individual</p> : null}
    </section>
  )
}

function Participantes({
  clase,
  mesa,
  hacer,
}: {
  clase: ClasePista
  mesa: string
  hacer: (accion: () => Promise<void>) => Promise<void>
}) {
  const abierta = clase.fase === 'prepista' || clase.fase === 'formato_a'
  const lista = numerados(clase)
  return (
    <section>
      <h2 className="typo-name text-lg">Pre-pista</h2>
      <p className="typo-meta mt-1">
        {lista.filter((item) => item.asistio === true).length} de {lista.length} confirmados.
      </p>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
        {lista.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              {clase.fase === 'prepista' && item.id ? (
                <Numero key={`${item.id}-${item.numero}`} mesa={mesa} claseId={clase.id} item={item} hacer={hacer} />
              ) : (
                <span className="w-12 text-center font-display text-2xl font-semibold text-gold">{item.numero}</span>
              )}
              <span className="typo-name text-sm">{formatNombre(item.nombre)}</span>
            </div>
            <div className="flex gap-2">
              <Marca
                activo={item.asistio === true}
                disabled={!abierta}
                onClick={() => void hacer(() => pistaAsistencia(mesa, item.id!, item.asistio === true ? null : true))}
              >
                Confirmado
              </Marca>
              <Marca
                activo={item.asistio === false}
                disabled={!abierta}
                onClick={() => void hacer(() => pistaAsistencia(mesa, item.id!, item.asistio === false ? null : false))}
              >
                No asistió
              </Marca>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Numero({
  mesa,
  claseId,
  item,
  hacer,
}: {
  mesa: string
  claseId: string
  item: EjemplarPista
  hacer: (accion: () => Promise<void>) => Promise<void>
}) {
  const [texto, setTexto] = useState(String(item.numero ?? ''))
  return (
    <input
      aria-label={`Número de ${item.nombre ?? item.numero}`}
      inputMode="numeric"
      value={texto}
      onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onBlur={() => {
        const numero = Number(texto)
        if (!numero || numero === item.numero) {
          setTexto(String(item.numero ?? ''))
          return
        }
        void hacer(() => pistaNumeroEjemplar(mesa, claseId, item.id!, numero))
      }}
      className="w-14 rounded-[8px] border border-border bg-bg px-2 py-1 text-center font-display text-xl font-semibold text-gold"
    />
  )
}

function FormatoA({
  clase,
  estado,
  estilo,
  codigos,
  hacer,
}: {
  clase: ClasePista
  estado: EstadoPista
  estilo: EstiloJueces
  codigos: Map<number, string>
  hacer: (accion: () => Promise<void>) => Promise<void>
}) {
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const lista = numerados(clase).filter((item) => item.asistio !== false && !item.excusa)
  const abierto = clase.fase === 'formato_a'
  return (
    <section>
      <h2 className="typo-name text-lg">Formato A</h2>
      <p className="typo-meta mt-1">Cada juez marca hasta {MAXIMO_FORMATO_A} números para el recorrido individual.</p>
      <div className="mt-3 overflow-x-auto rounded-[12px] border border-border">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="typo-caption">
            <tr className="border-b border-border">
              <th className="px-3 py-2">No.</th>
              {puestos.map((puesto) => (
                <th key={puesto} className="px-3 py-2">
                  {nombreJuez(estado, puesto, estilo)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lista.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <span className="font-display text-xl font-semibold text-gold">{item.numero}</span>
                  <span className="typo-meta ml-2">{formatNombre(item.nombre)}</span>
                </td>
                {puestos.map((puesto) => {
                  const marcado = clase.formatoA.some((marca) => marca.juezPuesto === puesto && marca.numero === item.numero)
                  const propios = clase.formatoA.filter((marca) => marca.juezPuesto === puesto).length
                  const finalizado = juezFinalizo(clase, puesto, 'formato_a')
                  const codigo = codigos.get(puesto)
                  return (
                    <td key={puesto} className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Juez ${etiquetaJuez(puesto, estilo)} marca el ${item.numero}`}
                        checked={marcado}
                        disabled={!abierto || finalizado || !codigo || (!marcado && propios >= MAXIMO_FORMATO_A)}
                        onChange={() => {
                          if (!codigo) return
                          void hacer(() => pistaFormatoA(codigo, clase.id, item.numero!, !marcado))
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {abierto ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {puestos.map((puesto) => {
            const codigo = codigos.get(puesto)
            const finalizado = juezFinalizo(clase, puesto, 'formato_a')
            if (!codigo) return null
            return finalizado ? (
              <span key={puesto} className="typo-caption text-gold">
                {nombreJuez(estado, puesto, estilo)} finalizó
              </span>
            ) : (
              <button
                key={puesto}
                type="button"
                className="typo-btn rounded-[10px] border border-gold px-3 py-2 text-gold"
                onClick={() => {
                  if (!window.confirm(`¿Finalizar el formato A de ${nombreJuez(estado, puesto, estilo)}?`)) return
                  void hacer(() => pistaFinalizarVotacion(codigo, clase.id))
                }}
              >
                Finalizar {etiquetaJuez(puesto, estilo)}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function QuienPasa({
  clase,
  mesa,
  hacer,
}: {
  clase: ClasePista
  mesa: string
  hacer: (accion: () => Promise<void>) => Promise<void>
}) {
  const lista = numerados(clase).filter((item) => item.asistio !== false && !item.excusa)
  return (
    <section>
      <h2 className="typo-name text-lg">Pasan al recorrido</h2>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
        {lista.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
            <span>
              <span className="font-display text-xl font-semibold text-gold">{item.numero}</span>
              <span className="typo-name ml-2 text-sm">{formatNombre(item.nombre)}</span>
            </span>
            <label className="typo-meta flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.escogido}
                onChange={(e) => void hacer(() => pistaEscoger(mesa, item.id!, e.target.checked))}
              />
              Pasa
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="typo-meta mt-3 underline"
        onClick={() =>
          void hacer(async () => {
            for (const item of numerados(clase)) {
              if (!item.id) continue
              const marcado = clase.formatoA.some((marca) => marca.numero === item.numero)
              const debe = marcado && item.asistio !== false && !item.excusa
              if (debe !== item.escogido) await pistaEscoger(mesa, item.id, debe)
            }
          })
        }
      >
        Pasar a todos los que marcó algún juez
      </button>
    </section>
  )
}

function Excusas({
  clase,
  estado,
  estilo,
  codigos,
  mesa,
  hacer,
}: {
  clase: ClasePista
  estado: EstadoPista
  estilo: EstiloJueces
  codigos: Map<number, string>
  mesa: string
  hacer: (accion: () => Promise<void>) => Promise<void>
}) {
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const lista = numerados(clase).filter((item) => item.asistio !== false)
  const faseJuez = clase.fase === 'votacion' ? 'votacion' : clase.fase === 'formato_a' ? 'formato_a' : null
  return (
    <section>
      <h2 className="typo-name text-lg">Excusas</h2>
      <p className="typo-meta mt-1">
        Queda excusado con {mayoriaJueces(puestos.length)} de {puestos.length} jueces.
      </p>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
        {lista.map((item) => (
          <li key={item.id} className="bg-surface px-4 py-3">
            <p>
              <span className="font-display text-xl font-semibold text-gold">{item.numero}</span>
              <span className="typo-name ml-2 text-sm">{formatNombre(item.nombre)}</span>
              {item.excusa ? <span className="typo-caption ml-2 text-flag-red">{etiquetaExcusa(item.excusa)}</span> : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {puestos.map((puesto) => {
                const voto = clase.excusasVotos.find((itemVoto) => itemVoto.juezPuesto === puesto && itemVoto.numero === item.numero)
                const codigo = codigos.get(puesto)
                const bloqueado = faseJuez != null && juezFinalizo(clase, puesto, faseJuez)
                return (
                  <label key={puesto} className="typo-caption">
                    {etiquetaJuez(puesto, estilo)}
                    <select
                      aria-label={`Excusa del juez ${etiquetaJuez(puesto, estilo)} para el ${item.numero}`}
                      value={voto?.motivo ?? ''}
                      disabled={!codigo || bloqueado}
                      onChange={(e) => {
                        if (!codigo) return
                        const motivo = (e.target.value || null) as Excusa | null
                        void hacer(() => pistaExcusaVoto(codigo, clase.id, item.numero!, motivo))
                      }}
                      className="mt-1 block rounded-[8px] border border-border bg-bg px-2 py-2 text-ink"
                    >
                      <option value="">No excusar</option>
                      {EXCUSAS.map((excusa) => (
                        <option key={excusa.value} value={excusa.value}>
                          {excusa.label}
                        </option>
                      ))}
                    </select>
                    {bloqueado && faseJuez ? (
                      <button
                        type="button"
                        className="typo-meta mt-1 block underline"
                        onClick={() => void hacer(() => pistaReabrirVotacion(mesa, clase.id, puesto))}
                      >
                        Reabrir
                      </button>
                    ) : null}
                  </label>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Votacion({
  clase,
  estado,
  estilo,
  codigos,
  mesa,
  hacer,
}: {
  clase: ClasePista
  estado: EstadoPista
  estilo: EstiloJueces
  codigos: Map<number, string>
  mesa: string
  hacer: (accion: () => Promise<void>) => Promise<void>
}) {
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const escogidos = numerados(clase).filter((item) => item.escogido && item.asistio !== false && !item.excusa)
  const lugares = LUGARES_PUESTO.slice(0, Math.min(LUGARES_PUESTO.length, escogidos.length))
  const abierta = clase.fase === 'votacion'
  return (
    <section>
      <h2 className="typo-name text-lg">Votación final</h2>
      <p className="typo-meta mt-1">El número que cada juez puso en cada lugar. Un número no se repite en la misma libreta.</p>
      <div className="mt-3 overflow-x-auto rounded-[12px] border border-border">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="typo-caption">
            <tr className="border-b border-border">
              <th className="px-3 py-2">Lugar</th>
              {puestos.map((puesto) => (
                <th key={puesto} className="px-3 py-2">
                  {nombreJuez(estado, puesto, estilo)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lugares.map((lugar) => (
              <tr key={lugar}>
                <th className="px-3 py-2 text-left">{lugar}.º</th>
                {puestos.map((puesto) => {
                  const actual = clase.votos.find((voto) => voto.juezPuesto === puesto && voto.lugar === lugar)?.numero ?? ''
                  const codigo = codigos.get(puesto)
                  const finalizado = juezFinalizo(clase, puesto, 'votacion')
                  return (
                    <td key={puesto} className="px-3 py-2">
                      <select
                        aria-label={`${lugar}.º del juez ${etiquetaJuez(puesto, estilo)}`}
                        value={actual}
                        disabled={!abierta || finalizado || !codigo}
                        onChange={(e) => {
                          if (!codigo) return
                          const numero = e.target.value ? Number(e.target.value) : null
                          void hacer(() => pistaVotar(codigo, clase.id, lugar, numero))
                        }}
                        className="rounded-[8px] border border-border bg-bg px-2 py-2 text-ink"
                      >
                        <option value="">—</option>
                        {escogidos.map((item) => (
                          <option key={item.numero} value={item.numero ?? ''}>
                            {item.numero}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {abierta ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {puestos.map((puesto) => {
            const codigo = codigos.get(puesto)
            if (!codigo) return null
            const finalizado = juezFinalizo(clase, puesto, 'votacion')
            return finalizado ? (
              <button
                key={puesto}
                type="button"
                className="typo-meta underline"
                onClick={() => void hacer(() => pistaReabrirVotacion(mesa, clase.id, puesto))}
              >
                Reabrir {etiquetaJuez(puesto, estilo)}
              </button>
            ) : (
              <button
                key={puesto}
                type="button"
                className="typo-btn rounded-[10px] border border-gold px-3 py-2 text-gold"
                onClick={() => {
                  if (!window.confirm(`¿Finalizar la votación de ${nombreJuez(estado, puesto, estilo)}?`)) return
                  void hacer(() => pistaFinalizarVotacion(codigo, clase.id))
                }}
              >
                Finalizar {etiquetaJuez(puesto, estilo)}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function Resumen({ clase, estado, estilo }: { clase: ClasePista; estado: EstadoPista; estilo: EstiloJueces }) {
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const lista = numerados(clase)
  return (
    <section>
      <h2 className="typo-name text-lg">Lo capturado</h2>
      <ul className="typo-meta mt-2 space-y-1">
        {lista.map((item) => (
          <li key={item.id}>
            <span className="font-semibold text-ink">{item.numero}</span> {formatNombre(item.nombre)}
            {item.asistio === false ? ' · no asistió' : ''}
            {item.excusa ? ` · ${etiquetaExcusa(item.excusa)}` : ''}
            {item.escogido && item.asistio !== false && !item.excusa ? ' · pasó' : ''}
          </li>
        ))}
      </ul>
      {puestos.length > 0 ? (
        <p className="typo-meta mt-3">
          Votos:{' '}
          {puestos
            .map((puesto) => {
              const lugares = LUGARES_PUESTO.map((lugar) => {
                const numero = clase.votos.find((voto) => voto.juezPuesto === puesto && voto.lugar === lugar)?.numero
                return numero != null ? `${lugar}.º ${numero}` : null
              }).filter(Boolean)
              return `${etiquetaJuez(puesto, estilo)} ${lugares.join(', ') || 'sin votar'}`
            })
            .join(' · ')}
        </p>
      ) : null}
    </section>
  )
}

function Marca({
  activo,
  disabled,
  onClick,
  children,
}: {
  activo: boolean
  disabled?: boolean
  onClick: () => void
  children: string
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

function numerados(clase: ClasePista): EjemplarPista[] {
  return clase.ejemplares.filter((item) => item.numero != null)
}

function nombreJuez(estado: EstadoPista, puesto: number, estilo: EstiloJueces): string {
  const nombre = estado.jueces.find((juez) => juez.puesto === puesto)?.nombre
  const etiqueta = `Juez ${etiquetaJuez(puesto, estilo)}`
  return nombre ? `${etiqueta} · ${formatNombre(nombre)}` : etiqueta
}
