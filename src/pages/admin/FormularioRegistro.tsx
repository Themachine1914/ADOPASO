import { useEffect, useState, type FormEvent } from 'react'
import type { CampoForm, Categoria } from '../../admin/categorias'
import {
  buscarNombre,
  cargarOpciones,
  guardarRegistro,
  siguienteCodigo,
  validar,
  valoresIniciales,
  type Valores,
} from '../../lib/registro'

type Fila = Record<string, unknown>
type Opcion = { valor: string; etiqueta: string }

const CAMPO =
  'typo-body mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2.5 text-ink transition-colors focus:border-gold/50 focus:outline-none disabled:opacity-60'

interface Props {
  categoria: Categoria
  /** null = registro nuevo */
  fila: Fila | null
  onCerrar: () => void
  onGuardado: (clave: string) => void
}

export function FormularioRegistro({ categoria, fila, onCerrar, onGuardado }: Props) {
  const campos = categoria.formulario ?? []
  const creando = fila === null
  const [valores, setValores] = useState<Valores>(() => valoresIniciales(campos, fila))
  const [opciones, setOpciones] = useState<Record<string, Opcion[]>>({})
  const [avisos, setAvisos] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    if (creando && categoria.codigoNuevo) {
      siguienteCodigo(categoria)
        .then((codigo) => {
          if (vigente) setValores((v) => (v.codigo ? v : { ...v, codigo }))
        })
        .catch(() => undefined)
    }
    for (const campo of categoria.formulario ?? []) {
      if (!campo.opcionesDe) continue
      cargarOpciones(campo.opcionesDe)
        .then((lista) => {
          if (vigente) setOpciones((o) => ({ ...o, [campo.clave]: lista }))
        })
        .catch(() => undefined)
    }
    return () => {
      vigente = false
    }
  }, [categoria, creando])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar, guardando])

  function cambiar(clave: string, valor: string) {
    setValores((v) => ({ ...v, [clave]: valor }))
    setError(null)
  }

  async function completarNombre(campo: CampoForm) {
    const busca = campo.buscaNombre
    if (!busca) return
    const codigo = valores[campo.clave] ?? ''
    if (!codigo.trim()) {
      setAvisos((a) => ({ ...a, [campo.clave]: '' }))
      return
    }
    try {
      const nombre = await buscarNombre(busca, codigo)
      if (nombre) {
        setValores((v) => ({ ...v, [busca.campo]: nombre }))
        setAvisos((a) => ({ ...a, [campo.clave]: `Encontrado: ${nombre}` }))
      } else {
        setAvisos((a) => ({ ...a, [campo.clave]: 'No está en el registro. Escriba el nombre a mano.' }))
      }
    } catch {
      setAvisos((a) => ({ ...a, [campo.clave]: 'No se pudo buscar ese código.' }))
    }
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    const problema = validar(campos, valores, creando)
    if (problema) {
      setError(problema)
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const clave = await guardarRegistro(categoria, valores, fila)
      onGuardado(clave)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setGuardando(false)
    }
  }

  const titulo = `${creando ? (categoria.femenino ? 'Nueva' : 'Nuevo') : 'Editar'} ${categoria.singular ?? 'registro'}`

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={() => (guardando ? undefined : onCerrar())}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <form
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface"
        noValidate
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="typo-name-lg first-letter:uppercase">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="typo-btn rounded-[10px] border border-border px-3 py-1.5 text-muted hover:text-ink"
          >
            Cancelar
          </button>
        </div>

        <div className="grid flex-1 content-start gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          {campos.map((campo) => {
            const id = `campo-${campo.clave}`
            const bloqueado = campo.soloNuevo && !creando
            const lista = campo.opciones ?? opciones[campo.clave] ?? []
            return (
              <label key={campo.clave} htmlFor={id} className={campo.completo || campo.tipo === 'area' ? 'sm:col-span-2' : ''}>
                <span className="typo-label">
                  {campo.etiqueta}
                  {campo.requerido ? <span className="text-gold"> *</span> : null}
                </span>
                {campo.tipo === 'area' ? (
                  <textarea
                    id={id}
                    rows={3}
                    value={valores[campo.clave] ?? ''}
                    onChange={(e) => cambiar(campo.clave, e.target.value)}
                    className={CAMPO}
                  />
                ) : campo.tipo === 'opciones' ? (
                  <select
                    id={id}
                    value={valores[campo.clave] ?? ''}
                    onChange={(e) => cambiar(campo.clave, e.target.value)}
                    className={CAMPO}
                  >
                    <option value="">—</option>
                    {lista.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.etiqueta}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    type={campo.tipo === 'fecha' ? 'date' : 'text'}
                    inputMode={campo.tipo === 'numero' ? 'numeric' : undefined}
                    list={campo.sugerencias ? `${id}-lista` : undefined}
                    value={valores[campo.clave] ?? ''}
                    disabled={bloqueado}
                    onChange={(e) => cambiar(campo.clave, e.target.value)}
                    onBlur={() => completarNombre(campo)}
                    className={CAMPO}
                  />
                )}
                {campo.sugerencias ? (
                  <datalist id={`${id}-lista`}>
                    {campo.sugerencias.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                ) : null}
                {avisos[campo.clave] ? (
                  <span className="typo-caption mt-1 block text-gold">{avisos[campo.clave]}</span>
                ) : campo.ayuda || bloqueado ? (
                  <span className="typo-caption mt-1 block">
                    {bloqueado ? 'Es la clave del registro: no se puede cambiar.' : campo.ayuda}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>

        <div className="border-t border-border px-6 py-4">
          {error ? (
            <p role="alert" className="typo-meta mb-3 rounded-[10px] border border-flag-red/50 bg-flag-red/10 px-3 py-2">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={guardando}
            className="typo-btn w-full rounded-[12px] bg-gold px-4 py-3 text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : creando ? 'Registrar' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
