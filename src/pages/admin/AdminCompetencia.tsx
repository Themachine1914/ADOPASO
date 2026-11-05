import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AyudaGuia } from '../../components/AyudaGuia'
import type { BuscaLista } from '../../admin/categorias'
import { useAuth } from '../../lib/auth-context'
import {
  borrarAcceso,
  buscarCaballos,
  cambiarMontador,
  cargarCompetencia,
  categoriasDelCaballo,
  crearAcceso,
  eliminarCompetencia,
  enlaceAcceso,
  enlaceWhatsApp,
  etiquetaAcceso,
  etiquetaFase,
  finalizarCompetencia,
  inscribir,
  listarCatalogoCategorias,
  marcarPagado,
  montadorRepetido,
  moverInscripcion,
  numerarCompetencia,
  quitarInscripcion,
  ultimoGrupo,
  type CaballoInscribible,
  type CategoriaCatalogo,
  type ClaseCompetencia,
  type DetalleCompetencia,
  type Inscripcion as InscripcionCompetencia,
  type UltimoGrupo,
} from '../../lib/competencia'
import { formatFechaEmision, formatNombre } from '../../lib/format'
import { listarJueces, type JuezCatalogo } from '../../lib/juzgamiento'
import { ResultadosCompetencia } from './ResultadosCompetencia'
import { SelectorBusqueda } from './SelectorBusqueda'

/** El ranking agrupa a las personas por nombre, así que del montador se guarda el nombre. */
const MONTADORES: BuscaLista = { tabla: 'montadores', valor: 'nombre', etiqueta: 'nombre' }

export function AdminCompetencia() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [detalle, setDetalle] = useState<DetalleCompetencia | null>(null)
  const [catalogo, setCatalogo] = useState<CategoriaCatalogo[]>([])
  const [jueces, setJueces] = useState<JuezCatalogo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)

  async function recargar() {
    setDetalle(await cargarCompetencia(id))
  }

  async function hacer(accion: () => Promise<void>) {
    setError(null)
    try {
      await accion()
      await recargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  useEffect(() => {
    if (perfil?.rol !== 'admin' || !id) return
    let vigente = true
    setCargando(true)
    Promise.all([cargarCompetencia(id), listarCatalogoCategorias(), listarJueces()])
      .then(([datos, categorias, catalogoJueces]) => {
        if (!vigente) return
        setDetalle(datos)
        setCatalogo(categorias)
        setJueces(catalogoJueces)
      })
      .catch((err: Error) => {
        if (vigente) setError(err.message)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [id, perfil?.rol])

  if (perfil?.rol !== 'admin') return <Navigate to="/admin" replace />
  if (cargando) return <p className="typo-meta">Cargando la competencia…</p>
  if (!detalle) return <p className="typo-meta">{error ?? 'Esta competencia no existe.'}</p>

  const { competencia, clases } = detalle
  const inscritos = clases.reduce((suma, clase) => suma + clase.inscritos.length, 0)
  const sinNumero = clases.some((clase) => clase.inscritos.some((item) => item.numero == null))
  const finalizada = competencia.estado === 'finalizada'

  return (
    <div className="space-y-10">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/competencias" className="typo-meta font-medium text-gold hover:text-gold-soft">
            ← Competencias
          </Link>
          <AyudaGuia id="competencias-en-vivo" />
        </div>
        <p className="typo-eyebrow mt-4">Competencia</p>
        <h1 className="typo-page mt-2">{competencia.nombre}</h1>
        <p className="typo-lead mt-2">
          {formatFechaEmision(competencia.fecha)}
          {competencia.lugar ? ` · ${competencia.lugar}` : ''} · {inscritos} inscripciones en {clases.length} categorías
        </p>
        {competencia.simulacion ? (
          <p className="typo-meta mt-3 rounded-[10px] border border-gold/60 px-3 py-2">
            Esta es una simulación, no una competencia oficial.{' '}
            <Link to={`/admin/competencias/${competencia.id}/simulacion`} className="font-medium text-gold underline">
              Ir al ensayo
            </Link>
          </p>
        ) : null}
        {error ? <p className="typo-meta mt-3 text-flag-red">{error}</p> : null}
      </div>

      {!finalizada ? (
        <Inscripcion
          fecha={competencia.fecha}
          catalogo={catalogo}
          clases={clases}
          onInscribir={(categoria, caballo, pagado, montador) =>
            hacer(() => inscribir(competencia.id, categoria, caballo, pagado, montador))
          }
        />
      ) : null}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="typo-section">Categorías e inscritos</h2>
            <p className="typo-meta mt-1">
              Al cerrar la inscripción cada categoría se numera: el más adulto lleva el 1 y el más joven el número más alto.
            </p>
          </div>
          {!finalizada && inscritos > 0 ? (
            <button
              type="button"
              className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg"
              onClick={() => {
                const texto = sinNumero
                  ? '¿Cerrar la inscripción y numerar todas las categorías?'
                  : '¿Volver a numerar? Los números actuales cambiarán.'
                if (window.confirm(texto)) void hacer(() => numerarCompetencia(competencia.id))
              }}
            >
              {sinNumero ? 'Cerrar inscripción y numerar' : 'Volver a numerar'}
            </button>
          ) : null}
        </div>

        {clases.length === 0 ? (
          <p className="typo-meta mt-4">Todavía no hay caballos inscritos.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {clases.map((clase) => (
              <div key={clase.id} className="overflow-hidden rounded-[12px] border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3">
                  <p className="typo-name text-base">{clase.categoria}</p>
                  <div className="flex items-center gap-3">
                    <span className="typo-caption text-gold">{etiquetaFase(clase.fase)}</span>
                    <Link to={`/admin/juzgamiento/${clase.id}`} className="typo-meta underline">
                      Libretas y cómputo
                    </Link>
                  </div>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="typo-caption">
                    <tr className="border-b border-border">
                      <th className="px-4 py-2">No.</th>
                      <th className="px-4 py-2">Caballo</th>
                      <th className="hidden px-4 py-2 sm:table-cell">Propietario</th>
                      <th className="px-4 py-2">Montador</th>
                      <th className="px-4 py-2">Pagó</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clase.inscritos.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-semibold">{item.numero ?? '—'}</td>
                        <td className="px-4 py-2">
                          {formatNombre(item.nombre)}
                          <span className="typo-meta block">
                            {item.caballoCodigo}
                            {item.nacimiento ? ` · nació ${item.nacimiento}` : ' · sin fecha de nacimiento'}
                          </span>
                        </td>
                        <td className="hidden px-4 py-2 sm:table-cell">{formatNombre(item.propietario)}</td>
                        <td className="px-4 py-2">
                          {item.montador ? (
                            formatNombre(item.montador)
                          ) : (
                            <span className="text-flag-red">Sin montador</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Pagó ${item.nombre}`}
                            checked={item.pagado}
                            disabled={finalizada}
                            onChange={(e) => void hacer(() => marcarPagado(item.id, e.target.checked))}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          {!finalizada ? (
                            <button
                              type="button"
                              className="typo-meta mr-3 underline"
                              onClick={() => setEditando(editando === item.id ? null : item.id)}
                            >
                              Editar
                            </button>
                          ) : null}
                          {clase.fase === 'inscripcion' || clase.fase === 'prepista' ? (
                            <button
                              type="button"
                              className="typo-meta underline"
                              onClick={() => {
                                if (window.confirm(`¿Quitar a ${item.nombre} de esta categoría?`)) {
                                  void hacer(() => quitarInscripcion(item.id))
                                }
                              }}
                            >
                              Quitar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )).flatMap((fila, indice) => {
                      const item = clase.inscritos[indice]
                      if (editando !== item.id) return [fila]
                      return [
                        fila,
                        <tr key={`${item.id}-editar`}>
                          <td colSpan={6} className="bg-bg/40 px-4 py-4">
                            <EditarInscripcion
                              item={item}
                              clase={clase}
                              clases={clases}
                              fecha={competencia.fecha}
                              catalogo={catalogo}
                              onCancelar={() => setEditando(null)}
                              onGuardar={async (cambio) => {
                                await hacer(async () => {
                                  if (cambio.categoria) {
                                    await moverInscripcion(competencia.id, item.id, cambio.categoria, item.nombre)
                                  }
                                  if (cambio.montador !== item.montador) await cambiarMontador(item.id, cambio.montador)
                                  if (cambio.pagado !== item.pagado) await marcarPagado(item.id, cambio.pagado)
                                })
                                setEditando(null)
                              }}
                            />
                          </td>
                        </tr>,
                      ]
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      <ResultadosCompetencia competencia={competencia} onCambio={recargar} />

      <Accesos
        detalle={detalle}
        jueces={jueces}
        onCrear={(acceso) => hacer(() => crearAcceso(competencia.id, acceso))}
        onBorrar={(codigo) => hacer(() => borrarAcceso(codigo))}
      />

      <section className="flex flex-wrap gap-3 border-t border-border pt-6">
        {!finalizada ? (
          <button
            type="button"
            className="typo-btn rounded-[10px] border border-border px-4 py-2.5"
            onClick={() => {
              if (window.confirm('¿Finalizar la competencia? Los códigos de acceso dejarán de funcionar.')) {
                void hacer(() => finalizarCompetencia(competencia.id))
              }
            }}
          >
            Finalizar competencia
          </button>
        ) : (
          <p className="typo-meta">Competencia finalizada. Los códigos ya no funcionan.</p>
        )}
        {/* Una competencia ya sincronizada no se borra: primero hay que deshacer la sincronización. */}
        {!competencia.sincronizadoEn ? (
          <button
            type="button"
            className="typo-meta text-muted underline"
            onClick={async () => {
              if (!window.confirm('¿Eliminar la competencia con sus inscripciones y votaciones?')) return
              await eliminarCompetencia(competencia.id)
              navigate('/admin/competencias')
            }}
          >
            Eliminar competencia
          </button>
        ) : null}
      </section>
    </div>
  )
}

function Inscripcion({
  fecha,
  catalogo,
  clases,
  onInscribir,
}: {
  fecha: string
  catalogo: CategoriaCatalogo[]
  clases: ClaseCompetencia[]
  onInscribir: (
    categoria: CategoriaCatalogo,
    caballo: CaballoInscribible,
    pagado: boolean,
    montador: string | null,
  ) => Promise<void>
}) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<CaballoInscribible[]>([])
  const [caballo, setCaballo] = useState<CaballoInscribible | null>(null)
  const [pagado, setPagado] = useState(false)
  const [verTodas, setVerTodas] = useState(false)
  const [montador, setMontador] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<UltimoGrupo | null>(null)

  // Último grupo en que compitió: se sugiere esa modalidad con la categoría de su edad de hoy.
  useEffect(() => {
    setUltimo(null)
    if (!caballo) return
    let vigente = true
    ultimoGrupo(caballo.codigo)
      .then((grupo) => {
        if (vigente) setUltimo(grupo)
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [caballo])

  useEffect(() => {
    let vigente = true
    const espera = window.setTimeout(() => {
      buscarCaballos(busqueda)
        .then((filas) => {
          if (vigente) setResultados(filas)
        })
        .catch(() => {
          if (vigente) setResultados([])
        })
    }, 250)
    return () => {
      vigente = false
      window.clearTimeout(espera)
    }
  }, [busqueda])

  const { meses, sugerencias } = useMemo(
    () =>
      caballo
        ? categoriasDelCaballo(caballo, fecha, catalogo, ultimo?.modalidad ?? null)
        : { meses: null, sugerencias: [] },
    [caballo, fecha, catalogo, ultimo],
  )
  const recomendadas = sugerencias.filter((s) => s.recomendada)
  const visibles = verTodas || recomendadas.length === 0 ? sugerencias : recomendadas

  return (
    <section className="rounded-[12px] border border-border bg-surface p-5">
      <h2 className="typo-section">Inscribir un caballo</h2>
      <label className="mt-4 block">
        <span className="typo-label">Buscar por nombre o registro</span>
        <input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setCaballo(null)
            setAviso(null)
          }}
          placeholder="Ej.: Bandolero"
          className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
        />
      </label>

      {!caballo && resultados.length > 0 ? (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-[10px] border border-border">
          {resultados.map((item) => (
            <li key={item.codigo}>
              <button
                type="button"
                className="block w-full bg-bg/40 px-4 py-2 text-left hover:bg-surface-elevated"
                onClick={() => {
                  setCaballo(item)
                  setVerTodas(false)
                  setPagado(false)
                  setMontador(null)
                }}
              >
                <span className="typo-name text-sm">{formatNombre(item.nombre)}</span>
                <span className="typo-meta block">
                  {item.codigo} · {item.sexo === 'H' ? 'Hembra' : item.sexo === 'M' ? 'Macho' : 'Sin sexo'}
                  {item.modalidad ? ` · ${item.modalidad}` : ''}
                  {item.propietario ? ` · ${formatNombre(item.propietario)}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {caballo ? (
        <div className="mt-4 rounded-[10px] border border-border bg-bg/40 p-4">
          <p className="typo-name text-base">{formatNombre(caballo.nombre)}</p>
          <p className="typo-meta mt-1">
            {caballo.codigo}
            {caballo.modalidad ? ` · ${caballo.modalidad}` : ''}
            {meses != null ? ` · ${meses} meses el día de la competencia` : ''}
          </p>
          {ultimo ? (
            <p className="typo-meta mt-1">
              Último grupo en que compitió: {ultimo.categoria}
              {ultimo.fecha ? ` (${formatFechaEmision(ultimo.fecha)})` : ''}.
            </p>
          ) : null}

          {meses == null ? (
            <p className="typo-meta mt-3 text-flag-red">
              Este caballo no tiene fecha de nacimiento en el registro. Complétela antes de inscribirlo.
            </p>
          ) : sugerencias.length === 0 ? (
            <p className="typo-meta mt-3 text-flag-red">Ninguna categoría corresponde a su sexo y edad.</p>
          ) : (
            <>
              <div className="mt-4 max-w-sm">
                <span className="typo-label">Montador</span>
                <SelectorBusqueda
                  busca={MONTADORES}
                  valor={montador ?? ''}
                  etiqueta={formatNombre(montador)}
                  onElegir={(opcion) => setMontador(opcion?.valor ?? null)}
                />
              </div>
              <label className="typo-meta mt-4 flex items-center gap-2">
                <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />
                Pagó la inscripción
              </label>
              <p className="typo-label mt-4">Categoría</p>
              <ul className="mt-2 space-y-2">
                {visibles.map(({ categoria, recomendada, ultimoGrupo: delUltimo }, indice) => (
                  <li
                    key={categoria.codigo}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2"
                  >
                    <span className="text-sm">
                      {categoria.nombre}
                      {delUltimo && indice === 0 ? <span className="typo-caption ml-2 text-gold">Sugerida</span> : null}
                      {!recomendada ? <span className="typo-meta"> · otra modalidad</span> : null}
                    </span>
                    <button
                      type="button"
                      className="typo-btn rounded-[10px] bg-gold px-3 py-1.5 text-bg"
                      onClick={async () => {
                        setAviso(null)
                        const otro = montadorRepetido(clases, categoria.codigo, montador)
                        if (
                          otro &&
                          !window.confirm(
                            `${formatNombre(montador)} ya monta a ${formatNombre(otro.nombre)} en ${categoria.nombre}. Un montador no puede llevar dos caballos en la misma categoría. ¿Inscribir de todas formas?`,
                          )
                        ) {
                          return
                        }
                        try {
                          await onInscribir(categoria, caballo, pagado, montador)
                          setAviso(`${formatNombre(caballo.nombre)} quedó inscrito en ${categoria.nombre}.`)
                          setCaballo(null)
                          setBusqueda('')
                        } catch (err) {
                          setAviso(err instanceof Error ? err.message : 'No se pudo inscribir.')
                        }
                      }}
                    >
                      Registrar
                    </button>
                  </li>
                ))}
              </ul>
              {recomendadas.length > 0 && recomendadas.length < sugerencias.length ? (
                <button type="button" className="typo-meta mt-2 underline" onClick={() => setVerTodas(!verTodas)}>
                  {verTodas ? 'Ver solo las de su modalidad' : 'Ver categorías de otras modalidades'}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {aviso ? <p className="typo-meta mt-3">{aviso}</p> : null}
    </section>
  )
}

function Accesos({
  detalle,
  jueces,
  onCrear,
  onBorrar,
}: {
  detalle: DetalleCompetencia
  jueces: JuezCatalogo[]
  onCrear: (acceso: { rol: 'juez' | 'prepista' | 'mesa'; juezPuesto?: number; juezCodigo?: number; nombre?: string }) => Promise<void>
  onBorrar: (codigo: string) => Promise<void>
}) {
  const [juezCodigo, setJuezCodigo] = useState('')
  const { accesos } = detalle
  const tiene = (rol: string) => accesos.some((a) => a.rol === rol)
  const puestoLibre = [1, 2, 3, 4, 5].find((puesto) => !accesos.some((a) => a.rol === 'juez' && a.juezPuesto === puesto))

  return (
    <section>
      <h2 className="typo-section">Códigos de acceso</h2>
      <p className="typo-meta mt-1">
        Cada persona abre el enlace en su celular o tablet, o entra a /pista y escribe el código. No necesita cuenta.
        Los jueces solo ven números, nunca nombres.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {!tiene('mesa') ? (
          <button type="button" className="typo-btn rounded-[10px] border border-border px-3 py-2" onClick={() => void onCrear({ rol: 'mesa' })}>
            + Mesa técnica
          </button>
        ) : null}
        {!tiene('prepista') ? (
          <button type="button" className="typo-btn rounded-[10px] border border-border px-3 py-2" onClick={() => void onCrear({ rol: 'prepista' })}>
            + Pre-pista
          </button>
        ) : null}
        {puestoLibre ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Juez"
              value={juezCodigo}
              onChange={(e) => setJuezCodigo(e.target.value)}
              className="rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
            >
              <option value="">Elegir juez…</option>
              {jueces.map((juez) => (
                <option key={juez.codigo} value={juez.codigo}>
                  {formatNombre(juez.nombre)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!juezCodigo}
              className="typo-btn rounded-[10px] border border-border px-3 py-2 disabled:opacity-50"
              onClick={() => {
                const juez = jueces.find((j) => String(j.codigo) === juezCodigo)
                if (!juez) return
                void onCrear({ rol: 'juez', juezPuesto: puestoLibre, juezCodigo: juez.codigo, nombre: juez.nombre }).then(() =>
                  setJuezCodigo(''),
                )
              }}
            >
              + Juez {puestoLibre}
            </button>
          </div>
        ) : null}
      </div>

      {accesos.filter((a) => a.rol === 'juez').length % 2 === 0 && accesos.some((a) => a.rol === 'juez') ? (
        <p className="typo-meta mt-3 text-flag-red">
          Hay un número par de jueces. Para excusar hace falta la mayoría, así que conviene que sean 3 o 5.
        </p>
      ) : null}

      {accesos.length > 0 ? (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
          {accesos.map((acceso) => (
            <li key={acceso.codigo} className="flex flex-wrap items-center justify-between gap-3 bg-bg/40 px-4 py-3">
              <div>
                <p className="typo-name text-sm">
                  {etiquetaAcceso(acceso.rol, acceso.juezPuesto)}
                  {acceso.nombre ? ` · ${formatNombre(acceso.nombre)}` : ''}
                </p>
                <p className="mt-1 font-mono text-lg tracking-[0.2em] text-gold">{acceso.codigo}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="typo-meta underline"
                  onClick={() => void navigator.clipboard?.writeText(enlaceAcceso(acceso.codigo))}
                >
                  Copiar enlace
                </button>
                <a
                  href={enlaceWhatsApp(acceso, detalle.competencia.nombre)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="typo-meta font-medium text-gold underline"
                >
                  Enviar por WhatsApp
                </a>
                <button
                  type="button"
                  className="typo-meta text-muted underline"
                  onClick={() => {
                    const extra = acceso.rol === 'juez' ? ' Se borran también sus votos.' : ''
                    if (window.confirm(`¿Quitar el código de ${etiquetaAcceso(acceso.rol, acceso.juezPuesto)}?${extra}`)) {
                      void onBorrar(acceso.codigo)
                    }
                  }}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function EditarInscripcion({
  item,
  clase,
  clases,
  fecha,
  catalogo,
  onCancelar,
  onGuardar,
}: {
  item: InscripcionCompetencia
  clase: ClaseCompetencia
  clases: ClaseCompetencia[]
  fecha: string
  catalogo: CategoriaCatalogo[]
  onCancelar: () => void
  onGuardar: (cambio: { categoria: CategoriaCatalogo | null; montador: string | null; pagado: boolean }) => Promise<void>
}) {
  const [codigo, setCodigo] = useState(String(clase.eventoCodigo ?? ''))
  const [montador, setMontador] = useState<string | null>(item.montador)
  const [pagado, setPagado] = useState(item.pagado)
  const [guardando, setGuardando] = useState(false)
  // Antes de la votación se puede cambiar de categoría; después, solo montador y pago.
  const mueve = clase.fase === 'inscripcion' || clase.fase === 'prepista'
  const opciones = useMemo(() => {
    const caballo: CaballoInscribible = {
      codigo: item.caballoCodigo ?? '',
      nombre: item.nombre,
      sexo: item.sexo,
      nacimiento: item.nacimiento,
      modalidad: '',
      padre: null,
      madre: null,
      criador: null,
      propietario: item.propietario,
    }
    const propias = categoriasDelCaballo(caballo, fecha, catalogo).sugerencias.map((s) => s.categoria)
    const actual = catalogo.find((c) => c.codigo === clase.eventoCodigo)
    return actual && !propias.some((c) => c.codigo === actual.codigo) ? [actual, ...propias] : propias
  }, [item, fecha, catalogo, clase.eventoCodigo])
  const destino = opciones.find((c) => String(c.codigo) === codigo) ?? null
  const cambiaCategoria = destino != null && destino.codigo !== clase.eventoCodigo

  return (
    <div className="space-y-4">
      <p className="typo-name text-sm">Editar a {formatNombre(item.nombre)}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="typo-label">Categoría</span>
          <select
            value={codigo}
            disabled={!mueve}
            onChange={(e) => setCodigo(e.target.value)}
            className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink disabled:opacity-60"
          >
            {opciones.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.nombre}
              </option>
            ))}
          </select>
          {!mueve ? (
            <span className="typo-meta mt-1 block">La categoría ya está en juzgamiento; no se puede cambiar.</span>
          ) : cambiaCategoria ? (
            <span className="typo-meta mt-1 block">Queda sin número: vuelva a numerar después de guardar.</span>
          ) : null}
        </label>
        <div>
          <span className="typo-label">Montador</span>
          <SelectorBusqueda
            busca={MONTADORES}
            valor={montador ?? ''}
            etiqueta={formatNombre(montador)}
            onElegir={(opcion) => setMontador(opcion?.valor ?? null)}
          />
        </div>
      </div>
      <label className="typo-meta flex items-center gap-2">
        <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />
        Pagó la inscripción
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={guardando}
          className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg disabled:opacity-60"
          onClick={async () => {
            const evento = destino?.codigo ?? clase.eventoCodigo ?? 0
            const otro = montadorRepetido(clases, evento, montador, item.id)
            if (
              otro &&
              !window.confirm(
                `${formatNombre(montador)} ya monta a ${formatNombre(otro.nombre)} en esa categoría. Un montador no puede llevar dos caballos en la misma categoría. ¿Guardar de todas formas?`,
              )
            ) {
              return
            }
            setGuardando(true)
            await onGuardar({ categoria: cambiaCategoria ? destino : null, montador, pagado })
            setGuardando(false)
          }}
        >
          Guardar cambios
        </button>
        <button type="button" className="typo-meta underline" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
