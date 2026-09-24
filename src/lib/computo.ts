/** Lugares de la libreta F-2, en el orden del papel. */
export const LUGARES_F2 = ['GC', 'GCR', 'MJ', '1', '2', '3', '4', '5'] as const
export type LugarF2 = (typeof LUGARES_F2)[number]

export const LUGARES_PUESTO = ['1', '2', '3', '4', '5'] as const

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
 * Hoja de cómputo: cada juez aporta el número de lugar (1 es mejor).
 * Gana la suma más baja. Si empatan, gana quien tenga más primeros, luego más segundos.
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
    const total = completo ? porJuez.reduce<number>((suma, n) => suma + (n ?? 0), 0) : null
    return { numero: ejemplar.numero, nombre: ejemplar.nombre, porJuez, total, completo, puesto: null }
  })

  const ordenadas = filas
    .filter((fila) => fila.completo && fila.total != null)
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
