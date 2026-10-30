import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AyudaGuia } from '../../components/AyudaGuia'
import { PageHeader } from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'
import { crearCompetencia, listarCompetencias, type Competencia } from '../../lib/competencia'
import { formatFechaEmision } from '../../lib/format'
import { listarPrograma, type EventoPrograma } from '../../lib/juzgamiento'
import { crearSimulacion } from '../../lib/simulacion'

const vacio = { programaCodigo: null as number | null, nombre: '', fecha: '', lugar: '' }

const ESTADOS: Record<Competencia['estado'], string> = {
  inscripcion: 'Inscripción abierta',
  en_curso: 'En pista',
  finalizada: 'Finalizada',
}

export function AdminCompetencias() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [filas, setFilas] = useState<Competencia[]>([])
  const [programa, setPrograma] = useState<EventoPrograma[]>([])
  const [form, setForm] = useState(vacio)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [simulando, setSimulando] = useState<string | null>(null)

  useEffect(() => {
    if (perfil?.rol !== 'admin') return
    listarCompetencias().then(setFilas).catch((err: Error) => setError(err.message))
    listarPrograma().then(setPrograma).catch(() => setPrograma([]))
  }, [perfil?.rol])

  if (perfil?.rol !== 'admin') return <Navigate to="/admin" replace />

  async function crear(event: FormEvent) {
    event.preventDefault()
    if (!form.nombre.trim() || !form.fecha) {
      setError('Escriba el nombre y la fecha de la competencia.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const id = await crearCompetencia(form)
      navigate(`/admin/competencias/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la competencia.')
      setGuardando(false)
    }
  }

  async function simular() {
    setError(null)
    setSimulando('Preparando…')
    try {
      const id = await crearSimulacion(setSimulando)
      navigate(`/admin/competencias/${id}/simulacion`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la simulación.')
      setSimulando(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="En vivo"
        title="Competencias"
        description="Inscriba los caballos, cierre la inscripción para numerarlos y entregue los códigos a pre-pista, jueces y mesa técnica."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AyudaGuia id="competencias-en-vivo" />
            <button
              type="button"
              disabled={simulando != null}
              onClick={() => void simular()}
              className="typo-btn rounded-[10px] border border-gold px-4 py-2.5 text-gold disabled:opacity-60"
            >
              {simulando ? 'Creando simulación…' : 'Crear simulación de prueba'}
            </button>
          </div>
        }
      >
        {simulando ? <p className="typo-meta mt-3 text-gold">{simulando}</p> : null}
        <p className="typo-meta mt-3">
          La simulación inscribe caballos reales del registro en una competencia de práctica con fecha de hoy, para
          ensayar los pasos y los accesos con el cliente. No cuenta para nada y se puede borrar.
        </p>
      </PageHeader>

      <form onSubmit={crear} className="mb-10 grid gap-3 rounded-[12px] border border-border bg-surface p-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="typo-label">Tomar del calendario</span>
          <select
            className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
            value={form.programaCodigo ?? ''}
            onChange={(e) => {
              const item = programa.find((p) => String(p.codigo) === e.target.value)
              setForm(
                item
                  ? { programaCodigo: item.codigo, nombre: item.nombre, fecha: item.fecha, lugar: item.lugar }
                  : vacio,
              )
            }}
          >
            <option value="">Elegir un evento del programa…</option>
            {programa.map((item) => (
              <option key={item.codigo} value={item.codigo}>
                {item.fecha} · {item.nombre}
                {item.lugar ? ` · ${item.lugar}` : ''}
              </option>
            ))}
          </select>
        </label>
        <Campo label="Nombre" value={form.nombre} onChange={(nombre) => setForm({ ...form, nombre })} />
        <Campo label="Fecha" type="date" value={form.fecha} onChange={(fecha) => setForm({ ...form, fecha })} />
        <Campo label="Lugar" value={form.lugar} onChange={(lugar) => setForm({ ...form, lugar })} />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={guardando}
            className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg disabled:opacity-60"
          >
            {guardando ? 'Creando…' : 'Crear competencia'}
          </button>
        </div>
        <p className="typo-meta sm:col-span-2">
          La edad de cada caballo se cuenta a esta fecha para saber en qué categoría compite.
        </p>
        {error ? <p className="typo-meta text-flag-red sm:col-span-2">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-[12px] border border-border">
        {filas.length === 0 ? (
          <p className="typo-meta px-5 py-8">Todavía no hay competencias.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filas.map((fila) => (
              <li key={fila.id}>
                <Link
                  to={`/admin/competencias/${fila.id}${fila.simulacion ? '/simulacion' : ''}`}
                  className="flex items-center justify-between gap-3 bg-bg/40 px-5 py-4 hover:bg-surface-elevated"
                >
                  <div>
                    <p className="typo-name text-base">{fila.nombre}</p>
                    <p className="typo-meta mt-1">
                      {formatFechaEmision(fila.fecha)}
                      {fila.lugar ? ` · ${fila.lugar}` : ''}
                    </p>
                  </div>
                  <span className="typo-caption shrink-0 text-gold">
                    {fila.simulacion ? 'Simulación' : ESTADOS[fila.estado]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label>
      <span className="typo-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
      />
    </label>
  )
}
