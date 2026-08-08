import type { Competition } from '../types'

export const competitions: Competition[] = [
  {
    id: 'copa-santiago-2025',
    name: 'Copa Santiago de los Caballeros',
    date: '2025-03-15',
    location: 'Santiago de los Caballeros',
    year: 2025,
    status: 'completed',
  },
  {
    id: 'clasico-vega-2025',
    name: 'Clásico Valle de La Vega',
    date: '2025-06-21',
    location: 'La Vega',
    year: 2025,
    status: 'completed',
  },
  {
    id: 'gran-premio-capital-2025',
    name: 'Gran Premio Capital',
    date: '2025-09-13',
    location: 'Santo Domingo',
    year: 2025,
    status: 'completed',
  },
  {
    id: 'copa-santiago-2026',
    name: 'Copa Santiago de los Caballeros',
    date: '2026-02-14',
    location: 'Santiago de los Caballeros',
    year: 2026,
    status: 'completed',
  },
  {
    id: 'clasico-vega-2026',
    name: 'Clásico Valle de La Vega',
    date: '2026-04-18',
    location: 'La Vega',
    year: 2026,
    status: 'completed',
  },
  {
    id: 'copa-este-2026',
    name: 'Copa del Este',
    date: '2026-06-07',
    location: 'Higüey',
    year: 2026,
    status: 'completed',
  },
  {
    id: 'gran-premio-capital-2026',
    name: 'Gran Premio Capital',
    date: '2026-08-22',
    location: 'Santo Domingo',
    year: 2026,
    status: 'upcoming',
  },
  {
    id: 'nacional-adopaso-2026',
    name: 'Nacional ADOPASO',
    date: '2026-11-14',
    location: 'Santiago de los Caballeros',
    year: 2026,
    status: 'upcoming',
  },
]

export function getCompetitionById(id: string): Competition | undefined {
  return competitions.find((c) => c.id === id)
}

export function getCompetitionsByYear(year: number): Competition[] {
  return competitions
    .filter((c) => c.year === year)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getNextCompetition(): Competition | undefined {
  return competitions
    .filter((c) => c.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}
