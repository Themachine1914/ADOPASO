export type Year = 2025 | 2026

export interface CompetitionResult {
  competitionId: string
  points: number
  place: number
}

export interface Horse {
  id: string
  name: string
  owner: string
  stable: string
  photo: string
  sex: 'macho' | 'hembra'
  birthYear: number
  pointsByYear: Record<Year, number>
  history: CompetitionResult[]
}

export interface Competition {
  id: string
  name: string
  date: string
  location: string
  year: Year
  status: 'completed' | 'upcoming'
}

export interface RankedHorse extends Horse {
  position: number
  points: number
}
