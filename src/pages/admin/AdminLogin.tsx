import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { supabaseConfigurado } from '../../lib/supabase'

export function AdminLogin() {
  const { session, cargando, iniciarSesion } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (session && !cargando) return <Navigate to="/admin" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    setError(await iniciarSesion(email.trim(), password))
    setEnviando(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-ink">
      <div className="w-full max-w-sm">
        <img src="/logo-adopaso.png" alt="ADOPASO" className="mx-auto mb-6 h-16 w-auto rounded-[12px]" />
        <p className="typo-eyebrow text-center">Administración</p>
        <h1 className="typo-section mt-2 text-center">Iniciar sesión</h1>

        {!supabaseConfigurado ? (
          <p className="typo-meta mt-6 rounded-[12px] border border-flag-red/50 bg-flag-red/10 p-4">
            Falta configurar la conexión con Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).
          </p>
        ) : null}

        <form onSubmit={enviar} className="mt-8 space-y-4">
          <label className="block">
            <span className="typo-label">Correo</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="typo-body mt-1.5 w-full rounded-[12px] border border-border bg-surface px-4 py-3 text-ink focus:border-gold/50 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="typo-label">Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="typo-body mt-1.5 w-full rounded-[12px] border border-border bg-surface px-4 py-3 text-ink focus:border-gold/50 focus:outline-none"
            />
          </label>
          {error ? (
            <p role="alert" className="typo-meta text-flag-red">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={enviando || !supabaseConfigurado}
            className="typo-btn w-full rounded-[12px] bg-gold px-4 py-3 text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="typo-caption mt-6 text-center">
          El acceso lo crea un administrador. No hay registro abierto.
        </p>
      </div>
    </div>
  )
}
