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
    <div className="space-y-3" role="status" aria-label="Cargando ranking">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[12px] border border-border bg-surface p-3"
        >
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-12 w-12 rounded-[10px]" />
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
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Cargando caballos"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[12px] border border-border bg-surface"
        >
          <Skeleton className="aspect-[5/3] rounded-none sm:aspect-[5/3]" />
          <div className="space-y-2 p-3 sm:p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
