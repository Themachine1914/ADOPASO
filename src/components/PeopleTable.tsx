import { Link } from 'react-router-dom'
import type { EntradaPersona, RolPersona } from '../types/publico'
import { formatPoints } from '../lib/format'

interface PeopleTableProps {
  people: EntradaPersona[]
  rol: RolPersona
  year: number
}

function enlace(rol: RolPersona, persona: string, year: number) {
  return `/persona/${rol}/${encodeURIComponent(persona)}?year=${year}`
}

function Resumen({ person, rol }: { person: EntradaPersona; rol: RolPersona }) {
  const bits = [`${person.salidas} ${person.salidas === 1 ? 'salida' : 'salidas'}`]
  if (rol !== 'jinete') bits.push(`${person.caballos} ${person.caballos === 1 ? 'caballo' : 'caballos'}`)
  if (person.primeros > 0) bits.push(`${person.primeros} ${person.primeros === 1 ? 'primer lugar' : 'primeros lugares'}`)
  return bits.join(' · ')
}

export function PeopleTable({ people, rol, year }: PeopleTableProps) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {people.map((person) => (
          <Link
            key={person.persona}
            to={enlace(rol, person.persona, year)}
            className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-3 py-3 transition-colors duration-200 hover:border-gold/50 hover:bg-surface-elevated"
          >
            <span className="w-8 shrink-0 text-center font-display text-xl font-semibold text-gold">
              {person.position}
            </span>
            <div className="min-w-0 flex-1">
              <p className="typo-name truncate text-base">{person.nombre}</p>
              <p className="typo-caption truncate">
                <Resumen person={person} rol={rol} />
              </p>
            </div>
            <div className="text-right">
              <p className="typo-points">{formatPoints(person.points)}</p>
              <p className="typo-caption">pts</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[12px] border border-border md:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-surface">
            <tr className="border-b border-border">
              <th className="typo-label px-5 py-3 font-medium">Pos</th>
              <th className="typo-label px-5 py-3 font-medium">Nombre</th>
              {rol !== 'jinete' ? (
                <th className="typo-label px-5 py-3 text-right font-medium">Caballos</th>
              ) : null}
              <th className="typo-label px-5 py-3 text-right font-medium">Salidas</th>
              <th className="typo-label px-5 py-3 text-right font-medium">1.er lugar</th>
              <th className="typo-label px-5 py-3 text-right font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody className="bg-bg">
            {people.map((person) => (
              <tr
                key={person.persona}
                className="group border-b border-border/70 transition-colors duration-200 last:border-b-0 hover:bg-surface-elevated"
              >
                <td className="px-5 py-3">
                  <span className="font-display text-lg font-semibold text-gold">{person.position}</span>
                </td>
                <td className="px-5 py-3">
                  <Link
                    to={enlace(rol, person.persona, year)}
                    className="typo-name text-base transition-colors duration-200 group-hover:text-gold"
                    aria-label={`Ver puntos de ${person.nombre}, posición ${person.position}, ${formatPoints(person.points)} puntos`}
                  >
                    {person.nombre}
                  </Link>
                </td>
                {rol !== 'jinete' ? (
                  <td className="px-5 py-3 text-right typo-meta">{person.caballos}</td>
                ) : null}
                <td className="px-5 py-3 text-right typo-meta">{person.salidas}</td>
                <td className="px-5 py-3 text-right typo-meta">{person.primeros}</td>
                <td className="px-5 py-3 text-right">
                  <span className="typo-points transition-colors group-hover:text-gold">
                    {formatPoints(person.points)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
