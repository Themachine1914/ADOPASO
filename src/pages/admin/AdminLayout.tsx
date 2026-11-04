import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { CATEGORIAS, GRUPOS } from '../../admin/categorias'
import { Skeleton } from '../../components/Skeleton'
import { useAuth } from '../../lib/auth-context'

export function FranjaAdmin() {
  return (
    <div className="bg-gold text-bg">
      <div className="container-app flex h-3 items-center justify-end">
        <Link to="/" className="inline-flex items-center gap-1 text-[10px] font-medium leading-none text-bg">
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1 1 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Ver sitio público
        </Link>
      </div>
    </div>
  )
}

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
      <div className="min-h-screen bg-bg text-ink">
        <FranjaAdmin />
        <div className="container-app space-y-4 py-16" role="status" aria-label="Cargando">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }
  if (!session) return <Navigate to="/admin/login" replace />

  if (!perfil || !perfil.activo) {
    return (
      <div className="flex min-h-screen flex-col bg-bg text-ink">
        <FranjaAdmin />
        <div className="flex flex-1 items-center justify-center px-4">
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
      <div className="sticky top-0 z-40">
      <FranjaAdmin />
      <header className="border-b border-border/80 bg-bg/90 backdrop-blur-md">
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
      </div>

      <div className="container-app grid gap-8 py-8 md:grid-cols-[14rem_1fr]">
        <nav
          aria-label="Categorías"
          className="admin-nav-scroll md:sticky md:top-[4.75rem] md:max-h-[calc(100dvh-6.75rem)] md:self-start md:overflow-y-auto md:overscroll-contain md:pb-4 md:pr-1"
        >
          <NavLink to="/admin" end className={enlace}>
            Resumen
          </NavLink>
          <NavLink to="/admin/guia" className={enlace}>
            Guía de uso
          </NavLink>
          {esAdmin ? (
            <>
              <NavLink to="/admin/competencias" className={enlace}>
                Competencias en vivo
              </NavLink>
              <NavLink to="/admin/juzgamiento" className={enlace}>
                Juzgamiento
              </NavLink>
            </>
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
