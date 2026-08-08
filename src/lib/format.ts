export function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('es-DO').format(points)
}

export function placeLabel(place: number): string {
  return `${place}º`
}
