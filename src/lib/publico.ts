import { supabase, supabaseConfigurado } from './supabase'
import { formatNombre } from './format'
import type {
  Ancestro,
  AnioRanking,
  CaballoPublico,
  CategoriaAnio,
  ClaseAnio,
  ClaseJinete,
  CompetenciaResumen,
  EntradaPersona,
  EntradaRanking,
  HistorialPersona,
  ResultadoPublico,
  RolPersona,
} from '../types/publico'

const CAMPOS_CABALLO =
  'codigo, nombre, sexo, color, fecha_nacimiento, lugar_nacimiento, padre, madre, expositor, criador, categoria_nombre'
const CAMPOS_FICHA = `${CAMPOS_CABALLO}, padre_codigo, madre_codigo, senas, adn, microchip, raza, fecha_registro, ancestros`

const LIMITE = 500

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function entero(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function enteroOpcional(value: unknown): number | null {
  const n = entero(value, Number.NaN)
  return Number.isFinite(n) ? n : null
}

function fechaIso(value: unknown): string {
  if (typeof value === 'string' && value) return value.slice(0, 10)
  return ''
}

function idCompetencia(fecha: string, lugar: string): string {
  return `${fecha}|${lugar}`
}

export function parsearIdCompetencia(id: string): { fecha: string; lugar: string } | null {
  const sep = id.indexOf('|')
  if (sep <= 0) return null
  return { fecha: id.slice(0, sep), lugar: id.slice(sep + 1) }
}

function etiquetaCompetencia(row: {
  nombre?: string | null
  competencia?: string | null
  circuito?: string | null
  lugar: string
}): string {
  const competencia = texto(row.competencia)
  const nombre = texto(row.nombre)
  const circuito = texto(row.circuito)
  if (competencia && circuito) return `${formatNombre(competencia)} · ${formatNombre(circuito)}`
  if (competencia) return formatNombre(competencia)
  if (nombre) return formatNombre(nombre)
  return formatNombre(row.lugar)
}

function filaRanking(row: Record<string, unknown>): EntradaRanking {
  return {
    id: texto(row.caballo_id) || texto(row.caballo_nombre),
    name: formatNombre(texto(row.caballo_nombre) || texto(row.caballo_id)),
    owner: formatNombre(texto(row.expositor)),
    stable: formatNombre(texto(row.criador)),
    position: entero(row.posicion, 0),
    points: entero(row.puntos),
    salidas: entero(row.salidas),
    campeonatos: entero(row.campeonatos),
    mejorPuesto: enteroOpcional(row.mejor_puesto),
    clase: texto(row.clase) ? formatNombre(texto(row.clase)) : null,
    campeon: Boolean(row.campeon),
  }
}

function hoyIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function anioPorDefecto(anios: AnioRanking[]): number | null {
  if (anios.length === 0) return null
  const conVolumen = anios.filter((a) => a.resultados >= 100)
  return (conVolumen[0] ?? anios.find((a) => a.resultados > 0) ?? anios[0]).anio
}

export async function cargarAniosRanking(): Promise<AnioRanking[]> {
  if (!supabaseConfigurado) return []
  const { data, error } = await supabase
    .from('catalogo_anios')
    .select('anio, resultados, con_puntos, puntos')
    .order('anio', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    anio: entero(row.anio),
    resultados: entero(row.resultados),
    conPuntos: entero(row.con_puntos),
    puntos: entero(row.puntos),
  }))
}

/** Años del ranking + años del calendario (2017–2026 no tienen puntos en el histórico). */
export async function cargarAniosPublicos(): Promise<AnioRanking[]> {
  if (!supabaseConfigurado) return []
  const [ranking, cal] = await Promise.all([
    cargarAniosRanking(),
    supabase.from('calendario_publico').select('anio'),
  ])
  if (cal.error) throw cal.error
  const porAnio = new Map(ranking.map((a) => [a.anio, a]))
  for (const row of cal.data ?? []) {
    const y = entero(row.anio)
    if (y && !porAnio.has(y)) {
      porAnio.set(y, { anio: y, resultados: 0, conPuntos: 0, puntos: 0 })
    }
  }
  return [...porAnio.values()].sort((a, b) => b.anio - a.anio)
}

export async function cargarRankingGeneral(anio: number): Promise<EntradaRanking[]> {
  const { data, error } = await supabase
    .from('ranking_general')
    .select(
      'caballo_id, caballo_nombre, expositor, criador, puntos, salidas, campeonatos, mejor_puesto, posicion',
    )
    .eq('anio', anio)
    .order('posicion', { ascending: true })
    .limit(LIMITE)
  if (error) throw error
  return (data ?? []).map((row) => filaRanking(row as Record<string, unknown>))
}

export async function cargarCategorias(anio: number): Promise<CategoriaAnio[]> {
  const { data, error } = await supabase
    .from('catalogo_categorias')
    .select('tipo, caballos, puntos')
    .eq('anio', anio)
    .order('puntos', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    tipo: texto(row.tipo),
    caballos: entero(row.caballos),
    puntos: entero(row.puntos),
  }))
}

export async function cargarClases(anio: number, tipo: string): Promise<ClaseAnio[]> {
  const { data, error } = await supabase
    .from('catalogo_clases')
    .select('tipo, clase, caballos, puntos')
    .eq('anio', anio)
    .eq('tipo', tipo)
    .order('puntos', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    tipo: texto(row.tipo),
    clase: texto(row.clase),
    caballos: entero(row.caballos),
    puntos: entero(row.puntos),
  }))
}

export async function cargarRankingCategoria(
  anio: number,
  tipo: string,
  clase?: string,
): Promise<EntradaRanking[]> {
  const tabla = clase ? 'ranking_clase' : 'ranking_categoria'
  const columnas =
    'caballo_id, caballo_nombre, expositor, criador, puntos, salidas, campeonatos, mejor_puesto, posicion' +
    (clase ? ', clase' : '')
  let q = supabase
    .from(tabla)
    .select(columnas)
    .eq('anio', anio)
    .eq('tipo', tipo)
    .order('posicion', { ascending: true })
    .limit(LIMITE)
  if (clase) q = q.eq('clase', clase)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => filaRanking(row as unknown as Record<string, unknown>))
}

export async function cargarCompetenciasConResultados(anio: number): Promise<CompetenciaResumen[]> {
  const { data, error } = await supabase
    .from('catalogo_competencias')
    .select('anio, fecha, lugar, nombre, circuito, competencia, ciudad, resultados, caballos, puntos')
    .eq('anio', anio)
    .order('fecha', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const fecha = fechaIso(row.fecha)
    const lugarClave = texto(row.lugar) || 'Sin lugar'
    return {
      id: idCompetencia(fecha, lugarClave),
      anio: entero(row.anio, anio),
      fecha,
      lugarClave,
      lugar: formatNombre(lugarClave),
      nombre:       etiquetaCompetencia({
        nombre: row.nombre,
        competencia: row.competencia,
        circuito: row.circuito,
        lugar: lugarClave,
      }),
      circuito: texto(row.circuito) ? formatNombre(texto(row.circuito)) : null,
      competencia: texto(row.competencia) ? formatNombre(texto(row.competencia)) : null,
      ciudad: texto(row.ciudad) ? formatNombre(texto(row.ciudad)) : null,
      resultados: entero(row.resultados),
      caballos: entero(row.caballos),
      puntos: entero(row.puntos),
      status: 'completed' as const,
    }
  })
}

export async function cargarRankingCompetencia(
  anio: number,
  fecha: string,
  lugar: string,
): Promise<EntradaRanking[]> {
  const { data, error } = await supabase
    .from('ranking_competencia')
    .select(
      'caballo_id, caballo_nombre, expositor, criador, puntos, salidas, campeonatos, mejor_puesto, posicion, campeon',
    )
    .eq('anio', anio)
    .eq('fecha', fecha)
    .eq('lugar', lugar)
    .order('posicion', { ascending: true })
    .limit(LIMITE)
  if (error) throw error
  return (data ?? []).map((row) => filaRanking(row as Record<string, unknown>))
}

export async function cargarCalendario(anio: number): Promise<CompetenciaResumen[]> {
  const [{ data: cal, error: errCal }, conResultados] = await Promise.all([
    supabase
      .from('calendario_publico')
      .select('codigo, fecha, nombre, circuito, competencia, ciudad, anio')
      .eq('anio', anio)
      .order('fecha', { ascending: true }),
    cargarCompetenciasConResultados(anio),
  ])
  if (errCal) throw errCal

  const porFecha = new Map(conResultados.map((c) => [c.fecha, c]))
  const hoy = hoyIso()
  const vistos = new Set<string>()
  const lista: CompetenciaResumen[] = []

  for (const row of cal ?? []) {
    const fecha = fechaIso(row.fecha)
    const existente = porFecha.get(fecha)
    if (existente) {
      vistos.add(existente.id)
      lista.push(existente)
      continue
    }
    const ciudad = texto(row.ciudad) || 'Por confirmar'
    lista.push({
      id: `cal-${row.codigo}`,
      anio,
      fecha,
      lugarClave: ciudad,
      lugar: formatNombre(ciudad),
      nombre: etiquetaCompetencia({
        nombre: row.nombre,
        competencia: row.competencia,
        circuito: row.circuito,
        lugar: ciudad,
      }),
      circuito: texto(row.circuito) ? formatNombre(texto(row.circuito)) : null,
      competencia: texto(row.competencia) ? formatNombre(texto(row.competencia)) : null,
      ciudad: formatNombre(ciudad),
      resultados: 0,
      caballos: 0,
      puntos: 0,
      status: fecha >= hoy ? 'upcoming' : 'completed',
    })
  }

  for (const extra of conResultados) {
    if (!vistos.has(extra.id)) lista.push(extra)
  }

  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export async function cargarProximaCompetencia(): Promise<CompetenciaResumen | null> {
  const hoy = hoyIso()
  const { data, error } = await supabase
    .from('calendario_publico')
    .select('codigo, fecha, nombre, circuito, competencia, ciudad, anio')
    .gte('fecha', hoy)
    .order('fecha', { ascending: true })
    .limit(1)
  if (error) throw error
  const row = data?.[0]
  if (!row) return null
  const fecha = fechaIso(row.fecha)
  const ciudad = texto(row.ciudad) || 'Por confirmar'
  return {
    id: `cal-${row.codigo}`,
    anio: entero(row.anio),
    fecha,
    lugarClave: ciudad,
    lugar: formatNombre(ciudad),
    nombre: etiquetaCompetencia({
      nombre: row.nombre,
      competencia: row.competencia,
      circuito: row.circuito,
      lugar: ciudad,
    }),
    circuito: texto(row.circuito) ? formatNombre(texto(row.circuito)) : null,
    competencia: texto(row.competencia) ? formatNombre(texto(row.competencia)) : null,
    ciudad: formatNombre(ciudad),
    resultados: 0,
    caballos: 0,
    puntos: 0,
    status: 'upcoming',
  }
}

export async function buscarCaballos(query: string): Promise<CaballoPublico[]> {
  let q = supabase
    .from('caballo_publico')
    .select(CAMPOS_CABALLO)
    .order('nombre', { ascending: true })
    .limit(60)
  const termino = query.trim().replace(/[%*,]/g, ' ')
  if (termino) {
    const like = `%${termino}%`
    q = q.or(
      `nombre.ilike."${like}",codigo.ilike."${like}",expositor.ilike."${like}",criador.ilike."${like}",padre.ilike."${like}",madre.ilike."${like}"`,
    )
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapCaballo)
}

async function leerFicha(
  aplicar: (campos: string) => PromiseLike<{ data: Record<string, unknown> | null; error: { message: string } | null }>,
): Promise<Record<string, unknown> | null> {
  const completa = await aplicar(CAMPOS_FICHA)
  if (!completa.error) return completa.data
  const basica = await aplicar(CAMPOS_CABALLO)
  if (basica.error) throw new Error(basica.error.message)
  return basica.data
}

export async function cargarCaballo(codigo: string): Promise<CaballoPublico | null> {
  const porCodigo = await leerFicha((campos) =>
    supabase.from('caballo_publico').select(campos).eq('codigo', codigo).maybeSingle(),
  )
  if (porCodigo) return mapCaballo(porCodigo)

  const porNombre = await supabase
    .from('caballo_publico')
    .select(CAMPOS_CABALLO)
    .ilike('nombre', codigo)
    .limit(1)
  if (porNombre.error) throw porNombre.error
  return porNombre.data?.[0] ? mapCaballo(porNombre.data[0]) : null
}

export async function cargarHistorialCaballo(caballoId: string): Promise<ResultadoPublico[]> {
  const { data, error } = await supabase
    .from('resultados_publicos')
    .select(
      'anio, fecha, lugar, tipo, clase, caballo_id, caballo_nombre, expositor, criador, puesto, puntos, campeon',
    )
    .eq('caballo_id', caballoId)
    .order('fecha', { ascending: false })
    .limit(LIMITE)
  if (error) throw error
  return (data ?? []).map((row) => ({
    anio: entero(row.anio),
    fecha: fechaIso(row.fecha),
    lugar: formatNombre(texto(row.lugar)),
    tipo: texto(row.tipo) || null,
    clase: texto(row.clase) ? formatNombre(texto(row.clase)) : null,
    caballoId: texto(row.caballo_id),
    caballoNombre: formatNombre(texto(row.caballo_nombre)),
    expositor: texto(row.expositor) ? formatNombre(texto(row.expositor)) : null,
    criador: texto(row.criador) ? formatNombre(texto(row.criador)) : null,
    puesto: enteroOpcional(row.puesto),
    puntos: entero(row.puntos),
    campeon: Boolean(row.campeon),
  }))
}

function ancestro(value: unknown): Ancestro {
  if (!value || typeof value !== 'object') return { codigo: null, nombre: null }
  const fila = value as Record<string, unknown>
  const codigo = texto(fila.codigo)
  const nombre = texto(fila.nombre)
  return {
    codigo: codigo || null,
    nombre: nombre ? formatNombre(nombre) : null,
  }
}

function mapaAncestros(value: unknown): Record<string, Ancestro> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([clave, item]) => [clave, ancestro(item)]),
  )
}

function mapCaballo(row: Record<string, unknown>): CaballoPublico {
  return {
    codigo: texto(row.codigo),
    nombre: formatNombre(texto(row.nombre) || texto(row.codigo)),
    sexo: texto(row.sexo) || null,
    color: texto(row.color) ? formatNombre(texto(row.color)) : null,
    fechaNacimiento: fechaIso(row.fecha_nacimiento) || null,
    lugarNacimiento: texto(row.lugar_nacimiento) ? formatNombre(texto(row.lugar_nacimiento)) : null,
    padre: texto(row.padre) ? formatNombre(texto(row.padre)) : null,
    madre: texto(row.madre) ? formatNombre(texto(row.madre)) : null,
    padreCodigo: texto(row.padre_codigo) || null,
    madreCodigo: texto(row.madre_codigo) || null,
    expositor: texto(row.expositor) ? formatNombre(texto(row.expositor)) : null,
    criador: texto(row.criador) ? formatNombre(texto(row.criador)) : null,
    categoria: texto(row.categoria_nombre) ? formatNombre(texto(row.categoria_nombre)) : null,
    senas: texto(row.senas) ? formatNombre(texto(row.senas)) : null,
    adn: texto(row.adn) || null,
    microchip: texto(row.microchip) || null,
    modalidad: texto(row.raza) ? formatNombre(texto(row.raza)) : null,
    fechaRegistro: fechaIso(row.fecha_registro) || null,
    ancestros: mapaAncestros(row.ancestros),
  }
}

export const ROLES_PERSONA: { value: RolPersona; label: string; singular: string; plural: string }[] = [
  { value: 'montador', label: 'Montadores', singular: 'montador', plural: 'montadores' },
  { value: 'jinete', label: 'Jinetes y amazonas', singular: 'jinete', plural: 'jinetes y amazonas' },
  { value: 'criador', label: 'Criadores', singular: 'criador', plural: 'criadores' },
  { value: 'propietario', label: 'Propietarios', singular: 'propietario', plural: 'propietarios' },
]

export function esRolPersona(value: string | undefined): value is RolPersona {
  return ROLES_PERSONA.some((r) => r.value === value)
}

const CAMPOS_PERSONA =
  'persona, puntos, salidas, caballos, primeros, campeonatos, competencias, posicion'

function filaPersona(row: Record<string, unknown>): EntradaPersona {
  const persona = texto(row.persona)
  return {
    persona,
    nombre: formatNombre(persona),
    position: entero(row.posicion, 0),
    points: entero(row.puntos),
    salidas: entero(row.salidas),
    caballos: entero(row.caballos),
    primeros: entero(row.primeros),
    campeonatos: entero(row.campeonatos),
    competencias: entero(row.competencias),
  }
}

/** Ranking de personas del año, o de una competencia si se pasa fecha y lugar. */
export async function cargarRankingPersonas(
  anio: number,
  rol: RolPersona,
  opciones: { categoria?: string; fecha?: string; lugar?: string } = {},
): Promise<EntradaPersona[]> {
  const porCompetencia = Boolean(opciones.fecha && opciones.lugar)
  let q = supabase
    .from(porCompetencia ? 'ranking_personas_competencia' : 'ranking_personas')
    .select(CAMPOS_PERSONA)
    .eq('anio', anio)
    .eq('rol', rol)
    .eq('categoria', opciones.categoria ?? '')
    .order('posicion', { ascending: true })
    .limit(LIMITE)
  if (porCompetencia) q = q.eq('fecha', opciones.fecha!).eq('lugar', opciones.lugar!)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => filaPersona(row as Record<string, unknown>))
}

export async function cargarClasesJinetes(anio: number): Promise<ClaseJinete[]> {
  const { data, error } = await supabase
    .from('catalogo_clases_jinetes')
    .select('clase, personas, puntos')
    .eq('anio', anio)
    .gt('puntos', 0)
    .order('clase', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    clase: texto(row.clase),
    nombre: formatNombre(texto(row.clase)),
    personas: entero(row.personas),
    puntos: entero(row.puntos),
  }))
}

export async function cargarHistorialPersona(
  rol: RolPersona,
  persona: string,
): Promise<HistorialPersona[]> {
  const { data, error } = await supabase
    .from('historial_personas')
    .select('anio, fecha, lugar, categoria, puntos, salidas, primeros, campeonatos')
    .eq('rol', rol)
    .eq('persona', persona)
    .order('fecha', { ascending: false })
    .limit(2000)
  if (error) throw error
  return (data ?? []).map((row) => ({
    anio: entero(row.anio),
    fecha: fechaIso(row.fecha),
    lugar: formatNombre(texto(row.lugar)),
    categoria: texto(row.categoria) ? formatNombre(texto(row.categoria)) : null,
    puntos: entero(row.puntos),
    salidas: entero(row.salidas),
    primeros: entero(row.primeros),
    campeonatos: entero(row.campeonatos),
  }))
}
