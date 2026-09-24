import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { categoriaPorSlug, type Categoria, type TipoColumna } from '../../admin/categorias'
import { EmptyState } from '../../components/EmptyState'
import { AyudaGuia } from '../../components/AyudaGuia'
import { PageHeader } from '../../components/PageHeader'
import { SearchInput } from '../../components/SearchInput'
import { Skeleton } from '../../components/Skeleton'
import { useAuth } from '../../lib/auth-context'
import { FormularioRegistro } from './FormularioRegistro'
import { formatDate } from '../../lib/format'
import { eliminarRegistro } from '../../lib/registro'
import { supabase } from '../../lib/supabase'

const POR_PAGINA = 50
const ANIOS = Array.from({ length: 2026 - 1998 + 1 }, (_, i) => 2026 - i)

type Fila = Record<string, unknown>

/** Ruta /admin/:slug — valida que la categoría exista y que el rol pueda verla. */
export function AdminCategoria() {
  const { slug } = useParams()
  const { perfil } = useAuth()
  const categoria = categoriaPorSlug(slug)
  if (!categoria || (categoria.soloAdmin && perfil?.rol !== 'admin')) {
    return <Navigate to="/admin" replace />
  }
  // key: al cambiar de categoría se reinician búsqueda, página y filtros.
  return <VistaCategoria key={categoria.slug} categoria={categoria} esAdmin={perfil?.rol === 'admin'} />
}

function celda(valor: unknown, tipo?: TipoColumna): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (tipo === 'fecha') return formatDate(String(valor))
  if (tipo === 'si_no') return valor ? 'Sí' : '—'
  return String(valor)
}

function etiquetaCampo(clave: string): string {
  const texto = clave.replace(/_/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function VistaCategoria({ categoria, esAdmin }: { categoria: Categoria; esAdmin: boolean }) {
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [anio, setAnio] = useState('')
  const [pagina, setPagina] = useState(0)
  const [filas, setFilas] = useState<Fila[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<Fila | null>(null)
  // null = cerrado; { fila: null } = registro nuevo; { fila } = editar esa fila
  const [formulario, setFormulario] = useState<{ fila: Fila | null } | null>(null)
  const [version, setVersion] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const puedeEditar = esAdmin && Boolean(categoria.formulario)

  // Espera a que se deje de escribir antes de consultar.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setBusqueda(texto)
      setPagina(0)
    }, 300)
    return () => window.clearTimeout(id)
  }, [texto])

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)

    const pk = ['caballos', 'eventos', 'programa'].includes(categoria.tabla) ? 'codigo' : 'id'
    let consulta = supabase.from(categoria.tabla).select('*', { count: 'exact' })

    const limpio = busqueda.replace(/[,()%*_\\"]/g, ' ').trim()
    if (limpio) {
      consulta = consulta.or(categoria.busqueda.map((col) => `${col}.ilike.%${limpio}%`).join(','))
    }
    if (anio && categoria.filtroAnio) {
      consulta = consulta.gte(categoria.filtroAnio, `${anio}-01-01`).lte(categoria.filtroAnio, `${anio}-12-31`)
    }
    consulta = consulta.order(categoria.orden.columna, { ascending: categoria.orden.asc })
    if (categoria.orden.columna !== pk) consulta = consulta.order(pk) // desempate: paginación estable

    consulta.range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1).then(({ data, count, error: err }) => {
      if (!vigente) return
      if (err) {
        setError('No se pudieron cargar los datos. Verifique su conexión y permisos.')
        setFilas([])
        setTotal(0)
      } else {
        setFilas((data as Fila[]) ?? [])
        setTotal(count ?? 0)
      }
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [categoria, busqueda, anio, pagina, version])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const filtrando = Boolean(busqueda.trim()) || Boolean(anio)

  return (
    <div>
      <PageHeader
        eyebrow={categoria.grupo}
        title={categoria.titulo}
        description={categoria.descripcion}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {puedeEditar ? (
              <button
                type="button"
                onClick={() => setFormulario({ fila: null })}
                className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg transition-opacity hover:opacity-90"
              >
                + Registrar {categoria.singular}
              </button>
            ) : null}
            <AyudaGuia id={categoria.guia} />
          </div>
        }
      />

      {aviso ? (
        <p role="status" className="typo-meta mb-4 flex items-center justify-between gap-3 rounded-[12px] border border-gold/40 bg-gold/10 px-4 py-3">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} className="typo-caption text-muted hover:text-ink">
            Cerrar
          </button>
        </p>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchInput
          value={texto}
          onChange={setTexto}
          placeholder={`Buscar en ${categoria.titulo.toLowerCase()}…`}
          label={`Buscar en ${categoria.titulo}`}
        />
        {categoria.filtroAnio ? (
          <label className="flex items-center gap-2">
            <span className="typo-label">Año</span>
            <select
              value={anio}
              onChange={(e) => {
                setAnio(e.target.value)
                setPagina(0)
              }}
              className="typo-body rounded-[12px] border border-border bg-surface px-3 py-3 text-ink focus:border-gold/50 focus:outline-none"
            >
              <option value="">Todos</option>
              {ANIOS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="typo-meta rounded-[12px] border border-flag-red/50 bg-flag-red/10 p-4">
          {error}
        </p>
      ) : cargando ? (
        <div className="space-y-2" role="status" aria-label="Cargando datos">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filas.length === 0 ? (
        <EmptyState
          title={filtrando ? 'Sin resultados' : 'Todavía no hay datos'}
          description={
            filtrando
              ? 'Pruebe con otra búsqueda o quite el filtro de año.'
              : 'Esta categoría está vacía. Cuando se importen los datos aparecerán aquí.'
          }
        />
      ) : (
        <>
          <p className="typo-caption mb-2">
            {new Intl.NumberFormat('es-DO').format(total)} registros · página {pagina + 1} de {paginas}
          </p>
          <div className="overflow-x-auto rounded-[12px] border border-border">
            <table className="w-full min-w-max border-collapse text-left">
              <thead className="bg-surface">
                <tr className="border-b border-border">
                  {categoria.columnas.map((col) => (
                    <th key={col.clave} className="typo-label whitespace-nowrap px-4 py-3 font-medium">
                      {col.etiqueta}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-bg">
                {filas.map((fila, i) => (
                  <tr
                    key={String(fila.id ?? fila.codigo ?? i)}
                    onClick={() => setDetalle(fila)}
                    className="cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-surface-elevated"
                  >
                    {categoria.columnas.map((col) => (
                      <td key={col.clave} className="typo-meta whitespace-nowrap px-4 py-3">
                        {celda(fila[col.clave], col.tipo)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={pagina === 0}
              onClick={() => setPagina((p) => p - 1)}
              className="typo-btn rounded-[10px] border border-border px-4 py-2 text-muted hover:text-ink disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina + 1 >= paginas}
              onClick={() => setPagina((p) => p + 1)}
              className="typo-btn rounded-[10px] border border-border px-4 py-2 text-muted hover:text-ink disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {detalle && !formulario ? (
        <Detalle
          fila={detalle}
          titulo={categoria.titulo}
          onCerrar={() => setDetalle(null)}
          onEditar={puedeEditar ? () => setFormulario({ fila: detalle }) : undefined}
          onEliminar={
            puedeEditar && categoria.borrar
              ? async () => {
                  const nombre = String(detalle.nombre ?? detalle[categoria.pk] ?? '')
                  if (!window.confirm(`¿Eliminar «${nombre}»? No se puede deshacer.`)) return
                  await eliminarRegistro(categoria, detalle)
                  setDetalle(null)
                  setAviso(`Se eliminó «${nombre}».`)
                  setVersion((v) => v + 1)
                }
              : undefined
          }
        />
      ) : null}

      {formulario ? (
        <FormularioRegistro
          categoria={categoria}
          fila={formulario.fila}
          onCerrar={() => setFormulario(null)}
          onGuardado={(clave) => {
            const creado = formulario.fila === null
            setFormulario(null)
            setDetalle(null)
            setAviso(
              categoria.tabla === 'caballos'
                ? `${creado ? 'Registrado' : 'Guardado'} el caballo ${clave}. La genealogía y la descendencia se actualizaron.`
                : `${creado ? 'Registrado' : 'Guardado'} correctamente.`,
            )
            setVersion((v) => v + 1)
          }}
        />
      ) : null}
    </div>
  )
}

function Detalle({
  fila,
  titulo,
  onCerrar,
  onEditar,
  onEliminar,
}: {
  fila: Fila
  titulo: string
  onCerrar: () => void
  onEditar?: () => void
  onEliminar?: () => Promise<void>
}) {
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const campos = Object.entries(fila).filter(([, v]) => v !== null && v !== '')

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${titulo}`}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="typo-name-lg">Detalle</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="typo-btn rounded-[10px] border border-border px-3 py-1.5 text-muted hover:text-ink"
          >
            Cerrar
          </button>
        </div>
        {onEditar || onEliminar ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {onEditar ? (
              <button
                type="button"
                onClick={onEditar}
                className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg transition-opacity hover:opacity-90"
              >
                Editar
              </button>
            ) : null}
            {onEliminar ? (
              <button
                type="button"
                onClick={() => {
                  setErrorBorrar(null)
                  onEliminar().catch((err: Error) => setErrorBorrar(err.message))
                }}
                className="typo-btn rounded-[10px] border border-flag-red/50 px-4 py-2 text-flag-red hover:bg-flag-red/10"
              >
                Eliminar
              </button>
            ) : null}
          </div>
        ) : null}
        {errorBorrar ? (
          <p role="alert" className="typo-meta mb-5 rounded-[10px] border border-flag-red/50 bg-flag-red/10 px-3 py-2">
            {errorBorrar}
          </p>
        ) : null}
        <dl className="space-y-3">
          {campos.map(([clave, valor]) => (
            <div key={clave}>
              <dt className="typo-caption">{etiquetaCampo(clave)}</dt>
              <dd className="typo-meta mt-0.5 break-words whitespace-pre-wrap text-ink">
                {typeof valor === 'object' ? JSON.stringify(valor, null, 2) : String(valor)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
