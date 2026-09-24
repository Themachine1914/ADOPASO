const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

const MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const

function fechaLocal(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const date = new Date(`${dateStr}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Fecha de nacimiento como en el certificado: 08-FEB-2010. */
export function formatFechaRegistro(dateStr: string): string {
  const date = fechaLocal(dateStr)
  if (!date) return dateStr
  const dia = String(date.getDate()).padStart(2, '0')
  return `${dia}-${MESES_CORTOS[date.getMonth()]}-${date.getFullYear()}`
}

/** Fecha de emisión del certificado: 23 de febrero de 2012. */
export function formatFechaEmision(dateStr: string): string {
  const date = fechaLocal(dateStr)
  if (!date) return dateStr
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateParts(dateStr: string): { day: string; month: string; year: string } {
  const date = new Date(`${dateStr}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('es-DO', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('es-DO', { month: 'short' })
      .format(date)
      .replace('.', ''),
    year: new Intl.DateTimeFormat('es-DO', { year: 'numeric' }).format(date),
  }
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('es-DO').format(points)
}

/** Nombres del histórico vienen en MAYÚSCULAS; se muestran en título. */
export function formatNombre(value: string | null | undefined): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (!trimmed) return '—'
  return trimmed
    .toLocaleLowerCase('es-DO')
    .replace(/(^|[\s/\\.,\-'(])\S/g, (chunk) => chunk.toLocaleUpperCase('es-DO'))
}

export function placeLabel(place: number): string {
  return `${place}º`
}
