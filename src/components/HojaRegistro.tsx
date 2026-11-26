import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { partesFechaHoja, formatFechaRegistro } from '../lib/format'
import { codigoEnlazable, generaciones } from '../lib/genealogia'
import { imprimirDocumento, type DocumentoImpreso, type PapelImpresion } from '../lib/impresion'
import type { CaballoPublico } from '../types/publico'

/** Hoja física del libro: 8½ × 9¼ pulgadas. Frente certificado, reverso genealogía. */
const ANCHO = '8.5in'
const ALTO = '9.25in'

function sexoHoja(sexo: string | null): string {
  if (!sexo) return ''
  switch (sexo.trim().toLowerCase()) {
    case 'h':
    case 'f':
    case 'yegua':
    case 'hembra':
      return 'HEMBRA'
    case 'm':
    case 's':
    case 'macho':
      return 'MACHO'
    case 'c':
    case 'capon':
    case 'capón':
      return 'CAPÓN'
    default:
      return sexo.trim().toLocaleUpperCase('es-DO')
  }
}

function codigoHoja(codigo: string | null): string {
  if (!codigo) return ''
  const limpio = codigo.trim()
  const partes = limpio.match(/^([A-Za-z]+)\s*-\s*(.+)$/)
  if (!partes) return limpio.toLocaleUpperCase('es-DO')
  return `${partes[1].toLocaleUpperCase('es-DO')} - ${partes[2]}`
}

function registroConAsociacion(codigo: string | null, asociacion: string | null): string {
  const visible = codigoHoja(codigo)
  if (!visible) return ''
  if (asociacion) return `${visible} ${asociacion}`
  if (/^G\b/i.test(visible) || /^\d/.test(visible)) return `${visible} ADOPASO`
  return visible
}

function lugarHoja(horse: CaballoPublico): string {
  const lugar = horse.lugarNacimiento?.trim() ?? ''
  const pais = horse.pais?.trim() ?? ''
  if (!pais) return lugar.toLocaleUpperCase('es-DO')
  if (lugar.toLocaleLowerCase('es-DO').includes(pais.toLocaleLowerCase('es-DO'))) {
    return lugar.toLocaleUpperCase('es-DO')
  }
  const texto = lugar ? `${lugar}, ${pais}` : pais
  return texto.toLocaleUpperCase('es-DO')
}

function mayus(valor: string | null | undefined): string {
  return valor?.trim() ? valor.trim().toLocaleUpperCase('es-DO') : ''
}

function VistaHoja({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const aplicar = () => {
      const ancho = el.clientWidth
      if (ancho < 8) return
      setEscala(Math.min(1, ancho / (8.5 * 96)))
    }
    aplicar()
    const obs = new ResizeObserver(aplicar)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={`hoja-vista ${className}`} style={{ height: `calc(${ALTO} * ${escala})` }}>
      <article className="hoja-papel" style={{ width: ANCHO, height: ALTO, transform: `scale(${escala})` }}>
        {children}
      </article>
    </div>
  )
}

function Renglon({
  y,
  x,
  etiqueta,
  valor,
  anchoEtiqueta,
  anchoLinea,
  href,
  centrar,
}: {
  y: string
  x: string
  etiqueta: string
  valor: string
  anchoEtiqueta: string
  anchoLinea: string
  href?: string | null
  centrar?: boolean
}) {
  const linea: CSSProperties = {
    top: y,
    left: `calc(${x} + ${anchoEtiqueta})`,
    width: anchoLinea,
    textAlign: centrar ? 'center' : 'left',
  }
  const dato = valor ? (
    href ? (
      <Link to={href} className="dato" style={linea}>
        {valor}
      </Link>
    ) : (
      <span className="dato" style={linea}>
        {valor}
      </span>
    )
  ) : null
  return (
    <>
      <span className="solo-formato etiqueta" style={{ top: y, left: x, width: anchoEtiqueta }}>
        {etiqueta}
      </span>
      <span className="solo-formato linea" style={linea} />
      {dato}
    </>
  )
}

function Casilla({
  y,
  x,
  ancho,
  valor,
  centrar,
}: {
  y: string
  x: string
  ancho: string
  valor: string
  centrar?: boolean
}) {
  const estilo: CSSProperties = { top: y, left: x, width: ancho, textAlign: centrar ? 'center' : 'left' }
  return (
    <>
      <span className="solo-formato linea" style={estilo} />
      {valor ? (
        <span className="dato" style={estilo}>
          {valor}
        </span>
      ) : null}
    </>
  )
}

function Certificado({ horse }: { horse: CaballoPublico }) {
  const fecha = horse.fechaRegistro ? partesFechaHoja(horse.fechaRegistro) : null
  const padreHref = codigoEnlazable(horse.padreCodigo, horse.codigo)
  const madreHref = codigoEnlazable(horse.madreCodigo, horse.codigo)
  const padreLink = padreHref ? `/caballo/${encodeURIComponent(padreHref)}` : null
  const madreLink = madreHref ? `/caballo/${encodeURIComponent(madreHref)}` : null

  return (
    <>
      <div className="solo-formato marca-agua" aria-hidden="true">
        {Array.from({ length: 8 }, (_, fila) => (
          <div key={fila} className="marca-fila">
            <span>ADOPASO</span>
            <span>ADOPASO</span>
            <span>ADOPASO</span>
          </div>
        ))}
      </div>
      <div className="solo-formato marco" />
      <div className="solo-formato marco-interno" />

      <p className="solo-formato membrete">Asociación Dominicana de Caballos de Paso, Inc.</p>
      <img src="/logo-adopaso.png" alt="" className="solo-formato logo-hoja" />
      <h2 className="solo-formato titulo-hoja">
        Certificado de entrada
        <br />
        en el libro de registro genealogico
      </h2>

      <Renglon
        y="2.72in"
        x="2.35in"
        etiqueta="No. Registro"
        anchoEtiqueta="1.05in"
        anchoLinea="2.15in"
        valor={codigoHoja(horse.codigo)}
        centrar
      />

      <span className="solo-formato etiqueta" style={{ top: '3.08in', left: '1.15in', width: '1.85in' }}>
        Santo Domingo, D. N.
      </span>
      <Casilla y="3.08in" x="3.15in" ancho="0.42in" valor={fecha?.dia ?? ''} centrar />
      <Casilla y="3.08in" x="3.68in" ancho="1.35in" valor={fecha?.mes ?? ''} centrar />
      <Casilla y="3.08in" x="5.15in" ancho="0.38in" valor={fecha?.siglo ?? ''} centrar />
      <Casilla y="3.08in" x="5.64in" ancho="0.42in" valor={fecha?.anio ?? ''} centrar />

      <Renglon
        y="3.52in"
        x="0.52in"
        etiqueta="Certificamos que el equino:"
        anchoEtiqueta="1.95in"
        anchoLinea="4.55in"
        valor={mayus(horse.nombre)}
        centrar
      />
      <span className="solo-formato nombre-pie">Nombre</span>

      <Renglon
        y="3.90in"
        x="0.52in"
        etiqueta="Modalidad de paso:"
        anchoEtiqueta="1.45in"
        anchoLinea="3.15in"
        valor={mayus(horse.modalidad)}
      />
      <Renglon
        y="3.90in"
        x="5.35in"
        etiqueta="Sexo:"
        anchoEtiqueta="0.48in"
        anchoLinea="1.85in"
        valor={sexoHoja(horse.sexo)}
      />

      <Renglon
        y="4.28in"
        x="0.52in"
        etiqueta="Color:"
        anchoEtiqueta="0.55in"
        anchoLinea="3.55in"
        valor={mayus(horse.color)}
      />
      <Renglon
        y="4.28in"
        x="4.85in"
        etiqueta="Microchip No.:"
        anchoEtiqueta="1.15in"
        anchoLinea="1.7in"
        valor={horse.microchip?.trim() ?? ''}
      />

      <Renglon
        y="4.66in"
        x="0.52in"
        etiqueta="Señas particulares:"
        anchoEtiqueta="1.5in"
        anchoLinea="5.7in"
        valor={mayus(horse.senas)}
      />
      <Renglon
        y="5.04in"
        x="0.52in"
        etiqueta="DNA:"
        anchoEtiqueta="0.48in"
        anchoLinea="6.7in"
        valor={horse.adn?.trim().toLocaleUpperCase('es-DO') ?? ''}
      />

      <Renglon
        y="5.42in"
        x="0.52in"
        etiqueta="Fecha de nacimiento:"
        anchoEtiqueta="1.6in"
        anchoLinea="1.7in"
        valor={horse.fechaNacimiento ? formatFechaRegistro(horse.fechaNacimiento) : ''}
      />
      <Renglon
        y="5.42in"
        x="4.05in"
        etiqueta="Lugar de nacimiento:"
        anchoEtiqueta="1.6in"
        anchoLinea="2.05in"
        valor={lugarHoja(horse)}
      />

      <Renglon
        y="5.80in"
        x="0.52in"
        etiqueta="Padre:"
        anchoEtiqueta="0.55in"
        anchoLinea="3.15in"
        valor={mayus(horse.padre)}
        href={padreLink}
      />
      <Renglon
        y="5.80in"
        x="4.4in"
        etiqueta="Registro No.:"
        anchoEtiqueta="1.05in"
        anchoLinea="2.25in"
        valor={registroConAsociacion(horse.padreCodigo, null)}
        href={padreLink}
      />

      <Renglon
        y="6.18in"
        x="0.52in"
        etiqueta="Madre:"
        anchoEtiqueta="0.62in"
        anchoLinea="3.08in"
        valor={mayus(horse.madre)}
        href={madreLink}
      />
      <Renglon
        y="6.18in"
        x="4.4in"
        etiqueta="Registro No.:"
        anchoEtiqueta="1.05in"
        anchoLinea="2.25in"
        valor={registroConAsociacion(horse.madreCodigo, null)}
        href={madreLink}
      />

      <Renglon
        y="6.56in"
        x="0.52in"
        etiqueta="Criador:"
        anchoEtiqueta="0.7in"
        anchoLinea="3.0in"
        valor={mayus(horse.criador)}
      />
      <Renglon
        y="6.56in"
        x="4.4in"
        etiqueta="Propietario:"
        anchoEtiqueta="0.95in"
        anchoLinea="2.35in"
        valor={mayus(horse.expositor)}
      />

      <div className="solo-formato firma" style={{ left: '0.7in' }}>
        <span className="linea" />
        <span>Secretario del Registro Genealógico</span>
      </div>
      <div className="solo-formato firma" style={{ left: '5.15in' }}>
        <span className="linea" />
        <span>Presidente</span>
      </div>
      <p className="solo-formato pie-imprenta">JOSE M. FROMETA, C. POR A.</p>
    </>
  )
}

function NombreArbol({
  nombre,
  href,
  top,
  left,
  width,
}: {
  nombre: string | null
  href?: string | null
  top: string
  left: string
  width: string
}) {
  const texto = mayus(nombre)
  const estilo: CSSProperties = {
    top,
    left,
    width,
    textAlign: 'center',
    fontSize: texto.length > 24 ? '6.5pt' : '8pt',
  }
  return (
    <>
      <span className="solo-formato linea" style={estilo} />
      {texto ? (
        href ? (
          <Link to={href} className="dato" style={estilo}>
            {texto}
          </Link>
        ) : (
          <span className="dato" style={estilo}>
            {texto}
          </span>
        )
      ) : null}
    </>
  )
}

function GenealogiaHoja({ horse }: { horse: CaballoPublico }) {
  const columnas = generaciones(horse)
  const [ejemplar] = columnas[0]
  const [padre, madre] = columnas[1]
  const [pabuelo, pabuela, mabuelo, mabuela] = columnas[2]
  const [papbiso, pambisa, pmabiso, pmabisa, mpabiso, mpabisa, mmabiso, mmabisa] = columnas[3]
  const hrefDe = (codigo: string | null) => {
    const visible = codigoEnlazable(codigo, horse.codigo)
    return visible ? `/caballo/${encodeURIComponent(visible)}` : null
  }

  const arriba = 1.15
  const paso = 4.9 / 8
  const y = (indice: number) => `${arriba + (indice + 0.5) * paso}in`
  const entre = (a: number, b: number) => `${arriba + ((a + b) / 2 + 0.5) * paso}in`

  const gran = [
    papbiso,
    pambisa,
    pmabiso,
    pmabisa,
    mpabiso,
    mpabisa,
    mmabiso,
    mmabisa,
  ]

  return (
    <>
      <h2 className="solo-formato titulo-genealogia">Genealogia</h2>
      <NombreArbol nombre={ejemplar.nombre} top={entre(1.5, 5.5)} left="0.4in" width="1.9in" />
      <NombreArbol nombre={padre.nombre} href={hrefDe(padre.codigo)} top={entre(0, 3)} left="2.4in" width="1.9in" />
      <NombreArbol nombre={madre.nombre} href={hrefDe(madre.codigo)} top={entre(4, 7)} left="2.4in" width="1.9in" />
      <NombreArbol nombre={pabuelo.nombre} href={hrefDe(pabuelo.codigo)} top={entre(0, 1)} left="4.45in" width="1.7in" />
      <NombreArbol nombre={pabuela.nombre} href={hrefDe(pabuela.codigo)} top={entre(2, 3)} left="4.45in" width="1.7in" />
      <NombreArbol nombre={mabuelo.nombre} href={hrefDe(mabuelo.codigo)} top={entre(4, 5)} left="4.45in" width="1.7in" />
      <NombreArbol nombre={mabuela.nombre} href={hrefDe(mabuela.codigo)} top={entre(6, 7)} left="4.45in" width="1.7in" />
      {gran.map((nodo, indice) => (
        <NombreArbol
          key={nodo.id}
          nombre={nodo.nombre}
          href={hrefDe(nodo.codigo)}
          top={y(indice)}
          left="6.3in"
          width="1.8in"
        />
      ))}

      <h3 className="solo-formato titulo-traspasos">Traspasos</h3>
      <p className="solo-formato texto-traspasos">
        Para mantener la validez del registro, todo traspaso debe ser aprobado y hecho en presencia del secretario de
        ADOPASO, quien emitira un nuevo certificado.
      </p>
      <span className="solo-formato linea" style={{ top: '7.72in', left: '0.45in', width: '3.1in' }} />
      <span className="solo-formato pie-linea" style={{ top: '7.76in', left: '0.45in', width: '3.1in' }}>
        Dueño
      </span>
      <span className="solo-formato linea" style={{ top: '7.72in', left: '4.9in', width: '3.1in' }} />
      <span className="solo-formato pie-linea" style={{ top: '7.76in', left: '4.9in', width: '3.1in' }}>
        Comprador
      </span>
      <span className="solo-formato linea" style={{ top: '8.28in', left: '2.7in', width: '3.1in' }} />
      <span className="solo-formato pie-linea" style={{ top: '8.32in', left: '2.7in', width: '3.1in' }}>
        Secretario
      </span>
      <span className="solo-formato etiqueta" style={{ top: '8.82in', left: '0.45in', width: '1.25in' }}>
        Fecha de la Venta:
      </span>
      <span className="solo-formato linea" style={{ top: '8.82in', left: '1.75in', width: '2.6in' }} />
    </>
  )
}

export function HojasRegistro({ horse, papel }: { horse: CaballoPublico; papel: PapelImpresion }) {
  return (
    <div className="hojas-registro" data-papel={papel}>
      <VistaHoja className="doc-certificado hoja-certificado">
        <Certificado horse={horse} />
      </VistaHoja>
      <VistaHoja className="doc-genealogia hoja-genealogia">
        <GenealogiaHoja horse={horse} />
      </VistaHoja>
    </div>
  )
}

export function BarraHoja({
  papel,
  onPapel,
  origen,
  botonClass,
}: {
  papel: PapelImpresion
  onPapel: (papel: PapelImpresion) => void
  origen?: 'admin'
  botonClass: string
}) {
  function imprimir(documento: DocumentoImpreso) {
    imprimirDocumento(documento, origen, papel)
  }
  const activo = 'bg-gold text-bg'
  const quieto = botonClass
  return (
    <div className="no-imprimir space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="typo-label">Papel</span>
        <button
          type="button"
          aria-pressed={papel === 'blanco'}
          className={`typo-btn rounded-[10px] px-3 py-2 ${papel === 'blanco' ? activo : quieto}`}
          onClick={() => onPapel('blanco')}
        >
          En blanco
        </button>
        <button
          type="button"
          aria-pressed={papel === 'timbrado'}
          className={`typo-btn rounded-[10px] px-3 py-2 ${papel === 'timbrado' ? activo : quieto}`}
          onClick={() => onPapel('timbrado')}
        >
          Timbrado
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={botonClass} onClick={() => imprimir('certificado')}>
          Imprimir certificado
        </button>
        <button type="button" className={botonClass} onClick={() => imprimir('genealogia')}>
          Imprimir genealogía
        </button>
        <button type="button" className={`typo-btn rounded-[10px] px-4 py-2 ${activo}`} onClick={() => imprimir('ambos')}>
          Imprimir ambos
        </button>
      </div>
      <p className="typo-caption max-w-xl">
        {papel === 'timbrado'
          ? 'El papel timbrado ya trae el fondo, el logo, las líneas y los títulos. Solo se imprimen los datos. Ambos es el frente y el reverso de la misma hoja de 8½ × 9¼.'
          : 'En blanco imprime el formato completo, con el logo nuevo. El certificado va por delante y la genealogía por detrás, en hoja de 8½ × 9¼. En la ventana de impresión: márgenes en ninguno, escala 100 % y doble cara por el borde largo.'}
      </p>
    </div>
  )
}
