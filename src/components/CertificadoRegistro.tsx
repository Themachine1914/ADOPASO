import { Link } from 'react-router-dom'
import { codigoEnlazable } from '../lib/genealogia'
import { formatFechaEmision, formatFechaRegistro, formatNombre } from '../lib/format'
import type { CaballoPublico } from '../types/publico'

function sexoCertificado(sexo: string | null): string {
  if (!sexo) return ''
  switch (sexo.trim().toLowerCase()) {
    case 'h':
    case 'f':
    case 'yegua':
    case 'hembra':
      return 'Hembra'
    case 'm':
    case 's':
    case 'macho':
      return 'Macho'
    case 'c':
    case 'capon':
    case 'capón':
      return 'Capón'
    default:
      return formatNombre(sexo)
  }
}

function Linea({
  label,
  value,
  href,
}: {
  label: string
  value: string | null
  href?: string | null
}) {
  const texto = value?.trim() ? value : ''
  return (
    <p className="min-w-0 text-[0.95rem] leading-snug text-[#3a3226]">
      <span>{label}: </span>
      {href && texto ? (
        <Link to={href} className="border-b border-[#1c1408] font-semibold uppercase text-[#1c1408] hover:text-[#8a6a12]">
          {texto}
        </Link>
      ) : (
        <span className="border-b border-[#1c1408]/70 font-semibold uppercase text-[#1c1408]">
          {texto || '\u00a0\u00a0\u00a0\u00a0'}
        </span>
      )}
    </p>
  )
}

export function CertificadoRegistro({ horse }: { horse: CaballoPublico }) {
  const padreCodigo = codigoEnlazable(horse.padreCodigo, horse.codigo)
  const madreCodigo = codigoEnlazable(horse.madreCodigo, horse.codigo)
  const padreHref = padreCodigo ? `/caballo/${encodeURIComponent(padreCodigo)}` : null
  const madreHref = madreCodigo ? `/caballo/${encodeURIComponent(madreCodigo)}` : null

  return (
    <article className="rounded-[18px] bg-[#f4efe4] p-1.5 text-[#1c1408] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="rounded-[14px] border-2 border-[#1c1408] p-1">
        <div className="rounded-[10px] border border-[#1c1408] px-5 py-8 sm:px-8 md:px-12 md:py-10">
          <header className="text-center">
            <img src="/logo-adopaso.png" alt="" className="mx-auto h-16 w-auto" />
            <p className="mt-3 font-display text-lg leading-tight sm:text-xl">
              Asociación Dominicana de Caballos de Paso, Inc.
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tracking-wide">ADOPASO</p>
            <h2 className="mx-auto mt-6 max-w-md font-display text-xl font-semibold uppercase leading-tight tracking-wide sm:text-2xl">
              Certificado de entrada en el libro de registro genealógico
            </h2>
            <p className="mt-4 text-base">
              No. Registro{' '}
              <span className="border-b border-[#1c1408] px-2 font-semibold">{horse.codigo}</span>
            </p>
            {horse.fechaRegistro ? (
              <p className="mt-3 text-sm uppercase tracking-wide">
                Santo Domingo, D.N. · {formatFechaEmision(horse.fechaRegistro)}
              </p>
            ) : null}
          </header>

          <div className="mt-8 space-y-3">
            <p className="text-base">
              <span className="uppercase tracking-wide">Equino: </span>
              <span className="font-display text-xl font-semibold uppercase">{horse.nombre}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Linea label="Modalidad de paso" value={horse.modalidad} />
              <Linea label="Sexo" value={sexoCertificado(horse.sexo)} />
              <Linea label="Color" value={horse.color} />
              <Linea label="Microchip No." value={horse.microchip} />
            </div>
            <Linea label="Señas particulares" value={horse.senas} />
            <Linea label="DNA" value={horse.adn} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Linea
                label="Fecha de nacimiento"
                value={horse.fechaNacimiento ? formatFechaRegistro(horse.fechaNacimiento) : null}
              />
              <Linea label="Lugar de nacimiento" value={horse.lugarNacimiento} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Linea label="Padre" value={horse.padre} href={padreHref} />
              <Linea label="Registro del padre" value={horse.padreCodigo} href={padreHref} />
              <Linea label="Madre" value={horse.madre} href={madreHref} />
              <Linea label="Registro de la madre" value={horse.madreCodigo} href={madreHref} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Linea label="Criador" value={horse.criador} />
              <Linea label="Propietario" value={horse.expositor} />
            </div>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-[#5c5346]">
            Consulta del libro de registro. El certificado firmado lo emite la secretaría de ADOPASO.
          </p>
        </div>
      </div>
    </article>
  )
}
