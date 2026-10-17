import type { Ancestro, CaballoPublico } from '../types/publico'

export interface NodoGenealogia {
  id: string
  etiqueta: string
  nombre: string | null
  codigo: string | null
}

const VACIO: Ancestro = { codigo: null, nombre: null }

const ABUELOS = [
  { id: 'pabuelo', clave: 'copabuelo', etiqueta: 'Abuelo paterno' },
  { id: 'pabuela', clave: 'copabuela', etiqueta: 'Abuela paterna' },
  { id: 'mabuelo', clave: 'compabuelo', etiqueta: 'Abuelo materno' },
  { id: 'mabuela', clave: 'commabuela', etiqueta: 'Abuela materna' },
] as const

const BISABUELOS = [
  { id: 'papbiso', clave: 'copapbiso', etiqueta: 'Padre del abuelo paterno' },
  { id: 'pambisa', clave: 'copambisa', etiqueta: 'Madre del abuelo paterno' },
  { id: 'pmabiso', clave: 'copmabiso', etiqueta: 'Padre de la abuela paterna' },
  { id: 'pmabisa', clave: 'copmabisa', etiqueta: 'Madre de la abuela paterna' },
  { id: 'mpabiso', clave: 'compabiso', etiqueta: 'Padre del abuelo materno' },
  { id: 'mpabisa', clave: 'compabisa', etiqueta: 'Madre del abuelo materno' },
  { id: 'mmabiso', clave: 'commabiso', etiqueta: 'Padre de la abuela materna' },
  { id: 'mmabisa', clave: 'commabisa', etiqueta: 'Madre de la abuela materna' },
] as const

const POSICIONES = [...ABUELOS, ...BISABUELOS]

export interface LineaAncestro {
  clave: string
  etiqueta: string
  texto: string
}

function textoAncestro(valor: unknown): string | null {
  if (typeof valor === 'string') {
    const texto = valor.trim()
    return texto || null
  }
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null
  const fila = valor as Record<string, unknown>
  const nombre = typeof fila.nombre === 'string' ? fila.nombre.trim() : ''
  const codigo = typeof fila.codigo === 'string' ? fila.codigo.trim() : ''
  if (nombre && codigo && nombre.toLowerCase() !== codigo.toLowerCase()) return `${nombre} · ${codigo}`
  return nombre || codigo || null
}

/** Ancestros de un caballo, en el orden de la genealogía, listos para leer. */
export function describirAncestros(valor: unknown): LineaAncestro[] {
  let datos = valor
  if (typeof datos === 'string') {
    try {
      datos = JSON.parse(datos) as unknown
    } catch {
      return []
    }
  }
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return []
  const mapa = datos as Record<string, unknown>
  const conocidas = new Set<string>(POSICIONES.map((p) => p.clave))
  const extra = Object.keys(mapa)
    .filter((clave) => !conocidas.has(clave))
    .map((clave) => ({ clave, etiqueta: clave.replace(/_/g, ' ') }))
  return [...POSICIONES, ...extra].flatMap((posicion) => {
    const texto = textoAncestro(mapa[posicion.clave])
    return texto ? [{ clave: posicion.clave, etiqueta: posicion.etiqueta, texto }] : []
  })
}

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
    ABUELOS.map((p) => nodo(p.id, p.etiqueta, ancestroDe(a, p.clave))),
    BISABUELOS.map((p) => nodo(p.id, p.etiqueta, ancestroDe(a, p.clave))),
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
