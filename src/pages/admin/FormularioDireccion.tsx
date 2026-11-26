import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cargarFormularioDireccion, type FilaFormularioDireccion } from '../../lib/competencia'
import { formatFechaEmision, formatFechaRegistro, formatNombre } from '../../lib/format'

const COLUMNAS = ['No.', 'Registro', 'Asoc.', 'Nombre', 'Sexo', 'Nacimiento', 'Padre', 'Madre', 'Criador', 'Propietario', 'Montador']

/** Hoja en blanco: sin relleno, para que la impresora no gaste tinta en el fondo. */
const ESTILO_IMPRESION = `
@page {
  size: letter landscape;
  margin: 8mm;
}
@media print {
  html, body {
    background: #fff !important;
    background-image: none !important;
    color: #000 !important;
    print-color-adjust: economy !important;
    -webkit-print-color-adjust: economy !important;
  }
  body > *:not(#formulario-direccion) {
    display: none !important;
  }
  #formulario-direccion {
    display: block !important;
    position: static !important;
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    background-image: none !important;
    color: #000 !important;
    box-shadow: none !important;
    print-color-adjust: economy !important;
    -webkit-print-color-adjust: economy !important;
  }
  #formulario-direccion, #formulario-direccion * {
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
    color: #000 !important;
  }
  #formulario-direccion table {
    width: 100%;
    border-collapse: collapse;
  }
  #formulario-direccion th,
  #formulario-direccion td {
    border: 1px solid #000 !important;
    padding: 3px 4px;
    font-size: 9px;
    font-weight: 400;
    text-align: left;
    vertical-align: top;
  }
  #formulario-direccion thead {
    display: table-header-group;
  }
  #formulario-direccion tr {
    break-inside: avoid;
  }
}
`

function texto(valor: string | null | undefined): string {
  const formateado = formatNombre(valor)
  return formateado === '—' ? '' : formateado
}

function sexo(valor: string | null): string {
  if (!valor) return ''
  switch (valor.trim().toLowerCase()) {
    case 'h':
    case 'f':
    case 'hembra':
    case 'yegua':
      return 'Hembra'
    case 'm':
    case 'macho':
      return 'Macho'
    default:
      return valor.trim()
  }
}

function FormularioDireccionImpreso({
  categoria,
  evento,
  fecha,
  lugar,
  filas,
  onCerrar,
}: {
  categoria: string
  evento: string
  fecha: string
  lugar: string | null
  filas: FilaFormularioDireccion[]
  onCerrar: () => void
}) {
  const cerrar = useRef(onCerrar)
  cerrar.current = onCerrar

  useEffect(() => {
    const espera = window.setTimeout(() => window.print(), 100)
    const listo = () => cerrar.current()
    window.addEventListener('afterprint', listo)
    return () => {
      window.clearTimeout(espera)
      window.removeEventListener('afterprint', listo)
    }
  }, [])

  const contexto = [evento, fecha ? formatFechaEmision(fecha) : '', lugar].filter(Boolean).join(' · ')

  return createPortal(
    <>
      <style>{ESTILO_IMPRESION}</style>
      <div id="formulario-direccion" className="hidden text-black print:block">
        <div className="flex items-start justify-between gap-4 border-b border-black pb-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">ADOPASO</p>
            <h1 className="mt-1 text-base font-semibold uppercase">Formulario dirección de eventos</h1>
            <p className="mt-1 text-sm font-semibold uppercase">{categoria}</p>
            {contexto ? <p className="text-xs">{contexto}</p> : null}
          </div>
          <p className="shrink-0 border border-black px-2 py-1 text-center text-[10px] font-semibold leading-tight">
            FORMATO
            <br />
            CLASE
          </p>
        </div>
        <table className="mt-3 w-full border-collapse text-left">
          <thead>
            <tr>
              {COLUMNAS.map((columna) => (
                <th key={columna} className="border border-black px-1 py-1 text-[9px] font-semibold uppercase">
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id}>
                <td className="border border-black px-1 py-1 text-[9px] font-semibold">{fila.numero ?? ''}</td>
                <td className="border border-black px-1 py-1 text-[9px]">{fila.registro ?? ''}</td>
                <td className="border border-black px-1 py-1 text-[9px]">{fila.asociacion ?? ''}</td>
                <td className="border border-black px-1 py-1 text-[9px] font-semibold uppercase">{texto(fila.nombre)}</td>
                <td className="border border-black px-1 py-1 text-[9px]">{sexo(fila.sexo)}</td>
                <td className="border border-black px-1 py-1 text-[9px]">
                  {fila.nacimiento ? formatFechaRegistro(fila.nacimiento) : ''}
                </td>
                <td className="border border-black px-1 py-1 text-[9px]">{texto(fila.padre)}</td>
                <td className="border border-black px-1 py-1 text-[9px]">{texto(fila.madre)}</td>
                <td className="border border-black px-1 py-1 text-[9px]">{texto(fila.criador)}</td>
                <td className="border border-black px-1 py-1 text-[9px]">{texto(fila.propietario)}</td>
                <td className="border border-black px-1 py-1 text-[9px]">{texto(fila.montador)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length === 0 ? <p className="mt-3 text-xs">Sin ejemplares inscritos.</p> : null}
      </div>
    </>,
    document.body,
  )
}

export function BotonFormularioDireccion({
  claseId,
  categoria,
  evento,
  fecha,
  lugar,
  onError,
}: {
  claseId: string
  categoria: string
  evento: string
  fecha: string
  lugar: string | null
  onError: (mensaje: string) => void
}) {
  const [cargando, setCargando] = useState(false)
  const [filas, setFilas] = useState<FilaFormularioDireccion[] | null>(null)
  const [ticket, setTicket] = useState(0)

  return (
    <>
      <button
        type="button"
        className="typo-btn rounded-[10px] border border-gold/70 px-3 py-1.5 text-sm text-gold disabled:opacity-60"
        disabled={cargando}
        title="Imprime el formulario de dirección de eventos, sin fondo"
        onClick={() => {
          setCargando(true)
          cargarFormularioDireccion(claseId)
            .then((datos) => {
              setFilas(datos)
              setTicket((actual) => actual + 1)
            })
            .catch((err: unknown) => {
              onError(err instanceof Error ? err.message : 'No se pudo preparar el formulario.')
            })
            .finally(() => setCargando(false))
        }}
      >
        {cargando ? 'Preparando…' : 'Imprimir formulario'}
      </button>
      {filas ? (
        <FormularioDireccionImpreso
          key={ticket}
          categoria={categoria}
          evento={evento}
          fecha={fecha}
          lugar={lugar}
          filas={filas}
          onCerrar={() => setFilas(null)}
        />
      ) : null}
    </>
  )
}
