import { normalize } from './normalize'

/** Modalidades en las que compite el ejemplar. A la cuerda y Libre quedan fuera. */
export type Modalidad =
  | 'paso_fino'
  | 'performance'
  | 'placer'
  | 'trocha_pura'
  | 'trocha_galope'
  | 'trote_galope'
  | 'bellas_formas'

/** Edad el día de la competencia. */
export type CampeonatoEdad = 'proceso' | 'joven' | 'general'

export type SexoEjemplar = 'M' | 'H'

export const MODALIDADES: { value: Modalidad; label: string }[] = [
  { value: 'paso_fino', label: 'Paso fino' },
  { value: 'performance', label: 'Performance' },
  { value: 'placer', label: 'Placer' },
  { value: 'trocha_pura', label: 'Trocha pura' },
  { value: 'trocha_galope', label: 'Trocha y galope' },
  { value: 'trote_galope', label: 'Trote y galope' },
  { value: 'bellas_formas', label: 'Bellas formas' },
]

export const CAMPEONATOS: { value: CampeonatoEdad; label: string; detalle: string }[] = [
  { value: 'proceso', label: 'En proceso', detalle: '31 a 35 meses' },
  { value: 'joven', label: 'Joven', detalle: '36 a 48 meses' },
  { value: 'general', label: 'General', detalle: '49 meses en adelante' },
]

export const SEXOS: { value: SexoEjemplar; label: string }[] = [
  { value: 'M', label: 'Machos' },
  { value: 'H', label: 'Hembras' },
]

export function etiquetaModalidad(modalidad: Modalidad): string {
  return MODALIDADES.find((m) => m.value === modalidad)?.label ?? modalidad
}

/** Textos viejos del libro que corresponden a una modalidad del ranking. */
const ALIAS_MODALIDAD: Record<string, Modalidad> = {
  'paso fino': 'paso_fino',
  paso: 'paso_fino',
  fino: 'paso_fino',
  pf: 'paso_fino',
  pasofino: 'paso_fino',
  performance: 'performance',
  placer: 'placer',
  pleasure: 'placer',
  trocha: 'trocha_pura',
  'trocha pura': 'trocha_pura',
  'trocha colombiana': 'trocha_pura',
  'trocha y galope': 'trocha_galope',
  'trote y galope': 'trote_galope',
  'bellas formas': 'bellas_formas',
}

/** Valor que debe quedar seleccionado en el formulario. Si no es una modalidad conocida, se deja igual. */
export function valorModalidad(valor: string | null | undefined): string {
  const crudo = (valor ?? '').trim()
  if (!crudo) return ''
  const clave = normalize(crudo).replace(/\s+/g, ' ')
  const oficial = MODALIDADES.find((m) => normalize(m.label) === clave)
  if (oficial) return oficial.label
  const alias = ALIAS_MODALIDAD[clave]
  return alias ? etiquetaModalidad(alias) : crudo
}

export function etiquetaCampeonato(campeonato: CampeonatoEdad): string {
  const item = CAMPEONATOS.find((c) => c.value === campeonato)
  return item ? `${item.label} (${item.detalle})` : campeonato
}

export function etiquetaSexo(sexo: SexoEjemplar): string {
  return SEXOS.find((s) => s.value === sexo)?.label ?? sexo
}

/** Texto de clase listo para reconocer modalidad y sexo. Corrige faltas frecuentes del histórico. */
export function normalizarClase(nombre: string): string {
  return normalize(nombre)
    .replace(/fin0/g, 'fino')
    .replace(/campena/g, 'campeona')
    .replace(/adietrad/g, 'adiestrad')
    .replace(/adieste/g, 'adiestra')
    .replace(/tropte/g, 'trote')
    .replace(/troche/g, 'trocha')
    .replace(/pleasura/g, 'placer')
    .replace(/pleasure/g, 'placer')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Modalidad de una clase. Las que solo dicen «adiestradas» o «funcional» son paso fino.
 * Devuelve null para a la cuerda, libre, lotes de cría y clases de personas.
 */
export function modalidadDeClase(clase: string | null | undefined, tipo: string | null | undefined): Modalidad | null {
  if (tipo === 'Libre' || tipo === 'A la cuerda') return null
  const t = normalizarClase(clase ?? '')
  if (!t) {
    return tipo === 'Bellas formas' ? 'bellas_formas' : tipo === 'Funcional' ? 'paso_fino' : null
  }
  if (/jinete|amazona|dueno|duena|montando|fuera de concurso|exhibicion|descendencia|ratific/.test(t)) {
    return null
  }
  if (/\bcria\b|\bcrias\b|para cria|con su cria|con sus crias/.test(t)) return null
  if (/\bcuerda\b/.test(t)) return null
  if (/\blibre\b/.test(t)) return null
  if (/trocha y galope/.test(t)) return 'trocha_galope'
  if (/trote y galope/.test(t)) return 'trote_galope'
  if (/trocha/.test(t)) return 'trocha_pura'
  if (/perform/.test(t)) return 'performance'
  if (/placer/.test(t)) return 'placer'
  if (/bellas/.test(t)) return 'bellas_formas'
  if (/paso|fino|funcional|adiestr|proceso|potro|potranca|yegua|caballo|potrillo|potrilla/.test(t)) {
    return 'paso_fino'
  }
  if (tipo === 'Bellas formas') return 'bellas_formas'
  if (tipo === 'Funcional') return 'paso_fino'
  return null
}

export function sexoRegistro(sexo: string | null | undefined): SexoEjemplar | null {
  const s = (sexo ?? '').trim().toUpperCase()
  if (s === 'M' || s === 'MACHO' || s === 'S') return 'M'
  if (s === 'H' || s === 'HEMBRA' || s === 'YEGUA' || s === 'F') return 'H'
  return null
}

/** Sexo que declara el nombre de la clase, si no está mezclado. */
export function sexoDeClase(clase: string | null | undefined): SexoEjemplar | null {
  const t = normalizarClase(clase ?? '')
  const hembra = /potranc|yegua|potrilla|campeona/.test(t)
  const macho = /potrillos|potrillo|potros|potro\b|caballos|caballo\b|campeon\b/.test(t)
  if (hembra === macho) return null
  return hembra ? 'H' : 'M'
}

/** Meses cumplidos entre dos fechas ISO (YYYY-MM-DD). */
export function mesesCumplidos(nacimiento: string | null | undefined, fecha: string | null | undefined): number | null {
  const n = partesFecha(nacimiento)
  const f = partesFecha(fecha)
  if (!n || !f) return null
  let meses = (f.anio - n.anio) * 12 + (f.mes - n.mes)
  if (f.dia < n.dia) meses -= 1
  return meses
}

export function campeonatoDeMeses(meses: number | null): CampeonatoEdad | null {
  if (meses == null || meses < 31) return null
  if (meses <= 35) return 'proceso'
  if (meses <= 48) return 'joven'
  return 'general'
}

function partesFecha(valor: string | null | undefined): { anio: number; mes: number; dia: number } | null {
  if (!valor) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor)
  if (!m) return null
  const anio = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  if (!anio || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  return { anio, mes, dia }
}
