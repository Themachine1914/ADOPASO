export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-app flex flex-col gap-3 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-gold">ADOPASO</p>
          <p className="mt-1 text-sm text-muted">
            Asociación Dominicana de Caballos de Paso
          </p>
        </div>
        <p className="text-xs text-muted">
          Ranking Oficial {new Date().getFullYear()} · República Dominicana
        </p>
      </div>
    </footer>
  )
}
