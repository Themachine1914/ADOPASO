import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { SocialLinks } from './SocialLinks'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/caballos', label: 'Caballos' },
  { to: '/competencias', label: 'Competencias' },
]

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/90 backdrop-blur-md">
      <div className="container-app flex h-16 items-center justify-between gap-3 md:h-[4.5rem]">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3 transition-opacity duration-200 hover:opacity-90"
            onClick={() => setOpen(false)}
          >
            <img
              src="/logo-adopaso.png"
              alt="ADOPASO"
              className="h-11 w-auto shrink-0 rounded-[12px] object-contain md:h-12"
            />
            <div className="hidden leading-tight sm:block">
              <p className="typo-nav font-bold tracking-[0.12em] text-ink">ADOPASO</p>
              <p className="typo-caption">Caballos de Paso Fino</p>
            </div>
          </Link>

          <SocialLinks className="ml-1 border-l border-border pl-2 sm:ml-2 sm:pl-3" />
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                [
                  'typo-nav transition-colors duration-200',
                  isActive ? 'text-gold' : 'text-muted hover:text-ink',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-border text-ink md:hidden"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menú</span>
          <div className="flex w-4 flex-col gap-1.5">
            <span
              className={`h-px w-full bg-current transition-transform duration-200 ${open ? 'translate-y-[3.5px] rotate-45' : ''}`}
            />
            <span
              className={`h-px w-full bg-current transition-opacity duration-200 ${open ? 'opacity-0' : ''}`}
            />
            <span
              className={`h-px w-full bg-current transition-transform duration-200 ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`}
            />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <nav className="container-app flex flex-col py-3">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'typo-nav rounded-[10px] px-3 py-3 transition-colors duration-200',
                    isActive ? 'bg-surface-elevated text-gold' : 'text-muted hover:text-ink',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-border px-3 pt-3">
              <span className="typo-caption">Síguenos</span>
              <SocialLinks />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
