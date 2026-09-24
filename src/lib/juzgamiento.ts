import { supabase } from './supabase'
import type { LugarF2 } from './computo'

export interface Juzgamiento {
  id: string
  evento: string
  fecha: string | null
  lugar: string | null
  categoria: string
  codigo: string | null
}

export interface EjemplarClase {
  id: string
  numero: number
  registro: string | null
  asociacion: string | null
  nombre: string
  sexo: string | null
  nacimiento: string | null
  padre: string | null
  madre: string | null
  criador: string | null
  propietario: string | null
  montador: string | null
  escogido: boolean
}

export interface JuezAsignado {
  id: string
  puesto: number
  juezCodigo: number | null
  nombre: string
}

export interface VotoJuez {
  id: string
  juezPuesto: number
  lugar: LugarF2
  ejemplarNumero: number
}

export interface JuezCatalogo {
  codigo: number
  nombre: string
}

export interface EventoPrograma {
  codigo: number
  fecha: string
  nombre: string
  lugar: string
}

export interface SalaJuzgamiento {
  juzgamiento: Juzgamiento
  ejemplares: EjemplarClase[]
  jueces: JuezAsignado[]
  votos: VotoJuez[]
}

function fecha(value: unknown): string | null {
  return typeof value === 'string' && value ? value.slice(0, 10) : null
}

function mapJuzgamiento(row: Record<string, unknown>): Juzgamiento {
  return {
    id: String(row.id),
    evento: String(row.evento ?? ''),
    fecha: fecha(row.fecha),
    lugar: row.lugar ? String(row.lugar) : null,
    categoria: String(row.categoria ?? ''),
    codigo: row.codigo ? String(row.codigo) : null,
  }
}

function mapEjemplar(row: Record<string, unknown>): EjemplarClase {
  return {
    id: String(row.id),
    numero: Number(row.numero),
    registro: row.registro ? String(row.registro) : null,
    asociacion: row.asociacion ? String(row.asociacion) : null,
    nombre: String(row.nombre ?? ''),
    sexo: row.sexo ? String(row.sexo) : null,
    nacimiento: fecha(row.nacimiento),
    padre: row.padre ? String(row.padre) : null,
    madre: row.madre ? String(row.madre) : null,
    criador: row.criador ? String(row.criador) : null,
    propietario: row.propietario ? String(row.propietario) : null,
    montador: row.montador ? String(row.montador) : null,
    escogido: Boolean(row.escogido),
  }
}

export async function listarJuzgamientos(): Promise<Juzgamiento[]> {
  const { data, error } = await supabase
    .from('juzgamientos')
    .select('id, evento, fecha, lugar, categoria, codigo')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapJuzgamiento)
}

export async function listarPrograma(): Promise<EventoPrograma[]> {
  const { data, error } = await supabase
    .from('programa')
    .select('codigo, fecha, nombre, ciudad')
    .order('fecha', { ascending: false })
    .limit(40)
  if (error) throw error
  return (data ?? []).map((row) => ({
    codigo: Number(row.codigo),
    fecha: fecha(row.fecha) ?? '',
    nombre: String(row.nombre ?? row.ciudad ?? 'Evento'),
    lugar: String(row.ciudad ?? ''),
  }))
}

export async function listarJueces(): Promise<JuezCatalogo[]> {
  const { data, error } = await supabase.from('jueces').select('codigo, nombre').order('nombre')
  if (error) throw error
  return (data ?? []).map((row) => ({ codigo: Number(row.codigo), nombre: String(row.nombre) }))
}

export async function eliminarJuzgamiento(id: string): Promise<void> {
  const { error } = await supabase.from('juzgamientos').delete().eq('id', id)
  if (error) throw error
}

export async function crearJuzgamiento(input: {
  evento: string
  fecha: string
  lugar: string
  categoria: string
  codigo: string
}): Promise<string> {
  const { data, error } = await supabase
    .from('juzgamientos')
    .insert({
      evento: input.evento.trim(),
      fecha: input.fecha || null,
      lugar: input.lugar.trim() || null,
      categoria: input.categoria.trim(),
      codigo: input.codigo.trim() || null,
    })
    .select('id')
    .single()
  if (error) throw error
  return String(data.id)
}

export async function cargarSala(id: string): Promise<SalaJuzgamiento | null> {
  const [juzgamiento, ejemplares, jueces, votos] = await Promise.all([
    supabase.from('juzgamientos').select('id, evento, fecha, lugar, categoria, codigo').eq('id', id).maybeSingle(),
    supabase.from('juzgamiento_ejemplares').select('*').eq('juzgamiento_id', id).order('numero'),
    supabase.from('juzgamiento_jueces').select('*').eq('juzgamiento_id', id).order('puesto'),
    supabase.from('juzgamiento_votos').select('*').eq('juzgamiento_id', id),
  ])
  if (juzgamiento.error) throw juzgamiento.error
  if (!juzgamiento.data) return null
  if (ejemplares.error) throw ejemplares.error
  if (jueces.error) throw jueces.error
  if (votos.error) throw votos.error
  return {
    juzgamiento: mapJuzgamiento(juzgamiento.data),
    ejemplares: (ejemplares.data ?? []).map(mapEjemplar),
    jueces: (jueces.data ?? []).map((row) => ({
      id: String(row.id),
      puesto: Number(row.puesto),
      juezCodigo: row.juez_codigo == null ? null : Number(row.juez_codigo),
      nombre: String(row.nombre),
    })),
    votos: (votos.data ?? []).map((row) => ({
      id: String(row.id),
      juezPuesto: Number(row.juez_puesto),
      lugar: String(row.lugar) as LugarF2,
      ejemplarNumero: Number(row.ejemplar_numero),
    })),
  }
}

export async function agregarEjemplar(
  juzgamientoId: string,
  ejemplar: Omit<EjemplarClase, 'id' | 'escogido'>,
): Promise<void> {
  const { error } = await supabase.from('juzgamiento_ejemplares').insert({
    juzgamiento_id: juzgamientoId,
    numero: ejemplar.numero,
    registro: ejemplar.registro,
    asociacion: ejemplar.asociacion,
    nombre: ejemplar.nombre,
    sexo: ejemplar.sexo,
    nacimiento: ejemplar.nacimiento,
    padre: ejemplar.padre,
    madre: ejemplar.madre,
    criador: ejemplar.criador,
    propietario: ejemplar.propietario,
    montador: ejemplar.montador,
    escogido: true,
  })
  if (error) throw error
}

export async function quitarEjemplar(id: string): Promise<void> {
  const { error } = await supabase.from('juzgamiento_ejemplares').delete().eq('id', id)
  if (error) throw error
}

export async function marcarEscogido(id: string, escogido: boolean): Promise<void> {
  const { error } = await supabase.from('juzgamiento_ejemplares').update({ escogido }).eq('id', id)
  if (error) throw error
}

export async function asignarJuez(
  juzgamientoId: string,
  puesto: number,
  juez: JuezCatalogo,
): Promise<void> {
  const { error } = await supabase.from('juzgamiento_jueces').insert({
    juzgamiento_id: juzgamientoId,
    puesto,
    juez_codigo: juez.codigo,
    nombre: juez.nombre,
  })
  if (error) throw error
}

export async function quitarJuez(id: string, juzgamientoId: string, puesto: number): Promise<void> {
  const votos = await supabase
    .from('juzgamiento_votos')
    .delete()
    .eq('juzgamiento_id', juzgamientoId)
    .eq('juez_puesto', puesto)
  if (votos.error) throw votos.error
  const { error } = await supabase.from('juzgamiento_jueces').delete().eq('id', id)
  if (error) throw error
}

export async function guardarVoto(
  juzgamientoId: string,
  juezPuesto: number,
  lugar: LugarF2,
  ejemplarNumero: number | null,
): Promise<void> {
  if (!ejemplarNumero) {
    const { error } = await supabase
      .from('juzgamiento_votos')
      .delete()
      .eq('juzgamiento_id', juzgamientoId)
      .eq('juez_puesto', juezPuesto)
      .eq('lugar', lugar)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('juzgamiento_votos').upsert(
    {
      juzgamiento_id: juzgamientoId,
      juez_puesto: juezPuesto,
      lugar,
      ejemplar_numero: ejemplarNumero,
    },
    { onConflict: 'juzgamiento_id,juez_puesto,lugar' },
  )
  if (error) throw error
}

export async function fichaPorRegistro(registro: string): Promise<{
  registro: string
  nombre: string
  sexo: string | null
  nacimiento: string | null
  padre: string | null
  madre: string | null
  criador: string | null
  propietario: string | null
} | null> {
  const { data, error } = await supabase
    .from('caballo_publico')
    .select('codigo, nombre, sexo, fecha_nacimiento, padre, madre, criador, expositor')
    .eq('codigo', registro.trim())
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    registro: String(data.codigo),
    nombre: String(data.nombre),
    sexo: data.sexo ? String(data.sexo) : null,
    nacimiento: fecha(data.fecha_nacimiento),
    padre: data.padre ? String(data.padre) : null,
    madre: data.madre ? String(data.madre) : null,
    criador: data.criador ? String(data.criador) : null,
    propietario: data.expositor ? String(data.expositor) : null,
  }
}
