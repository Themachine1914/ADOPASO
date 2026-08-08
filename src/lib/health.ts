import type { HealthStatus, VirusCertificate } from '../types'

const WARN_DAYS = 30

function daysUntil(dateStr: string, now = new Date()): number {
  const target = new Date(`${dateStr}T12:00:00`)
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function healthStatusFromDue(dueDate: string | undefined | null, now = new Date()): HealthStatus {
  if (!dueDate) return 'sin_registro'
  const days = daysUntil(dueDate, now)
  if (days < 0) return 'vencida'
  if (days <= WARN_DAYS) return 'por_vencer'
  return 'al_dia'
}

export function virusCertificateStatus(
  cert: VirusCertificate | null,
  now = new Date(),
): HealthStatus {
  if (!cert) return 'sin_registro'
  if (cert.result === 'positivo') return 'vencida'
  return healthStatusFromDue(cert.validUntil, now)
}

export function healthStatusLabel(status: HealthStatus): string {
  switch (status) {
    case 'al_dia':
      return 'Al día'
    case 'por_vencer':
      return 'Por vencer'
    case 'vencida':
      return 'Vencida'
    default:
      return 'Sin registro'
  }
}

export function sexLabel(sex: string): string {
  switch (sex) {
    case 'macho':
      return 'Macho'
    case 'yegua':
      return 'Yegua'
    case 'capon':
      return 'Castrado / Capón'
    default:
      return sex
  }
}
