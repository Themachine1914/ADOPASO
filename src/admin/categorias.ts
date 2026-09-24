export type TipoColumna = 'texto' | 'fecha' | 'numero' | 'si_no'

export interface Columna {
  clave: string
  etiqueta: string
  tipo?: TipoColumna
}

export interface Categoria {
  slug: string
  grupo: 'Competencias' | 'Caballos' | 'Personas'
  titulo: string
  descripcion: string
  tabla: string
  /** Contiene datos personales: solo lo ve un administrador. */
  soloAdmin: boolean
  /** Columnas de la tabla; el detalle de cada fila muestra todas. */
  columnas: Columna[]
  /** Columnas de texto donde busca el cuadro de búsqueda. */
  busqueda: string[]
  orden: { columna: string; asc: boolean }
  /** Columna de fecha para habilitar el filtro por año. */
  filtroAnio?: string
  /** Categoría de la Guía de uso que explica esta sección. */
  guia: string
  /** Clave primaria de la tabla. */
  pk: string
  /** Campos del formulario para registrar y editar (solo administradores). */
  formulario?: CampoForm[]
  /** Cómo sugerir el código de un registro nuevo. */
  codigoNuevo?: 'numero' | 'caballo'
  /** Permite eliminar registros (con confirmación). */
  borrar?: boolean
  /** Nombre de un registro, para los títulos del formulario («Nuevo socio»). */
  singular?: string
  /** El nombre es femenino («Nueva asociación»). */
  femenino?: boolean
}

export type TipoCampo = 'texto' | 'area' | 'fecha' | 'numero' | 'opciones'

export interface CampoForm {
  clave: string
  etiqueta: string
  tipo?: TipoCampo
  requerido?: boolean
  /** Opciones fijas de una lista. */
  opciones?: { valor: string; etiqueta: string }[]
  /** Opciones tomadas de otra tabla. */
  opcionesDe?: { tabla: string; valor: string; etiqueta: string }
  /** Valores comunes que se ofrecen al escribir (se puede escribir otro). */
  sugerencias?: string[]
  ayuda?: string
  completo?: boolean
  /** No se puede cambiar después de creado (es la clave del registro). */
  soloNuevo?: boolean
  /** Al escribir un código, busca el nombre en otra tabla y lo copia en `campo`. */
  buscaNombre?: { tabla: string; columna: string; campo: string }
  /** Lista con buscador. Al elegir, puede copiar el nombre en otro campo. */
  buscaLista?: BuscaLista
  /** Se guarda, pero no se muestra: lo llena `buscaLista`. */
  oculto?: boolean
  /** Valor inicial en un registro nuevo; 'hoy' pone la fecha de hoy. */
  inicial?: string
}

export interface BuscaLista {
  tabla: string
  valor: string
  etiqueta: string
  /** El valor es numérico (código de socio o de asociación). */
  valorNumero?: boolean
  /** Columna extra para buscar y mostrar, como la abreviatura. */
  extra?: string
  filtro?: { columna: string; valores: string[] }
  /** Campo donde se copia el nombre al elegir. */
  copiaEn?: string
  placeholder?: string
  crear?: {
    slug: string
    sexo?: 'M' | 'H'
    /** El registro nuevo puede guardarse sin sus propios padres. */
    padresOpcionales?: boolean
    titulo: string
  }
}

const CAMPOS_PERSONA: CampoForm[] = [
  { clave: 'codigo', etiqueta: 'Código', tipo: 'numero', requerido: true, ayuda: 'Se sugiere el siguiente número libre.' },
  { clave: 'nombre', etiqueta: 'Nombre completo', requerido: true, completo: true },
  { clave: 'celular', etiqueta: 'Celular' },
  { clave: 'email', etiqueta: 'Correo' },
  { clave: 'residencia', etiqueta: 'Teléfono de residencia' },
  { clave: 'oficina', etiqueta: 'Teléfono de oficina' },
  { clave: 'secretaria', etiqueta: 'Secretaria' },
  { clave: 'direccion', etiqueta: 'Dirección', tipo: 'area', completo: true },
]

const FORM_CABALLO: CampoForm[] = [
  {
    clave: 'codigo',
    etiqueta: 'Código de registro',
    requerido: true,
    soloNuevo: true,
    ayuda: 'Se sugiere el siguiente código G-. La letra inicial (G, O, I) queda como tipo de registro.',
  },
  { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
  {
    clave: 'sexo',
    etiqueta: 'Sexo',
    tipo: 'opciones',
    requerido: true,
    opciones: [
      { valor: 'H', etiqueta: 'Hembra' },
      { valor: 'M', etiqueta: 'Macho' },
    ],
  },
  { clave: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha' },
  {
    clave: 'color',
    etiqueta: 'Color',
    sugerencias: ['ALAZAN', 'CASTAÑO', 'MORO', 'NEGRO', 'RUCIO', 'BAYO', 'PALOMINO', 'ZAINO'],
  },
  { clave: 'lugar_nacimiento', etiqueta: 'Lugar de nacimiento' },
  { clave: 'pais', etiqueta: 'País', sugerencias: ['REPUBLICA DOMINICANA', 'COLOMBIA', 'PUERTO RICO', 'ESTADOS UNIDOS'] },
  {
    clave: 'raza',
    etiqueta: 'Modalidad',
    sugerencias: ['PASO FINO', 'TROCHA COLOMBIANA', 'TROTE Y GALOPE', 'TROCHA Y GALOPE'],
  },
  {
    clave: 'categoria',
    etiqueta: 'Tipo de registro genealógico',
    tipo: 'opciones',
    opciones: [
      { valor: 'D', etiqueta: 'Registro genealógico' },
      { valor: 'C', etiqueta: '7/8 sangre' },
      { valor: 'B', etiqueta: '3/4 sangre' },
    ],
    inicial: 'D',
  },
  {
    clave: 'asociacion_codigo',
    etiqueta: 'Asociación',
    tipo: 'numero',
    inicial: '1',
    ayuda: 'Busque por nombre o abreviatura. Si no existe, use Agregar nuevo.',
    buscaLista: {
      tabla: 'asociaciones',
      valor: 'codigo',
      etiqueta: 'nombre',
      valorNumero: true,
      extra: 'abreviatura',
      placeholder: 'Buscar asociación',
      crear: { slug: 'asociaciones', titulo: 'Nueva asociación' },
    },
  },
  {
    clave: 'padre_codigo',
    etiqueta: 'Padre',
    requerido: true,
    ayuda: 'Tiene que estar registrado. Busque por nombre o código, o agregue uno nuevo.',
    buscaLista: {
      tabla: 'caballos',
      valor: 'codigo',
      etiqueta: 'nombre',
      filtro: { columna: 'sexo', valores: ['M'] },
      copiaEn: 'padre',
      placeholder: 'Buscar padre',
      crear: { slug: 'caballos', sexo: 'M', padresOpcionales: true, titulo: 'Nuevo padre' },
    },
  },
  { clave: 'padre', etiqueta: 'Nombre del padre', oculto: true },
  {
    clave: 'madre_codigo',
    etiqueta: 'Madre',
    requerido: true,
    ayuda: 'Tiene que estar registrada. Busque por nombre o código, o agregue una nueva.',
    buscaLista: {
      tabla: 'caballos',
      valor: 'codigo',
      etiqueta: 'nombre',
      filtro: { columna: 'sexo', valores: ['H'] },
      copiaEn: 'madre',
      placeholder: 'Buscar madre',
      crear: { slug: 'caballos', sexo: 'H', padresOpcionales: true, titulo: 'Nueva madre' },
    },
  },
  { clave: 'madre', etiqueta: 'Nombre de la madre', oculto: true },
  {
    clave: 'expositor_codigo',
    etiqueta: 'Propietario',
    tipo: 'numero',
    ayuda: 'Elija un socio. Si no existe, use Agregar nuevo.',
    buscaLista: {
      tabla: 'socios',
      valor: 'codigo',
      etiqueta: 'nombre',
      valorNumero: true,
      copiaEn: 'expositor',
      placeholder: 'Buscar socio',
      crear: { slug: 'socios', titulo: 'Nuevo propietario' },
    },
  },
  { clave: 'expositor', etiqueta: 'Propietario', oculto: true },
  {
    clave: 'criador_codigo',
    etiqueta: 'Criador',
    tipo: 'numero',
    ayuda: 'Elija un criador. Si no existe, use Agregar nuevo.',
    buscaLista: {
      tabla: 'criadores',
      valor: 'codigo',
      etiqueta: 'nombre',
      valorNumero: true,
      copiaEn: 'criador',
      placeholder: 'Buscar criador',
      crear: { slug: 'criadores', titulo: 'Nuevo criador' },
    },
  },
  { clave: 'criador', etiqueta: 'Criador', oculto: true },
  { clave: 'senas', etiqueta: 'Señas particulares', tipo: 'area', completo: true },
  { clave: 'adn', etiqueta: 'ADN' },
  { clave: 'microchip', etiqueta: 'Microchip' },
  { clave: 'fecha_registro', etiqueta: 'Fecha de registro', tipo: 'fecha', inicial: 'hoy' },
  { clave: 'fecha_muerte', etiqueta: 'Fecha de muerte', tipo: 'fecha' },
]

const CONTACTO: Columna[] = [
  { clave: 'celular', etiqueta: 'Celular' },
  { clave: 'email', etiqueta: 'Correo' },
  { clave: 'residencia', etiqueta: 'Teléfono' },
]

export const CATEGORIAS: Categoria[] = [
  {
    slug: 'participaciones',
    grupo: 'Competencias',
    titulo: 'Resultados',
    guia: 'competencias',
    pk: 'id',
    descripcion: 'Cada participación de un caballo en una competencia, con puesto y puntos.',
    tabla: 'participaciones',
    soloAdmin: false,
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
      { clave: 'caballo_nombre', etiqueta: 'Caballo' },
      { clave: 'expositor', etiqueta: 'Expositor' },
      { clave: 'montador', etiqueta: 'Montador' },
      { clave: 'categoria_nombre', etiqueta: 'Categoría' },
      { clave: 'lugar', etiqueta: 'Lugar' },
      { clave: 'puesto', etiqueta: 'Puesto', tipo: 'numero' },
      { clave: 'puntos', etiqueta: 'Puntos', tipo: 'numero' },
      { clave: 'campeon', etiqueta: 'Campeón', tipo: 'si_no' },
    ],
    busqueda: ['caballo_nombre', 'expositor', 'montador', 'criador', 'juez', 'lugar', 'categoria_nombre'],
    orden: { columna: 'fecha', asc: false },
    filtroAnio: 'fecha',
  },
  {
    slug: 'programa',
    grupo: 'Competencias',
    titulo: 'Calendario',
    singular: 'fecha del calendario',
    femenino: true,
    guia: 'competencias',
    pk: 'codigo',
    codigoNuevo: 'numero',
    borrar: true,
    formulario: [
      { clave: 'codigo', etiqueta: 'Código', tipo: 'numero', requerido: true, soloNuevo: true },
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
      { clave: 'fecha_fin', etiqueta: 'Fecha de cierre', tipo: 'fecha', ayuda: 'Si dura un solo día, déjela vacía.' },
      { clave: 'competencia', etiqueta: 'Competencia', ayuda: 'Ej.: 4TA COMPETENCIA 2026' },
      { clave: 'circuito', etiqueta: 'Circuito', ayuda: 'Ej.: 32AVO CIRCUITO DE PASO 2026' },
      { clave: 'ciudad', etiqueta: 'Lugar', completo: true, ayuda: 'Ej.: CIUDAD GANADERA PISTA DE SALTO' },
      { clave: 'nombre', etiqueta: 'Nombre visible', completo: true, ayuda: 'Si lo deja vacío, se escribe la fecha (ej.: 05 de Septiembre del 2026).' },
    ],
    descripcion: 'Fechas, circuitos y ciudades de las competencias.',
    tabla: 'programa',
    soloAdmin: false,
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
      { clave: 'nombre', etiqueta: 'Nombre' },
      { clave: 'circuito', etiqueta: 'Circuito' },
      { clave: 'competencia', etiqueta: 'Competencia' },
      { clave: 'ciudad', etiqueta: 'Ciudad' },
    ],
    busqueda: ['nombre', 'circuito', 'competencia', 'ciudad'],
    orden: { columna: 'fecha', asc: false },
    filtroAnio: 'fecha',
  },
  {
    slug: 'eventos',
    grupo: 'Competencias',
    titulo: 'Categorías de competencia',
    guia: 'competencias',
    pk: 'codigo',
    descripcion: 'Tipos de evento, como «Potrancas bellas formas de 36 a 60 meses».',
    tabla: 'eventos',
    soloAdmin: false,
    columnas: [
      { clave: 'codigo', etiqueta: 'Código', tipo: 'numero' },
      { clave: 'nombre', etiqueta: 'Nombre' },
      { clave: 'tipo', etiqueta: 'Tipo' },
      { clave: 'sexo', etiqueta: 'Sexo' },
      { clave: 'tiempo_desde', etiqueta: 'Desde', tipo: 'numero' },
      { clave: 'tiempo_hasta', etiqueta: 'Hasta', tipo: 'numero' },
      { clave: 'puntos', etiqueta: 'Puntos', tipo: 'numero' },
    ],
    busqueda: ['nombre'],
    orden: { columna: 'codigo', asc: true },
  },
  {
    slug: 'caballos',
    grupo: 'Caballos',
    titulo: 'Registro de caballos',
    singular: 'caballo',
    guia: 'caballos',
    pk: 'codigo',
    codigoNuevo: 'caballo',
    borrar: true,
    formulario: FORM_CABALLO,
    descripcion: 'Registro genealógico: identificación, padres, expositor y criador.',
    tabla: 'caballos',
    soloAdmin: false,
    columnas: [
      { clave: 'codigo', etiqueta: 'Código' },
      { clave: 'nombre', etiqueta: 'Nombre' },
      { clave: 'sexo', etiqueta: 'Sexo' },
      { clave: 'color', etiqueta: 'Color' },
      { clave: 'fecha_nacimiento', etiqueta: 'Nacimiento', tipo: 'fecha' },
      { clave: 'padre', etiqueta: 'Padre' },
      { clave: 'madre', etiqueta: 'Madre' },
      { clave: 'expositor', etiqueta: 'Expositor' },
    ],
    busqueda: ['codigo', 'nombre', 'padre', 'madre', 'expositor', 'criador'],
    orden: { columna: 'nombre', asc: true },
  },
  {
    slug: 'descendencia',
    grupo: 'Caballos',
    titulo: 'Descendencia',
    guia: 'caballos',
    pk: 'id',
    descripcion: 'Hijos, nietos y bisnietos de cada padre o madre.',
    tabla: 'descendencia',
    soloAdmin: false,
    columnas: [
      { clave: 'nombre', etiqueta: 'Padre / madre' },
      { clave: 'parentesco', etiqueta: 'Parentesco' },
      { clave: 'hijo_nombre', etiqueta: 'Descendiente' },
      { clave: 'hijo_codigo', etiqueta: 'Código' },
    ],
    busqueda: ['nombre', 'hijo_nombre', 'codigo', 'hijo_codigo'],
    orden: { columna: 'id', asc: true },
  },
  {
    slug: 'socios',
    grupo: 'Personas',
    titulo: 'Socios',
    singular: 'socio',
    guia: 'personas',
    pk: 'id',
    codigoNuevo: 'numero',
    borrar: true,
    formulario: [
      ...CAMPOS_PERSONA.slice(0, 2),
      {
        clave: 'tipo',
        etiqueta: 'Tipo de socio',
        tipo: 'opciones',
        opciones: [
          { valor: 'S', etiqueta: 'S' },
          { valor: 'C', etiqueta: 'C' },
          { valor: 'N', etiqueta: 'N' },
        ],
      },
      ...CAMPOS_PERSONA.slice(2),
    ],
    descripcion: 'Socios de la asociación con sus datos de contacto.',
    tabla: 'socios',
    soloAdmin: true,
    columnas: [
      { clave: 'codigo', etiqueta: 'Código', tipo: 'numero' },
      { clave: 'nombre', etiqueta: 'Nombre' },
      { clave: 'tipo', etiqueta: 'Tipo' },
      ...CONTACTO,
    ],
    busqueda: ['nombre', 'celular', 'email', 'residencia', 'direccion'],
    orden: { columna: 'nombre', asc: true },
  },
  {
    slug: 'criadores',
    grupo: 'Personas',
    titulo: 'Criadores',
    singular: 'criador',
    guia: 'personas',
    pk: 'id',
    codigoNuevo: 'numero',
    borrar: true,
    formulario: CAMPOS_PERSONA,
    descripcion: 'Criadores y criaderos registrados.',
    tabla: 'criadores',
    soloAdmin: true,
    columnas: [{ clave: 'codigo', etiqueta: 'Código', tipo: 'numero' }, { clave: 'nombre', etiqueta: 'Nombre' }, ...CONTACTO],
    busqueda: ['nombre', 'celular', 'email', 'residencia', 'direccion'],
    orden: { columna: 'nombre', asc: true },
  },
  {
    slug: 'montadores',
    grupo: 'Personas',
    titulo: 'Montadores',
    singular: 'montador',
    guia: 'personas',
    pk: 'id',
    codigoNuevo: 'numero',
    borrar: true,
    formulario: CAMPOS_PERSONA,
    descripcion: 'Jinetes o montadores registrados.',
    tabla: 'montadores',
    soloAdmin: true,
    columnas: [{ clave: 'codigo', etiqueta: 'Código', tipo: 'numero' }, { clave: 'nombre', etiqueta: 'Nombre' }, ...CONTACTO],
    busqueda: ['nombre', 'celular', 'email', 'residencia', 'direccion'],
    orden: { columna: 'nombre', asc: true },
  },
  {
    slug: 'jueces',
    grupo: 'Personas',
    titulo: 'Jueces',
    singular: 'juez',
    guia: 'personas',
    pk: 'id',
    codigoNuevo: 'numero',
    borrar: true,
    formulario: CAMPOS_PERSONA,
    descripcion: 'Jueces de las competencias.',
    tabla: 'jueces',
    soloAdmin: true,
    columnas: [{ clave: 'codigo', etiqueta: 'Código', tipo: 'numero' }, { clave: 'nombre', etiqueta: 'Nombre' }, ...CONTACTO],
    busqueda: ['nombre', 'celular', 'email', 'residencia', 'direccion'],
    orden: { columna: 'nombre', asc: true },
  },
  {
    slug: 'asociaciones',
    grupo: 'Personas',
    titulo: 'Asociaciones',
    singular: 'asociación',
    femenino: true,
    guia: 'caballos',
    pk: 'codigo',
    codigoNuevo: 'numero',
    borrar: true,
    descripcion: 'Asociaciones de registro (ADOPASO, ASENA, PFHA…).',
    tabla: 'asociaciones',
    soloAdmin: false,
    columnas: [
      { clave: 'codigo', etiqueta: 'Código', tipo: 'numero' },
      { clave: 'nombre', etiqueta: 'Nombre' },
      { clave: 'abreviatura', etiqueta: 'Abreviatura' },
      { clave: 'pais', etiqueta: 'País' },
    ],
    busqueda: ['nombre', 'abreviatura', 'pais'],
    orden: { columna: 'codigo', asc: true },
    formulario: [
      { clave: 'codigo', etiqueta: 'Código', tipo: 'numero', requerido: true, soloNuevo: true },
      { clave: 'nombre', etiqueta: 'Nombre', requerido: true, completo: true },
      { clave: 'abreviatura', etiqueta: 'Abreviatura', ayuda: 'Ej.: ADOPASO' },
      { clave: 'pais', etiqueta: 'País' },
    ],
  },
]

export const GRUPOS = ['Competencias', 'Caballos', 'Personas'] as const

export function categoriaPorSlug(slug: string | undefined): Categoria | undefined {
  return CATEGORIAS.find((c) => c.slug === slug)
}
