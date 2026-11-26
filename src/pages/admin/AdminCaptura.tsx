import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useParams } from 'react-router-dom'
import { mesesCumplidos } from '../../lib/campeonato'
import { useAuth } from '../../lib/auth-context'
import {
  EXCUSAS,
  FASES,
  MAXIMO_FORMATO_A,
  cargarCompetencia,
  estadoPista,
  etiquetaExcusa,
  etiquetaFase,
  etiquetaJuez,
  faltantesParaFase,
  juezFinalizo,
  mayoriaJueces,
  numerarCategoria,
  pistaAsignarNumeros,
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
import { hojaDeComputo, juezMasCertero, LUGARES_PUESTO, SIN_VOTO } from '../../lib/computo'
import { formatFechaEmision, formatNombre } from '../../lib/format'

type Hacer = (accion: () => Promise<void>) => Promise<boolean>

type PasoBase = {
  clase: ClasePista
  estado: EstadoPista
  estilo: EstiloJueces
  mesa: string
  codigos: Map<number, string>
  hacer: Hacer
}

/** Una persona recorre pre-pista, formato A, mesa técnica y votación de la categoría. */
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

  async function hacer(accion: () => Promise<void>): Promise<boolean> {
    setError(null)
    try {
      await accion()
      await recargar()
      return true
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      return false
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
  const base: PasoBase = { clase, estado, estilo, mesa, codigos: codigosJuez, hacer }
  const otra = estado.clases.find(
    (item) => item.id === estado.claseActiva && item.id !== clase.id && item.fase !== 'cerrada',
  )

  return (
    <div className="space-y-8">
      <div>
        <Link to={`/admin/competencias/${id}`} className="typo-meta font-medium text-gold hover:text-gold-soft">
          ← {estado.competencia.nombre}
        </Link>
        <p className="typo-eyebrow mt-4">Captura manual</p>
        <h1 className="typo-page mt-2">{clase.categoria}</h1>
        <p className="typo-lead mt-2">
          Una sola persona recorre la categoría: pre-pista, formato A si aplica, quién pasa, las excusas, la votación y
          el cierre de la mesa.
        </p>
        {error ? <p className="typo-meta mt-3 text-flag-red">{error}</p> : null}
      </div>

      {clase.fase === 'inscripcion' ? (
        <PasoAbrir {...base} />
      ) : !enPista && clase.fase === 'cerrada' ? (
        <PasoCierre {...base} />
      ) : !enPista && clase.fase === 'prepista' ? (
        <PasoSacar {...base} otra={otra?.categoria ?? null} />
      ) : !enPista ? (
        <PasoRetomar {...base} otra={otra?.categoria ?? null} />
      ) : (
        <Flujo {...base} bloqueo={bloqueo} onBloqueo={setBloqueo} />
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

function PasoAbrir({ clase, estado, hacer }: PasoBase) {
  const lista = [...clase.ejemplares]
  return (
    <section className="space-y-4">
      <Encabezado
        titulo="Abrir la categoría"
        texto="Se cierra la inscripción y se numera: el ejemplar más adulto lleva el 1. Después se saca a pista y se recorre el resto aquí mismo."
      />
      <ListaEjemplares estado={estado} lista={lista} />
      <button
        type="button"
        className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg"
        onClick={() => {
          if (!window.confirm(`¿Cerrar la inscripción de ${clase.categoria} y numerarla? El más adulto lleva el 1.`)) return
          void hacer(() => numerarCategoria(clase.id))
        }}
      >
        Cerrar y numerar
      </button>
    </section>
  )
}

function PasoSacar({ clase, estado, mesa, hacer, otra }: PasoBase & { otra: string | null }) {
  const [preguntar, setPreguntar] = useState(false)
  const sinNumero = clase.ejemplares.filter((item) => item.numero == null)
  return (
    <section className="space-y-4">
      <Encabezado
        titulo="Sacar a pista"
        texto="Diga si esta categoría lleva Formato A. Sin Formato A, los confirmados en pre-pista pasan directo al recorrido individual."
      />
      {otra ? (
        <p className="typo-meta text-flag-red">{otra} sigue en pista. Finalícela antes de sacar esta categoría.</p>
      ) : null}
      <ListaEjemplares estado={estado} lista={clase.ejemplares} />
      {sinNumero.length > 0 ? (
        <button
          type="button"
          className="typo-meta underline"
          onClick={() => void hacer(() => numerarCategoria(clase.id))}
        >
          Numerar los {sinNumero.length} inscritos sin número
        </button>
      ) : null}
      <button
        type="button"
        className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg"
        onClick={() => setPreguntar(true)}
      >
        Sacar a pista
      </button>
      {preguntar ? (
        <div role="alertdialog" className="rounded-[12px] border border-gold bg-surface p-4">
          <p className="typo-name text-base">¿{clase.categoria} lleva Formato A?</p>
          <p className="typo-meta mt-1">Si se equivoca, lo puede cambiar después mientras no haya votos.</p>
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

function PasoRetomar({ clase, mesa, hacer, otra }: PasoBase & { otra: string | null }) {
  return (
    <section className="space-y-4">
      <Encabezado
        titulo={`Retomar · ${etiquetaFase(clase.fase)}`}
        texto="Esta categoría ya avanzó y no está en pista. Vuelva a sacarla para seguir anotando donde quedó."
      />
      {otra ? <p className="typo-meta text-flag-red">Primero finalice {otra}.</p> : null}
      <button
        type="button"
        className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg"
        onClick={() => void hacer(() => pistaElegirClase(mesa, clase.id))}
      >
        Volver a pista
      </button>
    </section>
  )
}

function Flujo({
  bloqueo,
  onBloqueo,
  ...base
}: PasoBase & { bloqueo: string[] | null; onBloqueo: (faltan: string[] | null) => void }) {
  const { clase, estilo } = base
  const fases = fasesDe(clase)
  const puestos = base.estado.jueces.map((juez) => juez.puesto)

  function ir(destino: Fase) {
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
    void base.hacer(() => pistaFase(base.mesa, clase.id, destino))
  }

  const indice = fases.findIndex((fase) => fase.value === clase.fase)
  const siguiente = indice >= 0 ? fases[indice + 1] : undefined

  return (
    <div className="space-y-8">
      <nav aria-label="Pasos de la categoría">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="typo-label">Pasos</p>
          <FormatoToggle {...base} />
        </div>
        <ol className="mt-3 flex flex-wrap gap-2">
          {fases.map((fase, orden) => {
            const activo = fase.value === clase.fase
            const hecho = orden < indice
            return (
              <li key={fase.value}>
                <button
                  type="button"
                  aria-current={activo ? 'step' : undefined}
                  onClick={() => ir(fase.value)}
                  className={[
                    'typo-btn rounded-[10px] border px-3 py-2',
                    activo ? 'border-gold bg-gold text-bg' : hecho ? 'border-gold text-gold' : 'border-border text-ink',
                  ].join(' ')}
                >
                  {orden + 1}. {fase.label}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {bloqueo && bloqueo.length > 0 ? (
        <div role="alert" className="rounded-[12px] border border-gold/60 bg-surface p-4">
          <p className="typo-label">Para seguir falta</p>
          <ul className="typo-meta mt-2 list-disc space-y-1 pl-5">
            {bloqueo.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {clase.fase === 'prepista' ? <PasoPrepista {...base} /> : null}
      {clase.fase === 'formato_a' ? <PasoFormatoA {...base} /> : null}
      {clase.fase === 'individual' ? <PasoRecorrido {...base} /> : null}
      {clase.fase === 'votacion' ? <PasoVotacion {...base} /> : null}
      {clase.fase === 'cerrada' ? <PasoCierre {...base} /> : null}

      {siguiente ? (
        <button type="button" className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg" onClick={() => ir(siguiente.value)}>
          {etiquetaSiguiente(siguiente.value)}
        </button>
      ) : null}
    </div>
  )
}

function FormatoToggle({ clase, mesa, hacer }: PasoBase) {
  const sinVotos = clase.votos.length === 0 && clase.fase !== 'votacion' && clase.fase !== 'cerrada'
  const puedeHabilitar = !clase.conFormatoA && sinVotos
  const puedeQuitar =
    clase.conFormatoA && sinVotos && clase.formatoA.length === 0 && (clase.fase === 'prepista' || clase.fase === 'formato_a')
  return (
    <p className="typo-caption">
      {clase.conFormatoA ? 'Con Formato A' : 'Sin Formato A: pasan todos los confirmados'}
      {puedeHabilitar ? (
        <button
          type="button"
          className="ml-3 underline"
          onClick={() => {
            const texto =
              clase.fase === 'individual'
                ? '¿Habilitar Formato A? La categoría vuelve al Formato A y hay que escoger de nuevo quién pasa.'
                : '¿Habilitar Formato A en esta categoría?'
            if (window.confirm(texto)) void hacer(() => pistaLlevaFormatoA(mesa, clase.id, true))
          }}
        >
          Habilitar Formato A
        </button>
      ) : null}
      {puedeQuitar ? (
        <button
          type="button"
          className="ml-3 underline"
          onClick={() => {
            if (window.confirm('¿Quitar el Formato A? Pasarán todos los confirmados en pre-pista.')) {
              void hacer(() => pistaLlevaFormatoA(mesa, clase.id, false))
            }
          }}
        >
          Quitar Formato A
        </button>
      ) : null}
    </p>
  )
}

function PasoPrepista(base: PasoBase) {
  const { clase, estado, mesa, hacer } = base
  const lista = [...clase.ejemplares].sort((a, b) => (a.numero ?? 9999) - (b.numero ?? 9999))
  const presentes = lista.filter((item) => item.asistio === true).length
  const sinNumero = lista.filter((item) => item.numero == null)
  const sinMontador = lista.some((item) => !item.montador?.trim())
  return (
    <section className="space-y-4">
      <Encabezado
        titulo="Pre-pista"
        texto={
          clase.conFormatoA
            ? 'Ponga el número de cada ejemplar y marque si está confirmado o no asistió. El que no asistió no se puede marcar ni votar.'
            : 'Ponga el número de cada ejemplar y marque la asistencia. Al abrir el recorrido pasan todos los confirmados.'
        }
      />
      <p className="typo-meta">
        {presentes} de {lista.length} confirmados.
        {sinMontador ? ' Sin montador, esa persona no recibe sus puntos.' : ''}
      </p>
      {sinNumero.length > 0 ? (
        <button type="button" className="typo-meta underline" onClick={() => void hacer(() => numerarCategoria(clase.id))}>
          Numerar los {sinNumero.length} inscritos sin número
        </button>
      ) : null}
      <Numeros clase={clase} mesa={mesa} hacer={hacer} />
      <ul className="divide-y divide-border overflow-hidden rounded-[12px] border border-border">
        {lista.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <Numero key={`${item.id}-${item.numero ?? 's'}`} mesa={mesa} clase={clase} item={item} hacer={hacer} />
              <Ficha item={item} fecha={estado.competencia.fecha} />
            </div>
            <div className="flex gap-2">
              <Marca
                activo={item.asistio === true}
                onClick={() => void hacer(() => pistaAsistencia(mesa, item.id!, item.asistio === true ? null : true))}
              >
                Confirmado
              </Marca>
              <Marca
                activo={item.asistio === false}
                onClick={() => void hacer(() => pistaAsistencia(mesa, item.id!, item.asistio === false ? null : false))}
              >
                No asistió
              </Marca>
            </div>
          </li>
        ))}
      </ul>
      <AvisoJueces {...base} />
    </section>
  )
}

function PasoFormatoA(base: PasoBase) {
  const { clase, estado, estilo, codigos, hacer } = base
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const lista = numerados(clase).filter((item) => item.asistio !== false && !item.excusa)
  return (
    <section className="space-y-8">
      <div>
        <Encabezado
          titulo="Formato A"
          texto={`Anote la libreta de cada juez: hasta ${MAXIMO_FORMATO_A} números para el recorrido individual. Al terminar, finalice esa libreta.`}
        />
        <div className="mt-3 overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="typo-caption">
              <tr className="border-b border-border">
                <th className="px-3 py-2">Ejemplar</th>
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
                    <span className="typo-name ml-2 text-sm">{formatNombre(item.nombre)}</span>
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
                          aria-label={`${nombreJuez(estado, puesto, estilo)} marca el ${item.numero}`}
                          checked={marcado}
                          disabled={finalizado || !codigo || (!marcado && propios >= MAXIMO_FORMATO_A)}
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
        <Libretas {...base} fase="formato_a" titulo="formato A" />
      </div>
      {lista.length === 0 ? (
        <p className="typo-meta">No hay ejemplares confirmados. Vuelva al paso Pre-pista y marque la asistencia.</p>
      ) : null}
      <Excusas {...base} />
      <QuienPasa {...base} />
    </section>
  )
}

function PasoRecorrido(base: PasoBase) {
  return (
    <section className="space-y-8">
      <Encabezado
        titulo="Recorrido individual"
        texto="Confirme quién sigue en pista. Si un juez excusa a un ejemplar, anótelo: queda fuera con la mayoría."
      />
      <AvisoJueces {...base} />
      <QuienPasa {...base} />
      <Excusas {...base} />
    </section>
  )
}

function PasoVotacion(base: PasoBase) {
  const { clase, estado, estilo, codigos, hacer } = base
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const escogidos = numerados(clase).filter((item) => item.escogido && item.asistio !== false && !item.excusa)
  const lugares = LUGARES_PUESTO.slice(0, Math.min(LUGARES_PUESTO.length, escogidos.length))
  return (
    <section className="space-y-8">
      <div>
        <Encabezado
          titulo="Votación final"
          texto="Anote el número que cada juez puso en cada lugar. Un número no se repite en la misma libreta: si lo pone en otro lugar, sale del anterior."
        />
        {escogidos.length === 0 ? <p className="typo-meta mt-3">No hay ejemplares en el recorrido.</p> : null}
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
                          aria-label={`${lugar}.º de ${nombreJuez(estado, puesto, estilo)}`}
                          value={actual}
                          disabled={finalizado || !codigo}
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
        <Libretas {...base} fase="votacion" titulo="votación" />
      </div>
      <Excusas {...base} />
    </section>
  )
}

function PasoCierre(base: PasoBase) {
  const { clase, estado, estilo } = base
  const [imprimir, setImprimir] = useState(false)
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const lista = numerados(clase)
  const computo = computoDe(clase, puestos)
  useEffect(() => {
    if (!imprimir) return
    const espera = window.setTimeout(() => window.print(), 100)
    const listo = () => setImprimir(false)
    window.addEventListener('afterprint', listo)
    return () => {
      window.clearTimeout(espera)
      window.removeEventListener('afterprint', listo)
    }
  }, [imprimir])

  return (
    <section className="space-y-6">
      <Encabezado
        titulo="Cierre"
        texto="Hoja de cómputo de la mesa: gana la suma más baja. Imprima el acta para que la firmen los jueces y la mesa técnica."
      />
      <button type="button" className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg" onClick={() => setImprimir(true)}>
        Imprimir acta (PDF)
      </button>
      <p className="typo-meta">En la ventana de impresión puede elegir «Guardar como PDF».</p>
      <Narrador clase={clase} estado={estado} estilo={estilo} computo={computo} />
      <TablaComputo estilo={estilo} computo={computo} puestos={puestos} />
      {computo.length === 0 ? <p className="typo-meta">Todavía no hay ejemplares en el recorrido individual.</p> : null}
      <ul className="typo-meta space-y-1">
        {lista.map((item) => (
          <li key={item.id}>
            <span className="font-semibold text-ink">{item.numero}</span> {formatNombre(item.nombre)}
            {item.montador ? ` · monta ${formatNombre(item.montador)}` : ' · sin montador'}
            {item.asistio === false ? ' · no asistió' : ''}
            {item.excusa ? ` · ${etiquetaExcusa(item.excusa)}` : ''}
            {item.escogido && item.asistio !== false && !item.excusa ? ' · pasó' : ''}
          </li>
        ))}
      </ul>
      {imprimir ? <Acta clase={clase} estado={estado} estilo={estilo} computo={computo} /> : null}
    </section>
  )
}

function QuienPasa({ clase, mesa, hacer }: PasoBase) {
  const lista = numerados(clase).filter((item) => item.asistio !== false && !item.excusa)
  const pasan = numerados(clase)
    .filter((item) => item.escogido && item.asistio !== false && !item.excusa)
    .map((item) => item.numero)
  const puedeMarcar = clase.fase === 'formato_a' || clase.fase === 'individual'
  return (
    <div>
      <h2 className="typo-name text-lg">Pasan al recorrido</h2>
      <p className="typo-caption mt-1">Para el narrador</p>
      <p className="mt-2 font-display text-3xl font-semibold text-gold">{pasan.join(' · ') || '—'}</p>
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
                disabled={!puedeMarcar}
                onChange={(e) => void hacer(() => pistaEscoger(mesa, item.id!, e.target.checked))}
              />
              Pasa
            </label>
          </li>
        ))}
      </ul>
      {clase.conFormatoA && puedeMarcar ? (
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
      ) : null}
      {clase.conFormatoA ? (
        <p className="typo-caption mt-2">Basta con que un juez lo marque en el formato A.</p>
      ) : null}
    </div>
  )
}

function Excusas({ clase, estado, estilo, codigos, hacer }: PasoBase) {
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const lista = numerados(clase).filter((item) => item.asistio !== false)
  const faseJuez = clase.fase === 'votacion' ? 'votacion' : clase.fase === 'formato_a' ? 'formato_a' : null
  if (puestos.length === 0) return null
  return (
    <div>
      <h2 className="typo-name text-lg">Excusas de cada juez</h2>
      <p className="typo-meta mt-1">
        Queda excusado con {mayoriaJueces(puestos.length)} de {puestos.length} jueces.
        {puestos.length % 2 === 0 ? ' Con un número impar (3 o 5) la mayoría es más clara.' : ''}
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
                      aria-label={`Excusa de ${nombreJuez(estado, puesto, estilo)} para el ${item.numero}`}
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
                  </label>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Libretas({ clase, estado, estilo, mesa, codigos, hacer, fase, titulo }: PasoBase & { fase: 'formato_a' | 'votacion'; titulo: string }) {
  const puestos = estado.jueces.map((juez) => juez.puesto)
  if (puestos.length === 0) return <AvisoJueces clase={clase} estado={estado} estilo={estilo} mesa={mesa} codigos={codigos} hacer={hacer} />
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {puestos.map((puesto) => {
        const codigo = codigos.get(puesto)
        const finalizado = juezFinalizo(clase, puesto, fase)
        if (!codigo) {
          return (
            <span key={puesto} className="typo-caption text-flag-red">
              {nombreJuez(estado, puesto, estilo)} no tiene código
            </span>
          )
        }
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
              if (!window.confirm(`¿Finalizar ${titulo} de ${nombreJuez(estado, puesto, estilo)}?`)) return
              void hacer(() => pistaFinalizarVotacion(codigo, clase.id))
            }}
          >
            Finalizar {etiquetaJuez(puesto, estilo)}
          </button>
        )
      })}
    </div>
  )
}

function AvisoJueces({ estado }: PasoBase) {
  if (estado.jueces.length > 0) return null
  return (
    <p className="typo-meta text-flag-red">
      Esta competencia no tiene jueces con código. Créelos en la competencia, en Códigos de acceso, para anotar el
      formato A, las excusas y la votación.
    </p>
  )
}

function Numeros({ clase, mesa, hacer }: { clase: ClasePista; mesa: string; hacer: Hacer }) {
  const [porEdadAbierto, setPorEdadAbierto] = useState(false)
  if (porEdadAbierto) {
    return <RepartirPorEdad clase={clase} mesa={mesa} hacer={hacer} onListo={() => setPorEdadAbierto(false)} />
  }
  return (
    <button type="button" className="typo-meta underline" onClick={() => setPorEdadAbierto(true)}>
      Repartir varios números por edad
    </button>
  )
}

function Numero({ mesa, clase, item, hacer }: { mesa: string; clase: ClasePista; item: EjemplarPista; hacer: Hacer }) {
  const [texto, setTexto] = useState(String(item.numero ?? ''))
  return (
    <input
      aria-label={`Número de ${item.nombre ?? item.numero}`}
      inputMode="numeric"
      value={texto}
      onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onBlur={() => {
        const numero = Number(texto)
        if (!numero || numero === item.numero || !item.id) {
          setTexto(String(item.numero ?? ''))
          return
        }
        const ocupado = clase.ejemplares.find((otro) => otro.id !== item.id && otro.numero === numero)
        if (ocupado) {
          const aviso =
            item.numero != null
              ? `El ${numero} lo tiene ${formatNombre(ocupado.nombre)}. ¿Intercambiar? Se queda con el ${item.numero}.`
              : `El ${numero} lo tiene ${formatNombre(ocupado.nombre)}. ¿Quitárselo? Se queda sin número.`
          if (!window.confirm(aviso)) {
            setTexto(String(item.numero ?? ''))
            return
          }
        }
        void hacer(() => pistaNumeroEjemplar(mesa, clase.id, item.id!, numero)).then((guardo) => {
          if (!guardo) setTexto(String(item.numero ?? ''))
        })
      }}
      className="w-14 rounded-[8px] border border-border bg-bg px-2 py-1 text-center font-display text-xl font-semibold text-gold"
    />
  )
}

function RepartirPorEdad({
  clase,
  mesa,
  hacer,
  onListo,
}: {
  clase: ClasePista
  mesa: string
  hacer: Hacer
  onListo: () => void
}) {
  const [texto, setTexto] = useState('')
  const ordenados = [...clase.ejemplares].sort(porEdad)
  const numeros = leerNumeros(texto)
  const faltan = ordenados.length - numeros.length
  return (
    <div className="rounded-[12px] border border-gold/60 bg-surface p-4">
      <p className="typo-name text-base">Números por edad</p>
      <p className="typo-meta mt-1">
        Escriba los {ordenados.length} números, separados por coma (también vale un rango, por ejemplo 20-25). El menor
        va al ejemplar más adulto.
      </p>
      <input
        aria-label="Números disponibles"
        inputMode="numeric"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ej.: 7, 12, 15"
        className="mt-3 w-full rounded-[10px] border border-border bg-bg px-3 py-3 text-ink"
      />
      <ul className="mt-3 divide-y divide-border rounded-[10px] border border-border">
        {ordenados.map((item, indice) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2">
            <span className="w-10 text-center font-display text-xl font-semibold text-gold">{numeros[indice] ?? '—'}</span>
            <span className="typo-name text-sm">{formatNombre(item.nombre)}</span>
          </li>
        ))}
      </ul>
      <p className="typo-meta mt-2">
        {faltan > 0 ? `Faltan ${faltan} números.` : faltan < 0 ? `Sobran ${-faltan} números.` : 'Listo para guardar.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={faltan !== 0}
          className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg disabled:opacity-50"
          onClick={() => {
            if (!window.confirm(`¿Guardar los números ${numeros.join(', ')}?`)) return
            void hacer(async () => {
              await pistaAsignarNumeros(mesa, clase.id, numeros)
              onListo()
            })
          }}
        >
          Guardar números
        </button>
        <button type="button" className="typo-btn rounded-[10px] border border-border px-4 py-2" onClick={onListo}>
          Volver a uno por uno
        </button>
      </div>
    </div>
  )
}

function ListaEjemplares({ lista, estado }: { estado: EstadoPista; lista: EjemplarPista[] }) {
  if (lista.length === 0) return <p className="typo-meta">Todavía no hay ejemplares en esta categoría.</p>
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[12px] border border-border">
      {lista.map((item) => (
        <li key={item.id ?? item.nombre} className="flex items-center gap-3 bg-surface px-4 py-3">
          <span className="w-10 text-center font-display text-2xl font-semibold text-gold">{item.numero ?? '—'}</span>
          <Ficha item={item} fecha={estado.competencia.fecha} />
        </li>
      ))}
    </ul>
  )
}

function Ficha({ item, fecha }: { item: EjemplarPista; fecha: string }) {
  const meses = mesesCumplidos(item.nacimiento, fecha)
  const linea = [
    meses != null ? `${meses} meses` : null,
    item.montador ? `monta ${formatNombre(item.montador)}` : 'sin montador',
    item.propietario ? formatNombre(item.propietario) : null,
    item.registro ? `registro ${item.registro}` : null,
  ].filter(Boolean)
  return (
    <div>
      <span className="typo-name block text-sm">{formatNombre(item.nombre)}</span>
      <span className="typo-meta block">{linea.join(' · ')}</span>
    </div>
  )
}

function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h2 className="typo-name text-lg">{titulo}</h2>
      <p className="typo-meta mt-1">{texto}</p>
    </div>
  )
}

function Marca({ activo, disabled, onClick, children }: { activo: boolean; disabled?: boolean; onClick: () => void; children: string }) {
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

function Narrador({
  clase,
  estado,
  estilo,
  computo,
  impresa,
}: {
  clase: ClasePista
  estado: EstadoPista
  estilo: EstiloJueces
  computo: ReturnType<typeof hojaDeComputo>
  impresa?: boolean
}) {
  const puestos = estado.jueces.map((juez) => juez.puesto)
  const listo =
    clase.fase === 'cerrada' ||
    (clase.fase === 'votacion' && puestos.length > 0 && puestos.every((puesto) => juezFinalizo(clase, puesto, 'votacion')))
  if (!listo) return null
  const votos = clase.votos.map((voto) => ({ juezPuesto: voto.juezPuesto, lugar: voto.lugar, ejemplarNumero: voto.numero }))
  const { porJuez, ganadores } = juezMasCertero(computo, puestos, votos)
  if (ganadores.length === 0) return null
  const aciertos = porJuez.find((juez) => juez.juezPuesto === ganadores[0])?.aciertos ?? 0
  const titulo =
    ganadores.length === 1
      ? `Narra los lugares: ${nombreJuez(estado, ganadores[0], estilo)}`
      : `Empate entre ${ganadores.map((puesto) => nombreJuez(estado, puesto, estilo)).join(' y ')}: ellos deciden quién narra`
  return (
    <div className={impresa ? 'mt-3 text-sm' : 'rounded-[12px] border border-gold/60 bg-surface p-4'}>
      <p className={impresa ? 'font-semibold' : 'typo-label'}>Juez más certero</p>
      <p className={impresa ? '' : 'typo-name mt-1 text-base text-gold'}>
        {titulo} ({aciertos} {aciertos === 1 ? 'acierto' : 'aciertos'}).
      </p>
    </div>
  )
}

function TablaComputo({
  computo,
  puestos,
  estilo,
  impresa,
}: {
  computo: ReturnType<typeof hojaDeComputo>
  puestos: number[]
  estilo: EstiloJueces
  impresa?: boolean
}) {
  const celda = impresa ? CELDA : 'px-3 py-2'
  return (
    <div className={impresa ? 'mt-2' : 'overflow-x-auto rounded-[12px] border border-border'}>
      <table className={impresa ? 'w-full border-collapse text-center text-sm' : 'w-full min-w-[28rem] text-center text-sm'}>
        <thead className={impresa ? '' : 'typo-caption'}>
          <tr className={impresa ? '' : 'border-b border-border'}>
            <th className={`${celda} text-left`}>No.</th>
            {puestos.map((puesto) => (
              <th key={puesto} className={celda}>
                J{etiquetaJuez(puesto, estilo)}
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
              {fila.porJuez.map((nota, indice) => (
                <td key={indice} className={celda}>
                  {nota ?? (fila.total != null ? SIN_VOTO : '')}
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

const CELDA = 'border border-black px-2 py-1'

function Acta({
  clase,
  estado,
  estilo,
  computo,
}: {
  clase: ClasePista
  estado: EstadoPista
  estilo: EstiloJueces
  computo: ReturnType<typeof hojaDeComputo>
}) {
  const lista = numerados(clase)
  const puestos = estado.jueces.map((juez) => juez.puesto)
  return createPortal(
    <>
      <style>{'@media print { body > *:not(#acta-captura) { display: none !important; } }'}</style>
      <div id="acta-captura" className="hidden bg-white p-6 text-black print:block">
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
              {['No.', 'Caballo', 'Propietario', 'Montador', 'Pre-pista', 'Formato A', 'Pasa', 'Excusa'].map((columna) => (
                <th key={columna} className={CELDA}>
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((item) => (
              <tr key={item.id}>
                <td className={CELDA}>{item.numero}</td>
                <td className={CELDA}>{formatNombre(item.nombre)}</td>
                <td className={CELDA}>{formatNombre(item.propietario)}</td>
                <td className={CELDA}>{formatNombre(item.montador)}</td>
                <td className={CELDA}>{item.asistio === true ? 'Confirmado' : item.asistio === false ? 'No asistió' : '—'}</td>
                <td className={CELDA}>{clase.formatoA.filter((marca) => marca.numero === item.numero).length || '—'}</td>
                <td className={CELDA}>{item.escogido && !item.excusa ? 'Sí' : ''}</td>
                <td className={CELDA}>{item.excusa ? etiquetaExcusa(item.excusa) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="mt-6 text-base font-bold">Votación final</h2>
        <table className="mt-2 w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              <th className={CELDA}>Lugar</th>
              {puestos.map((puesto) => (
                <th key={puesto} className={CELDA}>
                  {nombreJuez(estado, puesto, estilo)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LUGARES_PUESTO.map((lugar) => (
              <tr key={lugar}>
                <th className={CELDA}>{lugar}.º</th>
                {puestos.map((puesto) => (
                  <td key={puesto} className={CELDA}>
                    {clase.votos.find((voto) => voto.juezPuesto === puesto && voto.lugar === lugar)?.numero ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <h2 className="mt-6 text-base font-bold">Hoja de cómputo</h2>
        <TablaComputo estilo={estilo} computo={computo} puestos={puestos} impresa />
        <Narrador clase={clase} estado={estado} estilo={estilo} computo={computo} impresa />
        <h2 className="mt-8 text-base font-bold">Firmas</h2>
        <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-12 text-sm">
          {puestos.map((puesto) => (
            <div key={puesto} className="border-t border-black pt-1">
              {nombreJuez(estado, puesto, estilo)}
            </div>
          ))}
          <div className="border-t border-black pt-1">Mesa técnica</div>
        </div>
      </div>
    </>,
    document.body,
  )
}

function fasesDe(clase: ClasePista) {
  return FASES.filter((fase) => fase.value !== 'inscripcion' && (clase.conFormatoA || fase.value !== 'formato_a'))
}

function etiquetaSiguiente(fase: Fase): string {
  if (fase === 'formato_a') return 'Seguir al Formato A'
  if (fase === 'individual') return 'Abrir el recorrido individual'
  if (fase === 'votacion') return 'Abrir la votación final'
  if (fase === 'cerrada') return 'Finalizar categoría'
  return `Abrir ${etiquetaFase(fase)}`
}

function numerados(clase: ClasePista): EjemplarPista[] {
  return clase.ejemplares.filter((item) => item.numero != null)
}

function computoDe(clase: ClasePista, puestos: number[]) {
  return hojaDeComputo(
    numerados(clase).map((item) => ({
      numero: item.numero!,
      nombre: item.nombre ?? '',
      escogido: item.escogido && !item.excusa,
    })),
    puestos,
    clase.votos.map((voto) => ({ juezPuesto: voto.juezPuesto, lugar: voto.lugar, ejemplarNumero: voto.numero })),
  ).sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99) || a.numero - b.numero)
}

function nombreJuez(estado: EstadoPista, puesto: number, estilo: EstiloJueces): string {
  const nombre = estado.jueces.find((juez) => juez.puesto === puesto)?.nombre
  const etiqueta = `Juez ${etiquetaJuez(puesto, estilo)}`
  return nombre ? `${etiqueta} · ${formatNombre(nombre)}` : etiqueta
}

function porEdad(a: EjemplarPista, b: EjemplarPista): number {
  if (a.nacimiento !== b.nacimiento) {
    if (!a.nacimiento) return 1
    if (!b.nacimiento) return -1
    return a.nacimiento < b.nacimiento ? -1 : 1
  }
  const na = a.nombre ?? ''
  const nb = b.nombre ?? ''
  if (na !== nb) return na < nb ? -1 : 1
  return (a.id ?? '') < (b.id ?? '') ? -1 : 1
}

function leerNumeros(texto: string): number[] {
  const numeros = new Set<number>()
  for (const parte of texto.split(/[\s,;]+/)) {
    const rango = parte.match(/^(\d+)-(\d+)$/)
    if (rango) {
      const desde = Number(rango[1])
      const hasta = Number(rango[2])
      for (let n = Math.min(desde, hasta); n <= Math.max(desde, hasta) && numeros.size < 500; n++) numeros.add(n)
    } else if (/^\d+$/.test(parte)) {
      numeros.add(Number(parte))
    }
  }
  return [...numeros].filter((n) => n > 0).sort((a, b) => a - b)
}
