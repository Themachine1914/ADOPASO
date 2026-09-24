import type { CampoForm, Categoria } from '../admin/categorias'
import { supabase } from './supabase'

export type Valores = Record<string, string>
type Fila = Record<string, unknown>

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const CATEGORIA_CABALLO: Record<string, string> = {
  D: 'REGISTRO GENEALOGICO',
  C: '7/8 SANGRE',
  B: '3/4 SANGRE',
}

export function hoyIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Valores del formulario: los de la fila al editar, o los iniciales al crear. */
export function valoresIniciales(campos: CampoForm[], fila: Fila | null): Valores {
  const valores: Valores = {}
  for (const campo of campos) {
    const actual = fila?.[campo.clave]
    if (fila) {
      valores[campo.clave] = actual === null || actual === undefined ? '' : String(actual).slice(0, campo.tipo === 'fecha' ? 10 : undefined)
    } else {
      valores[campo.clave] = campo.inicial === 'hoy' ? hoyIso() : campo.inicial ?? ''
    }
  }
  return valores
}

export async function siguienteCodigo(categoria: Categoria): Promise<string> {
  if (categoria.codigoNuevo === 'caballo') {
    const { data, error } = await supabase
      .from('caballos')
      .select('codigo')
      .like('codigo', 'G-00____')
      .order('codigo', { ascending: false })
      .limit(1)
    if (error) throw error
    const ultimo = Number(String(data?.[0]?.codigo ?? 'G-000000').slice(2))
    return `G-${String(ultimo + 1).padStart(6, '0')}`
  }
  if (categoria.codigoNuevo === 'numero') {
    const { data, error } = await supabase
      .from(categoria.tabla)
      .select('codigo')
      .order('codigo', { ascending: false })
      .limit(1)
    if (error) throw error
    return String(Number(data?.[0]?.codigo ?? 0) + 1)
  }
  return ''
}

export async function cargarOpciones(
  origen: NonNullable<CampoForm['opcionesDe']>,
): Promise<{ valor: string; etiqueta: string }[]> {
  const { data, error } = await supabase
    .from(origen.tabla)
    .select(`${origen.valor}, ${origen.etiqueta}`)
    .order(origen.etiqueta)
  if (error) throw error
  return ((data ?? []) as unknown as Fila[]).map((row) => ({
    valor: String(row[origen.valor]),
    etiqueta: String(row[origen.etiqueta] ?? row[origen.valor]),
  }))
}

/** Nombre del registro con ese código, o null si no existe. */
export async function buscarNombre(
  busca: NonNullable<CampoForm['buscaNombre']>,
  codigo: string,
): Promise<string | null> {
  const limpio = codigo.trim().toUpperCase()
  if (!limpio) return null
  const { data, error } = await supabase
    .from(busca.tabla)
    .select('nombre')
    .eq(busca.columna, limpio)
    .limit(1)
  if (error) throw error
  const nombre = data?.[0]?.nombre
  return typeof nombre === 'string' ? nombre : null
}

function nombreFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia} de ${MESES[Number(mes) - 1]} del ${anio}`
}

/** Convierte lo escrito en el formulario a los valores de la tabla. */
function aFila(campos: CampoForm[], valores: Valores, creando: boolean): Fila {
  const fila: Fila = {}
  for (const campo of campos) {
    if (campo.soloNuevo && !creando) continue
    const texto = (valores[campo.clave] ?? '').trim()
    if (!texto) {
      fila[campo.clave] = null
    } else if (campo.tipo === 'numero' || campo.opcionesDe) {
      fila[campo.clave] = Number(texto)
    } else if (campo.tipo === 'fecha' || campo.tipo === 'opciones' || campo.tipo === 'area') {
      fila[campo.clave] = texto
    } else {
      // Mismo formato que el registro histórico: nombres y códigos en mayúsculas.
      fila[campo.clave] = campo.clave === 'email' ? texto : texto.toUpperCase()
    }
  }
  return fila
}

export function validar(campos: CampoForm[], valores: Valores, creando: boolean): string | null {
  for (const campo of campos) {
    if (campo.soloNuevo && !creando) continue
    const texto = (valores[campo.clave] ?? '').trim()
    if (campo.requerido && !texto) return `Falta «${campo.etiqueta}».`
    if (texto && campo.tipo === 'numero' && !Number.isFinite(Number(texto))) {
      return `«${campo.etiqueta}» debe ser un número.`
    }
  }
  const inicio = valores.fecha
  const fin = valores.fecha_fin
  if (inicio && fin && fin < inicio) return 'La fecha de cierre no puede ser anterior a la fecha.'
  if (valores.fecha_nacimiento && valores.fecha_nacimiento > hoyIso()) {
    return 'La fecha de nacimiento no puede ser futura.'
  }
  return null
}

function mensajeError(error: { code?: string; message: string }, categoria: Categoria): string {
  if (error.code === '23505') {
    return categoria.tabla === 'caballos'
      ? 'Ya existe un caballo con ese código de registro.'
      : 'Ya existe un registro con ese código.'
  }
  if (error.code === '42501') return 'Su usuario no tiene permiso para guardar. Solo un administrador puede hacerlo.'
  return `No se pudo guardar: ${error.message}`
}

/** Guarda el registro y devuelve su clave. Para caballos, arma también la genealogía. */
export async function guardarRegistro(
  categoria: Categoria,
  valores: Valores,
  original: Fila | null,
): Promise<string> {
  const campos = categoria.formulario ?? []
  const creando = original === null
  const fila = aFila(campos, valores, creando)

  if (categoria.tabla === 'caballos') {
    const codigo = String(creando ? fila.codigo : original[categoria.pk])
    const letra = codigo.charAt(0)
    if (creando && /^[A-Z]$/.test(letra)) fila.registro_tipo = letra
    if (creando) fila.registrado_en = hoyIso()
    fila.categoria_nombre = fila.categoria ? CATEGORIA_CABALLO[String(fila.categoria)] ?? null : null
    if (fila.asociacion_codigo) {
      const { data } = await supabase
        .from('asociaciones')
        .select('nombre, abreviatura')
        .eq('codigo', fila.asociacion_codigo)
        .maybeSingle()
      fila.asociacion = data?.nombre ?? null
      fila.asociacion_abrev = data?.abreviatura ?? null
    } else {
      fila.asociacion = null
      fila.asociacion_abrev = null
    }
  }
  if (categoria.tabla === 'programa' && !fila.nombre && fila.fecha) {
    fila.nombre = nombreFecha(String(fila.fecha))
  }

  const consulta = creando
    ? supabase.from(categoria.tabla).insert(fila).select(categoria.pk).single()
    : supabase.from(categoria.tabla).update(fila).eq(categoria.pk, original[categoria.pk]).select(categoria.pk).single()
  const { data, error } = await consulta
  if (error) throw new Error(mensajeError(error, categoria))
  const clave = String((data as unknown as Fila)[categoria.pk])

  if (categoria.tabla === 'caballos') {
    const padresCambiaron =
      creando ||
      (original.padre_codigo ?? null) !== (fila.padre_codigo ?? null) ||
      (original.madre_codigo ?? null) !== (fila.madre_codigo ?? null) ||
      (original.sexo ?? null) !== (fila.sexo ?? null) ||
      (original.nombre ?? null) !== (fila.nombre ?? null)
    if (padresCambiaron) {
      const { error: errGen } = await supabase.rpc('registrar_genealogia', { p_codigo: clave })
      if (errGen) throw new Error(`Se guardó el caballo, pero no se pudo armar la genealogía: ${errGen.message}`)
    }
  }
  return clave
}

/** Elimina el registro. Un caballo con competencias o descendientes no se puede eliminar. */
export async function eliminarRegistro(categoria: Categoria, fila: Fila): Promise<void> {
  const clave = fila[categoria.pk]
  if (categoria.tabla === 'caballos') {
    const codigo = String(clave)
    const [part, hijos] = await Promise.all([
      supabase.from('participaciones').select('id', { count: 'exact', head: true }).eq('caballo_codigo', codigo),
      supabase.from('descendencia').select('id', { count: 'exact', head: true }).eq('codigo', codigo),
    ])
    if ((part.count ?? 0) > 0) {
      throw new Error(`No se puede eliminar: tiene ${part.count} resultados de competencia. Para darlo de baja, anote la fecha de muerte.`)
    }
    if ((hijos.count ?? 0) > 0) {
      throw new Error('No se puede eliminar: aparece como padre, madre o antepasado de otros caballos.')
    }
    const { error } = await supabase.from('descendencia').delete().eq('hijo_codigo', codigo)
    if (error) throw new Error(`No se pudo eliminar: ${error.message}`)
  }
  const { error } = await supabase.from(categoria.tabla).delete().eq(categoria.pk, clave)
  if (error) throw new Error(`No se pudo eliminar: ${error.message}`)
}
