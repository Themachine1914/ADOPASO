import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatNombre } from '../lib/format'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { FilterChips } from '../components/FilterChips'
import { PageHeader } from '../components/PageHeader'
import { PeopleTable } from '../components/PeopleTable'
import { RankTable } from '../components/RankTable'
import { SearchInput } from '../components/SearchInput'
import { RankTableSkeleton } from '../components/Skeleton'
import { YearFilter } from '../components/YearFilter'
import { matchesSearch } from '../lib/normalize'
import { supabaseConfigurado } from '../lib/supabase'
import {
  ROLES_PERSONA,
  anioPorDefecto,
  cargarAniosPublicos,
  cargarCalendario,
  cargarCategorias,
  cargarClases,
  cargarClasesJinetes,
  cargarRankingCategoria,
  cargarRankingCompetencia,
  cargarRankingGeneral,
  cargarRankingPersonas,
  esRolPersona,
} from '../lib/publico'
import type {
  AnioRanking,
  CategoriaAnio,
  ClaseAnio,
  ClaseJinete,
  CompetenciaResumen,
  EntradaPersona,
  EntradaRanking,
  ModoRanking,
} from '../types/publico'

const modos: { value: ModoRanking; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'categoria', label: 'Por categoría' },
  { value: 'competencia', label: 'Por competencia' },
  ...ROLES_PERSONA.map((r) => ({ value: r.value, label: r.label })),
]

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="block min-w-[16rem] flex-1">
      <span className="typo-label mb-2 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="typo-body w-full rounded-[12px] border border-border bg-surface px-3.5 py-3 text-ink transition-colors duration-200 focus:border-gold/50 focus:outline-none"
      >
        {children}
      </select>
    </label>
  )
}

export function Ranking() {
  const [anios, setAnios] = useState<AnioRanking[]>([])
  const [year, setYear] = useState<number | null>(null)
  const [modo, setModo] = useState<ModoRanking>('general')
  const [tipo, setTipo] = useState('')
  const [clase, setClase] = useState('')
  const [competenciaId, setCompetenciaId] = useState('')
  const [categorias, setCategorias] = useState<CategoriaAnio[]>([])
  const [clases, setClases] = useState<ClaseAnio[]>([])
  const [competencias, setCompetencias] = useState<CompetenciaResumen[]>([])
  const [ranking, setRanking] = useState<EntradaRanking[]>([])
  const [personas, setPersonas] = useState<EntradaPersona[]>([])
  const [clasesJinete, setClasesJinete] = useState<ClaseJinete[]>([])
  const [claseJinete, setClaseJinete] = useState('')
  const [compPersona, setCompPersona] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const deferredQuery = useDeferredValue(query)
  const yearList = anios.map((a) => a.anio)
  const rolPersona = esRolPersona(modo) ? modo : null
  const rolInfo = ROLES_PERSONA.find((r) => r.value === rolPersona)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setLoading(false)
      setError('Falta la conexión con Supabase.')
      return
    }
    let cancel = false
    cargarAniosPublicos()
      .then((lista) => {
        if (cancel) return
        setAnios(lista)
        setYear(anioPorDefecto(lista))
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message)
      })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (!year) return
    let cancel = false
    Promise.all([cargarCategorias(year), cargarCalendario(year)])
      .then(([cats, comps]) => {
        if (cancel) return
        setCategorias(cats)
        setTipo((actual) => (cats.some((c) => c.tipo === actual) ? actual : cats[0]?.tipo ?? ''))
        setCompetencias(comps)
        setCompetenciaId((actual) => (comps.some((c) => c.id === actual) ? actual : comps[0]?.id ?? ''))
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message)
      })
    return () => {
      cancel = true
    }
  }, [year])

  useEffect(() => {
    if (!year) return
    let cancel = false
    cargarClasesJinetes(year)
      .then((lista) => {
        if (cancel) return
        setClasesJinete(lista)
        setClaseJinete((actual) => (lista.some((c) => c.clase === actual) ? actual : lista[0]?.clase ?? ''))
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message)
      })
    setCompPersona('')
    return () => {
      cancel = true
    }
  }, [year])

  useEffect(() => {
    if (!year || !tipo) {
      setClases([])
      return
    }
    let cancel = false
    cargarClases(year, tipo)
      .then((lista) => {
        if (cancel) return
        setClases(lista)
        setClase((actual) => (lista.some((c) => c.clase === actual) ? actual : ''))
      })
      .catch((err: Error) => {
        if (!cancel) setError(err.message)
      })
    return () => {
      cancel = true
    }
  }, [year, tipo])

  useEffect(() => {
    if (!year) return
    let cancel = false
    setLoading(true)
    setError(null)

    if (rolPersona) {
      const comp = competencias.find((c) => c.id === compPersona)
      const pedirPersonas =
        rolPersona === 'jinete' && !claseJinete
          ? Promise.resolve([])
          : cargarRankingPersonas(year, rolPersona, {
              categoria: rolPersona === 'jinete' ? claseJinete : '',
              fecha: comp?.fecha,
              lugar: comp?.lugarClave,
            })
      pedirPersonas
        .then((filas) => {
          if (!cancel) setPersonas(filas)
        })
        .catch((err: Error) => {
          if (!cancel) {
            setPersonas([])
            setError(err.message || 'No se pudo cargar el ranking.')
          }
        })
        .finally(() => {
          if (!cancel) setLoading(false)
        })
      return () => {
        cancel = true
      }
    }

    const pedir =
      modo === 'general'
        ? cargarRankingGeneral(year)
        : modo === 'categoria' && tipo
          ? cargarRankingCategoria(year, tipo, clase || undefined)
          : modo === 'competencia' && competenciaId
            ? (() => {
                const actual = competencias.find((c) => c.id === competenciaId)
                if (actual && actual.resultados > 0) {
                  return cargarRankingCompetencia(year, actual.fecha, actual.lugarClave)
                }
                return Promise.resolve([])
              })()
            : Promise.resolve([])

    pedir
      .then((filas) => {
        if (cancel) return
        setRanking(filas)
      })
      .catch((err: Error) => {
        if (!cancel) {
          setRanking([])
          setError(err.message || 'No se pudo cargar el ranking.')
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })

    return () => {
      cancel = true
    }
  }, [year, modo, rolPersona, tipo, clase, competenciaId, competencias, claseJinete, compPersona])

  const filtered = useMemo(() => {
    return ranking.filter((horse) =>
      matchesSearch(`${horse.name} ${horse.owner} ${horse.stable}`, deferredQuery),
    )
  }, [ranking, deferredQuery])

  const personasFiltradas = useMemo(
    () => personas.filter((p) => matchesSearch(p.nombre, deferredQuery)),
    [personas, deferredQuery],
  )
  const conResultados = competencias.filter((c) => c.resultados > 0)
  const compPersonaActual = competencias.find((c) => c.id === compPersona)
  const total = rolPersona ? personasFiltradas.length : filtered.length

  const searching = query !== deferredQuery
  const isFiltering = Boolean(query.trim())
  const competenciaActual = competencias.find((c) => c.id === competenciaId)
  const anioActual = anios.find((a) => a.anio === year)
  const sinPuntos = Boolean(year && anioActual && anioActual.puntos === 0)
  const sinPuntosFecha = Boolean(
    modo === 'competencia' && competenciaActual && competenciaActual.resultados === 0,
  )

  const descripcion = rolPersona
    ? `Puntos de ${rolInfo?.plural ?? ''}${
        rolPersona === 'jinete' && claseJinete ? ` · ${formatNombre(claseJinete)}` : ''
      }${compPersonaActual ? ` en ${compPersonaActual.nombre} (${compPersonaActual.fecha})` : ` en ${year ?? ''}`}.`
    : sinPuntosFecha
    ? `${competenciaActual?.nombre ?? 'Esta fecha'} está en el calendario, pero todavía no tiene resultados.`
    : sinPuntos
    ? `Hay calendario de ${year}, pero todavía no hay resultados con puntos de ese año.`
      : modo === 'categoria' && tipo
      ? `Caballos con más puntos en ${tipo}${clase ? ` · ${clase}` : ''} (${year ?? ''}).`
      : modo === 'competencia' && competenciaActual
        ? `Resultados de ${competenciaActual.nombre} en ${competenciaActual.lugar}.`
        : `Clasificación por puntos acumulados${year ? ` en ${year}` : ''}.`

  return (
    <div className="container-app page-shell">
      <PageHeader
        eyebrow="Leaderboard"
        title="Ranking de puntuaciones"
        description={descripcion}
        action={year ? <YearFilter value={year} years={yearList} onChange={setYear} /> : null}
      >
        <p className="typo-meta mt-3">
          Resultados con puntos hasta la última competencia cargada.{' '}
          <Link to="/caballos" className="font-medium text-gold hover:text-gold-soft">
            Ir al directorio
          </Link>
        </p>
      </PageHeader>

      <div className="mb-6 space-y-4">
        <FilterChips label="Tipo de ranking" value={modo} options={modos} onChange={setModo} />

        {modo === 'categoria' ? (
          <div className="space-y-4">
            <FilterChips
              label="Categoría"
              value={tipo}
              options={categorias.map((c) => ({ value: c.tipo, label: c.tipo }))}
              onChange={setTipo}
            />
            {clases.length > 0 ? (
              <SelectField label="Clase" value={clase} onChange={setClase}>
                <option value="">Todas las clases de {tipo}</option>
                {clases.map((c) => (
                  <option key={c.clase} value={c.clase}>
                    {formatNombre(c.clase)} ({c.caballos})
                  </option>
                ))}
              </SelectField>
            ) : null}
          </div>
        ) : null}

        {modo === 'competencia' ? (
          <SelectField label="Competencia" value={competenciaId} onChange={setCompetenciaId}>
            {competencias.length === 0 ? (
              <option value="">No hay competencias en el calendario de este año</option>
            ) : (
              competencias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fecha} · {c.nombre} · {c.lugar}
                  {c.resultados > 0 ? '' : ' (sin puntos)'}
                </option>
              ))
            )}
          </SelectField>
        ) : null}

        {rolPersona === 'jinete' ? (
          <SelectField label="Clase" value={claseJinete} onChange={setClaseJinete}>
            {clasesJinete.length === 0 ? (
              <option value="">No hay clases de jinetes o amazonas con puntos este año</option>
            ) : (
              clasesJinete.map((c) => (
                <option key={c.clase} value={c.clase}>
                  {c.nombre} ({c.personas})
                </option>
              ))
            )}
          </SelectField>
        ) : null}

        {rolPersona ? (
          <SelectField label="Competencia" value={compPersona} onChange={setCompPersona}>
            <option value="">Todo el año {year ?? ''}</option>
            {conResultados.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fecha} · {c.nombre} · {c.lugar}
              </option>
            ))}
          </SelectField>
        ) : null}

        <SearchInput
          value={query}
          onChange={setQuery}
          label="Buscar en ranking"
          placeholder={
            rolPersona ? `Buscar ${rolInfo?.singular ?? 'persona'} por nombre…` : 'Buscar por caballo, expositor o criador…'
          }
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="typo-meta">
          {loading || searching
            ? 'Actualizando resultados…'
            : rolPersona
              ? `${total} ${total === 1 ? 'persona' : 'personas'}`
              : `${total} ${total === 1 ? 'caballo' : 'caballos'}`}
          {!loading && !searching && isFiltering ? ' con estos filtros' : ''}
        </p>
        {isFiltering && !loading ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="typo-meta font-medium text-gold transition-colors hover:text-gold-soft"
          >
            Limpiar búsqueda
          </button>
        ) : null}
      </div>

      {error ? (
        <EmptyState title="No se pudo cargar el ranking" description={error} />
      ) : loading || !year ? (
        <RankTableSkeleton />
      ) : rolPersona ? (
        personasFiltradas.length === 0 ? (
          <EmptyState
            title={`No hay ${rolInfo?.plural ?? 'personas'} con puntos`}
            description={
              isFiltering
                ? 'Prueba con otro nombre.'
                : 'No hay puntos registrados con estos filtros. Prueba con otro año o competencia.'
            }
          />
        ) : (
          <PeopleTable people={personasFiltradas} rol={rolPersona} year={year} />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            sinPuntosFecha
              ? 'Esta competencia no tiene ranking'
              : sinPuntos
                ? `Sin ranking en ${year}`
                : 'No hay caballos con estos filtros'
          }
          description={
            sinPuntosFecha || sinPuntos
              ? 'Esta fecha está en el calendario, pero sus resultados todavía no se han cargado.'
              : 'Prueba con otro nombre, otra categoría o una competencia distinta.'
          }
          action={
            sinPuntosFecha || sinPuntos ? (
              <Link
                to="/competencias"
                className="typo-btn rounded-[12px] bg-gold px-5 py-2.5 text-bg transition-colors hover:bg-gold-soft"
              >
                Ver calendario {year}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setModo('general')
                }}
                className="typo-btn rounded-[12px] bg-gold px-5 py-2.5 text-bg transition-colors hover:bg-gold-soft"
              >
                Ver ranking general
              </button>
            )
          }
        />
      ) : (
        <RankTable horses={filtered} year={year} showPlace={modo === 'competencia'} />
      )}
    </div>
  )
}