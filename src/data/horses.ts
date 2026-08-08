import type {
  Horse,
  RankedHorse,
  VirusCertificate,
  Year,
} from '../types'
import { matchesSearch } from '../lib/normalize'
import { competitions } from './competitions'

const horsePhotos = [
  '/horses/horse-01.jpg',
  '/horses/horse-02.jpg',
  '/horses/horse-03.jpg',
  '/horses/horse-04.jpg',
  '/horses/horse-05.jpg',
  '/horses/horse-06.jpg',
  '/horses/horse-07.jpg',
  '/horses/horse-08.jpg',
  '/horses/horse-09.jpg',
  '/horses/horse-10.jpg',
  '/horses/horse-11.jpg',
  '/horses/horse-12.jpg',
  '/horses/horse-13.jpg',
  '/horses/horse-14.jpg',
  '/horses/horse-15.jpg',
]


function virus(
  testedAt: string,
  validUntil: string,
  certificateNumber: string,
  lab = 'Lab. Veterinario Nacional',
): VirusCertificate {
  return {
    testedAt,
    validUntil,
    result: 'negativo',
    lab,
    certificateNumber,
  }
}

type HorseInput = Omit<Horse, 'birthDate'> & { birthDate: string }

function horse(input: HorseInput): Horse {
  return input
}

export const horses: Horse[] = [
  horse({
    id: 'relampago-del-este',
    name: 'Relámpago del Este',
    owner: 'Carlos Méndez',
    stable: 'Criadero El Este',
    photo: horsePhotos[0],
    sex: 'macho',
    birthDate: '2019-03-12',
    color: 'Alazán',
    sireName: 'Trueno Imperial',
    damName: 'Estrella del Este',
    maternalGrandsire: 'Rey del Yaque',
    paternalGrandsire: 'Señor Dorado',
    pointsByYear: { 2025: 312, 2026: 286 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 95, place: 1 },
      { competitionId: 'clasico-vega-2025', points: 110, place: 1 },
      { competitionId: 'gran-premio-capital-2025', points: 107, place: 2 },
      { competitionId: 'copa-santiago-2026', points: 100, place: 1 },
      { competitionId: 'clasico-vega-2026', points: 96, place: 2 },
      { competitionId: 'copa-este-2026', points: 90, place: 1 },
    ],
    virusCertificate: virus('2026-01-20', '2027-01-20', 'EIA-2026-0142'),
  }),
  horse({
    id: 'estrella-de-yaque',
    name: 'Estrella de Yaque',
    owner: 'María Almonte',
    stable: 'Haras Yaque del Norte',
    photo: horsePhotos[1],
    sex: 'yegua',
    birthDate: '2020-05-22',
    color: 'Bayo',
    sireName: 'Cometa del Norte',
    damName: 'Luna Yaqueña',
    maternalGrandsire: 'Príncipe Cibaeño',
    paternalGrandsire: 'Valiente del Yaque',
    pointsByYear: { 2025: 278, 2026: 274 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 88, place: 2 },
      { competitionId: 'clasico-vega-2025', points: 92, place: 2 },
      { competitionId: 'gran-premio-capital-2025', points: 98, place: 1 },
      { competitionId: 'copa-santiago-2026', points: 92, place: 2 },
      { competitionId: 'clasico-vega-2026', points: 100, place: 1 },
      { competitionId: 'copa-este-2026', points: 82, place: 2 },
    ],
    virusCertificate: virus('2026-02-02', '2027-02-02', 'EIA-2026-0208'),
  }),
  horse({
    id: 'senor-del-caribe',
    name: 'Señor del Caribe',
    owner: 'Luis Rosario',
    stable: 'Criadero Caribe Real',
    photo: horsePhotos[2],
    sex: 'macho',
    birthDate: '2018-08-04',
    color: 'Negro azabache',
    sireName: 'Caribe Real',
    damName: 'Dama del Mar',
    maternalGrandsire: 'Galeón Azul',
    paternalGrandsire: 'Rey Caribeño',
    pointsByYear: { 2025: 265, 2026: 248 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 80, place: 3 },
      { competitionId: 'clasico-vega-2025', points: 85, place: 3 },
      { competitionId: 'gran-premio-capital-2025', points: 100, place: 3 },
      { competitionId: 'copa-santiago-2026', points: 84, place: 3 },
      { competitionId: 'clasico-vega-2026', points: 88, place: 3 },
      { competitionId: 'copa-este-2026', points: 76, place: 3 },
    ],
    virusCertificate: virus('2025-12-10', '2026-12-10', 'EIA-2025-1188'),
  }),
  horse({
    id: 'brisa-de-constanza',
    name: 'Brisa de Constanza',
    owner: 'Ana Paula Guzmán',
    stable: 'Estancias Constanza',
    photo: horsePhotos[3],
    sex: 'yegua',
    birthDate: '2021-01-18',
    color: 'Palomino',
    sireName: 'Viento de la Cordillera',
    damName: 'Nieve Constancera',
    maternalGrandsire: 'Alto Valle',
    paternalGrandsire: 'Señor de la Sierra',
    pointsByYear: { 2025: 210, 2026: 232 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 70, place: 5 },
      { competitionId: 'clasico-vega-2025', points: 68, place: 6 },
      { competitionId: 'gran-premio-capital-2025', points: 72, place: 5 },
      { competitionId: 'copa-santiago-2026', points: 78, place: 4 },
      { competitionId: 'clasico-vega-2026', points: 80, place: 4 },
      { competitionId: 'copa-este-2026', points: 74, place: 4 },
    ],
    virusCertificate: virus('2026-05-01', '2027-05-01', 'EIA-2026-0511'),
  }),
  horse({
    id: 'rey-de-cigua',
    name: 'Rey de Cigua',
    owner: 'Jorge Peña',
    stable: 'Criadero Cigua Dorada',
    photo: horsePhotos[4],
    sex: 'macho',
    birthDate: '2019-11-09',
    color: 'Castaño',
    sireName: 'Cigua Real',
    damName: 'Perla Dorada',
    maternalGrandsire: 'Sol del Cibao',
    paternalGrandsire: 'Trueno Cigua',
    pointsByYear: { 2025: 198, 2026: 218 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 62, place: 6 },
      { competitionId: 'clasico-vega-2025', points: 74, place: 4 },
      { competitionId: 'gran-premio-capital-2025', points: 62, place: 7 },
      { competitionId: 'copa-santiago-2026', points: 72, place: 5 },
      { competitionId: 'clasico-vega-2026', points: 74, place: 5 },
      { competitionId: 'copa-este-2026', points: 72, place: 5 },
    ],
    virusCertificate: virus('2026-03-15', '2027-03-15', 'EIA-2026-0330'),
  }),
  horse({
    id: 'dama-del-cigarro',
    name: 'Dama del Cibao',
    owner: 'Patricia Vargas',
    stable: 'Haras Cibao Prestige',
    photo: horsePhotos[5],
    sex: 'yegua',
    birthDate: '2020-07-30',
    color: 'Tordillo',
    sireName: 'Prestigio Cibaeño',
    damName: 'Rosa del Valle',
    maternalGrandsire: 'Marqués del Norte',
    paternalGrandsire: 'Duque del Cibao',
    pointsByYear: { 2025: 186, 2026: 205 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 58, place: 7 },
      { competitionId: 'clasico-vega-2025', points: 64, place: 7 },
      { competitionId: 'gran-premio-capital-2025', points: 64, place: 6 },
      { competitionId: 'copa-santiago-2026', points: 68, place: 6 },
      { competitionId: 'clasico-vega-2026', points: 70, place: 6 },
      { competitionId: 'copa-este-2026', points: 67, place: 6 },
    ],
    virusCertificate: virus('2026-04-01', '2027-04-01', 'EIA-2026-0402'),
  }),
  horse({
    id: 'trueno-de-bonao',
    name: 'Trueno de Bonao',
    owner: 'Rafael Jiménez',
    stable: 'Criadero Bonao Hills',
    photo: horsePhotos[6],
    sex: 'macho',
    birthDate: '2017-04-02',
    color: 'Alazán tostado',
    sireName: 'Bonao Power',
    damName: 'Furia de la Loma',
    maternalGrandsire: 'Cerro Alto',
    paternalGrandsire: 'Impacto Bonao',
    pointsByYear: { 2025: 240, 2026: 190 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 76, place: 4 },
      { competitionId: 'clasico-vega-2025', points: 80, place: 5 },
      { competitionId: 'gran-premio-capital-2025', points: 84, place: 4 },
      { competitionId: 'copa-santiago-2026', points: 64, place: 7 },
      { competitionId: 'clasico-vega-2026', points: 66, place: 7 },
      { competitionId: 'copa-este-2026', points: 60, place: 8 },
    ],
    virusCertificate: virus('2025-06-20', '2026-06-20', 'EIA-2025-0620'),
  }),
  horse({
    id: 'luna-de-samana',
    name: 'Luna de Samaná',
    owner: 'Elena Torres',
    stable: 'Bahía Samaná Stables',
    photo: horsePhotos[7],
    sex: 'yegua',
    birthDate: '2021-09-14',
    color: 'Isabela',
    sireName: 'Mar de Samaná',
    damName: 'Perla Costera',
    maternalGrandsire: 'Cabo Francés',
    paternalGrandsire: 'Norte Atlántico',
    pointsByYear: { 2025: 142, 2026: 178 },
    history: [
      { competitionId: 'clasico-vega-2025', points: 52, place: 9 },
      { competitionId: 'gran-premio-capital-2025', points: 90, place: 8 },
      { competitionId: 'copa-santiago-2026', points: 58, place: 8 },
      { competitionId: 'clasico-vega-2026', points: 60, place: 8 },
      { competitionId: 'copa-este-2026', points: 60, place: 7 },
    ],
    virusCertificate: virus('2026-01-10', '2027-01-10', 'EIA-2026-0110'),
  }),
  horse({
    id: 'principe-de-ozama',
    name: 'Príncipe de Ozama',
    owner: 'Diego Cabrera',
    stable: 'Haras Ozama',
    photo: horsePhotos[8],
    sex: 'macho',
    birthDate: '2018-12-01',
    color: 'Zaino',
    sireName: 'Ozama King',
    damName: 'Reina Capital',
    maternalGrandsire: 'Colonial',
    paternalGrandsire: 'Grandeza Ozama',
    pointsByYear: { 2025: 168, 2026: 164 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 54, place: 8 },
      { competitionId: 'clasico-vega-2025', points: 56, place: 8 },
      { competitionId: 'gran-premio-capital-2025', points: 58, place: 9 },
      { competitionId: 'copa-santiago-2026', points: 54, place: 9 },
      { competitionId: 'clasico-vega-2026', points: 56, place: 9 },
      { competitionId: 'copa-este-2026', points: 54, place: 9 },
    ],
    virusCertificate: virus('2026-02-28', '2027-02-28', 'EIA-2026-0228'),
  }),
  horse({
    id: 'perla-del-yuna',
    name: 'Perla del Yuna',
    owner: 'Sofía Encarnación',
    stable: 'Criadero Río Yuna',
    photo: horsePhotos[9],
    sex: 'yegua',
    birthDate: '2022-02-25',
    color: 'Bayo claro',
    sireName: 'Corriente Yuna',
    damName: 'Agua Clara',
    maternalGrandsire: 'Río Verde',
    paternalGrandsire: 'Cauce Dorado',
    pointsByYear: { 2025: 98, 2026: 152 },
    history: [
      { competitionId: 'gran-premio-capital-2025', points: 98, place: 10 },
      { competitionId: 'copa-santiago-2026', points: 50, place: 10 },
      { competitionId: 'clasico-vega-2026', points: 52, place: 10 },
      { competitionId: 'copa-este-2026', points: 50, place: 10 },
    ],
    virusCertificate: virus('2026-01-15', '2027-01-15', 'EIA-2026-0115'),
  }),
  horse({
    id: 'galeon-de-puerto-plata',
    name: 'Galeón de Puerto Plata',
    owner: 'Andrés Núñez',
    stable: 'Costa Norte Paso',
    photo: horsePhotos[10],
    sex: 'macho',
    birthDate: '2019-06-17',
    color: 'Alazán',
    sireName: 'Amberes Norte',
    damName: 'Brisa Portuaria',
    maternalGrandsire: 'Farallón',
    paternalGrandsire: 'Puerto Real',
    pointsByYear: { 2025: 155, 2026: 140 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 50, place: 9 },
      { competitionId: 'clasico-vega-2025', points: 48, place: 10 },
      { competitionId: 'gran-premio-capital-2025', points: 57, place: 11 },
      { competitionId: 'copa-santiago-2026', points: 46, place: 11 },
      { competitionId: 'clasico-vega-2026', points: 48, place: 11 },
      { competitionId: 'copa-este-2026', points: 46, place: 11 },
    ],
    virusCertificate: virus('2025-11-01', '2026-11-01', 'EIA-2025-1101'),
  }),
  horse({
    id: 'flor-de-jarabacoa',
    name: 'Flor de Jarabacoa',
    owner: 'Isabel Montás',
    stable: 'Montañas Jarabacoa',
    photo: horsePhotos[11],
    sex: 'yegua',
    birthDate: '2020-10-08',
    color: 'Castano claro',
    sireName: 'Pico Duarte',
    damName: 'Orquídea de Montaña',
    maternalGrandsire: 'Valle Verde',
    paternalGrandsire: 'Nube Alta',
    pointsByYear: { 2025: 120, 2026: 128 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 42, place: 10 },
      { competitionId: 'clasico-vega-2025', points: 40, place: 11 },
      { competitionId: 'gran-premio-capital-2025', points: 38, place: 12 },
      { competitionId: 'copa-santiago-2026', points: 42, place: 12 },
      { competitionId: 'clasico-vega-2026', points: 44, place: 12 },
      { competitionId: 'copa-este-2026', points: 42, place: 12 },
    ],
    virusCertificate: virus('2026-03-01', '2027-03-01', 'EIA-2026-0301'),
  }),
  horse({
    id: 'sol-de-bani',
    name: 'Sol de Baní',
    owner: 'Miguel Santana',
    stable: 'Criadero Baní Real',
    photo: horsePhotos[12],
    sex: 'macho',
    birthDate: '2023-04-11',
    color: 'Alazán',
    sireName: 'Baní Gold',
    damName: 'Aurora del Sur',
    maternalGrandsire: 'Camino Real',
    paternalGrandsire: 'Sol Peravia',
    pointsByYear: { 2025: 0, 2026: 0 },
    history: [],
    virusCertificate: virus('2026-02-10', '2027-02-10', 'EIA-2026-0210'),
  }),
  horse({
    id: 'aurora-de-moca',
    name: 'Aurora de Moca',
    owner: 'Carmen De León',
    stable: 'Haras Moca Elite',
    photo: horsePhotos[13],
    sex: 'yegua',
    birthDate: '2022-08-19',
    color: 'Bayo',
    sireName: 'Elite Moca',
    damName: 'Estrella Espaillat',
    maternalGrandsire: 'Valle Espaillat',
    paternalGrandsire: 'Señor Moca',
    pointsByYear: { 2025: 45, 2026: 0 },
    history: [
      { competitionId: 'gran-premio-capital-2025', points: 45, place: 13 },
    ],
    virusCertificate: null,
  }),
  horse({
    id: 'valiente-del-sur',
    name: 'Valiente del Sur',
    owner: 'Héctor Batista',
    stable: 'Paso del Sur',
    photo: horsePhotos[14],
    sex: 'capon',
    birthDate: '2021-05-03',
    color: 'Tordillo',
    sireName: 'Sur Real',
    damName: 'Valiente Rosa',
    maternalGrandsire: 'Barahona',
    paternalGrandsire: 'Paso Sureño',
    pointsByYear: { 2025: 0, 2026: 0 },
    history: [],
    virusCertificate: virus('2024-10-15', '2025-10-15', 'EIA-2024-1015'),
  }),
]

export function getHorseById(id: string): Horse | undefined {
  return horses.find((h) => h.id === id)
}

export function searchHorses(query: string): Horse[] {
  const list = [...horses].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return list.filter((horse) =>
    matchesSearch(
      `${horse.name} ${horse.owner} ${horse.stable} ${horse.sireName} ${horse.damName} ${horse.color}`,
      query,
    ),
  )
}

export function getRanking(year: Year): RankedHorse[] {
  return [...horses]
    .map((h) => ({
      ...h,
      points: h.pointsByYear[year] ?? 0,
      position: 0,
    }))
    .filter((h) => h.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return a.name.localeCompare(b.name, 'es')
    })
    .map((h, index) => ({ ...h, position: index + 1 }))
}

export function getResultsForCompetition(competitionId: string) {
  const competition = competitions.find((c) => c.id === competitionId)
  if (!competition) return []

  return horses
    .map((h) => {
      const entry = h.history.find((item) => item.competitionId === competitionId)
      if (!entry) return null
      return { horse: h, ...entry }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.place - b.place)
}
