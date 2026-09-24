import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { CATEGORIAS, GRUPOS } from '../../admin/categorias'
import { Skeleton } from '../../components/Skeleton'
import { useAuth } from '../../lib/auth-context'

export function AdminLayout() {
  const { cargando, session, perfil, cerrarSesion } = useAuth()

  // Zona privada: que no aparezca en buscadores.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  if (cargando) {
    return (
      <div className="container-app space-y-4 py-16" role="status" aria-label="Cargando">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (!session) return <Navigate to="/admin/login" replace />

  if (!perfil || !perfil.activo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-ink">
        <div className="max-w-md text-center">
          <p className="typo-eyebrow">Acceso pendiente</p>
          <h1 className="typo-section mt-2">Su cuenta aún no está activa</h1>
          <p className="typo-lead mt-3">
            Un administrador debe activar su usuario antes de que pueda ver los datos.
          </p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="typo-btn mt-6 rounded-[10px] border border-border px-4 py-2.5 text-muted hover:text-ink"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  const esAdmin = perfil.rol === 'admin'
  const visibles = CATEGORIAS.filter((c) => esAdmin || !c.soloAdmin)

  const enlace = ({ isActive }: { isActive: boolean }) =>
    [
      'typo-meta block rounded-[10px] px-3 py-2 transition-colors duration-200',
      isActive ? 'bg-surface-elevated text-gold' : 'text-muted hover:text-ink',
    ].join(' ')

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
        <div className="container-app flex h-16 items-center justify-between gap-3">
          <Link to="/admin" className="flex items-center gap-3">
            <img src="/logo-adopaso.png" alt="ADOPASO" className="h-10 w-auto rounded-[10px]" />
            <span className="typo-nav font-bold tracking-[0.12em]">ADMINISTRACIÓN</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="typo-meta truncate">{perfil.email}</p>
              <p className="typo-caption text-gold">{esAdmin ? 'Administrador' : 'Consulta'}</p>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              className="typo-btn rounded-[10px] border border-border px-3 py-2 text-muted transition-colors hover:text-ink"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="container-app grid gap-8 py-8 md:grid-cols-[14rem_1fr]">
        <nav aria-label="Categorías" className="md:sticky md:top-24 md:self-start">
          <NavLink to="/admin" end className={enlace}>
            Resumen
          </NavLink>
          <NavLink to="/admin/guia" className={enlace}>
            Guía de uso
          </NavLink>
          {esAdmin ? (
            <NavLink to="/admin/juzgamiento" className={enlace}>
              Juzgamiento
            </NavLink>
          ) : null}
          {GRUPOS.map((grupo) => {
            const items = visibles.filter((c) => c.grupo === grupo)
            if (items.length === 0) return null
            return (
              <div key={grupo} className="mt-5">
                <p className="typo-caption mb-1 px-3 uppercase tracking-[0.12em]">{grupo}</p>
                {items.map((c) => (
                  <NavLink key={c.slug} to={`/admin/${c.slug}`} className={enlace}>
                    {c.titulo}
                  </NavLink>
                ))}
              </div>
            )
          })}
          {esAdmin ? (
            <div className="mt-5">
              <p className="typo-caption mb-1 px-3 uppercase tracking-[0.12em]">Sistema</p>
              <NavLink to="/admin/usuarios" className={enlace}>
                Usuarios y roles
              </NavLink>
            </div>
          ) : null}
        </nav>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
