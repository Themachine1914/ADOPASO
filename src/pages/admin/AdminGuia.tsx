import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GUIA, textoArticulo, type Articulo } from '../../admin/guia'
import { PageHeader } from '../../components/PageHeader'
import { SearchInput } from '../../components/SearchInput'
import { useAuth } from '../../lib/auth-context'
import { matchesSearch } from '../../lib/normalize'

function Pendiente() {
  return (
    <span className="typo-caption ml-2 inline-block rounded-[6px] border border-border px-1.5 py-0.5 align-middle text-muted">
      Todavía no disponible
    </span>
  )
}

function ArticuloGuia({ articulo, abierto }: { articulo: Articulo; abierto: boolean }) {
  const tieneCuerpo = Boolean(articulo.respuesta || articulo.pasos || articulo.nota || articulo.enlace)
  if (!tieneCuerpo) {
    return (
      <li className="px-5 py-4">
        <p className="typo-name text-base">
          {articulo.pregunta}
          {articulo.pendiente ? <Pendiente /> : null}
        </p>
      </li>
    )
  }
  return (
    <li>
      <details open={abierto} className="group px-5 py-4">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
          <span className="typo-name text-base">
            {articulo.pregunta}
            {articulo.pendiente ? <Pendiente /> : null}
          </span>
          <span aria-hidden className="typo-name text-gold transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="mt-3 space-y-3">
          {articulo.respuesta ? <p className="typo-body text-muted">{articulo.respuesta}</p> : null}
          {articulo.pasos ? (
            <ol className="typo-body list-decimal space-y-1.5 pl-5 text-muted marker:text-gold">
              {articulo.pasos.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          ) : null}
          {articulo.nota ? (
            <p className="typo-meta rounded-[10px] border border-gold/30 bg-gold/5 px-3 py-2">{articulo.nota}</p>
          ) : null}
          {articulo.enlace ? (
            <Link to={articulo.enlace.to} className="typo-meta inline-block font-medium text-gold hover:text-gold-soft">
              {articulo.enlace.label} →
            </Link>
          ) : null}
        </div>
      </details>
    </li>
  )
}

export function AdminGuia() {
  const { perfil } = useAuth()
  const { hash } = useLocation()
  const [texto, setTexto] = useState('')
  const busqueda = useDeferredValue(texto)
  const esAdmin = perfil?.rol === 'admin'

  const categorias = useMemo(() => GUIA.filter((c) => esAdmin || !c.soloAdmin), [esAdmin])

  const resultados = useMemo(() => {
    if (!busqueda.trim()) return categorias
    return categorias
      .map((c) => ({ ...c, articulos: c.articulos.filter((a) => matchesSearch(textoArticulo(a), busqueda)) }))
      .filter((c) => c.articulos.length > 0)
  }, [categorias, busqueda])

  const buscando = Boolean(busqueda.trim())
  const total = resultados.reduce((suma, c) => suma + c.articulos.length, 0)

  // Enlaces como /admin/guia#juzgamiento llevan directo a esa categoría.
  useEffect(() => {
    if (!hash) return
    document.getElementById(`guia-${hash.slice(1)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div>
      <PageHeader
        eyebrow="Ayuda"
        title="Guía de uso"
        description="Respuestas paso a paso, ordenadas por categoría. Busque su pregunta o elija una categoría."
      />

      <div className="mb-8">
        <SearchInput
          value={texto}
          onChange={setTexto}
          label="Buscar en la guía"
          placeholder="Ej.: activar usuario, libreta F-2, buscar caballo…"
        />
        {buscando ? (
          <p className="typo-meta mt-3">
            {total === 0 ? 'No hay respuestas con esas palabras.' : `${total} ${total === 1 ? 'respuesta' : 'respuestas'}`}
          </p>
        ) : null}
      </div>

      {!buscando ? (
        <nav aria-label="Categorías de la guía" className="mb-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categorias.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              onClick={(e) => {
                e.preventDefault()
                window.history.replaceState(null, '', `#${c.id}`)
                document.getElementById(`guia-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="rounded-[12px] border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-surface-elevated"
            >
              <p className="typo-name">{c.titulo}</p>
              <p className="typo-caption mt-2">{c.resumen}</p>
              <p className="typo-caption mt-3 text-gold">
                {c.articulos.length} {c.articulos.length === 1 ? 'tema' : 'temas'}
              </p>
            </a>
          ))}
        </nav>
      ) : null}

      <div className="space-y-10">
        {resultados.map((c) => (
          <section key={c.id} id={`guia-${c.id}`} className="scroll-mt-24">
            <h2 className="typo-section text-xl">{c.titulo}</h2>
            <p className="typo-meta mt-1">
              {c.resumen}
              {c.soloAdmin ? ' · Solo administradores.' : ''}
            </p>
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-bg/40">
              {c.articulos.map((a) => (
                <ArticuloGuia key={a.pregunta} articulo={a} abierto={buscando} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
