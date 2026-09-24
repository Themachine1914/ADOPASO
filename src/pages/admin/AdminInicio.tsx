import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIAS, GRUPOS } from '../../admin/categorias'
import { PageHeader } from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'
import { supabase } from '../../lib/supabase'

export function AdminInicio() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const visibles = CATEGORIAS.filter((c) => esAdmin || !c.soloAdmin)
  const [conteos, setConteos] = useState<Record<string, number | null>>({})

  useEffect(() => {
    let vigente = true
    Promise.all(
      visibles.map(async (c) => {
        const { count, error } = await supabase.from(c.tabla).select('*', { count: 'exact', head: true })
        return [c.slug, error ? null : count] as const
      }),
    ).then((pares) => {
      if (vigente) setConteos(Object.fromEntries(pares))
    })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin])

  return (
    <div>
      <PageHeader
        eyebrow="Estadísticas"
        title="Resumen de datos"
        description="Todos los datos históricos organizados por categoría. Elija una para consultarla."
      />
      {esAdmin ? (
        <Link
          to="/admin/juzgamiento"
          className="mb-10 block rounded-[12px] border border-gold/40 bg-surface p-5 transition-colors hover:bg-surface-elevated"
        >
          <p className="typo-label text-gold">Interno</p>
          <p className="typo-name mt-1">Juzgamiento de competencias</p>
          <p className="typo-meta mt-2">
            Formulario de la clase, formato A, libreta F-2 y hoja de cómputo con los jueces del registro.
          </p>
        </Link>
      ) : null}
      {GRUPOS.map((grupo) => {
        const items = visibles.filter((c) => c.grupo === grupo)
        if (items.length === 0) return null
        return (
          <section key={grupo} className="mb-10">
            <h2 className="typo-label mb-3 uppercase tracking-[0.12em]">{grupo}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <Link
                  key={c.slug}
                  to={`/admin/${c.slug}`}
                  className="rounded-[12px] border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-surface-elevated"
                >
                  <p className="typo-name">{c.titulo}</p>
                  <p className="typo-stat mt-2 text-gold">
                    {conteos[c.slug] == null ? '—' : new Intl.NumberFormat('es-DO').format(conteos[c.slug]!)}
                  </p>
                  <p className="typo-caption mt-2">{c.descripcion}</p>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
