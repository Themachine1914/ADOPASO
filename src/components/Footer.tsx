export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-app flex flex-col gap-3 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="typo-eyebrow">ADOPASO</p>
          <p className="typo-meta mt-1">
            Asociación Dominicana de Caballos de Paso
          </p>
        </div>
        <p className="typo-caption">
          Ranking Oficial {new Date().getFullYear()} · República Dominicana
        </p>
      </div>
    </footer>
  )
}
