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
        <div className="flex flex-col items-start gap-1 md:items-end">
          <p className="typo-caption">
            Ranking Oficial {new Date().getFullYear()} · República Dominicana
          </p>
          <a
            href="https://www.facilapp.lat"
            target="_blank"
            rel="noopener noreferrer"
            className="typo-caption transition-colors hover:text-gold"
          >
            Desarrollada por FacilApp
          </a>
        </div>
      </div>
    </footer>
  )
}
