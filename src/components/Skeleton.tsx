interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={['animate-pulse rounded-[10px] bg-surface-elevated/80', className].join(' ')}
      aria-hidden="true"
    />
  )
}

export function RankTableSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando ranking">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-3"
        >
          <Skeleton className="h-6 w-6" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-[12rem]" />
            <Skeleton className="h-3 w-1/2 max-w-[9rem]" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

export function HorseGridSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando caballos">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-[12px] border border-border bg-surface px-4 py-3">
          <Skeleton className="h-4 w-1/2 max-w-[14rem]" />
          <Skeleton className="mt-2 h-3 w-1/3 max-w-[8rem]" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
