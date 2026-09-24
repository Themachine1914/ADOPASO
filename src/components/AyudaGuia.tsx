import { Link } from 'react-router-dom'

/** Enlace «¿Cómo se usa?» a la categoría correspondiente de la Guía de uso. */
export function AyudaGuia({ id }: { id: string }) {
  return (
    <Link
      to={`/admin/guia#${id}`}
      className="typo-meta inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-2 font-medium text-gold transition-colors hover:border-gold/50 hover:text-gold-soft"
    >
      <span aria-hidden>?</span> ¿Cómo se usa?
    </Link>
  )
}
