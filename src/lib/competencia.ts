import { mesesCumplidos, modalidadDeClase, sexoRegistro, type Modalidad } from './campeonato'
import { valorModalidadRegistro } from './registro'
import { supabase } from './supabase'

/** Pasos de una clase en pista, en orden. */
export const FASES = [
  { value: 'inscripcion', label: 'Inscripción' },
  { value: 'prepista', label: 'Pre-pista' },
  { value: 'formato_a', label: 'Formato A' },
  { value: 'individual', label: 'Recorrido individual' },
  { value: 'votacion', label: 'Votación final' },
  { value: 'cerrada', label: 'Cerrada' },
] as const
export type Fase = (typeof FASES)[number]['value']

/** Únicos motivos para excusar un ejemplar. */
export const EXCUSAS = [
  { value: 'indocilidad', label: 'Acto de indocilidad' },
  { value: 'fuera_modalidad', label: 'Fuera de la modalidad' },
  { value: 'solicitud_exhibidor', label: 'Lo pidió el exhibidor' },
  { value: 'sanitaria', label: 'Situación sanitaria' },
] as const
export type Excusa = (typeof EXCUSAS)[number]['value']

export type RolAcceso = 'juez' | 'prepista' | 'mesa'

export function etiquetaFase(fase: string): string {
  return FASES.find((f) => f.value === fase)?.label ?? fase
}

export function etiquetaExcusa(excusa: string | null): string {
  return EXCUSAS.find((e) => e.value === excusa)?.label ?? ''
}

export function etiquetaAcceso(rol: RolAcceso, juezPuesto?: number | null): string {
  if (rol === 'juez') return `Juez ${juezPuesto ?? ''}`.trim()
  return rol === 'prepista' ? 'Pre-pista' : 'Mesa técnica'
}

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

export interface Competencia {
  id: string
  programaCodigo: number | null
  nombre: string
  fecha: string
  lugar: string | null
  estado: 'inscripcion' | 'en_curso' | 'finalizada'
  simulacion: boolean
}

export interface Inscripcion {
  id: string
  numero: number | null
  caballoCodigo: string | null
  nombre: string
  sexo: string | null
  nacimiento: string | null
  propietario: string | null
  pagado: boolean
  asistio: boolean | null
}

export interface ClaseCompetencia {
  id: string
  eventoCodigo: number | null
  categoria: string
  fase: Fase
  inscritos: Inscripcion[]
}

export interface Acceso {
  codigo: string
  rol: RolAcceso
  juezPuesto: number | null
  nombre: string | null
}

export interface DetalleCompetencia {
  competencia: Competencia
  clases: ClaseCompetencia[]
  accesos: Acceso[]
}

export interface CategoriaCatalogo {
  codigo: number
  nombre: string
  sexo: string | null
  desde: number
  hasta: number
  modalidad: Modalidad | null
}

export interface CaballoInscribible {
  codigo: string
  nombre: string
  sexo: string | null
  nacimiento: string | null
  modalidad: string
  padre: string | null
  madre: string | null
  criador: string | null
  propietario: string | null
}

function texto(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function fecha(value: unknown): string | null {
  return typeof value === 'string' && value ? value.slice(0, 10) : null
}

function mapCompetencia(row: Record<string, unknown>): Competencia {
  return {
    id: String(row.id),
    programaCodigo: row.programa_codigo == null ? null : Number(row.programa_codigo),
    nombre: String(row.nombre ?? ''),
    fecha: fecha(row.fecha) ?? '',
    lugar: texto(row.lugar),
    estado: String(row.estado) as Competencia['estado'],
    simulacion: Boolean(row.simulacion),
  }
}

export async function listarCompetencias(): Promise<Competencia[]> {
  const { data, error } = await supabase
    .from('competencias')
    .select('id, programa_codigo, nombre, fecha, lugar, estado, simulacion')
    .order('fecha', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapCompetencia)
}

export async function crearCompetencia(input: {
  programaCodigo: number | null
  nombre: string
  fecha: string
  lugar: string
  simulacion?: boolean
}): Promise<string> {
  const { data, error } = await supabase
    .from('competencias')
    .insert({
      programa_codigo: input.programaCodigo,
      nombre: input.nombre.trim(),
      fecha: input.fecha,
      lugar: input.lugar.trim() || null,
      simulacion: input.simulacion ?? false,
    })
    .select('id')
    .single()
  if (error) throw error
  return String(data.id)
}

export async function cargarCompetencia(id: string): Promise<DetalleCompetencia | null> {
  const [competencia, clases, accesos] = await Promise.all([
    supabase.from('competencias').select('id, programa_codigo, nombre, fecha, lugar, estado, simulacion').eq('id', id).maybeSingle(),
    supabase
      .from('juzgamientos')
      .select(
        'id, evento_codigo, categoria, fase, orden, juzgamiento_ejemplares (id, numero, caballo_codigo, nombre, sexo, nacimiento, propietario, pagado, asistio)',
      )
      .eq('competencia_id', id)
      .order('orden', { ascending: true }),
    supabase.from('competencia_accesos').select('codigo, rol, juez_puesto, nombre').eq('competencia_id', id),
  ])
  if (competencia.error) throw competencia.error
  if (!competencia.data) return null
  if (clases.error) throw clases.error
  if (accesos.error) throw accesos.error
  return {
    competencia: mapCompetencia(competencia.data),
    clases: (clases.data ?? []).map((row) => ({
      id: String(row.id),
      eventoCodigo: row.evento_codigo == null ? null : Number(row.evento_codigo),
      categoria: String(row.categoria ?? ''),
      fase: String(row.fase) as Fase,
      inscritos: ((row.juzgamiento_ejemplares ?? []) as Record<string, unknown>[])
        .map((e) => ({
          id: String(e.id),
          numero: e.numero == null ? null : Number(e.numero),
          caballoCodigo: texto(e.caballo_codigo),
          nombre: String(e.nombre ?? ''),
          sexo: texto(e.sexo),
          nacimiento: fecha(e.nacimiento),
          propietario: texto(e.propietario),
          pagado: Boolean(e.pagado),
          asistio: e.asistio == null ? null : Boolean(e.asistio),
        }))
        .sort((a, b) => (a.numero ?? 9999) - (b.numero ?? 9999) || a.nombre.localeCompare(b.nombre)),
    })),
    accesos: (accesos.data ?? [])
      .map((row) => ({
        codigo: String(row.codigo),
        rol: String(row.rol) as RolAcceso,
        juezPuesto: row.juez_puesto == null ? null : Number(row.juez_puesto),
        nombre: texto(row.nombre),
      }))
      .sort((a, b) => ordenAcceso(a) - ordenAcceso(b)),
  }
}

function ordenAcceso(acceso: Acceso): number {
  if (acceso.rol === 'mesa') return 0
  if (acceso.rol === 'prepista') return 1
  return 1 + (acceso.juezPuesto ?? 0)
}

export async function finalizarCompetencia(id: string): Promise<void> {
  const { error } = await supabase.from('competencias').update({ estado: 'finalizada' }).eq('id', id)
  if (error) throw error
}

export async function eliminarCompetencia(id: string): Promise<void> {
  const { error } = await supabase.from('competencias').delete().eq('id', id)
  if (error) throw error
}

/** Categorías por edad de ejemplares (sin grandes campeonatos ni clases de jinetes). */
export async function listarCatalogoCategorias(): Promise<CategoriaCatalogo[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select('codigo, nombre, tipo, sexo, tiempo_desde, tiempo_hasta, campeon, jinete')
    .order('codigo')
  if (error) throw error
  return (data ?? [])
    .filter((row) => {
      const tipo = texto(row.tipo)?.toUpperCase()
      return (
        tipo === 'M' &&
        texto(row.campeon)?.toUpperCase() !== 'X' &&
        texto(row.jinete)?.toUpperCase() !== 'X' &&
        Number(row.tiempo_hasta) > 0
      )
    })
    .map((row) => {
      const nombre = String(row.nombre ?? '').replace(/\s+/g, ' ').trim()
      return {
        codigo: Number(row.codigo),
        nombre,
        sexo: sexoRegistro(texto(row.sexo)),
        desde: Number(row.tiempo_desde),
        hasta: Number(row.tiempo_hasta),
        modalidad: modalidadDeClase(nombre, null),
      }
    })
}

/** Modalidades de competencia en que puede salir un caballo según la modalidad de su registro. */
const MODALIDADES_POR_REGISTRO: Record<string, Modalidad[]> = {
  'Paso Fino': ['paso_fino', 'bellas_formas', 'performance', 'placer'],
  Trocha: ['trocha_pura'],
  'Trote y galope': ['trote_galope'],
  'Trocha y galope': ['trocha_galope'],
}

export interface Sugerencia {
  categoria: CategoriaCatalogo
  /** true si además coincide con la modalidad del registro */
  recomendada: boolean
}

/** Categorías que le corresponden por sexo y edad cumplida el día de la competencia. */
export function categoriasDelCaballo(
  caballo: CaballoInscribible,
  fechaCompetencia: string,
  catalogo: CategoriaCatalogo[],
): { meses: number | null; sugerencias: Sugerencia[] } {
  const meses = mesesCumplidos(caballo.nacimiento, fechaCompetencia)
  const sexo = sexoRegistro(caballo.sexo)
  if (meses == null) return { meses, sugerencias: [] }
  const permitidas = MODALIDADES_POR_REGISTRO[caballo.modalidad]
  const sugerencias = catalogo
    .filter((c) => (!c.sexo || !sexo || c.sexo === sexo) && meses >= c.desde && meses <= c.hasta)
    .map((categoria) => ({
      categoria,
      recomendada: !permitidas || (categoria.modalidad != null && permitidas.includes(categoria.modalidad)),
    }))
    .sort((a, b) => Number(b.recomendada) - Number(a.recomendada) || a.categoria.codigo - b.categoria.codigo)
  return { meses, sugerencias }
}

export async function buscarCaballos(busqueda: string): Promise<CaballoInscribible[]> {
  // Comas, paréntesis y comodines romperían el filtro «or» de PostgREST.
  const limpio = busqueda.trim().replace(/[%_\\,()*"]/g, '')
  if (limpio.length < 2) return []
  const { data, error } = await supabase
    .from('caballos')
    .select(COLUMNAS_CABALLO)
    .or(`nombre.ilike.%${limpio}%,codigo.ilike.${limpio}%`)
    .is('fecha_muerte', null)
    .order('nombre')
    .limit(12)
  if (error) throw error
  return (data ?? []).map(mapCaballo)
}

export const COLUMNAS_CABALLO = 'codigo, nombre, sexo, fecha_nacimiento, raza, padre, madre, criador, expositor'

export function mapCaballo(row: Record<string, unknown>): CaballoInscribible {
  return {
    codigo: String(row.codigo),
    nombre: String(row.nombre ?? ''),
    sexo: texto(row.sexo),
    nacimiento: fecha(row.fecha_nacimiento),
    modalidad: valorModalidadRegistro(texto(row.raza)),
    padre: texto(row.padre),
    madre: texto(row.madre),
    criador: texto(row.criador),
    propietario: texto(row.expositor),
  }
}

/** Clase de la competencia para esa categoría; la crea la primera vez que se inscribe alguien. */
async function claseDeCategoria(competenciaId: string, categoria: CategoriaCatalogo): Promise<string> {
  const existente = await supabase
    .from('juzgamientos')
    .select('id')
    .eq('competencia_id', competenciaId)
    .eq('evento_codigo', categoria.codigo)
    .maybeSingle()
  if (existente.error) throw existente.error
  if (existente.data) return String(existente.data.id)
  const competencia = await supabase
    .from('competencias')
    .select('nombre, fecha, lugar, estado')
    .eq('id', competenciaId)
    .single()
  if (competencia.error) throw competencia.error
  const { data, error } = await supabase
    .from('juzgamientos')
    .insert({
      competencia_id: competenciaId,
      evento_codigo: categoria.codigo,
      orden: categoria.codigo,
      evento: competencia.data.nombre,
      fecha: competencia.data.fecha,
      lugar: competencia.data.lugar,
      categoria: categoria.nombre,
      codigo: String(categoria.codigo),
      // Si la competencia ya se numeró, la clase nueva queda en inscripción hasta volver a numerar.
      fase: 'inscripcion',
    })
    .select('id')
    .single()
  if (error) throw error
  return String(data.id)
}

export async function inscribir(
  competenciaId: string,
  categoria: CategoriaCatalogo,
  caballo: CaballoInscribible,
  pagado: boolean,
): Promise<void> {
  const claseId = await claseDeCategoria(competenciaId, categoria)
  const { error } = await supabase.from('juzgamiento_ejemplares').insert({
    juzgamiento_id: claseId,
    numero: null,
    caballo_codigo: caballo.codigo,
    registro: caballo.codigo,
    asociacion: 'ADOPASO',
    nombre: caballo.nombre,
    sexo: caballo.sexo,
    nacimiento: caballo.nacimiento,
    padre: caballo.padre,
    madre: caballo.madre,
    criador: caballo.criador,
    propietario: caballo.propietario,
    pagado,
    escogido: false,
  })
  if (error?.code === '23505') throw new Error(`${caballo.nombre} ya está inscrito en ${categoria.nombre}.`)
  if (error) throw error
}

export async function marcarPagado(inscripcionId: string, pagado: boolean): Promise<void> {
  const { error } = await supabase.from('juzgamiento_ejemplares').update({ pagado }).eq('id', inscripcionId)
  if (error) throw error
}

export async function quitarInscripcion(inscripcionId: string): Promise<void> {
  const { error } = await supabase.from('juzgamiento_ejemplares').delete().eq('id', inscripcionId)
  if (error) throw error
}

/** Cierra la inscripción: numera cada categoría del más adulto (1) al más joven. */
export async function numerarCompetencia(competenciaId: string): Promise<void> {
  const { error } = await supabase.rpc('numerar_competencia', { p_competencia: competenciaId })
  if (error) throw error
}

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function nuevoCodigo(): string {
  const azar = crypto.getRandomValues(new Uint32Array(8))
  return Array.from(azar, (n) => LETRAS[n % LETRAS.length]).join('')
}

export async function crearAcceso(
  competenciaId: string,
  acceso: { rol: RolAcceso; juezPuesto?: number; juezCodigo?: number; nombre?: string },
): Promise<void> {
  const { error } = await supabase.from('competencia_accesos').insert({
    codigo: nuevoCodigo(),
    competencia_id: competenciaId,
    rol: acceso.rol,
    juez_puesto: acceso.juezPuesto ?? null,
    juez_codigo: acceso.juezCodigo ?? null,
    nombre: acceso.nombre ?? null,
  })
  if (error?.code === '23505') throw new Error('Ese puesto de juez ya tiene código.')
  if (error) throw error
}

export async function borrarAcceso(codigo: string): Promise<void> {
  const { error } = await supabase.from('competencia_accesos').delete().eq('codigo', codigo)
  if (error) throw error
}

export function enlaceAcceso(codigo: string): string {
  return `${window.location.origin}/pista/${codigo}`
}

// ---------------------------------------------------------------------------
// Pista: lo que ven jueces, pre-pista y mesa técnica con su código
// ---------------------------------------------------------------------------

export interface EjemplarPista {
  /** Los jueces no reciben id, nombre ni propietario. */
  id?: string
  numero: number | null
  nombre?: string
  sexo?: string | null
  nacimiento?: string | null
  propietario?: string | null
  montador?: string | null
  pagado?: boolean
  asistio: boolean | null
  escogido: boolean
  excusa: Excusa | null
  excusaFase?: 'formato_a' | 'final' | null
}

export interface ClasePista {
  id: string
  categoria: string
  orden: number | null
  fase: Fase
  ejemplares: EjemplarPista[]
  formatoA: Array<{ juezPuesto: number; numero: number }>
  votos: Array<{ juezPuesto: number; lugar: string; numero: number }>
}

export interface EstadoPista {
  rol: RolAcceso
  juezPuesto: number | null
  nombre: string | null
  competencia: { id: string; nombre: string; fecha: string; lugar: string | null; estado: string; simulacion: boolean }
  jueces: Array<{ puesto: number; nombre: string | null }>
  clases: ClasePista[]
}

function mensaje(error: { message: string }): Error {
  return new Error(error.message)
}

export function limpiarCodigo(codigo: string): string {
  return codigo.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

export async function estadoPista(codigo: string): Promise<EstadoPista> {
  const { data, error } = await supabase.rpc('acceso_estado', { p_codigo: codigo })
  if (error) throw mensaje(error)
  return data as EstadoPista
}

export async function pistaAsistencia(codigo: string, ejemplarId: string, asistio: boolean | null): Promise<void> {
  const { error } = await supabase.rpc('acceso_asistencia', {
    p_codigo: codigo,
    p_ejemplar: ejemplarId,
    p_asistio: asistio,
  })
  if (error) throw mensaje(error)
}

export async function pistaFormatoA(codigo: string, claseId: string, numero: number, marcado: boolean): Promise<void> {
  const { error } = await supabase.rpc('acceso_formato_a', {
    p_codigo: codigo,
    p_clase: claseId,
    p_numero: numero,
    p_marcado: marcado,
  })
  if (error) throw mensaje(error)
}

export async function pistaVotar(codigo: string, claseId: string, lugar: string, numero: number | null): Promise<void> {
  const { error } = await supabase.rpc('acceso_votar', {
    p_codigo: codigo,
    p_clase: claseId,
    p_lugar: lugar,
    p_numero: numero,
  })
  if (error) throw mensaje(error)
}

export async function pistaEscoger(codigo: string, ejemplarId: string, escogido: boolean): Promise<void> {
  const { error } = await supabase.rpc('acceso_escoger', {
    p_codigo: codigo,
    p_ejemplar: ejemplarId,
    p_escogido: escogido,
  })
  if (error) throw mensaje(error)
}

export async function pistaExcusar(codigo: string, ejemplarId: string, excusa: Excusa | null): Promise<void> {
  const { error } = await supabase.rpc('acceso_excusar', {
    p_codigo: codigo,
    p_ejemplar: ejemplarId,
    p_excusa: excusa ?? '',
  })
  if (error) throw mensaje(error)
}

export async function pistaFase(codigo: string, claseId: string, fase: Fase): Promise<void> {
  const { error } = await supabase.rpc('acceso_fase', { p_codigo: codigo, p_clase: claseId, p_fase: fase })
  if (error) throw mensaje(error)
}
