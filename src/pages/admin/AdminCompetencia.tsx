import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AyudaGuia } from '../../components/AyudaGuia'
import { SearchInput } from '../../components/SearchInput'
import type { BuscaLista } from '../../admin/categorias'
import { useAuth } from '../../lib/auth-context'
import {
  borrarAcceso,
  cambiarEstiloJueces,
  actualizarCompetencia,
  buscarCaballos,
  cambiarMontador,
  cargarCompetencia,
  categoriasDelCaballo,
  crearAcceso,
  eliminarCompetencia,
  enlaceAcceso,
  enlaceWhatsApp,
  etiquetaAcceso,
  etiquetaJuez,
  etiquetaFase,
  faseDeCategoria,
  finalizarCompetencia,
  inscribir,
  listarCatalogoCategorias,
  marcarPagado,
  montadorRepetido,
  moverInscripcion,
  numerarCategoria,
  numerarCompetencia,
  quitarInscripcion,
  reasignarJuez,
  ultimoGrupo,
  type CaballoInscribible,
  type CategoriaCatalogo,
  type ClaseCompetencia,
  type Competencia,
  type DetalleCompetencia,
  type Inscripcion as InscripcionCompetencia,
  type UltimoGrupo,
} from '../../lib/competencia'
import { enMayusculas, formatFechaEmision, formatNombre } from '../../lib/format'
import { matchesSearch, normalize } from '../../lib/normalize'
import { listarJueces, type JuezCatalogo } from '../../lib/juzgamiento'
import { cerrarSimulacion } from '../../lib/simulacion'
import { BotonFormularioDireccion } from './FormularioDireccion'
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
  const [agregando, setAgregando] = useState<string | null>(null)
  const [busquedaCategoria, setBusquedaCategoria] = useState('')

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
  const regulares = clases.filter((clase) => !clase.esGranCampeonato)
  const clasesVisibles = regulares.filter((clase) => matchesSearch(clase.categoria, busquedaCategoria))
  const inscritos = regulares.reduce((suma, clase) => suma + clase.inscritos.length, 0)
  const porCerrar = (clase: ClaseCompetencia) =>
    !clase.esGranCampeonato &&
    (clase.fase === 'inscripcion' || (clase.fase === 'prepista' && clase.inscritos.some((item) => item.numero == null)))
  const abiertas = regulares.filter(porCerrar).length
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
        <DatosCompetencia
          competencia={competencia}
          inscritos={inscritos}
          categorias={regulares.length}
          onGuardar={async (datos) => {
            await actualizarCompetencia(competencia.id, datos)
            await recargar()
          }}
        />
        {competencia.simulacion ? (
          <div className="typo-meta mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-gold/60 px-3 py-2">
            <p>
              Esta es una simulación: no es oficial y su puntuación no va al ranking.{' '}
              <Link to={`/admin/competencias/${competencia.id}/simulacion`} className="font-medium text-gold underline">
                Ir al ensayo
              </Link>
            </p>
            <button
              type="button"
              className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg"
              onClick={() => {
                const texto =
                  '¿Cerrar la simulación? Se borra con sus categorías, votos y códigos de acceso. ' +
                  'No queda como competencia ni como puntuación oficial. La competencia real no se toca.'
                if (!window.confirm(texto)) return
                setError(null)
                cerrarSimulacion(competencia)
                  .then((real) => navigate(real ? `/admin/competencias/${real}` : '/admin/competencias'))
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cerrar la simulación.'))
              }}
            >
              Cerrar simulación
            </button>
          </div>
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
        <h2 className="typo-section">Categorías e inscritos</h2>

        {regulares.length === 0 ? (
          <p className="typo-meta mt-4">Todavía no hay caballos inscritos.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <SearchInput
              value={busquedaCategoria}
              onChange={setBusquedaCategoria}
              label="Buscar categoría"
              placeholder="Buscar una categoría para inscribir…"
            />
            {clasesVisibles.length === 0 ? (
              <p className="typo-meta">Ninguna categoría coincide con esa búsqueda.</p>
            ) : null}
            {clasesVisibles.map((clase) => {
              // Se inscribe a última hora mientras la categoría no esté en juzgamiento.
              const categoriaClase = catalogo.find((c) => c.codigo === clase.eventoCodigo) ?? null
              const admiteInscripcion =
                !finalizada && categoriaClase != null && (clase.fase === 'inscripcion' || clase.fase === 'prepista')
              const capturada = clase.fase === 'cerrada'
              const enPista = competencia.claseActiva === clase.id && !capturada
              return (
              <div
                key={clase.id}
                className={[
                  'overflow-hidden rounded-[12px] border',
                  capturada ? 'border-emerald-500/60' : enPista ? 'border-amber-400/80' : 'border-border',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex flex-wrap items-center justify-between gap-2 px-4 py-3',
                    capturada ? 'bg-emerald-500/10' : enPista ? 'bg-amber-400/10' : 'bg-surface',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <p className="typo-name text-base">{clase.categoria}</p>
                    {admiteInscripcion ? (
                      <button
                        type="button"
                        aria-label={`Inscribir un caballo en ${clase.categoria}`}
                        title="Inscribir un caballo en esta categoría"
                        aria-expanded={agregando === clase.id}
                        className={[
                          'flex h-8 w-8 items-center justify-center rounded-full border text-lg font-semibold leading-none',
                          agregando === clase.id ? 'border-gold bg-gold text-bg' : 'border-gold/60 text-gold hover:bg-gold hover:text-bg',
                        ].join(' ')}
                        onClick={() => setAgregando(agregando === clase.id ? null : clase.id)}
                      >
                        {agregando === clase.id ? '×' : '+'}
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={[
                        'typo-caption',
                        capturada ? 'font-medium text-emerald-300' : enPista ? 'font-medium text-amber-300' : 'text-gold',
                      ].join(' ')}
                    >
                      {capturada
                        ? 'Capturada'
                        : enPista
                          ? `En pista · ${etiquetaFase(clase.fase)}`
                          : clase.fase === 'inscripcion'
                            ? 'Inscripción abierta'
                            : etiquetaFase(clase.fase)}
                    </span>
                    {clase.modoCaptura === 'manual' ? (
                      <span className="typo-caption font-medium text-gold">A mano</span>
                    ) : clase.modoCaptura === 'en_vivo' ? (
                      <span className="typo-caption font-medium text-amber-300">En vivo</span>
                    ) : null}
                    {!finalizada && porCerrar(clase) ? (
                      <button
                        type="button"
                        className="typo-btn rounded-[10px] bg-gold px-3 py-1.5 text-sm text-bg"
                        onClick={() => {
                          const texto =
                            clase.fase === 'inscripcion'
                              ? `¿Cerrar la inscripción de ${clase.categoria} y numerarla? La mesa técnica la podrá sacar a pista.`
                              : `¿Dar número a los inscritos tarde en ${clase.categoria}? Los demás conservan el suyo.`
                          if (window.confirm(texto)) void hacer(() => numerarCategoria(clase.id))
                        }}
                      >
                        {clase.fase === 'inscripcion' ? 'Cerrar y numerar' : 'Numerar los nuevos'}
                      </button>
                    ) : null}
                    {clase.modoCaptura === 'en_vivo' ? (
                      <button
                        type="button"
                        disabled
                        className="typo-btn rounded-[10px] border border-border px-3 py-1.5 text-sm text-muted disabled:opacity-60"
                        title="Esta categoría ya se está juzgando en vivo. No se puede capturar a mano."
                      >
                        Introducir datos manual
                      </button>
                    ) : (
                      <Link
                        to={`/admin/competencias/${competencia.id}/captura/${clase.id}`}
                        className="typo-btn rounded-[10px] bg-gold px-3 py-1.5 text-sm text-bg"
                      >
                        Introducir datos manual
                      </Link>
                    )}
                    <BotonFormularioDireccion
                      claseId={clase.id}
                      categoria={clase.categoria}
                      evento={competencia.nombre}
                      fecha={competencia.fecha}
                      lugar={competencia.lugar}
                      onError={setError}
                    />
                    <Link to={`/admin/juzgamiento/${clase.id}`} className="typo-meta underline">
                      Libretas y cómputo
                    </Link>
                  </div>
                </div>
                {admiteInscripcion && agregando === clase.id ? (
                  <InscribirEnCategoria
                    clase={clase}
                    categoria={categoriaClase}
                    clases={clases}
                    fecha={competencia.fecha}
                    onCerrar={() => setAgregando(null)}
                    onInscribir={async (caballo, pagado, montador) => {
                      // Si la categoría ya estaba cerrada, el nuevo recibe el siguiente número libre.
                      // La mesa técnica pudo haber sacado la categoría a pista mientras esta pantalla estaba abierta.
                      const fase = await faseDeCategoria(clase.id)
                      if (fase !== 'inscripcion' && fase !== 'prepista') {
                        await recargar().catch(() => undefined)
                        throw new Error(`${clase.categoria} ya entró a juzgamiento; no se puede inscribir.`)
                      }
                      await inscribir(competencia.id, categoriaClase, caballo, pagado, montador)
                      try {
                        if (fase === 'prepista') await numerarCategoria(clase.id)
                      } catch {
                        throw new Error(
                          `${formatNombre(caballo.nombre)} quedó inscrito, pero sin número. Pulse «Numerar los nuevos» en ${clase.categoria}.`,
                        )
                      } finally {
                        await recargar().catch(() => undefined)
                      }
                    }}
                  />
                ) : null}
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
              )
            })}
          </div>
        )}
        {!finalizada && abiertas > 0 ? (
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              className="typo-btn rounded-[10px] border border-border px-4 py-2.5 text-muted hover:text-ink"
              onClick={() => {
                const texto = `¿Cerrar y numerar las ${abiertas} categorías abiertas? Las que ya están cerradas conservan sus números.`
                if (window.confirm(texto)) void hacer(() => numerarCompetencia(competencia.id))
              }}
            >
              Cerrar todas las categorías ({abiertas})
            </button>
          </div>
        ) : null}
      </section>

      <ResultadosCompetencia competencia={competencia} onCambio={recargar} />

      <Accesos
        detalle={detalle}
        jueces={jueces}
        onCrear={(acceso) => hacer(() => crearAcceso(competencia.id, acceso))}
        onBorrar={(codigo) => hacer(() => borrarAcceso(codigo))}
        onEstilo={(estilo) => hacer(() => cambiarEstiloJueces(competencia.id, estilo))}
        onReasignar={(puesto, juez) => hacer(() => reasignarJuez(competencia.id, puesto, juez.codigo, juez.nombre))}
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

function DatosCompetencia({
  competencia,
  inscritos,
  categorias,
  onGuardar,
}: {
  competencia: Competencia
  inscritos: number
  categorias: number
  onGuardar: (datos: { nombre: string; fecha: string; lugar: string }) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [lugar, setLugar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  function abrir() {
    setNombre(enMayusculas(competencia.nombre))
    setFecha(competencia.fecha)
    setLugar(enMayusculas(competencia.lugar ?? ''))
    setErrorLocal(null)
    setEditando(true)
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    if (!enMayusculas(nombre).trim() || !fecha) {
      setErrorLocal('Escriba el nombre y la fecha de la competencia.')
      return
    }
    setGuardando(true)
    setErrorLocal(null)
    try {
      await onGuardar({ nombre, fecha, lugar })
      setEditando(false)
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  if (!editando) {
    return (
      <>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="typo-page uppercase">{competencia.nombre}</h1>
          <button type="button" onClick={abrir} className="typo-btn rounded-[10px] border border-gold px-4 py-2 text-gold">
            Editar
          </button>
        </div>
        <p className="typo-lead mt-2">
          {formatFechaEmision(competencia.fecha)}
          {competencia.lugar ? (
            <>
              {' · '}
              <span className="uppercase">{competencia.lugar}</span>
            </>
          ) : null}{' '}
          · {inscritos} inscripciones en {categorias} categorías
        </p>
      </>
    )
  }

  return (
    <form onSubmit={(event) => void guardar(event)} className="mt-4 grid gap-3 rounded-[12px] border border-border bg-surface p-5 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="typo-label">Nombre</span>
        <input
          value={nombre}
          autoCapitalize="characters"
          onChange={(event) => setNombre(enMayusculas(event.target.value))}
          className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink uppercase"
        />
      </label>
      <label>
        <span className="typo-label">Fecha</span>
        <input
          type="date"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
          className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
        />
      </label>
      <label>
        <span className="typo-label">Lugar</span>
        <input
          value={lugar}
          autoCapitalize="characters"
          onChange={(event) => setLugar(enMayusculas(event.target.value))}
          className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink uppercase"
        />
      </label>
      <p className="typo-meta sm:col-span-2">
        El nombre y el lugar se guardan en mayúsculas.
        {inscritos > 0 ? ' Cambiar la fecha no mueve a los caballos ya inscritos de categoría.' : ''}
        {competencia.sincronizadoEn ? ' El lugar y la fecha también se corrigen en el ranking.' : ''}
      </p>
      {errorLocal ? <p className="typo-meta text-flag-red sm:col-span-2">{errorLocal}</p> : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={guardando}
          className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          disabled={guardando}
          onClick={() => setEditando(false)}
          className="typo-btn rounded-[10px] border border-border px-4 py-2.5"
        >
          Cancelar
        </button>
      </div>
    </form>
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
  const [montador, setMontador] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<UltimoGrupo | null>(null)
  const [eleccion, setEleccion] = useState<{ clave: string; codigo: number } | null>(null)
  const montadorManual = useRef(false)

  // Último grupo en que compitió: se sugiere esa modalidad con la categoría de su edad de hoy.
  useEffect(() => {
    setUltimo(null)
    if (!caballo) return
    let vigente = true
    ultimoGrupo(caballo.codigo)
      .then((grupo) => {
        if (!vigente) return
        setUltimo(grupo)
        if (!montadorManual.current && grupo?.montador) setMontador(grupo.montador)
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
  const ultimaClase = normalize(ultimo?.categoria ?? '').replace(/\s+/g, ' ')
  const deLaUltimaClase = recomendadas.find(
    (s) => s.ultimoGrupo && normalize(s.categoria.nombre).replace(/\s+/g, ' ') === ultimaClase,
  )
  const defecto = (deLaUltimaClase ?? recomendadas.find((s) => s.ultimoGrupo) ?? recomendadas[0])?.categoria.codigo ?? null
  const claveDefecto = `${caballo?.codigo ?? ''}|${ultimo?.modalidad ?? ''}|${recomendadas.map((s) => s.categoria.codigo).join(',')}`
  const categoriaCodigo = eleccion?.clave === claveDefecto ? eleccion.codigo : defecto
  const categoriaElegida = recomendadas.find((s) => s.categoria.codigo === categoriaCodigo)?.categoria ?? null

  return (
    <section className="rounded-[12px] border-2 border-gold bg-gold/10 p-5">
      <h2 className="typo-section text-gold">Inscribir un caballo</h2>
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
                  setPagado(false)
                  montadorManual.current = false
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

          <div className="mt-4 max-w-sm">
            <span className="typo-label">Montador</span>
            <SelectorBusqueda
              busca={MONTADORES}
              valor={montador ?? ''}
              etiqueta={montador ? formatNombre(montador) : ''}
              onElegir={(opcion) => {
                montadorManual.current = true
                setMontador(opcion?.valor ?? null)
              }}
            />
            <p className="typo-caption mt-1 text-muted">
              {montador
                ? 'Viene de la última salida. Cámbielo solo si esta vez lo monta otra persona.'
                : ultimo
                  ? 'Esta salida no tiene montador guardado. Búsquelo.'
                  : 'Buscando el montador de la última salida…'}
            </p>
          </div>

          {meses == null ? (
            <p className="typo-meta mt-3 text-flag-red">
              Este caballo no tiene fecha de nacimiento en el registro. Complétela antes de inscribirlo.
            </p>
          ) : recomendadas.length === 0 ? (
            <p className="typo-meta mt-3 text-flag-red">Ninguna categoría corresponde a su modalidad, sexo y edad.</p>
          ) : (
            <>
              <label className="typo-meta mt-4 flex items-center gap-2">
                <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />
                Pagó la inscripción
              </label>
              <p className="typo-label mt-4">Categoría</p>
              <ul className="mt-2 space-y-2">
                {recomendadas.map(({ categoria, ultimoGrupo: delUltimo }) => {
                  const marcada = categoria.codigo === categoriaCodigo
                  return (
                    <li key={categoria.codigo}>
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-[10px] border px-3 py-2 ${marcada ? 'border-gold bg-gold/10' : 'border-border'}`}
                      >
                        <input
                          type="radio"
                          name={`categoria-${caballo.codigo}`}
                          className="mt-1 accent-[#d4af37]"
                          checked={marcada}
                          onChange={() => setEleccion({ clave: claveDefecto, codigo: categoria.codigo })}
                        />
                        <span className="text-sm">
                          {categoria.nombre}
                          {delUltimo && categoria.codigo === defecto ? (
                            <span className="typo-caption ml-2 text-gold">Última en que compitió</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="typo-btn mt-4 rounded-[10px] bg-gold px-4 py-2 text-bg disabled:opacity-50"
                disabled={!categoriaElegida}
                onClick={async () => {
                  if (!categoriaElegida) return
                  setAviso(null)
                  const otro = montadorRepetido(clases, categoriaElegida.codigo, montador)
                  if (
                    otro &&
                    !window.confirm(
                      `${formatNombre(montador)} ya monta a ${formatNombre(otro.nombre)} en ${categoriaElegida.nombre}. Un montador no puede llevar dos caballos en la misma categoría. ¿Inscribir de todas formas?`,
                    )
                  ) {
                    return
                  }
                  try {
                    await onInscribir(categoriaElegida, caballo, pagado, montador)
                    setAviso(`${formatNombre(caballo.nombre)} quedó inscrito en ${categoriaElegida.nombre}.`)
                    setCaballo(null)
                    setBusqueda('')
                  } catch (err) {
                    setAviso(err instanceof Error ? err.message : 'No se pudo inscribir.')
                  }
                }}
              >
                Inscribir
              </button>
            </>
          )}
        </div>
      ) : null}
      {aviso ? <p className="typo-meta mt-3">{aviso}</p> : null}
    </section>
  )
}

/** Inscripción de última hora directo en una categoría, desde el «+» de su tarjeta. */
function InscribirEnCategoria({
  clase,
  categoria,
  clases,
  fecha,
  onCerrar,
  onInscribir,
}: {
  clase: ClaseCompetencia
  categoria: CategoriaCatalogo
  clases: ClaseCompetencia[]
  fecha: string
  onCerrar: () => void
  onInscribir: (caballo: CaballoInscribible, pagado: boolean, montador: string | null) => Promise<void>
}) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<CaballoInscribible[]>([])
  const [caballo, setCaballo] = useState<CaballoInscribible | null>(null)
  const [montador, setMontador] = useState<string | null>(null)
  const [pagado, setPagado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const montadorManual = useRef(false)

  useEffect(() => {
    if (!caballo) return
    let vigente = true
    ultimoGrupo(caballo.codigo)
      .then((grupo) => {
        if (vigente && !montadorManual.current && grupo?.montador) setMontador(grupo.montador)
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

  const yaInscritos = new Set(clase.inscritos.map((item) => item.caballoCodigo))
  const { meses, sugerencias } = caballo
    ? categoriasDelCaballo(caballo, fecha, [categoria])
    : { meses: null, sugerencias: [] }
  const corresponde = sugerencias.length > 0

  return (
    <div className="border-b border-border bg-bg/40 px-4 py-4">
      <p className="typo-name text-sm">Inscribir en {clase.categoria}</p>
      {clase.fase === 'prepista' ? (
        <p className="typo-meta mt-1">La categoría ya está cerrada: el caballo recibe el siguiente número libre y los demás conservan el suyo.</p>
      ) : null}

      {!caballo ? (
        <>
          <label className="mt-3 block max-w-md">
            <span className="typo-label">Buscar por nombre o registro</span>
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setAviso(null)
              }}
              placeholder="Ej.: Bandolero"
              className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
            />
          </label>
          {resultados.length > 0 ? (
            <ul className="mt-2 max-w-md divide-y divide-border overflow-hidden rounded-[10px] border border-border">
              {resultados.map((item) => {
                const inscrito = yaInscritos.has(item.codigo)
                return (
                  <li key={item.codigo}>
                    <button
                      type="button"
                      disabled={inscrito}
                      className="block w-full bg-bg/40 px-4 py-2 text-left hover:bg-surface-elevated disabled:opacity-50"
                      onClick={() => {
                        setCaballo(item)
                        montadorManual.current = false
                        setMontador(null)
                        setPagado(false)
                        setAviso(null)
                      }}
                    >
                      <span className="typo-name text-sm">{formatNombre(item.nombre)}</span>
                      <span className="typo-meta block">
                        {item.codigo} · {item.sexo === 'H' ? 'Hembra' : item.sexo === 'M' ? 'Macho' : 'Sin sexo'}
                        {item.propietario ? ` · ${formatNombre(item.propietario)}` : ''}
                        {inscrito ? ' · ya está en esta categoría' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <p className="typo-name text-base">{formatNombre(caballo.nombre)}</p>
            <p className="typo-meta mt-1">
              {caballo.codigo}
              {caballo.modalidad ? ` · ${caballo.modalidad}` : ''}
              {meses != null ? ` · ${meses} meses el día de la competencia` : ''}
            </p>
            {meses == null ? (
              <p className="typo-meta mt-2 text-flag-red">
                Este caballo no tiene fecha de nacimiento en el registro. Complétela antes de inscribirlo.
              </p>
            ) : !corresponde ? (
              <p className="typo-meta mt-2 text-flag-red">Por su sexo o su edad, este caballo no corresponde a {categoria.nombre}.</p>
            ) : null}
          </div>
          {corresponde ? (
            <>
              <div className="max-w-sm">
                <span className="typo-label">Montador</span>
                <SelectorBusqueda
                  busca={MONTADORES}
                  valor={montador ?? ''}
                  etiqueta={montador ? formatNombre(montador) : ''}
                  onElegir={(opcion) => {
                    montadorManual.current = true
                    setMontador(opcion?.valor ?? null)
                  }}
                />
              </div>
              <label className="typo-meta flex items-center gap-2">
                <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />
                Pagó la inscripción
              </label>
            </>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {corresponde ? (
              <button
                type="button"
                disabled={guardando}
                className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg disabled:opacity-60"
                onClick={async () => {
                  const otro = montadorRepetido(clases, categoria.codigo, montador)
                  if (
                    otro &&
                    !window.confirm(
                      `${formatNombre(montador)} ya monta a ${formatNombre(otro.nombre)} en ${categoria.nombre}. Un montador no puede llevar dos caballos en la misma categoría. ¿Inscribir de todas formas?`,
                    )
                  ) {
                    return
                  }
                  setGuardando(true)
                  setAviso(null)
                  try {
                    await onInscribir(caballo, pagado, montador)
                    setAviso(`${formatNombre(caballo.nombre)} quedó inscrito en ${categoria.nombre}.`)
                    setCaballo(null)
                    setBusqueda('')
                  } catch (err) {
                    setAviso(err instanceof Error ? err.message : 'No se pudo inscribir.')
                  } finally {
                    setGuardando(false)
                  }
                }}
              >
                {guardando ? 'Inscribiendo…' : 'Inscribir aquí'}
              </button>
            ) : null}
            <button type="button" className="typo-meta underline" onClick={() => setCaballo(null)}>
              Elegir otro caballo
            </button>
          </div>
        </div>
      )}
      {aviso ? <p className="typo-meta mt-3">{aviso}</p> : null}
      <button type="button" className="typo-meta mt-3 block text-muted underline" onClick={onCerrar}>
        Cerrar
      </button>
    </div>
  )
}

function Accesos({
  detalle,
  jueces,
  onCrear,
  onBorrar,
  onEstilo,
  onReasignar,
}: {
  detalle: DetalleCompetencia
  jueces: JuezCatalogo[]
  onCrear: (acceso: { rol: 'juez' | 'prepista' | 'mesa'; juezPuesto?: number; juezCodigo?: number; nombre?: string }) => Promise<void>
  onBorrar: (codigo: string) => Promise<void>
  onEstilo: (estilo: 'numero' | 'letra') => Promise<void>
  onReasignar: (puesto: number, juez: JuezCatalogo) => Promise<void>
}) {
  const [juezCodigo, setJuezCodigo] = useState('')
  const [cambiando, setCambiando] = useState<number | null>(null)
  const { accesos } = detalle
  const estilo = detalle.competencia.etiquetaJueces
  const tiene = (rol: string) => accesos.some((a) => a.rol === rol)
  const puestoLibre = [1, 2, 3, 4, 5].find((puesto) => !accesos.some((a) => a.rol === 'juez' && a.juezPuesto === puesto))

  return (
    <section>
      <h2 className="typo-section">Códigos de acceso</h2>
      <p className="typo-meta mt-1">
        Cada persona abre el enlace en su celular o tablet, o entra a /pista y escribe el código. No necesita cuenta.
        Los jueces solo ven números, nunca nombres.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="typo-meta">Los jueces se llaman:</span>
        {(['numero', 'letra'] as const).map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={estilo === opcion}
            className={[
              'typo-btn rounded-[10px] border px-3 py-1.5',
              estilo === opcion ? 'border-gold bg-gold text-bg' : 'border-border',
            ].join(' ')}
            onClick={() => (estilo === opcion ? undefined : void onEstilo(opcion))}
          >
            {opcion === 'numero' ? '1 · 2 · 3' : 'A · B · C'}
          </button>
        ))}
      </div>

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
              + Juez {etiquetaJuez(puestoLibre, estilo)}
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
                  {etiquetaAcceso(acceso.rol, acceso.juezPuesto, estilo)}
                  {acceso.nombre ? ` · ${formatNombre(acceso.nombre)}` : ''}
                </p>
                <p className="mt-1 font-mono text-lg tracking-[0.2em] text-gold">{acceso.codigo}</p>
                {acceso.rol === 'juez' && acceso.juezPuesto != null && cambiando === acceso.juezPuesto ? (
                  <select
                    aria-label={`Nuevo juez para el puesto ${etiquetaJuez(acceso.juezPuesto, estilo)}`}
                    defaultValue=""
                    className="mt-2 rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
                    onChange={(e) => {
                      const juez = jueces.find((j) => String(j.codigo) === e.target.value)
                      const puesto = acceso.juezPuesto!
                      if (!juez) return
                      const texto =
                        `¿Poner a ${formatNombre(juez.nombre)} como Juez ${etiquetaJuez(puesto, estilo)}? ` +
                        'Usa el mismo código de acceso; los votos que ya tenga este puesto se quedan.'
                      if (window.confirm(texto)) void onReasignar(puesto, juez).then(() => setCambiando(null))
                    }}
                  >
                    <option value="">Elegir el nuevo juez…</option>
                    {jueces
                      .filter((j) => !accesos.some((a) => a.rol === 'juez' && a.juezPuesto !== acceso.juezPuesto && a.nombre === j.nombre))
                      .map((juez) => (
                        <option key={juez.codigo} value={juez.codigo}>
                          {formatNombre(juez.nombre)}
                        </option>
                      ))}
                  </select>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {acceso.rol === 'juez' && acceso.juezPuesto != null ? (
                  <button
                    type="button"
                    className="typo-meta underline"
                    onClick={() => setCambiando(cambiando === acceso.juezPuesto ? null : acceso.juezPuesto)}
                  >
                    {cambiando === acceso.juezPuesto ? 'Cancelar' : 'Cambiar juez'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="typo-meta underline"
                  onClick={() => void navigator.clipboard?.writeText(enlaceAcceso(acceso.codigo))}
                >
                  Copiar enlace
                </button>
                <a
                  href={enlaceWhatsApp(acceso, detalle.competencia.nombre, estilo)}
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
                    if (window.confirm(`¿Quitar el código de ${etiquetaAcceso(acceso.rol, acceso.juezPuesto, estilo)}?${extra}`)) {
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
    // Solo categorías que todavía no están en juzgamiento (o que aún no existen en la competencia).
    const abierta = (codigoEvento: number) => {
      const destino = clases.find((c) => c.eventoCodigo === codigoEvento)
      return !destino || destino.fase === 'inscripcion' || destino.fase === 'prepista'
    }
    const propias = categoriasDelCaballo(caballo, fecha, catalogo)
      .sugerencias.map((s) => s.categoria)
      .filter((c) => abierta(c.codigo))
    const actual = catalogo.find((c) => c.codigo === clase.eventoCodigo)
    return actual && !propias.some((c) => c.codigo === actual.codigo) ? [actual, ...propias] : propias
  }, [item, fecha, catalogo, clase.eventoCodigo, clases])
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
            <span className="typo-meta mt-1 block">Queda sin número: después de guardar, pulse «Numerar los nuevos» en su nueva categoría.</span>
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
