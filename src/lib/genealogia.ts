import type { Ancestro, CaballoPublico } from '../types/publico'

export interface NodoGenealogia {
  id: string
  etiqueta: string
  nombre: string | null
  codigo: string | null
}

const VACIO: Ancestro = { codigo: null, nombre: null }

function nodo(id: string, etiqueta: string, ancestro: Ancestro | undefined): NodoGenealogia {
  return {
    id,
    etiqueta,
    nombre: ancestro?.nombre ?? null,
    codigo: ancestro?.codigo ?? null,
  }
}

export function ancestroDe(mapa: Record<string, Ancestro>, clave: string): Ancestro {
  return mapa[clave] ?? VACIO
}

/** Cuatro generaciones, en el mismo orden que la hoja de genealogía: padre arriba, madre abajo. */
export function generaciones(horse: CaballoPublico): NodoGenealogia[][] {
  const a = horse.ancestros
  return [
    [{ id: 'ejemplar', etiqueta: 'Ejemplar', nombre: horse.nombre, codigo: horse.codigo }],
    [
      { id: 'padre', etiqueta: 'Padre', nombre: horse.padre, codigo: horse.padreCodigo },
      { id: 'madre', etiqueta: 'Madre', nombre: horse.madre, codigo: horse.madreCodigo },
    ],
    [
      nodo('pabuelo', 'Abuelo paterno', ancestroDe(a, 'copabuelo')),
      nodo('pabuela', 'Abuela paterna', ancestroDe(a, 'copabuela')),
      nodo('mabuelo', 'Abuelo materno', ancestroDe(a, 'compabuelo')),
      nodo('mabuela', 'Abuela materna', ancestroDe(a, 'commabuela')),
    ],
    [
      nodo('papbiso', 'Padre del abuelo paterno', ancestroDe(a, 'copapbiso')),
      nodo('pambisa', 'Madre del abuelo paterno', ancestroDe(a, 'copambisa')),
      nodo('pmabiso', 'Padre de la abuela paterna', ancestroDe(a, 'copmabiso')),
      nodo('pmabisa', 'Madre de la abuela paterna', ancestroDe(a, 'copmabisa')),
      nodo('mpabiso', 'Padre del abuelo materno', ancestroDe(a, 'compabiso')),
      nodo('mpabisa', 'Madre del abuelo materno', ancestroDe(a, 'compabisa')),
      nodo('mmabiso', 'Padre de la abuela materna', ancestroDe(a, 'commabiso')),
      nodo('mmabisa', 'Madre de la abuela materna', ancestroDe(a, 'commabisa')),
    ],
  ]
}

export function tieneGenealogia(horse: CaballoPublico): boolean {
  return generaciones(horse)
    .slice(1)
    .some((col) => col.some((n) => n.nombre || n.codigo))
}

export function codigoEnlazable(codigo: string | null, actual: string): string | null {
  if (!codigo) return null
  const limpio = codigo.trim()
  if (!limpio || limpio === actual || /^O-0+$/i.test(limpio)) return null
  return limpio
}
