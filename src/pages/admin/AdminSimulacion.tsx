import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AyudaGuia } from '../../components/AyudaGuia'
import { useAuth } from '../../lib/auth-context'
import {
  cargarCompetencia,
  eliminarCompetencia,
  estadoPista,
  etiquetaAcceso,
  etiquetaFase,
  listarCatalogoCategorias,
  type CategoriaCatalogo,
  type DetalleCompetencia,
  type EstadoPista,
} from '../../lib/competencia'
import { formatNombre } from '../../lib/format'
import { codigosDe, PASOS, probarAccesos, revisarPasos, type Resultado, type Revision } from '../../lib/simulacion'

const REFRESCO_MS = 5000

const MARCA: Record<Resultado, { simbolo: string; clase: string }> = {
  ok: { simbolo: '✓', clase: 'border-gold text-gold' },
  falla: { simbolo: '✗', clase: 'border-flag-red text-flag-red' },
  pendiente: { simbolo: '…', clase: 'border-border text-muted' },
}

/** Ensayo de una competencia: ejecuta cada paso como lo haría cada puesto y revisa el resultado. */
export function AdminSimulacion() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [detalle, setDetalle] = useState<DetalleCompetencia | null>(null)
  const [mesa, setMesa] = useState<EstadoPista | null>(null)
  const [catalogo, setCatalogo] = useState<CategoriaCatalogo[]>([])
  const [accesos, setAccesos] = useState<Revision[] | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verPuestos, setVerPuestos] = useState(false)

  const recargar = useCallback(async () => {
    const datos = await cargarCompetencia(id)
    setDetalle(datos)
    const codigo = datos ? codigosDe(datos).mesa : null
    setMesa(codigo ? await estadoPista(codigo).catch(() => null) : null)
  }, [id])

  useEffect(() => {
    if (perfil?.rol !== 'admin' || !id) return
    listarCatalogoCategorias().then(setCatalogo).catch(() => setCatalogo([]))
    recargar().catch((err: Error) => setError(err.message))
    // También refleja lo que hagan a mano los celulares de prueba.
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') void recargar().catch(() => undefined)
    }, REFRESCO_MS)
    return () => window.clearInterval(intervalo)
  }, [id, perfil?.rol, recargar])

  if (perfil?.rol !== 'admin') return <Navigate to="/admin" replace />
  if (!detalle) return <p className="typo-meta">{error ?? 'Cargando la simulación…'}</p>
  if (!detalle.competencia.simulacion) return <Navigate to={`/admin/competencias/${id}`} replace />

  async function correr(titulo: string, accion: () => Promise<void>) {
    setOcupado(titulo)
    setError(null)
    try {
      await accion()
    } catch (err) {
      setError(`${titulo}: ${err instanceof Error ? err.message : 'no se pudo completar.'}`)
    }
    await recargar().catch(() => undefined)
    setOcupado(null)
  }

  async function correrTodo() {
    setOcupado('Simulación completa')
    setError(null)
    try {
      for (const paso of PASOS) {
        setOcupado(paso.titulo)
        const actual = await cargarCompetencia(id)
        if (!actual) throw new Error('La simulación ya no existe.')
        await paso.ejecutar(actual)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La simulación se detuvo.')
    }
    await recargar().catch(() => undefined)
    setOcupado(null)
  }

  const revisiones = revisarPasos(detalle, catalogo, mesa)
  const fases = mesa?.clases.map((c) => `${c.categoria}: ${etiquetaFase(c.fase)}`) ?? []

  return (
    <div className="space-y-10">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={`/admin/competencias/${id}`} className="typo-meta font-medium text-gold hover:text-gold-soft">
            ← Ver la competencia
          </Link>
          <AyudaGuia id="simulacion" />
        </div>
        <p className="typo-eyebrow mt-4">Simulación · no es oficial</p>
        <h1 className="typo-page mt-2">Ensayo de competencia</h1>
        <p className="typo-lead mt-2">
          Recorra cada paso a mano desde los celulares con los códigos, o deje que el ensayo los haga por cada puesto. La
          revisión de abajo dice si cada paso quedó como manda el reglamento.
        </p>
        {error ? <p className="typo-meta mt-3 text-flag-red">{error}</p> : null}
        {ocupado ? <p className="typo-meta mt-3 text-gold">En curso: {ocupado}…</p> : null}
      </div>

      <section>
        <h2 className="typo-section">Códigos de prueba</h2>
        <p className="typo-meta mt-1">Ábralos en celulares o pestañas distintas para hacer el ensayo con el cliente.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detalle.accesos.map((acceso) => (
            <li key={acceso.codigo} className="rounded-[12px] border border-border bg-surface p-4">
              <p className="typo-name text-sm">
                {etiquetaAcceso(acceso.rol, acceso.juezPuesto)}
                {acceso.nombre ? ` · ${formatNombre(acceso.nombre)}` : ''}
              </p>
              <p className="mt-1 font-mono text-lg tracking-[0.2em] text-gold">{acceso.codigo}</p>
              <a href={`/pista/${acceso.codigo}`} target="_blank" rel="noreferrer" className="typo-meta mt-2 inline-block underline">
                Abrir en otra pestaña
              </a>
            </li>
          ))}
        </ul>
        <button type="button" className="typo-meta mt-3 underline" onClick={() => setVerPuestos(!verPuestos)}>
          {verPuestos ? 'Ocultar las pantallas' : 'Ver todas las pantallas lado a lado'}
        </button>
        {verPuestos ? (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {detalle.accesos.map((acceso) => (
              <figure key={acceso.codigo} className="shrink-0">
                <figcaption className="typo-caption mb-1">{etiquetaAcceso(acceso.rol, acceso.juezPuesto)}</figcaption>
                <iframe
                  title={etiquetaAcceso(acceso.rol, acceso.juezPuesto)}
                  src={`/pista/${acceso.codigo}`}
                  className="h-[640px] w-[360px] rounded-[16px] border-4 border-surface-elevated bg-bg"
                />
              </figure>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="typo-section">Pasos</h2>
            {fases.length > 0 ? <p className="typo-meta mt-1">{fases.join(' · ')}</p> : null}
          </div>
          <button
            type="button"
            disabled={ocupado != null}
            className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg disabled:opacity-60"
            onClick={() => void correrTodo()}
          >
            Simular la competencia completa
          </button>
        </div>
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-[12px] border border-border">
          {PASOS.map((paso, indice) => (
            <li key={paso.id} className="flex flex-wrap items-center justify-between gap-3 bg-bg/40 px-4 py-3">
              <div>
                <p className="typo-name text-sm">
                  {indice + 1}. {paso.titulo}
                </p>
                <p className="typo-meta">Lo hace: {paso.quien}</p>
              </div>
              <button
                type="button"
                disabled={ocupado != null}
                className="typo-btn rounded-[10px] border border-border px-3 py-2 disabled:opacity-50"
                onClick={() => void correr(paso.titulo, () => paso.ejecutar(detalle))}
              >
                Ejecutar
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="typo-section">Revisión de los pasos</h2>
        <Lista revisiones={revisiones} />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="typo-section">Prueba de accesos</h2>
            <p className="typo-meta mt-1">
              Intenta entrar con un código inventado y que cada puesto haga lo que no le toca. Todo debe ser rechazado.
            </p>
          </div>
          <button
            type="button"
            disabled={ocupado != null}
            className="typo-btn rounded-[10px] border border-border px-4 py-2.5 disabled:opacity-50"
            onClick={() => void correr('Prueba de accesos', async () => setAccesos(await probarAccesos(detalle)))}
          >
            Probar accesos
          </button>
        </div>
        {accesos ? <Lista revisiones={accesos} /> : null}
      </section>

      <section className="border-t border-border pt-6">
        <button
          type="button"
          className="typo-btn rounded-[10px] border border-border px-4 py-2.5"
          onClick={async () => {
            if (!window.confirm('¿Borrar esta simulación? Se eliminan sus inscripciones, votos y códigos.')) return
            await eliminarCompetencia(id)
            navigate('/admin/competencias')
          }}
        >
          Borrar simulación
        </button>
      </section>
    </div>
  )
}

function Lista({ revisiones }: { revisiones: Revision[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {revisiones.map((item, indice) => (
        <li key={`${item.titulo}-${indice}`} className="flex gap-3 rounded-[12px] border border-border bg-surface px-4 py-3">
          <span
            aria-label={item.resultado}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${MARCA[item.resultado].clase}`}
          >
            {MARCA[item.resultado].simbolo}
          </span>
          <div>
            <p className="typo-name text-sm">{item.titulo}</p>
            <p className="typo-meta mt-0.5">{item.detalle}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
