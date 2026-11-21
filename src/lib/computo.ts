/** Lugares de la libreta F-2, en el orden del papel. */
export const LUGARES_F2 = ['GC', 'GCR', 'MJ', '1', '2', '3', '4', '5'] as const
export type LugarF2 = (typeof LUGARES_F2)[number]

export const LUGARES_PUESTO = ['1', '2', '3', '4', '5'] as const

/** Reglamento 2019: donde un juez no puso al ejemplar en su votación final, cuenta como 6. */
export const SIN_VOTO = 6

export const LEYENDA_F2: Record<(typeof LUGARES_F2)[number], string> = {
  GC: 'Gran campeón',
  GCR: 'Gran campeón de reserva',
  MJ: 'MJ',
  '1': 'Primer lugar',
  '2': 'Segundo lugar',
  '3': 'Tercer lugar',
  '4': 'Cuarto lugar',
  '5': 'Quinto lugar',
}

export interface FilaComputo {
  numero: number
  nombre: string
  porJuez: Array<number | null>
  total: number | null
  completo: boolean
  puesto: number | null
}

interface EjemplarComputo {
  numero: number
  nombre: string
  escogido: boolean
}

interface VotoComputo {
  juezPuesto: number
  lugar: string
  ejemplarNumero: number
}

/**
 * Hoja de cómputo: cada juez aporta el número de lugar (1 es mejor); si un juez no lo votó, cuenta
 * SIN_VOTO (6). Entra en el orden todo ejemplar con al menos un voto. Gana la suma más baja; si
 * empatan, gana quien tenga más primeros, luego más segundos… y por último el número menor.
 */
export function hojaDeComputo(
  ejemplares: EjemplarComputo[],
  jueces: number[],
  votos: VotoComputo[],
): FilaComputo[] {
  const puestos = new Set<string>(LUGARES_PUESTO)
  const escogidos = ejemplares.filter((e) => e.escogido).sort((a, b) => a.numero - b.numero)

  const filas: FilaComputo[] = escogidos.map((ejemplar) => {
    const porJuez = jueces.map((puesto) => {
      const voto = votos.find(
        (v) => v.juezPuesto === puesto && v.ejemplarNumero === ejemplar.numero && puestos.has(v.lugar),
      )
      return voto ? Number(voto.lugar) : null
    })
    const completo = jueces.length > 0 && porJuez.every((n) => n != null)
    const votado = jueces.length > 0 && porJuez.some((n) => n != null)
    const total = votado ? porJuez.reduce<number>((suma, n) => suma + (n ?? SIN_VOTO), 0) : null
    return { numero: ejemplar.numero, nombre: ejemplar.nombre, porJuez, total, completo, puesto: null }
  })

  const ordenadas = filas
    .filter((fila) => fila.total != null)
    .sort((a, b) => {
      if (a.total !== b.total) return (a.total ?? 0) - (b.total ?? 0)
      for (let lugar = 1; lugar <= 5; lugar += 1) {
        const deA = a.porJuez.filter((n) => n === lugar).length
        const deB = b.porJuez.filter((n) => n === lugar).length
        if (deA !== deB) return deB - deA
      }
      return a.numero - b.numero
    })

  ordenadas.forEach((fila, indice) => {
    const original = filas.find((item) => item.numero === fila.numero)
    if (original) original.puesto = indice + 1
  })

  return filas
}

export interface CerteroJuez {
  juezPuesto: number
  aciertos: number
}

/**
 * Juez más certero de la votación final: cuántos ejemplares puso en el mismo lugar que el resultado
 * final (1.º al 5.º). El que más aciertos tenga narra los lugares; si empatan, deciden ellos.
 */
export function juezMasCertero(
  computo: FilaComputo[],
  jueces: number[],
  votos: VotoComputo[],
): { porJuez: CerteroJuez[]; ganadores: number[] } {
  const finalPorLugar = new Map<string, number>()
  for (const fila of computo) {
    if (fila.puesto != null && fila.puesto <= LUGARES_PUESTO.length) finalPorLugar.set(String(fila.puesto), fila.numero)
  }
  const porJuez = jueces.map((juezPuesto) => ({
    juezPuesto,
    aciertos: votos.filter((v) => v.juezPuesto === juezPuesto && finalPorLugar.get(v.lugar) === v.ejemplarNumero).length,
  }))
  const mejor = Math.max(0, ...porJuez.map((j) => j.aciertos))
  const ganadores = finalPorLugar.size === 0 ? [] : porJuez.filter((j) => j.aciertos === mejor).map((j) => j.juezPuesto)
  return { porJuez, ganadores }
}
