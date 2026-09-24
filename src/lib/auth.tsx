import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthState, type Perfil } from './auth-context'
import { supabase, supabaseConfigurado } from './supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState(supabaseConfigurado)
  const [cargandoPerfil, setCargandoPerfil] = useState(false)

  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargandoSesion(false)
    })
    // Dentro del callback solo se guarda la sesión: llamar a la API aquí puede bloquear supabase-js.
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!userId) {
      setPerfil(null)
      setCargandoPerfil(false)
      return
    }
    let vigente = true
    setCargandoPerfil(true)
    supabase
      .from('perfiles')
      .select('id, email, nombre, rol, activo')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!vigente) return
        setPerfil((data as Perfil | null) ?? null)
        setCargandoPerfil(false)
      })
    return () => {
      vigente = false
    }
  }, [userId])

  const valor = useMemo<AuthState>(
    () => ({
      cargando: cargandoSesion || cargandoPerfil,
      session,
      perfil,
      iniciarSesion: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error) return null
        return error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Intente de nuevo.'
      },
      cerrarSesion: async () => {
        await supabase.auth.signOut()
      },
    }),
    [cargandoSesion, cargandoPerfil, session, perfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
