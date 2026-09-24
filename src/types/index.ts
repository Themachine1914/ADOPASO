export type HealthStatus = 'al_dia' | 'por_vencer' | 'vencida' | 'sin_registro'

/** Certificado de virus / prueba EIA (anemia infecciosa equina). */
export interface VirusCertificate {
  testedAt: string
  validUntil: string
  result: 'negativo' | 'positivo'
  lab: string
  certificateNumber: string
}
