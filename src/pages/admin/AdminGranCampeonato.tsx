import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AyudaGuia } from '../../components/AyudaGuia'
import { PageHeader } from '../../components/PageHeader'
import { useAuth } from '../../lib/auth-context'
import { listarConsultaGran, type GranConsulta, type GranConsultaClase } from '../../lib/competencia'
import { formatFechaEmision, formatNombre } from '../../lib/format'

const REFRESCO_MS = 8000

function estadoClase(clase: GranConsultaClase): string {
  if (clase.fase === 'cerrada') return 'Ya votado'
  if (clase.enPista) return 'En pista'
  return 'Esperando'
}

function ClaseGran({ competenciaId, clase }: { competenciaId: string; clase: GranConsultaClase }) {
  const votado = clase.fase === 'cerrada'
  const enPista = clase.enPista
  return (
    <div
      className={[
        'rounded-[12px] border px-4 py-3',
        votado ? 'border-emerald-500/60 bg-emerald-500/10' : enPista ? 'border-amber-400/80 bg-amber-400/10' : 'border-border bg-surface',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="typo-name text-base">{clase.categoria}</p>
          <p className="typo-caption mt-1 text-gold">
            {estadoClase(clase)}
            {clase.caballos.length > 0 ? ` · ${clase.caballos.length} caballos` : ''}
          </p>
        </div>
        {clase.modoCaptura === 'en_vivo' ? (
          <p className="typo-meta text-amber-300">Se está votando en vivo</p>
        ) : (
          <Link
            to={`/admin/competencias/${competenciaId}/captura/${clase.id}`}
            className="typo-btn rounded-[10px] bg-gold px-3 py-1.5 text-sm text-bg"
          >
            Anotar a mano
          </Link>
        )}
      </div>
      {clase.caballos.length === 0 ? (
        <p className="typo-meta mt-3">Todavía no hay caballos.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {clase.caballos.map((caballo) => (
            <li key={caballo.id} className="typo-meta">
              <span className="font-semibold text-gold">{caballo.numero ?? '—'}</span> {formatNombre(caballo.nombre)}
              {caballo.origen ? ` · ${caballo.origenPuesto}.º de ${caballo.origen}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CompetenciaGran({ consulta }: { consulta: GranConsulta }) {
  return (
    <section className="rounded-[12px] border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="typo-name text-lg">{consulta.nombre}</h2>
        {consulta.simulacion ? <span className="typo-caption text-gold">Simulación</span> : null}
      </div>
      <p className="typo-meta mt-1">
        {formatFechaEmision(consulta.fecha)}
        {consulta.lugar ? ` · ${consulta.lugar}` : ''}
      </p>
      {consulta.clases.length === 0 ? (
        <p className="typo-meta mt-4">
          Todavía no hay caballos. El 1.º y el 2.º aparecen aquí cuando se cierra su categoría.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {consulta.clases.map((clase) => (
            <ClaseGran key={clase.id} competenciaId={consulta.id} clase={clase} />
          ))}
        </div>
      )}
    </section>
  )
}

/** Consulta del gran campeonato, aparte de la inscripción y las categorías. */
export function AdminGranCampeonato() {
  const { perfil } = useAuth()
  const [filas, setFilas] = useState<GranConsulta[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (perfil?.rol !== 'admin') return
    let vigente = true
    async function cargar() {
      try {
        const datos = await listarConsultaGran()
        if (vigente) {
          setFilas(datos)
          setError(null)
        }
      } catch (err) {
        if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar el gran campeonato.')
      }
    }
    void cargar()
    const reloj = window.setInterval(() => void cargar(), REFRESCO_MS)
    return () => {
      vigente = false
      window.clearInterval(reloj)
    }
  }, [perfil?.rol])

  if (perfil?.rol !== 'admin') return <Navigate to="/admin" replace />

  const abiertas = (filas ?? []).filter((item) => item.estado !== 'finalizada')
  const cerradas = (filas ?? []).filter((item) => item.estado === 'finalizada' && item.clases.length > 0)

  return (
    <div>
      <PageHeader
        eyebrow="En vivo"
        title="Gran campeonato"
        description="El 1.º y el 2.º de cada categoría entran solos. Machos y hembras van aparte. Esta lista se actualiza sola."
        action={<AyudaGuia id="competencias-en-vivo" />}
      />

      {error ? <p className="typo-meta mb-6 text-flag-red">{error}</p> : null}
      {filas == null && !error ? <p className="typo-meta">Cargando…</p> : null}

      {filas != null && abiertas.length === 0 && cerradas.length === 0 ? (
        <p className="typo-meta">No hay una competencia abierta. El gran campeonato aparece cuando hay una competencia en vivo.</p>
      ) : null}

      {abiertas.length > 0 ? (
        <div className="space-y-4">
          {abiertas.map((consulta) => (
            <CompetenciaGran key={consulta.id} consulta={consulta} />
          ))}
        </div>
      ) : null}

      {cerradas.length > 0 ? (
        <details className="mt-8">
          <summary className="typo-meta cursor-pointer text-gold">Ver competencias ya cerradas</summary>
          <div className="mt-4 space-y-4">
            {cerradas.map((consulta) => (
              <CompetenciaGran key={consulta.id} consulta={consulta} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
