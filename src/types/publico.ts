export interface EntradaRanking {
  id: string
  name: string
  owner: string
  stable: string
  position: number
  points: number
  salidas: number
  campeonatos: number
  mejorPuesto: number | null
  clase?: string | null
  campeon?: boolean
}

export interface AnioRanking {
  anio: number
  resultados: number
  conPuntos: number
  puntos: number
}

export interface CategoriaAnio {
  tipo: string
  caballos: number
  puntos: number
}

export interface ClaseAnio {
  tipo: string
  clase: string
  caballos: number
  puntos: number
}

export interface CompetenciaResumen {
  id: string
  anio: number
  fecha: string
  lugarClave: string
  lugar: string
  nombre: string
  circuito: string | null
  competencia: string | null
  ciudad: string | null
  resultados: number
  caballos: number
  puntos: number
  status: 'completed' | 'upcoming'
}

export interface Ancestro {
  codigo: string | null
  nombre: string | null
}

export interface CaballoPublico {
  codigo: string
  nombre: string
  sexo: string | null
  color: string | null
  fechaNacimiento: string | null
  lugarNacimiento: string | null
  padre: string | null
  madre: string | null
  padreCodigo: string | null
  madreCodigo: string | null
  expositor: string | null
  criador: string | null
  categoria: string | null
  senas: string | null
  adn: string | null
  microchip: string | null
  modalidad: string | null
  fechaRegistro: string | null
  ancestros: Record<string, Ancestro>
}

export interface ResultadoPublico {
  anio: number
  fecha: string
  lugar: string
  tipo: string | null
  clase: string | null
  caballoId: string
  caballoNombre: string
  expositor: string | null
  criador: string | null
  puesto: number | null
  puntos: number
  campeon: boolean
}

export type RolPersona = 'montador' | 'jinete' | 'criador' | 'propietario'

export type ModoRanking = 'general' | 'categoria' | 'competencia' | RolPersona

export interface EntradaPersona {
  persona: string
  nombre: string
  position: number
  points: number
  salidas: number
  caballos: number
  primeros: number
  campeonatos: number
  competencias: number
}

export interface ClaseJinete {
  clase: string
  nombre: string
  personas: number
  puntos: number
}

export interface HistorialPersona {
  anio: number
  fecha: string
  lugar: string
  categoria: string | null
  puntos: number
  salidas: number
  primeros: number
  campeonatos: number
}