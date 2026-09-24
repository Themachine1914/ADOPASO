import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** false cuando faltan las variables de entorno: el módulo admin lo avisa en pantalla. */
export const supabaseConfigurado = Boolean(url && key)

// Valores de relleno para que la app pública siga funcionando sin configuración.
export const supabase = createClient(url || 'http://localhost', key || 'sin-configurar')
