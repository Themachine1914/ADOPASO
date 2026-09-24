import { useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SearchInput } from '../components/SearchInput'
import { HorseGridSkeleton } from '../components/Skeleton'
import { buscarCaballos } from '../lib/publico'
import { supabaseConfigurado } from '../lib/supabase'
import type { CaballoPublico } from '../types/publico'

export function Horses() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [results, setResults] = useState<CaballoPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setLoading(false)
      setError('Falta la conexión con Supabase.')
      return
    }
    let cancel = false
    setLoading(true)
    buscarCaballos(deferredQuery)
      .then((filas) => {
        if (!cancel) setResults(filas)
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message)
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [deferredQuery])

  const searching = query !== deferredQuery

  return (
    <div className="container-app page-shell">
      <PageHeader
        eyebrow="Directorio"
        title="Caballos"
        description="Busca cualquier ejemplar del registro y entra a su ficha para ver puntos y resultados."
      />

      <div className="mb-6">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Buscar caballos"
          placeholder="Nombre, código, expositor, criador o pedigrí…"
        />
      </div>

      <div className="mb-4">
        <p className="typo-meta">
          {loading || searching
            ? 'Buscando…'
            : `${results.length} ${results.length === 1 ? 'caballo' : 'caballos'}${deferredQuery.trim() ? ' encontrados' : ' recientes'}`}
        </p>
      </div>

      {error ? (
        <EmptyState title="No se pudo cargar el directorio" description={error} />
      ) : loading ? (
        <HorseGridSkeleton />
      ) : results.length === 0 ? (
        <EmptyState
          title="No encontramos caballos"
          description="Prueba con el nombre, el código de registro o el expositor."
          action={
            query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="typo-btn rounded-[12px] bg-gold px-5 py-2.5 text-bg transition-colors hover:bg-gold-soft"
              >
                Limpiar búsqueda
              </button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-border">
          <div className="hidden grid-cols-[7rem_1fr_8rem_1.2fr] gap-3 border-b border-border bg-surface px-4 py-3 md:grid">
            <span className="typo-label">Código</span>
            <span className="typo-label">Caballo</span>
            <span className="typo-label">Sexo / color</span>
            <span className="typo-label">Expositor</span>
          </div>
          <div className="divide-y divide-border">
            {results.map((horse) => (
              <Link
                key={horse.codigo}
                to={`/caballo/${encodeURIComponent(horse.codigo)}`}
                className="grid gap-1 bg-bg/40 px-4 py-3 transition-colors duration-200 hover:bg-surface-elevated md:grid-cols-[7rem_1fr_8rem_1.2fr] md:items-center md:gap-3"
              >
                <p className="typo-caption text-gold">{horse.codigo}</p>
                <p className="typo-name truncate text-base">{horse.nombre}</p>
                <p className="typo-meta truncate">
                  {[horse.sexo, horse.color].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="typo-meta truncate">{horse.expositor || horse.criador || '—'}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}