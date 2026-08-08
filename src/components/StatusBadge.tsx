import { healthStatusLabel } from '../lib/health'
import type { HealthStatus } from '../types'

const styles: Record<HealthStatus, string> = {
  al_dia: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  por_vencer: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  vencida: 'border-flag-red/50 bg-flag-red/15 text-red-300',
  sin_registro: 'border-border bg-border/40 text-muted',
}

interface StatusBadgeProps {
  status: HealthStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={[
        'typo-label inline-flex items-center rounded-[8px] border px-2.5 py-1',
        styles[status],
      ].join(' ')}
    >
      {healthStatusLabel(status)}
    </span>
  )
}
