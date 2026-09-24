import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AyudaGuia } from '../../components/AyudaGuia'
import { PageHeader } from '../../components/PageHeader'
import { Skeleton } from '../../components/Skeleton'
import { useAuth, type Perfil, type Rol } from '../../lib/auth-context'
import { supabase } from '../../lib/supabase'

export function AdminUsuarios() {
  const { perfil } = useAuth()
  const [usuarios, setUsuarios] = useState<Perfil[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    supabase
      .from('perfiles')
      .select('id, email, nombre, rol, activo')
      .order('creado_en', { ascending: false })
      .then(({ data, error: err }) => {
        if (!vigente) return
        if (err) setError('No se pudo cargar la lista de usuarios.')
        else setUsuarios((data as Perfil[]) ?? [])
      })
    return () => {
      vigente = false
    }
  }, [])

  if (perfil?.rol !== 'admin') return <Navigate to="/admin" replace />

  async function cambiar(usuario: Perfil, cambios: Partial<Pick<Perfil, 'rol' | 'activo'>>) {
    setError(null)
    const { error: err } = await supabase.from('perfiles').update(cambios).eq('id', usuario.id)
    if (err) {
      setError('No se pudo guardar el cambio.')
      return
    }
    setUsuarios((lista) => lista?.map((u) => (u.id === usuario.id ? { ...u, ...cambios } : u)) ?? null)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sistema"
        title="Usuarios y roles"
        description="Los usuarios se crean en Supabase (Authentication → Users). Aquí se activan y se les asigna el rol."
        action={<AyudaGuia id="usuarios" />}
      />
      <div className="typo-meta mb-6 rounded-[12px] border border-border bg-surface p-4">
        <p>
          <strong className="text-ink">Administrador:</strong> ve y modifica todo, incluidos los datos personales.
        </p>
        <p className="mt-1">
          <strong className="text-ink">Consulta:</strong> solo lee caballos, resultados, calendario y categorías.
        </p>
      </div>

      {error ? (
        <p role="alert" className="typo-meta mb-4 rounded-[12px] border border-flag-red/50 bg-flag-red/10 p-4">
          {error}
        </p>
      ) : null}

      {usuarios === null && !error ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full min-w-max border-collapse text-left">
            <thead className="bg-surface">
              <tr className="border-b border-border">
                <th className="typo-label px-4 py-3 font-medium">Correo</th>
                <th className="typo-label px-4 py-3 font-medium">Rol</th>
                <th className="typo-label px-4 py-3 font-medium">Activo</th>
              </tr>
            </thead>
            <tbody className="bg-bg">
              {usuarios?.map((u) => {
                const esYo = u.id === perfil.id // no puede quitarse su propio acceso
                return (
                  <tr key={u.id} className="border-b border-border/70 last:border-b-0">
                    <td className="typo-meta px-4 py-3">
                      {u.email}
                      {esYo ? <span className="typo-caption ml-2 text-gold">(usted)</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.rol}
                        disabled={esYo}
                        onChange={(e) => cambiar(u, { rol: e.target.value as Rol })}
                        aria-label={`Rol de ${u.email}`}
                        className="typo-meta rounded-[10px] border border-border bg-surface px-2 py-1.5 text-ink disabled:opacity-50"
                      >
                        <option value="consulta">Consulta</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={u.activo}
                        disabled={esYo}
                        onChange={(e) => cambiar(u, { activo: e.target.checked })}
                        aria-label={`Activar a ${u.email}`}
                        className="h-4 w-4 accent-[#d4af37]"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
