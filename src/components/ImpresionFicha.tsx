import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CertificadoRegistro } from './CertificadoRegistro'
import { Genealogia } from './Genealogia'
import { formatDate, formatPoints, placeLabel } from '../lib/format'
import { generaciones, tieneGenealogia } from '../lib/genealogia'
import { imprimirDocumento, type DocumentoImpreso } from '../lib/impresion'
import { cargarHistorialCaballo, fichaCaballo } from '../lib/publico'
import type { CaballoPublico, ResultadoPublico } from '../types/publico'

export function BotonImprimir({
  documento,
  children,
  className,
  origen,
  disabled,
}: {
  documento: DocumentoImpreso
  children: string
  className?: string
  origen?: 'admin'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={() => imprimirDocumento(documento, origen)}
    >
      {children}
    </button>
  )
}

export function HistorialImpreso({
  horse,
  filas,
  anio,
  puntos,
}: {
  horse: CaballoPublico
  filas: ResultadoPublico[]
  anio: number | null
  puntos: number
}) {
  return (
    <article className="solo-impresion-historial rounded-[18px] bg-[#f4efe4] p-1.5 text-[#1c1408]">
      <div className="rounded-[14px] border-2 border-[#1c1408] p-1">
        <div className="rounded-[10px] border border-[#1c1408] px-6 py-8">
          <header className="text-center">
            <img src="/logo-adopaso.png" alt="" className="mx-auto h-14 w-auto" />
            <p className="mt-3 font-display text-lg leading-tight">
              Asociación Dominicana de Caballos de Paso, Inc.
            </p>
            <h2 className="mt-4 font-display text-2xl font-semibold uppercase tracking-wide">
              Historial de competencias
            </h2>
            <p className="mt-3 text-base">
              <span className="font-semibold uppercase">{horse.nombre}</span>
              {' · '}
              {horse.codigo}
            </p>
            <p className="mt-1 text-sm uppercase tracking-wide">
              {anio ? `Año ${anio}` : 'Todas las competencias'} · {formatPoints(puntos)} puntos
            </p>
          </header>

          {filas.length === 0 ? (
            <p className="mt-8 text-center text-sm">
              Sin competencias registradas{anio ? ` en ${anio}` : ''}.
            </p>
          ) : (
            <table className="mt-8 w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-[#1c1408] py-2 pr-3 font-semibold">Fecha</th>
                  <th className="border-b border-[#1c1408] py-2 pr-3 font-semibold">Competencia</th>
                  <th className="border-b border-[#1c1408] py-2 pr-3 font-semibold">Lugar</th>
                  <th className="border-b border-[#1c1408] py-2 pr-3 text-right font-semibold">Puesto</th>
                  <th className="border-b border-[#1c1408] py-2 text-right font-semibold">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((entry, index) => (
                  <tr key={`${entry.fecha}-${entry.clase}-${index}`}>
                    <td className="border-b border-[#1c1408]/25 py-2 pr-3 align-top">{formatDate(entry.fecha)}</td>
                    <td className="border-b border-[#1c1408]/25 py-2 pr-3 align-top">
                      {entry.clase || entry.tipo || 'Competencia'}
                      {entry.campeon ? ' · Campeón' : ''}
                    </td>
                    <td className="border-b border-[#1c1408]/25 py-2 pr-3 align-top">
                      {entry.lugar}
                      {entry.tipo ? ` · ${entry.tipo}` : ''}
                    </td>
                    <td className="border-b border-[#1c1408]/25 py-2 pr-3 text-right align-top">
                      {entry.puesto ? placeLabel(entry.puesto) : '—'}
                    </td>
                    <td className="border-b border-[#1c1408]/25 py-2 text-right align-top tabular-nums">
                      {formatPoints(entry.puntos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </article>
  )
}

const BOTON_ADMIN = 'typo-btn rounded-[10px] border border-border px-4 py-2 text-ink hover:bg-bg disabled:opacity-50'

/** Botones de impresión en el detalle del registro, y las hojas que salen al imprimir. */
export function ImpresionRegistroAdmin({ fila }: { fila: Record<string, unknown> }) {
  const horse = useMemo(() => fichaCaballo(fila), [fila])
  const [historial, setHistorial] = useState<ResultadoPublico[] | null>(null)
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setHistorial(null)
    setErrorHistorial(null)
    cargarHistorialCaballo(horse.codigo)
      .then((filas) => {
        if (!cancelado) setHistorial(filas)
      })
      .catch((err: Error) => {
        if (!cancelado) setErrorHistorial(err.message)
      })
    return () => {
      cancelado = true
    }
  }, [horse.codigo])

  const puntos = (historial ?? []).reduce((sum, entrada) => sum + entrada.puntos, 0)
  const hojas = (
    <>
      <div className="hoja-admin doc-certificado">
        <CertificadoRegistro horse={horse} />
      </div>
      {tieneGenealogia(horse) ? (
        <div className="hoja-admin doc-genealogia">
          <Genealogia horseId={horse.codigo} columnas={generaciones(horse)} />
        </div>
      ) : null}
      <div className="hoja-admin doc-historial">
        <HistorialImpreso horse={horse} filas={historial ?? []} anio={null} puntos={puntos} />
      </div>
    </>
  )

  return (
    <>
      <BotonImprimir documento="certificado" origen="admin" className={BOTON_ADMIN}>
        Imprimir certificado
      </BotonImprimir>
      {tieneGenealogia(horse) ? (
        <BotonImprimir documento="genealogia" origen="admin" className={BOTON_ADMIN}>
          Imprimir genealogía
        </BotonImprimir>
      ) : null}
      <BotonImprimir
        documento="historial"
        origen="admin"
        className={BOTON_ADMIN}
        disabled={historial === null}
      >
        Imprimir historial
      </BotonImprimir>
      {errorHistorial ? (
        <p role="alert" className="typo-caption basis-full text-flag-red">
          {errorHistorial}
        </p>
      ) : null}
      {createPortal(hojas, document.body)}
    </>
  )
}
