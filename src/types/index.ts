export type Year = 2025 | 2026

export type HorseSex = 'macho' | 'yegua' | 'capon'

export type HealthStatus = 'al_dia' | 'por_vencer' | 'vencida' | 'sin_registro'

export interface CompetitionResult {
  competitionId: string
  points: number
  place: number
}

/** Certificado de virus / prueba EIA (anemia infecciosa equina). */
export interface VirusCertificate {
  testedAt: string
  validUntil: string
  result: 'negativo' | 'positivo'
  lab: string
  certificateNumber: string
}

export interface Horse {
  id: string
  name: string
  owner: string
  stable: string
  photo: string
  sex: HorseSex
  birthDate: string
  color: string
  sireName: string
  damName: string
  maternalGrandsire: string
  paternalGrandsire: string
  pointsByYear: Record<Year, number>
  history: CompetitionResult[]
  virusCertificate: VirusCertificate | null
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
