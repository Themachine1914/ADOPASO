import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cargarFormularioDireccion, type FilaFormularioDireccion } from '../../lib/competencia'
import { formatFechaEmision, formatFechaRegistro, formatNombre } from '../../lib/format'

const COLUMNAS = ['No.', 'Registro', 'Asoc.', 'Nombre', 'Sexo', 'Nacimiento', 'Padre', 'Madre', 'Abuelo materno', 'Criador', 'Propietario', 'Montador']

/** Anchos como en la tabla de Libretas y cómputo, para que los nombres partan igual. */
const ANCHOS = ['4%', '8%', '7%', '12%', '4%', '8%', '9%', '9%', '10%', '10%', '10%', '9%']

/**
 * La misma tabla de «Libretas y cómputo», en hoja blanca. El estilo de impresión
 * solo quita el relleno; no cambia el tipo ni el aire de las filas.
 */
const ESTILO_IMPRESION = `
@page {
  size: letter landscape;
  margin: 12mm;
}
@media print {
  html, body {
    background: #fff !important;
    background-image: none !important;
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
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    color: #1c1408 !important;
  }
  #formulario-direccion, #formulario-direccion * {
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
    text-transform: uppercase !important;
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
      <div id="formulario-direccion" className="hidden font-sans text-xs uppercase text-[#1c1408] print:block">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold uppercase leading-tight">Formulario dirección de eventos</h1>
            <p className="mt-2 text-sm">
              <span className="font-semibold uppercase">{categoria}</span>
              {contexto ? <span className="mt-0.5 block font-normal">{contexto}</span> : null}
            </p>
          </div>
          <p className="shrink-0 border border-[#1c1408] px-2 py-1 text-center text-xs font-bold leading-tight">
            FORMATO
            <br />
            CLASE
          </p>
        </div>
        <table className="w-full table-fixed border-collapse text-left text-xs leading-5">
          <colgroup>
            {ANCHOS.map((ancho, indice) => (
              <col key={indice} style={{ width: ancho }} />
            ))}
          </colgroup>
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
              <tr key={fila.id} className="border-b border-[#1c1408]/20">
                <td className="px-2 py-2 align-top font-semibold">{fila.numero ?? ''}</td>
                <td className="px-2 py-2 align-top">{fila.registro ?? ''}</td>
                <td className="px-2 py-2 align-top">{fila.asociacion ?? ''}</td>
                <td className="px-2 py-2 align-top font-semibold uppercase">{texto(fila.nombre)}</td>
                <td className="px-2 py-2 align-top">{fila.sexo ?? ''}</td>
                <td className="px-2 py-2 align-top">{fila.nacimiento ? formatFechaRegistro(fila.nacimiento) : ''}</td>
                <td className="px-2 py-2 align-top">{texto(fila.padre)}</td>
                <td className="px-2 py-2 align-top">{texto(fila.madre)}</td>
                <td className="px-2 py-2 align-top">{texto(fila.abueloMaterno)}</td>
                <td className="px-2 py-2 align-top">{texto(fila.criador)}</td>
                <td className="px-2 py-2 align-top">{texto(fila.propietario)}</td>
                <td className="px-2 py-2 align-top">{texto(fila.montador)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filas.length === 0 ? <p className="mt-3 text-sm">Sin ejemplares inscritos.</p> : null}
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
