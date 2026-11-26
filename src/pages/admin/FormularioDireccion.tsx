import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cargarFormularioDireccion, type FilaFormularioDireccion } from '../../lib/competencia'
import { formatFechaEmision, formatFechaRegistro, formatNombre } from '../../lib/format'

const COLUMNAS = ['No.', 'Registro', 'Asoc.', 'Nombre', 'Sexo', 'Nacimiento', 'Padre', 'Madre', 'Criador', 'Propietario', 'Montador']

/**
 * Misma hoja que «Libretas y cómputo»: doble marco, título en serif y filas
 * subrayadas. Sin relleno, para que la impresora no gaste tinta en el fondo.
 */
const ESTILO_IMPRESION = `
@page {
  size: letter landscape;
  margin: 8mm;
}
@media print {
  html, body {
    background: #fff !important;
    background-image: none !important;
    color: #1c1408 !important;
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
    box-shadow: none !important;
    color: #1c1408 !important;
    print-color-adjust: economy !important;
    -webkit-print-color-adjust: economy !important;
  }
  #formulario-direccion, #formulario-direccion * {
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
    color: #1c1408 !important;
  }
  #formulario-direccion .marco {
    border: 2px solid #1c1408 !important;
    border-radius: 12px;
    padding: 4px;
  }
  #formulario-direccion .marco-interno {
    border: 1px solid #1c1408 !important;
    border-radius: 8px;
    padding: 14px 16px 16px;
  }
  #formulario-direccion .sello {
    border: 1px solid #1c1408 !important;
  }
  #formulario-direccion table {
    width: 100%;
    border-collapse: collapse;
  }
  #formulario-direccion th,
  #formulario-direccion td {
    border: none !important;
    padding: 5px 6px;
    font-size: 10px;
    text-align: left;
    vertical-align: top;
  }
  #formulario-direccion thead {
    display: table-header-group;
  }
  #formulario-direccion thead tr {
    border-bottom: 1.5px solid #1c1408 !important;
  }
  #formulario-direccion tbody tr {
    border-bottom: 1px solid rgba(28, 20, 8, 0.28) !important;
    break-inside: avoid;
  }
}
`

function texto(valor: string | null | undefined): string {
  const formateado = formatNombre(valor)
  return formateado === '—' ? '' : formateado
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
      <div id="formulario-direccion" className="hidden text-[#1c1408] print:block">
        <div className="marco rounded-[12px] border-2 border-[#1c1408] p-1">
          <div className="marco-interno rounded-[8px] border border-[#1c1408] px-4 py-5 sm:px-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h1 className="font-display text-lg font-semibold uppercase leading-tight">Formulario dirección de eventos</h1>
              <p className="sello shrink-0 border border-[#1c1408] px-2 py-1 text-center text-xs font-bold leading-tight">
                FORMATO
                <br />
                CLASE
              </p>
            </div>
            <div className="mb-4 space-y-1 text-sm">
              <p>
                Categoría: <strong className="uppercase">{categoria}</strong>
              </p>
              <p>
                Ejemplares: <strong>{filas.length}</strong>
              </p>
              {contexto ? <p>{contexto}</p> : null}
            </div>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#1c1408]">
                  {COLUMNAS.map((columna) => (
                    <th key={columna} className="px-2 py-2 font-semibold uppercase">
                      {columna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className="border-b border-[#1c1408]/30">
                    <td className="px-2 py-2 font-semibold">{fila.numero ?? ''}</td>
                    <td className="px-2 py-2">{fila.registro ?? ''}</td>
                    <td className="px-2 py-2">{fila.asociacion ?? ''}</td>
                    <td className="px-2 py-2 font-semibold uppercase">{texto(fila.nombre)}</td>
                    <td className="px-2 py-2">{fila.sexo ?? ''}</td>
                    <td className="px-2 py-2">{fila.nacimiento ? formatFechaRegistro(fila.nacimiento) : ''}</td>
                    <td className="px-2 py-2">{texto(fila.padre)}</td>
                    <td className="px-2 py-2">{texto(fila.madre)}</td>
                    <td className="px-2 py-2">{texto(fila.criador)}</td>
                    <td className="px-2 py-2">{texto(fila.propietario)}</td>
                    <td className="px-2 py-2">{texto(fila.montador)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length === 0 ? <p className="mt-3 text-sm">Sin ejemplares inscritos.</p> : null}
          </div>
        </div>
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
