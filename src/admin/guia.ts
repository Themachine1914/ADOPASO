/**
 * Contenido de la Guía de uso del módulo de administración.
 * Describe solo lo que el software hace hoy; lo que falta va marcado como «Todavía no disponible».
 * Al agregar una función nueva, actualice aquí la categoría que corresponda.
 */

export interface Articulo {
  pregunta: string
  respuesta?: string
  pasos?: string[]
  nota?: string
  enlace?: { to: string; label: string }
  /** Función que todavía no existe en el software. */
  pendiente?: boolean
}

export interface CategoriaGuia {
  id: string
  titulo: string
  resumen: string
  soloAdmin?: boolean
  articulos: Articulo[]
}

export const GUIA: CategoriaGuia[] = [
  {
    id: 'entrar',
    titulo: 'Entrar al sistema',
    resumen: 'Iniciar sesión, tipos de usuario y qué hacer si no puede entrar.',
    articulos: [
      {
        pregunta: '¿Cómo entro al módulo de administración?',
        pasos: [
          'Abra la dirección del sitio y agregue /admin al final (por ejemplo: adopaso.com/admin).',
          'Escriba su correo y su contraseña.',
          'Pulse «Entrar». Verá la pantalla «Resumen».',
        ],
        nota: 'El módulo de administración no aparece en el menú público. Guarde la dirección en sus favoritos.',
      },
      {
        pregunta: 'Me dice «Su cuenta aún no está activa». ¿Qué hago?',
        respuesta:
          'Su usuario existe, pero un administrador todavía no lo ha activado. Pídale que entre a «Usuarios y roles» y marque su cuenta como activa. Después cierre sesión y vuelva a entrar.',
        enlace: { to: '/admin/guia#usuarios', label: 'Ver: cómo se activa un usuario' },
      },
      {
        pregunta: '¿Qué diferencia hay entre «Administrador» y «Consulta»?',
        respuesta:
          'Consulta puede ver caballos, descendencia, resultados, calendario y categorías de competencia. Administrador ve todo eso y además los datos personales (socios, criadores, montadores y jueces), puede registrar, corregir y eliminar, y usa el juzgamiento y la gestión de usuarios. El tipo de usuario aparece arriba a la derecha, debajo de su correo.',
      },
      {
        pregunta: 'Olvidé mi contraseña.',
        respuesta:
          'Todavía no hay un botón de «Olvidé mi contraseña» en la pantalla de entrada. Pida al administrador del sistema que le envíe un correo para cambiarla desde Supabase (Authentication → Users → su correo → «Send password recovery»).',
      },
      {
        pregunta: '¿Cómo salgo?',
        respuesta: 'Pulse «Salir», arriba a la derecha. Hágalo siempre si usa una computadora compartida.',
      },
    ],
  },
  {
    id: 'consultar',
    titulo: 'Buscar y consultar datos',
    resumen: 'Cómo buscar, filtrar por año, ver el detalle de un registro y pasar de página.',
    articulos: [
      {
        pregunta: '¿Qué muestra la pantalla «Resumen»?',
        respuesta:
          'Cuántos registros hay en cada sección (resultados, caballos, socios, etc.). Toque cualquiera para abrir esa sección.',
      },
      {
        pregunta: '¿Cómo busco algo?',
        pasos: [
          'Abra la sección en el menú de la izquierda (por ejemplo «Registro de caballos»).',
          'Escriba en el cuadro «Buscar…». La lista se actualiza sola mientras escribe.',
          'Puede buscar por nombre, código, padre, madre, expositor o criador, según la sección.',
        ],
        nota: 'No hace falta escribir el nombre completo ni respetar mayúsculas: «coronado» encuentra «MELVIN CORONADO».',
      },
      {
        pregunta: '¿Cómo veo solo un año?',
        respuesta:
          'En «Resultados» y «Calendario» hay un selector «Año» al lado del buscador. Elija el año; para ver todos, elija «Todos».',
      },
      {
        pregunta: '¿Cómo veo toda la información de un registro?',
        respuesta:
          'Toque la fila. Se abre la ventana «Detalle» con todos los campos, incluidos los que no caben en la tabla. Ciérrela con «Cerrar», tocando fuera de la ventana o con la tecla Esc.',
      },
      {
        pregunta: 'La lista se corta. ¿Dónde está el resto?',
        respuesta:
          'Cada página muestra 50 registros. Use «Anterior» y «Siguiente» al final de la tabla. Arriba se indica cuántos registros hay en total.',
      },
    ],
  },
  {
    id: 'competencias',
    titulo: 'Competencias y resultados',
    resumen: 'Resultados de cada caballo, calendario de competencias y categorías.',
    articulos: [
      {
        pregunta: '¿Qué hay en cada sección de «Competencias»?',
        respuesta:
          '«Resultados»: cada salida de un caballo en una competencia, con fecha, montador, categoría, puesto y puntos. «Calendario»: las fechas de cada competencia con su circuito y ciudad. «Categorías de competencia»: los tipos de clase (por ejemplo «Potrancas bellas formas de 36 a 60 meses») con sus rangos de edad y puntos.',
        enlace: { to: '/admin/participaciones', label: 'Abrir Resultados' },
      },
      {
        pregunta: '¿Cómo veo los ejemplares que compitieron en un evento y fecha?',
        pasos: [
          'Abra «Resultados».',
          'Elija el año en el selector «Año».',
          'Escriba el lugar en el buscador (por ejemplo «Ganadera»). Los resultados salen ordenados por fecha, del más reciente al más antiguo.',
        ],
        nota: 'En el sitio público, «Ranking → Por competencia» muestra lo mismo ordenado por puntos.',
      },
      {
        pregunta: '¿Hasta qué fecha están cargados los resultados?',
        respuesta:
          'Hasta la última competencia del archivo de Excel «competef» que se importó (hoy: 20 de junio de 2026). Para agregar competencias nuevas, vea «Actualizar datos desde Excel».',
        enlace: { to: '/admin/guia#actualizar', label: 'Ver: actualizar datos desde Excel' },
      },
      {
        pregunta: '¿Cómo registro los resultados de una competencia desde la pantalla?',
        pendiente: true,
        respuesta:
          'Todavía no se puede. Por ahora los resultados entran importando el Excel. El juzgamiento en vivo calcula los puestos de una clase, pero ese resultado todavía no pasa al ranking.',
      },
      {
        pregunta: '¿Cómo agrego una fecha al calendario?',
        pasos: [
          'Abra «Calendario» y pulse «+ Registrar fecha del calendario».',
          'El código se sugiere solo. Escriba la «Fecha» (obligatoria) y, si dura varios días, la «Fecha de cierre».',
          'Escriba la «Competencia» (ej.: 4TA COMPETENCIA 2026), el «Circuito» y el «Lugar».',
          'Pulse «Registrar». La fecha aparece enseguida en el calendario del sitio público.',
        ],
        nota: 'Si deja vacío «Nombre visible», se escribe la fecha sola (ej.: 05 de Septiembre del 2026).',
        enlace: { to: '/admin/programa', label: 'Abrir Calendario' },
      },
      {
        pregunta: '¿Cómo cambio o elimino una fecha del calendario?',
        respuesta:
          'Toque la fecha en la lista. En la ventana «Detalle» pulse «Editar» para cambiarla o «Eliminar» para quitarla (pide confirmación y no se puede deshacer).',
      },
    ],
  },
  {
    id: 'caballos',
    titulo: 'Caballos y pedigrí',
    resumen: 'Registro genealógico, descendencia, ficha pública y certificado.',
    articulos: [
      {
        pregunta: '¿Cómo busco un caballo?',
        pasos: [
          'Abra «Registro de caballos».',
          'Escriba el nombre, el código (por ejemplo G-005282), el padre, la madre, el expositor o el criador.',
          'Toque la fila para ver todos sus datos: señas, ADN, microchip, abuelos y bisabuelos.',
        ],
        enlace: { to: '/admin/caballos', label: 'Abrir Registro de caballos' },
      },
      {
        pregunta: '¿Cómo veo los hijos de un padre o una madre?',
        respuesta:
          'Abra «Descendencia» y escriba el nombre o el código del padre o la madre. Verá sus hijos, nietos y bisnietos, con el parentesco de cada uno.',
        enlace: { to: '/admin/descendencia', label: 'Abrir Descendencia' },
      },
      {
        pregunta: '¿Dónde está el historial de competencias de un caballo y su certificado?',
        respuesta:
          'En su ficha pública. En el sitio, vaya a «Caballos», búsquelo y ábralo. La ficha muestra el certificado de registro, la genealogía y todas sus competencias con puesto y puntos.',
        enlace: { to: '/caballos', label: 'Abrir el directorio público de caballos' },
      },
      {
        pregunta: '¿Cómo registro un caballo nuevo (pedigrí)?',
        pasos: [
          'Abra «Registro de caballos» y pulse «+ Registrar caballo».',
          'El «Código de registro» se sugiere solo (el siguiente G-). Cámbielo si el caballo trae otro código (O- u otro).',
          'Escriba el «Nombre» y elija el «Sexo». Son obligatorios.',
          'Complete nacimiento, color, lugar, país, modalidad, tipo de registro y asociación.',
          'Escriba el «Código del padre» y pase al siguiente campo: el nombre del padre se completa solo. Haga lo mismo con la madre, el propietario (código de socio) y el criador.',
          'Complete señas, ADN y microchip, y pulse «Registrar».',
        ],
        nota: 'Al guardar, el sistema arma solo los abuelos y bisabuelos a partir del registro de los padres, y agrega el caballo a la descendencia de cada antepasado. Si un código no está en el registro, aparece «No está en el registro»: escriba el nombre a mano (así no se arman los abuelos de ese lado).',
        enlace: { to: '/admin/caballos', label: 'Abrir Registro de caballos' },
      },
      {
        pregunta: '¿Cómo corrijo los datos de un caballo?',
        pasos: [
          'Busque el caballo en «Registro de caballos» y toque su fila.',
          'En «Detalle», pulse «Editar».',
          'Corrija lo necesario y pulse «Guardar cambios».',
        ],
        nota: 'El código de registro no se puede cambiar. Si corrige el padre, la madre, el sexo o el nombre, la genealogía y la descendencia se rehacen solas.',
      },
      {
        pregunta: '¿Cómo elimino un caballo registrado por error?',
        respuesta:
          'Toque su fila, pulse «Eliminar» y confirme. Solo se puede si el caballo no tiene resultados de competencia y no es padre, madre ni antepasado de otro caballo. Si murió, no lo elimine: edítelo y anote la «Fecha de muerte».',
      },
      {
        pregunta: '¿Cómo registro o corrijo una asociación?',
        pasos: [
          'Abra «Asociaciones» (en el grupo Personas).',
          'Pulse «+ Registrar asociación», escriba el nombre, la abreviatura y el país, y pulse «Registrar».',
          'Para corregir una, tóquela y pulse «Editar».',
        ],
        nota: 'Las asociaciones aparecen en la lista «Asociación» al registrar un caballo.',
        enlace: { to: '/admin/asociaciones', label: 'Abrir Asociaciones' },
      },
    ],
  },
  {
    id: 'personas',
    titulo: 'Socios, criadores, montadores y jueces',
    resumen: 'Datos de contacto de las personas de la asociación. Solo para administradores.',
    soloAdmin: true,
    articulos: [
      {
        pregunta: '¿Por qué un usuario de «Consulta» no ve estas secciones?',
        respuesta:
          'Tienen datos personales (teléfono, correo, dirección). Solo los administradores pueden verlos.',
      },
      {
        pregunta: '¿Cómo encuentro el teléfono o el correo de un socio?',
        pasos: [
          'Abra «Socios» (o «Criadores», «Montadores», «Jueces»).',
          'Escriba el nombre, el celular, el correo o parte de la dirección.',
          'Toque la fila para ver todos los datos de contacto.',
        ],
        enlace: { to: '/admin/socios', label: 'Abrir Socios' },
      },
      {
        pregunta: '¿Cuántos puntos lleva un criador, un propietario o un montador?',
        respuesta:
          'En el sitio público: «Ranking» → pestaña «Criadores», «Propietarios», «Montadores» o «Jinetes y amazonas». Elija el año o una competencia. Toque un nombre para ver sus puntos competencia por competencia y año por año.',
        enlace: { to: '/ranking', label: 'Abrir el Ranking' },
      },
      {
        pregunta: '¿Cómo registro un socio, criador, montador o juez nuevo?',
        pasos: [
          'Abra la sección (por ejemplo «Socios») y pulse «+ Registrar socio».',
          'El «Código» se sugiere solo (el siguiente número). Escriba el «Nombre completo».',
          'Complete celular, correo, teléfonos y dirección, y pulse «Registrar».',
        ],
        nota: 'El código del socio es el que se usa como «Código del propietario» al registrar un caballo, y el del criador como «Código del criador».',
      },
      {
        pregunta: '¿Cómo corrijo o elimino a una persona?',
        respuesta:
          'Toque su fila. En «Detalle», pulse «Editar» para corregir sus datos o «Eliminar» para borrarla (pide confirmación y no se puede deshacer). Eliminar a una persona no borra sus resultados ni los caballos que tenga.',
      },
      {
        pregunta: '¿Cómo sé qué socios están al día con la anualidad?',
        pendiente: true,
        respuesta:
          'Todavía no se puede. Los Excel no traen la fecha de pago ni el vencimiento de la membresía. Se agregará junto con el pago de la anualidad en línea y los recordatorios de vencimiento.',
      },
    ],
  },
  {
    id: 'juzgamiento',
    titulo: 'Juzgamiento en vivo',
    resumen: 'Abrir una clase, anotar ejemplares y jueces, votar en la libreta F-2 y sacar la hoja de cómputo.',
    soloAdmin: true,
    articulos: [
      {
        pregunta: '1. ¿Cómo abro una clase?',
        pasos: [
          'Entre a «Juzgamiento» en el menú.',
          'En «Tomar del calendario» elija la competencia: se llenan solos el evento, la fecha y el lugar. Si no está en el calendario, escríbalos a mano.',
          'Escriba la «Categoría» (por ejemplo «Potros trocha pura 31 a 35 meses») y, si lo tiene, el «Código de la clase».',
          'Pulse «Abrir clase». Se abre el formulario de esa clase.',
        ],
        enlace: { to: '/admin/juzgamiento', label: 'Abrir Juzgamiento' },
      },
      {
        pregunta: '2. ¿Cómo agrego los ejemplares de la clase?',
        pasos: [
          'En «Formulario dirección de eventos», el número del ejemplar se sugiere solo (1, 2, 3…). Cámbielo si hace falta.',
          'Escriba el número de «Registro» del caballo y pulse «Traer del registro»: se llenan nombre, sexo, nacimiento, padre, madre, criador y propietario.',
          'Complete el «Montador».',
          'Pulse «Agregar ejemplar». Repita para cada caballo.',
        ],
        nota: 'Si sale «Ese registro no está en el libro», revise el código o escriba los datos a mano. Para quitar un ejemplar, use «Quitar» en su fila.',
      },
      {
        pregunta: '3. ¿Cómo asigno los jueces?',
        pasos: [
          'En «Jueces de la clase», elija el juez en la lista y pulse «Asignar».',
          'Repita hasta cinco jueces. El orden (Juez 1, Juez 2…) es el de la hoja de cómputo.',
        ],
        nota: 'Los jueces salen del registro de jueces. Si falta uno, regístrelo primero en «Jueces» con «+ Registrar juez».',
      },
      {
        pregunta: '4. ¿Cómo marco los que pasan a votación (formato A)?',
        respuesta:
          'En la «Libreta de juzgamiento – formato A», deje marcados los ejemplares escogidos para competir y desmarque los que no pasan. Debajo se muestra la lista de los que pasan a votación.',
      },
      {
        pregunta: '5. ¿Cómo anoto la votación de cada juez (libreta F-2)?',
        pasos: [
          'Cada juez tiene su propia libreta F-2.',
          'En cada casilla (GC, GCR, MJ, 1, 2, 3, 4, 5) escriba el número del ejemplar que el juez puso en ese lugar.',
          'Salga de la casilla (toque fuera o pulse Tab) para guardar.',
        ],
        nota: 'El sistema no deja poner un número que no esté entre los escogidos, ni poner el mismo ejemplar en dos puestos (1 a 5) de la misma libreta.',
      },
      {
        pregunta: '6. ¿Cómo se calcula el resultado (hoja de cómputo)?',
        respuesta:
          'La «Hoja de cómputo» suma el lugar que le dio cada juez a cada ejemplar. La suma más baja queda primera. Si hay empate, gana el que tenga más primeros lugares; si sigue el empate, más segundos, y así. Un ejemplar recibe puesto solo cuando todos los jueces lo votaron.',
      },
      {
        pregunta: '¿Cómo elimino una clase?',
        respuesta:
          'Dentro de la clase, pulse «Eliminar clase» (debajo del título) y confirme. Se borran la clase, sus ejemplares y sus votaciones. No se puede deshacer.',
      },
      {
        pregunta: '¿El resultado del juzgamiento pasa al ranking?',
        pendiente: true,
        respuesta:
          'Todavía no. La hoja de cómputo da los puestos de la clase, pero no se guardan en «Resultados» ni suman puntos en el ranking. Esa conexión está pendiente.',
      },
    ],
  },
  {
    id: 'usuarios',
    titulo: 'Usuarios y roles',
    resumen: 'Dar acceso a una persona, activarla y elegir qué puede ver. Solo para administradores.',
    soloAdmin: true,
    articulos: [
      {
        pregunta: '¿Cómo le doy acceso a una persona nueva?',
        pasos: [
          'El registro abierto está desactivado, así que la cuenta se crea en Supabase: Authentication → Users → «Add user». Escriba su correo y una contraseña temporal.',
          'Entre a «Usuarios y roles» aquí. La persona aparece como «Consulta» y sin activar.',
          'Marque la casilla «Activo».',
          'Si debe ver datos personales o usar el juzgamiento, cambie el rol a «Administrador».',
          'Pásele la dirección /admin y su contraseña temporal.',
        ],
        enlace: { to: '/admin/usuarios', label: 'Abrir Usuarios y roles' },
      },
      {
        pregunta: '¿Cómo le quito el acceso a alguien?',
        respuesta:
          'En «Usuarios y roles», desmarque «Activo». La persona ya no verá nada, aunque sepa su contraseña.',
      },
      {
        pregunta: '¿Por qué no puedo cambiar mi propio usuario?',
        respuesta:
          'Para que nadie se quite el acceso por error. Otro administrador tiene que hacer el cambio.',
      },
    ],
  },
  {
    id: 'sitio',
    titulo: 'El sitio público',
    resumen: 'Qué ve el público: ranking, caballos, competencias y reportes de puntos.',
    articulos: [
      {
        pregunta: '¿Qué reportes de puntos tiene el ranking?',
        respuesta:
          '«General» (caballos del año), «Por categoría» (Funcional, Bellas formas, A la cuerda, Libre y sus clases), «Por competencia», «Montadores», «Jinetes y amazonas» (por clase), «Criadores» y «Propietarios».',
        enlace: { to: '/ranking', label: 'Abrir el Ranking' },
      },
      {
        pregunta: '¿Cómo saco el reporte de puntos de un montador por competencia y por año?',
        pasos: [
          'En «Ranking», elija el año y la pestaña «Montadores».',
          'En «Competencia» deje «Todo el año» o elija una competencia.',
          'Toque el nombre del montador. Su página muestra los puntos de cada competencia del año y un resumen año por año.',
        ],
      },
      {
        pregunta: '¿Cómo saco la puntuación de jinetes y amazonas por categoría?',
        pasos: [
          'En «Ranking», pestaña «Jinetes y amazonas».',
          'Elija la «Clase» (por ejemplo «Amazonas Junior de 12 a 14 años»).',
          'Opcional: elija una competencia en lugar de «Todo el año».',
        ],
      },
      {
        pregunta: 'Un nombre sale dos veces en el ranking.',
        respuesta:
          'Los puntos se agrupan por nombre, porque los códigos del Excel no son confiables. Si una persona está escrita de dos formas (por ejemplo con y sin segundo apellido), sale dos veces. Hay que corregir el nombre en el Excel y volver a importar.',
      },
    ],
  },
  {
    id: 'actualizar',
    titulo: 'Actualizar datos desde Excel',
    resumen: 'Cómo cargar las competencias nuevas. Lo hace la persona encargada del sistema.',
    soloAdmin: true,
    articulos: [
      {
        pregunta: '¿De dónde salen los datos?',
        respuesta:
          'De los Excel de la carpeta «Todas las estadísticas»: competef (resultados), pedegree (caballos), padres (descendencia), programa (calendario), eventos (categorías), socios, criador, montar y jueces.',
        nota: 'Use siempre «competef.xlsx» para los resultados. El archivo viejo «compete.xls» se corta en 16,383 filas (marzo de 2016).',
      },
      {
        pregunta: '¿Cómo agrego las competencias nuevas?',
        pasos: [
          'Reemplace «competef.xlsx» en la carpeta «Todas las estadísticas» por la versión nueva exportada.',
          'En la computadora del proyecto, revise primero sin cargar nada: python3 scripts/importar_estadisticas.py --verificar',
          'Si el informe no muestra «PROBLEMAS», cargue solo lo nuevo: SUPABASE_DB_URL=\'…\' python3 scripts/importar_estadisticas.py --agregar',
          'Al final muestra cuántas filas se agregaron y la fecha de la última competencia.',
        ],
        nota: '«--agregar» solo inserta resultados cuyo número todavía no está en la base: no borra ni cambia nada. No use «--reemplazar»: borra todas las tablas y las vuelve a cargar.',
      },
      {
        pregunta: '¿Dónde está la contraseña de la base de datos?',
        respuesta:
          'En Supabase → botón «Connect» → Session pooler. La contraseña es la de la base de datos, no la de la cuenta. Nunca la escriba en el código ni la comparta por chat.',
      },
    ],
  },
  {
    id: 'pendiente',
    titulo: 'Lo que todavía no se puede hacer',
    resumen: 'Funciones pedidas por ADOPASO que aún no están en el software.',
    articulos: [
      {
        pregunta: 'Saber qué socios están al día y cuáles no',
        pendiente: true,
      },
      {
        pregunta: 'Pagar la anualidad en línea y enviar recordatorios de vencimiento',
        pendiente: true,
      },
      {
        pregunta: 'Pasar el resultado del juzgamiento en vivo a «Resultados» y al ranking',
        pendiente: true,
      },
      {
        pregunta: 'Registrar resultados de competencia sin usar Excel',
        pendiente: true,
      },
    ],
  },
]

export function textoArticulo(a: Articulo): string {
  return [a.pregunta, a.respuesta, a.nota, ...(a.pasos ?? [])].filter(Boolean).join(' ')
}
