import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type Rol = 'admin' | 'consulta'

export interface Perfil {
  id: string
  email: string | null
  nombre: string | null
  rol: Rol
  activo: boolean
}

export interface AuthState {
  cargando: boolean
  session: Session | null
  /** null si la cuenta aún no tiene perfil o no se pudo leer */
  perfil: Perfil | null
  iniciarSesion: (email: string, password: string) => Promise<string | null>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
