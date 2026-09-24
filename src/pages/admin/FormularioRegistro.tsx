import { useEffect, useState, type FormEvent } from 'react'
import { categoriaPorSlug, type CampoForm, type Categoria } from '../../admin/categorias'
import {
  buscarNombre,
  cargarOpciones,
  guardarRegistro,
  leerRegistro,
  siguienteCodigo,
  validar,
  valoresIniciales,
  type OpcionBusqueda,
  type Valores,
} from '../../lib/registro'
import { SelectorBusqueda } from './SelectorBusqueda'

type Fila = Record<string, unknown>
type Opcion = { valor: string; etiqueta: string }

const CAMPO =
  'typo-body mt-1 w-full rounded-[10px] border border-border bg-bg px-3 py-2.5 text-ink transition-colors focus:border-gold/50 focus:outline-none disabled:opacity-60'

interface Alta {
  campo: string
  categoria: Categoria
  fijos?: Valores
  padresOpcionales?: boolean
  titulo: string
}

interface Props {
  categoria: Categoria
  /** null = registro nuevo */
  fila: Fila | null
  onCerrar: () => void
  onGuardado: (clave: string) => void
  /** Valores que no se pueden cambiar (el sexo al crear un padre o una madre). */
  fijos?: Valores
  /** Un padre o una madre creados desde el caballo pueden guardarse sin los suyos. */
  padresOpcionales?: boolean
  /** Formularios abiertos encima de otro. */
  nivel?: number
  tituloForzado?: string
}

export function FormularioRegistro({
  categoria,
  fila,
  onCerrar,
  onGuardado,
  fijos,
  padresOpcionales = false,
  nivel = 0,
  tituloForzado,
}: Props) {
  const campos = categoria.formulario ?? []
  const creando = fila === null
  const [valores, setValores] = useState<Valores>(() => ({ ...valoresIniciales(campos, fila), ...fijos }))
  const [opciones, setOpciones] = useState<Record<string, Opcion[]>>({})
  const [avisos, setAvisos] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [alta, setAlta] = useState<Alta | null>(null)

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
      if (e.key !== 'Escape' || guardando || alta || document.querySelector('[data-buscador-abierto]')) return
      onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar, guardando, alta])

  function cambiar(clave: string, valor: string) {
    setValores((v) => ({ ...v, [clave]: valor }))
    setError(null)
  }

  function elegirLista(campo: CampoForm, opcion: OpcionBusqueda | null) {
    const copia = campo.buscaLista?.copiaEn
    setValores((v) => ({
      ...v,
      [campo.clave]: opcion?.valor ?? '',
      ...(copia ? { [copia]: opcion?.etiqueta ?? '' } : {}),
    }))
    setError(null)
  }

  function pedirAlta(campo: CampoForm) {
    const crear = campo.buscaLista?.crear
    if (!crear) return
    const destino = categoriaPorSlug(crear.slug)
    if (!destino) return
    setAlta({
      campo: campo.clave,
      categoria: destino,
      fijos: crear.sexo ? { sexo: crear.sexo } : undefined,
      padresOpcionales: crear.padresOpcionales,
      titulo: crear.titulo,
    })
  }

  async function aplicarAlta(clave: string) {
    const pendiente = alta
    if (!pendiente) return
    const campo = campos.find((item) => item.clave === pendiente.campo)
    const busca = campo?.buscaLista
    if (!campo || !busca) {
      setAlta(null)
      return
    }
    try {
      const creado = await leerRegistro(pendiente.categoria.tabla, pendiente.categoria.pk, clave, [
        busca.valor,
        busca.etiqueta,
      ])
      const valor = creado?.[busca.valor] || (pendiente.categoria.pk === busca.valor ? clave : '')
      elegirLista(campo, valor ? { valor, etiqueta: creado?.[busca.etiqueta] ?? '', extra: null } : null)
    } catch {
      setError('Se creó el registro, pero no se pudo seleccionarlo. Búsquelo en la lista.')
    }
    setAlta(null)
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
    const problema = validar(campos, valores, creando, { padresOpcionales })
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

  const titulo =
    tituloForzado ?? `${creando ? (categoria.femenino ? 'Nueva' : 'Nuevo') : 'Editar'} ${categoria.singular ?? 'registro'}`

  return (
    <>
      <div
        className="fixed inset-0 flex justify-end bg-black/60"
        style={{ zIndex: 50 + nivel * 10 }}
        onClick={() => (guardando || alta ? undefined : onCerrar())}
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
            {padresOpcionales ? (
              <p className="typo-caption sm:col-span-2">
                Este caballo puede registrarse sin padre ni madre. Si los tiene, búsquelos o agréguelos.
              </p>
            ) : null}
            {campos.map((campo) => {
              if (campo.oculto) return null
              const id = `campo-${campo.clave}-${nivel}`
              const bloqueado = (campo.soloNuevo && !creando) || fijos?.[campo.clave] !== undefined
              const esPadre = campo.clave === 'padre_codigo' || campo.clave === 'madre_codigo'
              const obligatorio = campo.requerido && creando && !(padresOpcionales && esPadre)
              const lista = campo.opciones ?? opciones[campo.clave] ?? []
              const pista =
                campo.buscaLista?.copiaEn && !(valores[campo.clave] ?? '').trim()
                  ? (valores[campo.buscaLista.copiaEn] ?? '').trim()
                  : ''
              const ayuda = bloqueado && fijos?.[campo.clave]
                ? campo.clave === 'sexo'
                  ? fijos.sexo === 'H'
                    ? 'Queda registrada como hembra.'
                    : 'Queda registrado como macho.'
                  : 'Este dato queda fijo.'
                : padresOpcionales && esPadre
                  ? 'Opcional aquí. Puede buscarlo o dejarlo vacío.'
                  : bloqueado
                    ? 'Es la clave del registro: no se puede cambiar.'
                    : campo.ayuda
              return (
                <div key={campo.clave} className={campo.completo || campo.tipo === 'area' ? 'sm:col-span-2' : ''}>
                  <label htmlFor={id} className="typo-label">
                    {campo.etiqueta}
                    {obligatorio ? <span className="text-gold"> *</span> : null}
                  </label>
                  {campo.buscaLista ? (
                    <SelectorBusqueda
                      id={id}
                      busca={campo.buscaLista}
                      valor={valores[campo.clave] ?? ''}
                      etiqueta={campo.buscaLista.copiaEn ? (valores[campo.buscaLista.copiaEn] ?? '') : ''}
                      excluir={
                        campo.buscaLista.tabla === 'caballos' && valores.codigo ? valores.codigo : undefined
                      }
                      disabled={guardando}
                      onElegir={(opcion) => elegirLista(campo, opcion)}
                      onCrear={campo.buscaLista.crear ? () => pedirAlta(campo) : undefined}
                    />
                  ) : campo.tipo === 'area' ? (
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
                      value={fijos?.[campo.clave] ?? valores[campo.clave] ?? ''}
                      disabled={bloqueado}
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
                  ) : pista ? (
                    <span className="typo-caption mt-1 block">En el libro figura «{pista}» sin código. Elija el registro.</span>
                  ) : ayuda ? (
                    <span className="typo-caption mt-1 block">{ayuda}</span>
                  ) : null}
                </div>
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
      {alta ? (
        <FormularioRegistro
          categoria={alta.categoria}
          fila={null}
          fijos={alta.fijos}
          padresOpcionales={alta.padresOpcionales}
          nivel={nivel + 1}
          tituloForzado={alta.titulo}
          onCerrar={() => setAlta(null)}
          onGuardado={(clave) => {
            void aplicarAlta(clave)
          }}
        />
      ) : null}
    </>
  )
}
