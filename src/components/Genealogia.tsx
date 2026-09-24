import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { codigoEnlazable, type NodoGenealogia } from '../lib/genealogia'

function Nombre({ nodo, actual }: { nodo: NodoGenealogia; actual: string }) {
  const codigo = codigoEnlazable(nodo.codigo, actual)
  const nombre = nodo.nombre
  if (!nombre && !codigo) {
    return <span className="block h-6 border-b border-[#1c1408]/45" aria-label={`${nodo.etiqueta}, sin dato`} />
  }
  const contenido = (
    <>
      <span className="block border-b border-[#1c1408] pb-0.5 font-semibold uppercase leading-snug">
        {nombre || codigo}
      </span>
      {codigo && nombre ? <span className="mt-0.5 block text-[0.65rem] tracking-wide text-[#5c5346]">{codigo}</span> : null}
    </>
  )
  if (!codigo) {
    return (
      <div className="text-sm" aria-label={`${nodo.etiqueta}: ${nombre}`}>
        {contenido}
      </div>
    )
  }
  return (
    <Link
      to={`/caballo/${encodeURIComponent(codigo)}`}
      className="block text-sm hover:text-[#8a6a12]"
      aria-label={`${nodo.etiqueta}: ${nombre || codigo}`}
    >
      {contenido}
    </Link>
  )
}

function Celda({
  nodo,
  actual,
  column,
  row,
  span,
}: {
  nodo: NodoGenealogia
  actual: string
  column: number
  row: number
  span: number
}) {
  return (
    <div
      className="flex items-center"
      style={{ gridColumn: column, gridRow: `${row} / span ${span}` }}
    >
      <div className="w-full">
        <Nombre nodo={nodo} actual={actual} />
      </div>
    </div>
  )
}

function Rama({ nodo, actual, children }: { nodo: NodoGenealogia; actual: string; children?: ReactNode }) {
  return (
    <li>
      <p className="text-[0.65rem] uppercase tracking-widest text-[#6b6256]">{nodo.etiqueta}</p>
      <Nombre nodo={nodo} actual={actual} />
      {children ? <ul className="mt-3 space-y-3 border-l border-[#1c1408]/25 pl-3">{children}</ul> : null}
    </li>
  )
}

export function Genealogia({ horseId, columnas }: { horseId: string; columnas: NodoGenealogia[][] }) {
  const [, padres, abuelos, bis] = columnas
  const [padre, madre] = padres
  const [pabuelo, pabuela, mabuelo, mabuela] = abuelos
  const [papbiso, pambisa, pmabiso, pmabisa, mpabiso, mpabisa, mmabiso, mmabisa] = bis

  return (
    <article className="rounded-[18px] bg-[#f4efe4] p-1.5 text-[#1c1408] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="rounded-[14px] border-2 border-[#1c1408] p-1">
        <div className="rounded-[10px] border border-[#1c1408] px-4 py-8 sm:px-8">
          <h2 className="text-center font-display text-2xl font-semibold tracking-[0.18em]">Genealogía</h2>
          <p className="mt-2 text-center text-xs text-[#5c5346]">
            Cuatro generaciones. Arriba la línea del padre y abajo la de la madre.
          </p>

          <div className="mt-8 hidden h-[40rem] md:grid md:grid-cols-4 md:grid-rows-8 md:gap-x-6">
            <Celda nodo={columnas[0][0]} actual={horseId} column={1} row={1} span={8} />
            <Celda nodo={padre} actual={horseId} column={2} row={1} span={4} />
            <Celda nodo={madre} actual={horseId} column={2} row={5} span={4} />
            <Celda nodo={pabuelo} actual={horseId} column={3} row={1} span={2} />
            <Celda nodo={pabuela} actual={horseId} column={3} row={3} span={2} />
            <Celda nodo={mabuelo} actual={horseId} column={3} row={5} span={2} />
            <Celda nodo={mabuela} actual={horseId} column={3} row={7} span={2} />
            <Celda nodo={papbiso} actual={horseId} column={4} row={1} span={1} />
            <Celda nodo={pambisa} actual={horseId} column={4} row={2} span={1} />
            <Celda nodo={pmabiso} actual={horseId} column={4} row={3} span={1} />
            <Celda nodo={pmabisa} actual={horseId} column={4} row={4} span={1} />
            <Celda nodo={mpabiso} actual={horseId} column={4} row={5} span={1} />
            <Celda nodo={mpabisa} actual={horseId} column={4} row={6} span={1} />
            <Celda nodo={mmabiso} actual={horseId} column={4} row={7} span={1} />
            <Celda nodo={mmabisa} actual={horseId} column={4} row={8} span={1} />
          </div>

          <div className="mt-8 md:hidden">
            <ul className="space-y-6">
              <Rama nodo={padre} actual={horseId}>
                <Rama nodo={pabuelo} actual={horseId}>
                  <Rama nodo={papbiso} actual={horseId} />
                  <Rama nodo={pambisa} actual={horseId} />
                </Rama>
                <Rama nodo={pabuela} actual={horseId}>
                  <Rama nodo={pmabiso} actual={horseId} />
                  <Rama nodo={pmabisa} actual={horseId} />
                </Rama>
              </Rama>
              <Rama nodo={madre} actual={horseId}>
                <Rama nodo={mabuelo} actual={horseId}>
                  <Rama nodo={mpabiso} actual={horseId} />
                  <Rama nodo={mpabisa} actual={horseId} />
                </Rama>
                <Rama nodo={mabuela} actual={horseId}>
                  <Rama nodo={mmabiso} actual={horseId} />
                  <Rama nodo={mmabisa} actual={horseId} />
                </Rama>
              </Rama>
            </ul>
          </div>
        </div>
      </div>
    </article>
  )
}
