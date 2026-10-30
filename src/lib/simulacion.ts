import { mesesCumplidos } from './campeonato'
import {
  categoriasDelCaballo,
  COLUMNAS_CABALLO,
  crearAcceso,
  crearCompetencia,
  estadoPista,
  inscribir,
  listarCatalogoCategorias,
  mapCaballo,
  numerarCompetencia,
  pistaAsistencia,
  pistaEscoger,
  pistaFase,
  pistaFormatoA,
  pistaVotar,
  type Acceso,
  type CaballoInscribible,
  type CategoriaCatalogo,
  type ClasePista,
  type DetalleCompetencia,
  type EstadoPista,
  type Fase,
} from './competencia'
import { hojaDeComputo, LUGARES_PUESTO } from './computo'
import { hoyIso } from './registro'
import { supabase } from './supabase'

/** Cuántas categorías y caballos por categoría tiene una simulación. */
const CATEGORIAS_SIMULADAS = 3
const CABALLOS_POR_CATEGORIA = 6
const JUECES_SIMULADOS = 3

function azar<T>(lista: T[]): T[] {
  return [...lista].sort(() => Math.random() - 0.5)
}

/** Caballos vivos del registro que caben en la categoría a esa fecha. */
async function caballosParaCategoria(categoria: CategoriaCatalogo, fecha: string): Promise<CaballoInscribible[]> {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const desde = new Date(Date.UTC(anio, mes - 1 - categoria.hasta - 1, dia)).toISOString().slice(0, 10)
  const hasta = new Date(Date.UTC(anio, mes - 1 - categoria.desde, dia)).toISOString().slice(0, 10)
  let consulta = supabase
    .from('caballos')
    .select(COLUMNAS_CABALLO)
    .is('fecha_muerte', null)
    .gte('fecha_nacimiento', desde)
    .lte('fecha_nacimiento', hasta)
  if (categoria.sexo) consulta = consulta.eq('sexo', categoria.sexo)
  const { data, error } = await consulta.limit(60)
  if (error) throw error
  return azar((data ?? []).map(mapCaballo))
    .filter((caballo) => {
      const meses = mesesCumplidos(caballo.nacimiento, fecha)
      return meses != null && meses >= categoria.desde && meses <= categoria.hasta
    })
    .slice(0, CABALLOS_POR_CATEGORIA)
}

/**
 * Crea una competencia de práctica con fecha de hoy: caballos reales del registro inscritos en
 * categorías de paso fino, y códigos para mesa técnica, pre-pista y tres jueces de prueba.
 */
export async function crearSimulacion(avance: (texto: string) => void): Promise<string> {
  const fecha = hoyIso()
  avance('Creando la competencia de prueba…')
  const id = await crearCompetencia({
    programaCodigo: null,
    nombre: `SIMULACIÓN ${fecha}`,
    fecha,
    lugar: 'Pista de práctica',
    simulacion: true,
  })

  const catalogo = await listarCatalogoCategorias()
  const candidatas = [
    ...catalogo.filter((c) => c.modalidad === 'paso_fino'),
    ...catalogo.filter((c) => c.modalidad !== 'paso_fino'),
  ]
  let usadas = 0
  for (const categoria of candidatas) {
    if (usadas >= CATEGORIAS_SIMULADAS) break
    const caballos = await caballosParaCategoria(categoria, fecha)
    if (caballos.length < 3) continue
    avance(`Inscribiendo ${caballos.length} caballos en ${categoria.nombre}…`)
    for (const caballo of caballos) {
      await inscribir(id, categoria, caballo, Math.random() < 0.7)
    }
    usadas += 1
  }
  if (usadas === 0) throw new Error('No se encontraron caballos con fecha de nacimiento para simular.')

  avance('Creando los códigos de acceso…')
  await crearAcceso(id, { rol: 'mesa' })
  await crearAcceso(id, { rol: 'prepista' })
  for (let puesto = 1; puesto <= JUECES_SIMULADOS; puesto += 1) {
    await crearAcceso(id, { rol: 'juez', juezPuesto: puesto, nombre: `JUEZ DE PRUEBA ${puesto}` })
  }
  return id
}

// ---------------------------------------------------------------------------
// Pasos automáticos: hacen lo mismo que cada persona en su celular, con su código
// ---------------------------------------------------------------------------

export interface Codigos {
  mesa: string | null
  prepista: string | null
  jueces: Acceso[]
}

export function codigosDe(detalle: DetalleCompetencia): Codigos {
  return {
    mesa: detalle.accesos.find((a) => a.rol === 'mesa')?.codigo ?? null,
    prepista: detalle.accesos.find((a) => a.rol === 'prepista')?.codigo ?? null,
    jueces: detalle.accesos.filter((a) => a.rol === 'juez'),
  }
}

function exigir(codigo: string | null, puesto: string): string {
  if (!codigo) throw new Error(`Falta el código de ${puesto}.`)
  return codigo
}

function numerosEnPista(clase: ClasePista): number[] {
  return clase.ejemplares
    .filter((e) => e.numero != null && e.asistio !== false && !e.excusa)
    .map((e) => e.numero!)
}

async function abrirFase(mesa: string, estado: EstadoPista, fase: Fase): Promise<void> {
  for (const clase of estado.clases) {
    if (clase.fase !== 'inscripcion' && clase.fase !== fase) await pistaFase(mesa, clase.id, fase)
  }
}

export interface PasoSimulado {
  id: string
  titulo: string
  quien: string
  ejecutar: (detalle: DetalleCompetencia) => Promise<void>
}

export const PASOS: PasoSimulado[] = [
  {
    id: 'numerar',
    titulo: 'Cerrar inscripción y numerar',
    quien: 'Administración',
    ejecutar: (detalle) => numerarCompetencia(detalle.competencia.id),
  },
  {
    id: 'prepista',
    titulo: 'Pre-pista confirma asistencia',
    quien: 'Pre-pista',
    ejecutar: async (detalle) => {
      const codigos = codigosDe(detalle)
      const mesa = exigir(codigos.mesa, 'mesa técnica')
      const prepista = exigir(codigos.prepista, 'pre-pista')
      await abrirFase(mesa, await estadoPista(mesa), 'prepista')
      const estado = await estadoPista(prepista)
      for (const clase of estado.clases) {
        // Uno de cada categoría no se presenta, para ver que queda fuera.
        const ausente = azar(clase.ejemplares.filter((e) => e.numero != null))[0]?.id
        for (const ejemplar of clase.ejemplares) {
          if (ejemplar.numero == null || !ejemplar.id) continue
          await pistaAsistencia(prepista, ejemplar.id, ejemplar.id !== ausente)
        }
      }
    },
  },
  {
    id: 'formato_a',
    titulo: 'Jueces marcan el formato A',
    quien: 'Jueces',
    ejecutar: async (detalle) => {
      const codigos = codigosDe(detalle)
      const mesa = exigir(codigos.mesa, 'mesa técnica')
      await abrirFase(mesa, await estadoPista(mesa), 'formato_a')
      for (const juez of codigos.jueces) {
        const estado = await estadoPista(juez.codigo)
        for (const clase of estado.clases) {
          const numeros = numerosEnPista(clase)
          const cuantos = Math.max(2, Math.ceil(numeros.length * 0.6))
          for (const numero of azar(numeros).slice(0, cuantos)) {
            await pistaFormatoA(juez.codigo, clase.id, numero, true)
          }
        }
      }
    },
  },
  {
    id: 'escoger',
    titulo: 'Mesa técnica escoge el recorrido individual',
    quien: 'Mesa técnica',
    ejecutar: async (detalle) => {
      const mesa = exigir(codigosDe(detalle).mesa, 'mesa técnica')
      const estado = await estadoPista(mesa)
      const jueces = Math.max(1, estado.jueces.length)
      for (const clase of estado.clases) {
        // Pasa el que marcó la mayoría de los jueces.
        for (const ejemplar of clase.ejemplares) {
          if (!ejemplar.id || ejemplar.numero == null || ejemplar.asistio === false || ejemplar.excusa) continue
          const votos = clase.formatoA.filter((m) => m.numero === ejemplar.numero).length
          const pasa = votos * 2 > jueces
          if (pasa !== ejemplar.escogido) await pistaEscoger(mesa, ejemplar.id, pasa)
        }
      }
      await abrirFase(mesa, await estadoPista(mesa), 'individual')
    },
  },
  {
    id: 'votacion',
    titulo: 'Jueces votan los lugares',
    quien: 'Jueces',
    ejecutar: async (detalle) => {
      const codigos = codigosDe(detalle)
      const mesa = exigir(codigos.mesa, 'mesa técnica')
      await abrirFase(mesa, await estadoPista(mesa), 'votacion')
      for (const juez of codigos.jueces) {
        const estado = await estadoPista(juez.codigo)
        for (const clase of estado.clases) {
          const escogidos = clase.ejemplares.filter((e) => e.escogido && !e.excusa && e.numero != null).map((e) => e.numero!)
          // Todos los jueces parten del mismo orden y cambian un par de lugares, como en la pista.
          const orden = [...escogidos].sort((a, b) => a - b)
          const i = Math.floor(Math.random() * Math.max(1, orden.length - 1))
          if (orden.length > 1) [orden[i], orden[i + 1]] = [orden[i + 1], orden[i]]
          for (const [indice, lugar] of LUGARES_PUESTO.entries()) {
            const numero = orden[indice]
            if (numero != null) await pistaVotar(juez.codigo, clase.id, lugar, numero)
          }
        }
      }
    },
  },
  {
    id: 'cerrar',
    titulo: 'Mesa técnica cierra las clases',
    quien: 'Mesa técnica',
    ejecutar: async (detalle) => {
      const mesa = exigir(codigosDe(detalle).mesa, 'mesa técnica')
      await abrirFase(mesa, await estadoPista(mesa), 'cerrada')
    },
  },
]

// ---------------------------------------------------------------------------
// Verificación: revisa que cada paso quedó como dice el reglamento
// ---------------------------------------------------------------------------

export type Resultado = 'ok' | 'falla' | 'pendiente'

export interface Revision {
  titulo: string
  resultado: Resultado
  detalle: string
}

function revision(titulo: string, resultado: Resultado, detalle: string): Revision {
  return { titulo, resultado, detalle }
}

export function revisarPasos(
  detalle: DetalleCompetencia,
  catalogo: CategoriaCatalogo[],
  mesa: EstadoPista | null,
): Revision[] {
  const revisiones: Revision[] = []
  const { clases, competencia } = detalle
  const inscritos = clases.flatMap((c) => c.inscritos.map((i) => ({ clase: c, inscrito: i })))

  // 1. Inscripción: cada caballo está en una categoría de su sexo y edad.
  const malUbicados = inscritos.filter(({ clase, inscrito }) => {
    const categoria = catalogo.find((c) => c.codigo === clase.eventoCodigo)
    if (!categoria) return true
    const caballo = { codigo: inscrito.caballoCodigo ?? '', nombre: inscrito.nombre, sexo: inscrito.sexo, nacimiento: inscrito.nacimiento, modalidad: '', padre: null, madre: null, criador: null, propietario: null }
    return !categoriasDelCaballo(caballo, competencia.fecha, catalogo).sugerencias.some((s) => s.categoria.codigo === categoria.codigo)
  })
  const pagados = inscritos.filter(({ inscrito }) => inscrito.pagado).length
  revisiones.push(
    inscritos.length === 0
      ? revision('Inscripción', 'pendiente', 'No hay caballos inscritos.')
      : malUbicados.length > 0
        ? revision('Inscripción', 'falla', `Fuera de su categoría por edad o sexo: ${malUbicados.map((m) => m.inscrito.nombre).join(', ')}.`)
        : revision('Inscripción', 'ok', `${inscritos.length} caballos en ${clases.length} categorías, todos en la que les toca por edad y sexo. ${pagados} pagaron.`),
  )

  // 2. Numeración: 1..n por categoría, el más adulto con el número más bajo.
  if (inscritos.some(({ inscrito }) => inscrito.numero == null)) {
    revisiones.push(revision('Numeración por edad', 'pendiente', 'Falta cerrar la inscripción.'))
  } else {
    const errores = clases.filter((clase) => {
      const ordenados = [...clase.inscritos].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
      const seguidos = ordenados.every((item, i) => item.numero === i + 1)
      const porEdad = ordenados.every((item, i) => i === 0 || (ordenados[i - 1].nacimiento ?? '') <= (item.nacimiento ?? '9999'))
      return !seguidos || !porEdad
    })
    revisiones.push(
      errores.length > 0
        ? revision('Numeración por edad', 'falla', `Mal numeradas: ${errores.map((c) => c.categoria).join(', ')}.`)
        : revision('Numeración por edad', 'ok', 'Cada categoría va del 1 (el más adulto) al número más alto (el más joven).'),
    )
  }

  if (!mesa) {
    revisiones.push(revision('Pasos en pista', 'pendiente', 'Falta el código de mesa técnica.'))
    return revisiones
  }
  const enPista = mesa.clases.filter((c) => c.fase !== 'inscripcion')
  const jueces = mesa.jueces.map((j) => j.puesto)

  // 3. Pre-pista
  const sinMarcar = enPista.flatMap((c) => c.ejemplares).filter((e) => e.numero != null && e.asistio == null).length
  const ausentes = enPista.flatMap((c) => c.ejemplares).filter((e) => e.asistio === false).length
  revisiones.push(
    enPista.length === 0
      ? revision('Pre-pista', 'pendiente', 'Ninguna categoría ha salido a pista.')
      : sinMarcar > 0
        ? revision('Pre-pista', 'pendiente', `${sinMarcar} ejemplares sin confirmar.`)
        : revision('Pre-pista', 'ok', `Asistencia confirmada. ${ausentes === 1 ? '1 no se presentó' : `${ausentes} no se presentaron`}.`),
  )

  // 4. Formato A: los jueces marcaron, nadie ausente pasa, la mesa escogió.
  const conFormato = enPista.filter((c) => c.formatoA.length > 0)
  const ausenteEscogido = enPista.flatMap((c) => c.ejemplares).some((e) => e.escogido && (e.asistio === false || e.excusa))
  const juecesSinMarcar = jueces.filter((p) => !enPista.some((c) => c.formatoA.some((m) => m.juezPuesto === p)))
  const sinEscoger = enPista.filter((c) => !c.ejemplares.some((e) => e.escogido))
  revisiones.push(
    conFormato.length === 0
      ? revision('Formato A', 'pendiente', 'Los jueces todavía no marcan.')
      : ausenteEscogido
        ? revision('Formato A', 'falla', 'Hay un ejemplar ausente o excusado escogido para el recorrido individual.')
        : juecesSinMarcar.length > 0 || sinEscoger.length > 0
          ? revision('Formato A', 'pendiente', [
              juecesSinMarcar.length ? `Sin marcar: Juez ${juecesSinMarcar.join(', ')}.` : '',
              sinEscoger.length ? `La mesa no ha escogido en ${sinEscoger.length} categorías.` : '',
            ].join(' ').trim())
          : revision('Formato A', 'ok', `Todos los jueces marcaron y la mesa escogió en ${enPista.length} categorías.`),
  )

  // 5. Votación: cada juez llena los lugares que alcanzan, sin repetir números y solo con escogidos.
  const conVotos = enPista.filter((c) => c.votos.length > 0)
  const invalidos = enPista.filter((c) => {
    const validos = new Set(c.ejemplares.filter((e) => e.escogido && !e.excusa && e.asistio !== false).map((e) => e.numero))
    return c.votos.some((v) => !validos.has(v.numero)) ||
      jueces.some((p) => {
        const propios = c.votos.filter((v) => v.juezPuesto === p).map((v) => v.numero)
        return new Set(propios).size !== propios.length
      })
  })
  const incompletas = enPista.filter((c) => {
    const lugares = Math.min(LUGARES_PUESTO.length, c.ejemplares.filter((e) => e.escogido && !e.excusa).length)
    return jueces.some((p) => c.votos.filter((v) => v.juezPuesto === p).length < lugares)
  })
  revisiones.push(
    conVotos.length === 0
      ? revision('Votación final', 'pendiente', 'Los jueces todavía no votan.')
      : invalidos.length > 0
        ? revision('Votación final', 'falla', `Votos a ejemplares fuera del recorrido o repetidos en: ${invalidos.map((c) => c.categoria).join(', ')}.`)
        : incompletas.length > 0
          ? revision('Votación final', 'pendiente', `Faltan lugares por votar en ${incompletas.length} categorías.`)
          : revision('Votación final', 'ok', 'Todos los jueces votaron los lugares de cada categoría.'),
  )

  // 6. Hoja de cómputo
  const resultados = enPista.map((c) => {
    const filas = hojaDeComputo(
      c.ejemplares.filter((e) => e.numero != null).map((e) => ({ numero: e.numero!, nombre: e.nombre ?? '', escogido: e.escogido && !e.excusa })),
      jueces,
      c.votos.map((v) => ({ juezPuesto: v.juezPuesto, lugar: v.lugar, ejemplarNumero: v.numero })),
    )
    return { clase: c, ganador: filas.find((f) => f.puesto === 1) }
  })
  const conGanador = resultados.filter((r) => r.ganador)
  revisiones.push(
    conGanador.length === 0
      ? revision('Hoja de cómputo', 'pendiente', 'Sin resultados todavía.')
      : revision(
          'Hoja de cómputo',
          conGanador.length === enPista.length ? 'ok' : 'pendiente',
          conGanador.map((r) => `${r.clase.categoria}: gana el ${r.ganador!.numero} (${r.ganador!.nombre})`).join(' · '),
        ),
  )

  // 7. Cierre
  revisiones.push(
    enPista.length > 0 && enPista.every((c) => c.fase === 'cerrada')
      ? revision('Cierre', 'ok', 'Todas las categorías cerradas.')
      : revision('Cierre', 'pendiente', 'Quedan categorías abiertas.'),
  )
  return revisiones
}

// ---------------------------------------------------------------------------
// Prueba de accesos: cada puesto ve y hace solo lo suyo
// ---------------------------------------------------------------------------

async function debeFallar(accion: () => Promise<void>): Promise<boolean> {
  try {
    await accion()
    return false
  } catch {
    return true
  }
}

export async function probarAccesos(detalle: DetalleCompetencia): Promise<Revision[]> {
  const codigos = codigosDe(detalle)
  const revisiones: Revision[] = []
  const agregar = (titulo: string, bien: boolean, ok: string, mal: string) =>
    revisiones.push(revision(titulo, bien ? 'ok' : 'falla', bien ? ok : mal))

  agregar(
    'Código inventado',
    await debeFallar(async () => {
      await estadoPista('ZZZZ0000')
    }),
    'Un código que no existe no entra.',
    'Un código inventado pudo entrar.',
  )

  for (const acceso of detalle.accesos) {
    try {
      await estadoPista(acceso.codigo)
      revisiones.push(revision(`Entra ${acceso.rol === 'juez' ? `Juez ${acceso.juezPuesto}` : acceso.rol === 'mesa' ? 'Mesa técnica' : 'Pre-pista'}`, 'ok', `El código ${acceso.codigo} funciona.`))
    } catch (err) {
      revisiones.push(revision(`Entra ${acceso.codigo}`, 'falla', err instanceof Error ? err.message : 'No entra.'))
    }
  }

  const juez = codigos.jueces[0]
  if (juez) {
    const estado = await estadoPista(juez.codigo)
    const ejemplares = estado.clases.flatMap((c) => c.ejemplares)
    agregar(
      'El juez no ve nombres',
      ejemplares.every((e) => e.nombre == null && e.propietario == null && e.id == null),
      'El juez solo recibe números: ni nombres, ni propietarios.',
      'El juez recibe nombres o propietarios de los caballos.',
    )
    const otros = estado.clases.flatMap((c) => [...c.votos, ...c.formatoA]).some((v) => v.juezPuesto !== juez.juezPuesto)
    agregar('El juez no ve otros votos', !otros, 'Cada juez ve solo su libreta.', 'Un juez puede ver los votos de otro.')

    const clase = estado.clases.find((c) => c.fase !== 'inscripcion')
    if (clase) {
      agregar(
        'El juez no escoge ni cambia la fase',
        (await debeFallar(() => pistaFase(juez.codigo, clase.id, clase.fase))) &&
          (await debeFallar(() => pistaEscoger(juez.codigo, '00000000-0000-0000-0000-000000000000', true))),
        'Solo la mesa técnica escoge y cambia la fase.',
        'Un juez pudo hacer algo que es de la mesa técnica.',
      )
      if (clase.fase !== 'votacion') {
        agregar(
          'No se vota fuera de turno',
          await debeFallar(() => pistaVotar(juez.codigo, clase.id, '1', numerosEnPista(clase)[0] ?? 1)),
          `Con la clase en ${clase.fase}, el juez no puede votar lugares.`,
          'El juez pudo votar antes de que la mesa abriera la votación.',
        )
      }
    }
  }

  if (codigos.prepista) {
    const estado = await estadoPista(codigos.prepista)
    agregar(
      'Pre-pista no ve votos',
      estado.clases.every((c) => c.votos.length === 0 && c.formatoA.length === 0),
      'Pre-pista ve la lista y la asistencia, no los votos.',
      'Pre-pista puede ver votos de los jueces.',
    )
    const clase = estado.clases.find((c) => c.fase !== 'inscripcion')
    if (clase) {
      agregar(
        'Pre-pista no vota',
        (await debeFallar(() => pistaVotar(codigos.prepista!, clase.id, '1', 1))) &&
          (await debeFallar(() => pistaFormatoA(codigos.prepista!, clase.id, 1, true))),
        'Pre-pista no puede votar ni marcar el formato A.',
        'Pre-pista pudo votar.',
      )
    }
  }

  return revisiones
}
