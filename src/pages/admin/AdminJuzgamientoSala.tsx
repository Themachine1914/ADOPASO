import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { hojaDeComputo, LEYENDA_F2, LUGARES_F2, LUGARES_PUESTO, type LugarF2 } from '../../lib/computo'
import { formatFechaEmision, formatFechaRegistro, formatNombre } from '../../lib/format'
import {
  agregarEjemplar,
  asignarJuez,
  cargarSala,
  eliminarJuzgamiento,
  fichaPorRegistro,
  guardarVoto,
  listarJueces,
  marcarEscogido,
  quitarEjemplar,
  quitarJuez,
  type EjemplarClase,
  type JuezCatalogo,
  type SalaJuzgamiento,
} from '../../lib/juzgamiento'

const ejemplarVacio = {
  numero: '',
  registro: '',
  asociacion: 'ADOPASO',
  nombre: '',
  sexo: '',
  nacimiento: '',
  padre: '',
  madre: '',
  criador: '',
  propietario: '',
  montador: '',
}

export function AdminJuzgamientoSala() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [sala, setSala] = useState<SalaJuzgamiento | null>(null)
  const [jueces, setJueces] = useState<JuezCatalogo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  async function recargar() {
    const datos = await cargarSala(id)
    setSala(datos)
  }

  useEffect(() => {
    if (perfil?.rol !== 'admin' || !id) return
    let vigente = true
    setCargando(true)
    Promise.all([cargarSala(id), listarJueces()])
      .then(([datos, catalogo]) => {
        if (!vigente) return
        setSala(datos)
        setJueces(catalogo)
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
  if (cargando) return <p className="typo-meta">Cargando la clase…</p>
  if (error) return <p className="typo-meta text-flag-red">{error}</p>
  if (!sala) return <p className="typo-meta">Esta clase no está en el juzgamiento.</p>

  const puestosJuez = sala.jueces.map((juez) => juez.puesto)
  const computo = hojaDeComputo(sala.ejemplares, puestosJuez, sala.votos)
  const escogidos = sala.ejemplares.filter((item) => item.escogido)

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/juzgamiento" className="typo-meta font-medium text-gold hover:text-gold-soft">
          ← Clases en juzgamiento
        </Link>
        <p className="typo-eyebrow mt-4">Formulario de la clase</p>
        <h1 className="typo-page mt-2">{sala.juzgamiento.categoria}</h1>
        <p className="typo-lead mt-2">
          {sala.juzgamiento.evento}
          {sala.juzgamiento.fecha ? ` · ${formatFechaEmision(sala.juzgamiento.fecha)}` : ''}
          {sala.juzgamiento.lugar ? ` · ${sala.juzgamiento.lugar}` : ''}
          {sala.juzgamiento.codigo ? ` · Código ${sala.juzgamiento.codigo}` : ''}
        </p>
        <button
          type="button"
          className="typo-meta mt-3 text-muted underline"
          onClick={async () => {
            if (!window.confirm('¿Eliminar esta clase y sus votaciones?')) return
            await eliminarJuzgamiento(sala.juzgamiento.id)
            navigate('/admin/juzgamiento')
          }}
        >
          Eliminar clase
        </button>
      </div>

      <Formulario
        juzgamientoId={sala.juzgamiento.id}
        ejemplares={sala.ejemplares}
        onChange={async (accion) => {
          setError(null)
          try {
            await accion()
            await recargar()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar.')
          }
        }}
      />

      <Jueces
        asignados={sala.jueces}
        catalogo={jueces}
        onChange={async (accion) => {
          setError(null)
          try {
            await accion()
            await recargar()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo asignar el juez.')
          }
        }}
        juzgamientoId={sala.juzgamiento.id}
      />

      <FormatoA
        ejemplares={sala.ejemplares}
        total={sala.ejemplares.length}
        categoria={sala.juzgamiento.categoria}
        codigo={sala.juzgamiento.codigo}
        onToggle={async (ejemplar, escogido) => {
          await marcarEscogido(ejemplar.id, escogido)
          await recargar()
        }}
      />

      {sala.jueces.length === 0 ? (
        <p className="typo-meta">Asigne al menos un juez para abrir las libretas F-2.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {sala.jueces.map((juez) => (
            <FormatoF2
              key={juez.id}
              juezNombre={juez.nombre}
              juezPuesto={juez.puesto}
              total={escogidos.length}
              categoria={sala.juzgamiento.categoria}
              ejemplares={escogidos}
              votos={sala.votos.filter((voto) => voto.juezPuesto === juez.puesto)}
              onGuardar={async (lugar, numero) => {
                await guardarVoto(sala.juzgamiento.id, juez.puesto, lugar, numero)
                await recargar()
              }}
            />
          ))}
        </div>
      )}

      <Hoja
        categoria={sala.juzgamiento.categoria}
        lugar={sala.juzgamiento.lugar}
        jueces={sala.jueces}
        filas={computo}
      />
      {error ? <p className="typo-meta text-flag-red">{error}</p> : null}
    </div>
  )
}

function Papel({ titulo, formato, children }: { titulo: string; formato: string; children: ReactNode }) {
  return (
    <section className="rounded-[16px] bg-[#f4efe4] p-1 text-[#1c1408] shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <div className="rounded-[12px] border-2 border-[#1c1408] p-1">
        <div className="rounded-[8px] border border-[#1c1408] px-4 py-5 sm:px-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-semibold uppercase leading-tight">{titulo}</h2>
            <span className="shrink-0 border border-[#1c1408] px-2 py-1 text-center text-xs font-bold leading-tight">
              FORMATO
              <br />
              {formato}
            </span>
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

function Formulario({
  juzgamientoId,
  ejemplares,
  onChange,
}: {
  juzgamientoId: string
  ejemplares: EjemplarClase[]
  onChange: (accion: () => Promise<void>) => Promise<void>
}) {
  const [form, setForm] = useState(ejemplarVacio)
  const [aviso, setAviso] = useState<string | null>(null)
  const siguiente = ejemplares.reduce((max, item) => Math.max(max, item.numero), 0) + 1

  async function traerRegistro() {
    setAviso(null)
    let ficha
    try {
      ficha = await fichaPorRegistro(form.registro)
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo consultar el registro.')
      return
    }
    if (!ficha) {
      setAviso('Ese registro no está en el libro.')
      return
    }
    setForm((actual) => ({
      ...actual,
      registro: ficha.registro,
      nombre: ficha.nombre,
      sexo: ficha.sexo ?? '',
      nacimiento: ficha.nacimiento ?? '',
      padre: ficha.padre ?? '',
      madre: ficha.madre ?? '',
      criador: ficha.criador ?? '',
      propietario: ficha.propietario ?? '',
    }))
  }

  return (
    <Papel titulo="Formulario dirección de eventos" formato="CLASE">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const numero = Number(form.numero || siguiente)
          if (!form.nombre.trim() || !Number.isFinite(numero) || numero <= 0) {
            setAviso('Escriba el número de ejemplar y el nombre.')
            return
          }
          setAviso(null)
          await onChange(async () => {
            await agregarEjemplar(juzgamientoId, {
              numero,
              registro: form.registro.trim() || null,
              asociacion: form.asociacion.trim() || null,
              nombre: form.nombre.trim(),
              sexo: form.sexo.trim() || null,
              nacimiento: form.nacimiento || null,
              padre: form.padre.trim() || null,
              madre: form.madre.trim() || null,
              criador: form.criador.trim() || null,
              propietario: form.propietario.trim() || null,
              montador: form.montador.trim() || null,
            })
          })
          setForm({ ...ejemplarVacio, numero: String(numero + 1) })
        }}
        className="mb-4 grid gap-2 sm:grid-cols-4"
      >
        <input className={campo} placeholder={`No. ${siguiente}`} value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
        <input className={campo} placeholder="Registro" value={form.registro} onChange={(e) => setForm({ ...form, registro: e.target.value })} />
        <button type="button" onClick={traerRegistro} className="rounded-[8px] border border-[#1c1408] px-3 py-2 text-sm font-semibold">
          Traer del registro
        </button>
        <input className={campo} placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input className={campo} placeholder="Sexo" value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} />
        <input className={campo} type="date" value={form.nacimiento} onChange={(e) => setForm({ ...form, nacimiento: e.target.value })} />
        <input className={campo} placeholder="Padre" value={form.padre} onChange={(e) => setForm({ ...form, padre: e.target.value })} />
        <input className={campo} placeholder="Madre" value={form.madre} onChange={(e) => setForm({ ...form, madre: e.target.value })} />
        <input className={campo} placeholder="Criador" value={form.criador} onChange={(e) => setForm({ ...form, criador: e.target.value })} />
        <input className={campo} placeholder="Propietario" value={form.propietario} onChange={(e) => setForm({ ...form, propietario: e.target.value })} />
        <input className={campo} placeholder="Montador" value={form.montador} onChange={(e) => setForm({ ...form, montador: e.target.value })} />
        <button type="submit" className="rounded-[8px] bg-[#1c1408] px-3 py-2 text-sm font-semibold text-[#f4efe4]">
          Agregar ejemplar
        </button>
      </form>
      {aviso ? <p className="mb-3 text-sm">{aviso}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#1c1408]">
              {['No.', 'Registro', 'Asoc.', 'Nombre', 'Sexo', 'Nacimiento', 'Padre', 'Madre', 'Criador', 'Propietario', 'Montador', ''].map((col) => (
                <th key={col} className="px-2 py-2 font-semibold uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ejemplares.map((item) => (
              <tr key={item.id} className="border-b border-[#1c1408]/20">
                <td className="px-2 py-2 font-semibold">{item.numero}</td>
                <td className="px-2 py-2">{item.registro}</td>
                <td className="px-2 py-2">{item.asociacion}</td>
                <td className="px-2 py-2 font-semibold uppercase">{formatNombre(item.nombre)}</td>
                <td className="px-2 py-2">{item.sexo}</td>
                <td className="px-2 py-2">{item.nacimiento ? formatFechaRegistro(item.nacimiento) : ''}</td>
                <td className="px-2 py-2">{item.padre ? formatNombre(item.padre) : ''}</td>
                <td className="px-2 py-2">{item.madre ? formatNombre(item.madre) : ''}</td>
                <td className="px-2 py-2">{item.criador ? formatNombre(item.criador) : ''}</td>
                <td className="px-2 py-2">{item.propietario ? formatNombre(item.propietario) : ''}</td>
                <td className="px-2 py-2">{item.montador ? formatNombre(item.montador) : ''}</td>
                <td className="px-2 py-2">
                  <button type="button" className="underline" onClick={() => onChange(() => quitarEjemplar(item.id))}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ejemplares.length === 0 ? <p className="mt-3 text-sm">Agregue los ejemplares de la clase.</p> : null}
      </div>
    </Papel>
  )
}

const campo = 'rounded-[8px] border border-[#1c1408]/40 bg-white px-2 py-2 text-sm text-[#1c1408]'

function Jueces({
  asignados,
  catalogo,
  juzgamientoId,
  onChange,
}: {
  asignados: SalaJuzgamiento['jueces']
  catalogo: JuezCatalogo[]
  juzgamientoId: string
  onChange: (accion: () => Promise<void>) => Promise<void>
}) {
  const [codigo, setCodigo] = useState('')
  const ocupados = new Set(asignados.map((juez) => juez.juezCodigo))
  const siguiente = [1, 2, 3, 4, 5].find((puesto) => !asignados.some((juez) => juez.puesto === puesto))

  return (
    <section className="rounded-[12px] border border-border bg-surface p-5">
      <h2 className="typo-section text-xl">Jueces de la clase</h2>
      <p className="typo-meta mt-1">Hasta cinco, tomados del registro de jueces. El orden es Juez 1, Juez 2 y así en la hoja de cómputo.</p>
      <ul className="mt-4 space-y-2">
        {asignados.map((juez) => (
          <li key={juez.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-2">
            <span className="typo-name text-base">
              Juez {juez.puesto} · {formatNombre(juez.nombre)}
            </span>
            <button
              type="button"
              className="typo-meta text-gold"
              onClick={() => onChange(() => quitarJuez(juez.id, juzgamientoId, juez.puesto))}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      {siguiente ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            const juez = catalogo.find((item) => String(item.codigo) === codigo)
            if (!juez) return
            onChange(() => asignarJuez(juzgamientoId, siguiente, juez))
            setCodigo('')
          }}
        >
          <select
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-bg px-3 py-2 text-ink"
          >
            <option value="">Elegir juez {siguiente}…</option>
            {catalogo
              .filter((juez) => !ocupados.has(juez.codigo))
              .map((juez) => (
                <option key={juez.codigo} value={juez.codigo}>
                  {formatNombre(juez.nombre)}
                </option>
              ))}
          </select>
          <button type="submit" className="typo-btn rounded-[10px] bg-gold px-4 py-2 text-bg">
            Asignar
          </button>
        </form>
      ) : (
        <p className="typo-meta mt-3">La clase ya tiene los cinco jueces.</p>
      )}
    </section>
  )
}

function FormatoA({
  ejemplares,
  total,
  categoria,
  codigo,
  onToggle,
}: {
  ejemplares: EjemplarClase[]
  total: number
  categoria: string
  codigo: string | null
  onToggle: (ejemplar: EjemplarClase, escogido: boolean) => Promise<void>
}) {
  const escogidos = ejemplares.filter((item) => item.escogido)
  return (
    <Papel titulo="Libreta de juzgamiento" formato="A">
      <p className="text-sm">Animales escogidos para competir.</p>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <p>Total ejemplares: <strong>{total}</strong></p>
        <p>Categoría: <strong className="uppercase">{categoria}</strong></p>
        <p>Código: <strong>{codigo || '—'}</strong></p>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {ejemplares.map((item) => (
          <li key={item.id}>
            <label className="flex items-center gap-3 border-b border-[#1c1408]/30 py-1">
              <input
                type="checkbox"
                checked={item.escogido}
                onChange={(e) => onToggle(item, e.target.checked)}
              />
              <span className="w-8 font-semibold">{item.numero}</span>
              <span className="uppercase">{formatNombre(item.nombre)}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        Pasan a votación: {escogidos.map((item) => item.numero).join(', ') || 'ninguno'}.
      </p>
    </Papel>
  )
}

function FormatoF2({
  juezNombre,
  juezPuesto,
  total,
  categoria,
  ejemplares,
  votos,
  onGuardar,
}: {
  juezNombre: string
  juezPuesto: number
  total: number
  categoria: string
  ejemplares: EjemplarClase[]
  votos: SalaJuzgamiento['votos']
  onGuardar: (lugar: LugarF2, numero: number | null) => Promise<void>
}) {
  const [aviso, setAviso] = useState<string | null>(null)
  const porLugar = new Map(votos.map((voto) => [voto.lugar, voto.ejemplarNumero]))

  async function guardar(lugar: LugarF2, texto: string) {
    const numero = texto ? Number(texto) : null
    if (numero != null && !ejemplares.some((item) => item.numero === numero)) {
      throw new Error(`El número ${numero} no está entre los animales escogidos.`)
    }
    const otros = votos.filter((voto) => voto.lugar !== lugar && voto.ejemplarNumero === numero)
    const lugaresPuesto = new Set<string>(LUGARES_PUESTO)
    if (numero != null && lugaresPuesto.has(lugar) && otros.some((voto) => lugaresPuesto.has(voto.lugar))) {
      throw new Error(`El ejemplar ${numero} ya tiene otro lugar en esta libreta.`)
    }
    setAviso(null)
    await onGuardar(lugar, numero)
  }

  return (
    <Papel titulo="Libreta de juzgamiento" formato="F-2">
      <p className="text-sm">Posición otorgada por el juez.</p>
      <div className="mt-3 space-y-1 text-sm">
        <p>Total ejemplares: <strong>{total}</strong></p>
        <p>Categoría: <strong className="uppercase">{categoria}</strong></p>
        <p>Juez {juezPuesto}: <strong className="uppercase">{formatNombre(juezNombre)}</strong></p>
      </div>
      <table className="mt-4 w-full max-w-sm border-collapse text-sm">
        <tbody>
          {LUGARES_F2.map((lugar) => (
            <tr key={lugar} className="border border-[#1c1408]">
              <th className="w-16 border border-[#1c1408] px-2 py-1 text-left font-semibold">{lugar}</th>
              <td className="border border-[#1c1408] px-2 py-1">
                <Casilla
                  valor={porLugar.get(lugar)?.toString() ?? ''}
                  onBlur={async (texto) => {
                    try {
                      await guardar(lugar, texto)
                    } catch (err) {
                      setAviso(err instanceof Error ? err.message : 'No se pudo guardar el voto.')
                      throw err
                    }
                  }}
                />
                <NombreNumero numero={porLugar.get(lugar)} ejemplares={ejemplares} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[#5c5346]">
        Escriba el número del ejemplar. {LEYENDA_F2.GC}. {LEYENDA_F2.GCR}. Los lugares 1 a 5 entran en la hoja de cómputo.
      </p>
      {aviso ? <p className="mt-2 text-sm">{aviso}</p> : null}
    </Papel>
  )
}

function Casilla({ valor, onBlur }: { valor: string; onBlur: (texto: string) => Promise<void> }) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  return (
    <input
      value={texto}
      inputMode="numeric"
      aria-label="Número de ejemplar"
      onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 3))}
      onBlur={(event) => {
        const escrito = event.currentTarget.value
        if (escrito === valor) return
        onBlur(escrito).catch(() => setTexto(valor))
      }}
      className="w-16 border-b border-[#1c1408] bg-transparent text-center font-semibold outline-none"
    />
  )
}

function NombreNumero({ numero, ejemplares }: { numero: number | undefined; ejemplares: EjemplarClase[] }) {
  const ejemplar = ejemplares.find((item) => item.numero === numero)
  if (!ejemplar) return null
  return <span className="ml-2 text-xs uppercase">{formatNombre(ejemplar.nombre)}</span>
}

function Hoja({
  categoria,
  lugar,
  jueces,
  filas,
}: {
  categoria: string
  lugar: string | null
  jueces: SalaJuzgamiento['jueces']
  filas: ReturnType<typeof hojaDeComputo>
}) {
  const ordenadas = useMemo(
    () => [...filas].sort((a, b) => (a.puesto ?? 99) - (b.puesto ?? 99) || a.numero - b.numero),
    [filas],
  )
  return (
    <Papel titulo="Hoja de cómputo" formato="CONFEPAZO">
      <p className="text-sm">Posición dada por cada juez. La suma más baja queda primera.</p>
      <div className="mt-2 text-sm">
        <p>Categoría: <strong className="uppercase">{categoria}</strong></p>
        {lugar ? <p>Feria: <strong className="uppercase">{lugar}</strong></p> : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-center text-sm">
          <thead>
            <tr>
              <th className="border border-[#1c1408] px-2 py-2">No. ejemplar</th>
              {jueces.map((juez) => (
                <th key={juez.id} className="border border-[#1c1408] px-2 py-2">
                  Juez {juez.puesto}
                </th>
              ))}
              <th className="border border-[#1c1408] px-2 py-2">Total puntos</th>
              <th className="border border-[#1c1408] px-2 py-2">Puesto</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((fila) => (
              <tr key={fila.numero}>
                <th className="border border-[#1c1408] px-2 py-2 text-left font-semibold">
                  {fila.numero}
                  <span className="mt-0.5 block text-[0.65rem] font-medium uppercase">{formatNombre(fila.nombre)}</span>
                </th>
                {fila.porJuez.map((puntos, indice) => (
                  <td key={`${fila.numero}-${indice}`} className="border border-[#1c1408] px-2 py-2">
                    {puntos ?? ''}
                  </td>
                ))}
                <td className="border border-[#1c1408] px-2 py-2 font-semibold">{fila.total ?? ''}</td>
                <td className="border border-[#1c1408] px-2 py-2 font-semibold">{fila.puesto ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length === 0 ? <p className="mt-3 text-sm">Marque en el formato A quiénes compiten.</p> : null}
    </Papel>
  )
}
