import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BuscaLista } from '../../admin/categorias'
import { buscarLista, etiquetaDeLista, type OpcionBusqueda } from '../../lib/registro'

const CAJA =
  'typo-body w-full rounded-[10px] border border-border bg-bg py-2.5 pl-3 text-ink transition-colors focus:border-gold/50 focus:outline-none'

interface Props {
  id?: string
  busca: BuscaLista
  valor: string
  etiqueta: string
  excluir?: string
  disabled?: boolean
  onElegir: (opcion: OpcionBusqueda | null) => void
  onCrear?: () => void
}

export function SelectorBusqueda({ id, busca, valor, etiqueta, excluir, disabled, onElegir, onCrear }: Props) {
  const listaId = useId()
  const caja = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [consulta, setConsulta] = useState('')
  const [opciones, setOpciones] = useState<OpcionBusqueda[]>([])
  const [cargando, setCargando] = useState(false)
  const [fallo, setFallo] = useState(false)
  const [rotulo, setRotulo] = useState(etiqueta)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [arriba, setArriba] = useState(false)

  useEffect(() => {
    setRotulo(etiqueta)
  }, [etiqueta])

  useEffect(() => {
    if (!valor || etiqueta) return
    let vigente = true
    etiquetaDeLista(busca, valor)
      .then((nombre) => {
        if (vigente && nombre) setRotulo(nombre)
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [busca, valor, etiqueta])

  useEffect(() => {
    const id = window.setTimeout(() => setConsulta(texto), 250)
    return () => window.clearTimeout(id)
  }, [texto])

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    setCargando(true)
    setFallo(false)
    buscarLista(busca, consulta, excluir)
      .then((lista) => {
        if (vigente) setOpciones(lista)
      })
      .catch(() => {
        if (vigente) {
          setOpciones([])
          setFallo(true)
        }
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [abierto, busca, consulta, excluir])

  useEffect(() => {
    if (!abierto) return
    function colocar() {
      const el = caja.current
      if (!el) return
      const marco = el.getBoundingClientRect()
      const espacioAbajo = window.innerHeight - marco.bottom
      setArriba(espacioAbajo < 280 && marco.top > espacioAbajo)
      setRect(marco)
    }
    let escuchar = false
    const habilitar = window.setTimeout(() => {
      escuchar = true
    }, 0)
    function fuera(event: MouseEvent) {
      if (!escuchar) return
      const nodo = event.target as Node
      if (!nodo.isConnected) return
      if (caja.current?.contains(nodo) || menu.current?.contains(nodo)) return
      setAbierto(false)
    }
    function tecla(event: KeyboardEvent) {
      if (event.key === 'Escape') setAbierto(false)
    }
    colocar()
    window.addEventListener('scroll', colocar, true)
    window.addEventListener('resize', colocar)
    window.addEventListener('mousedown', fuera)
    window.addEventListener('keydown', tecla)
    return () => {
      window.clearTimeout(habilitar)
      window.removeEventListener('scroll', colocar, true)
      window.removeEventListener('resize', colocar)
      window.removeEventListener('mousedown', fuera)
      window.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  function abrir() {
    if (disabled) return
    setTexto('')
    setConsulta('')
    setAbierto(true)
  }

  function elegir(opcion: OpcionBusqueda) {
    setRotulo(opcion.etiqueta)
    setAbierto(false)
    onElegir(opcion)
  }

  const visible = abierto ? texto : valor ? [rotulo || etiqueta, valor].filter(Boolean).join(' · ') : ''

  return (
    <div ref={caja} className="relative mt-1">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        disabled={disabled}
        value={visible}
        placeholder={busca.placeholder ?? 'Buscar…'}
        onFocus={abrir}
        onMouseDown={(event) => {
          event.stopPropagation()
          abrir()
        }}
        onChange={(event) => {
          setTexto(event.target.value)
          setAbierto(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
        className={`${CAJA} ${valor && !disabled ? 'pr-16' : 'pr-3'}`}
      />
      {valor && !disabled ? (
        <button
          type="button"
          aria-label="Quitar selección"
          onClick={() => {
            setRotulo('')
            setAbierto(false)
            onElegir(null)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 typo-caption text-muted hover:text-ink"
        >
          Quitar
        </button>
      ) : null}
      {abierto && rect
        ? createPortal(
            <div
              ref={menu}
              id={listaId}
              data-buscador-abierto=""
              role="listbox"
              style={
                arriba
                  ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width }
                  : { top: rect.bottom + 4, left: rect.left, width: rect.width }
              }
              className="fixed z-[80] overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg"
            >
              <div className="max-h-60 overflow-y-auto">
                {cargando ? (
                  <p className="typo-caption px-3 py-2">Buscando…</p>
                ) : fallo ? (
                  <p className="typo-caption px-3 py-2">No se pudo buscar. Intente de nuevo.</p>
                ) : opciones.length === 0 ? (
                  <p className="typo-caption px-3 py-2">Ningún registro coincide.</p>
                ) : (
                  opciones.map((opcion) => (
                    <button
                      key={opcion.valor}
                      type="button"
                      role="option"
                      onClick={() => elegir(opcion)}
                      className="block w-full px-3 py-2 text-left hover:bg-bg"
                    >
                      <span className="typo-body block text-ink">{opcion.etiqueta}</span>
                      <span className="typo-caption block">
                        {[opcion.extra, opcion.valor].filter((parte, i, todas) => parte && todas.indexOf(parte) === i).join(' · ')}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {onCrear ? (
                <button
                  type="button"
                  onClick={() => {
                    setAbierto(false)
                    onCrear()
                  }}
                  className="typo-btn block w-full border-t border-border px-3 py-2.5 text-left text-gold hover:bg-bg"
                >
                  + Agregar nuevo
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
