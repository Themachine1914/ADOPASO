import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AyudaGuia } from '../../components/AyudaGuia'
import { PageHeader } from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'
import { formatFechaEmision } from '../../lib/format'
import { crearJuzgamiento, listarJuzgamientos, listarPrograma, type Juzgamiento } from '../../lib/juzgamiento'

const vacio = { evento: '', fecha: '', lugar: '', categoria: '', codigo: '' }

export function AdminJuzgamiento() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [filas, setFilas] = useState<Juzgamiento[]>([])
  const [programa, setPrograma] = useState<Array<{ codigo: number; fecha: string; nombre: string; lugar: string }>>([])
  const [form, setForm] = useState(vacio)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (perfil?.rol !== 'admin') return
    listarJuzgamientos().then(setFilas).catch((err: Error) => setError(err.message))
    listarPrograma().then(setPrograma).catch(() => setPrograma([]))
  }, [perfil?.rol])

  if (perfil?.rol !== 'admin') return <Navigate to="/admin" replace />

  async function crear(event: FormEvent) {
    event.preventDefault()
    if (!form.evento.trim() || !form.categoria.trim()) {
      setError('Escriba el evento y la categoría.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const id = await crearJuzgamiento(form)
      navigate(`/admin/juzgamiento/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la competencia.')
      setGuardando(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Interno"
        title="Juzgamiento"
        description="Arme la clase como el formulario impreso, asigne jueces del registro y recoja la votación en la libreta F-2."
        action={<AyudaGuia id="juzgamiento" />}
      />

      <form onSubmit={crear} className="mb-10 grid gap-3 rounded-[12px] border border-border bg-surface p-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="typo-label">Tomar del calendario</span>
          <select
            className="mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
            value=""
            onChange={(e) => {
              const item = programa.find((p) => String(p.codigo) === e.target.value)
              if (!item) return
              setForm((actual) => ({
                ...actual,
                evento: item.nombre,
                fecha: item.fecha,
                lugar: item.lugar,
              }))
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
        <Campo label="Evento" value={form.evento} onChange={(evento) => setForm({ ...form, evento })} />
        <Campo label="Categoría" value={form.categoria} onChange={(categoria) => setForm({ ...form, categoria })} />
        <Campo label="Fecha" type="date" value={form.fecha} onChange={(fecha) => setForm({ ...form, fecha })} />
        <Campo label="Lugar" value={form.lugar} onChange={(lugar) => setForm({ ...form, lugar })} />
        <Campo label="Código de la clase" value={form.codigo} onChange={(codigo) => setForm({ ...form, codigo })} />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={guardando}
            className="typo-btn rounded-[10px] bg-gold px-4 py-2.5 text-bg disabled:opacity-60"
          >
            {guardando ? 'Creando…' : 'Abrir clase'}
          </button>
        </div>
        {error ? <p className="typo-meta text-flag-red sm:col-span-2">{error}</p> : null}
      </form>

      <div className="overflow-hidden rounded-[12px] border border-border">
        {filas.length === 0 ? (
          <p className="typo-meta px-5 py-8">Todavía no hay clases en juzgamiento.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filas.map((fila) => (
              <li key={fila.id}>
                <Link to={`/admin/juzgamiento/${fila.id}`} className="block bg-bg/40 px-5 py-4 hover:bg-surface-elevated">
                  <p className="typo-name text-base">{fila.categoria}</p>
                  <p className="typo-meta mt-1">
                    {fila.evento}
                    {fila.fecha ? ` · ${formatFechaEmision(fila.fecha)}` : ''}
                    {fila.lugar ? ` · ${fila.lugar}` : ''}
                    {fila.codigo ? ` · Código ${fila.codigo}` : ''}
                  </p>
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
