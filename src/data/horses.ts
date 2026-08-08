import type { Horse, RankedHorse, Year } from '../types'
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

export const horses: Horse[] = [
  {
    id: 'relampago-del-este',
    name: 'Relámpago del Este',
    owner: 'Carlos Méndez',
    stable: 'Criadero El Este',
    photo: horsePhotos[0],
    sex: 'macho',
    birthYear: 2019,
    pointsByYear: { 2025: 312, 2026: 286 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 95, place: 1 },
      { competitionId: 'clasico-vega-2025', points: 110, place: 1 },
      { competitionId: 'gran-premio-capital-2025', points: 107, place: 2 },
      { competitionId: 'copa-santiago-2026', points: 100, place: 1 },
      { competitionId: 'clasico-vega-2026', points: 96, place: 2 },
      { competitionId: 'copa-este-2026', points: 90, place: 1 },
    ],
  },
  {
    id: 'estrella-de-yaque',
    name: 'Estrella de Yaque',
    owner: 'María Almonte',
    stable: 'Haras Yaque del Norte',
    photo: horsePhotos[1],
    sex: 'hembra',
    birthYear: 2020,
    pointsByYear: { 2025: 278, 2026: 274 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 88, place: 2 },
      { competitionId: 'clasico-vega-2025', points: 92, place: 2 },
      { competitionId: 'gran-premio-capital-2025', points: 98, place: 1 },
      { competitionId: 'copa-santiago-2026', points: 92, place: 2 },
      { competitionId: 'clasico-vega-2026', points: 100, place: 1 },
      { competitionId: 'copa-este-2026', points: 82, place: 2 },
    ],
  },
  {
    id: 'senor-del-caribe',
    name: 'Señor del Caribe',
    owner: 'Luis Rosario',
    stable: 'Criadero Caribe Real',
    photo: horsePhotos[2],
    sex: 'macho',
    birthYear: 2018,
    pointsByYear: { 2025: 265, 2026: 248 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 80, place: 3 },
      { competitionId: 'clasico-vega-2025', points: 85, place: 3 },
      { competitionId: 'gran-premio-capital-2025', points: 100, place: 3 },
      { competitionId: 'copa-santiago-2026', points: 84, place: 3 },
      { competitionId: 'clasico-vega-2026', points: 88, place: 3 },
      { competitionId: 'copa-este-2026', points: 76, place: 3 },
    ],
  },
  {
    id: 'brisa-de-constanza',
    name: 'Brisa de Constanza',
    owner: 'Ana Paula Guzmán',
    stable: 'Estancias Constanza',
    photo: horsePhotos[3],
    sex: 'hembra',
    birthYear: 2021,
    pointsByYear: { 2025: 210, 2026: 232 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 70, place: 5 },
      { competitionId: 'clasico-vega-2025', points: 68, place: 6 },
      { competitionId: 'gran-premio-capital-2025', points: 72, place: 5 },
      { competitionId: 'copa-santiago-2026', points: 78, place: 4 },
      { competitionId: 'clasico-vega-2026', points: 80, place: 4 },
      { competitionId: 'copa-este-2026', points: 74, place: 4 },
    ],
  },
  {
    id: 'rey-de-cigua',
    name: 'Rey de Cigua',
    owner: 'Jorge Peña',
    stable: 'Criadero Cigua Dorada',
    photo: horsePhotos[4],
    sex: 'macho',
    birthYear: 2019,
    pointsByYear: { 2025: 198, 2026: 218 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 62, place: 6 },
      { competitionId: 'clasico-vega-2025', points: 74, place: 4 },
      { competitionId: 'gran-premio-capital-2025', points: 62, place: 7 },
      { competitionId: 'copa-santiago-2026', points: 72, place: 5 },
      { competitionId: 'clasico-vega-2026', points: 74, place: 5 },
      { competitionId: 'copa-este-2026', points: 72, place: 5 },
    ],
  },
  {
    id: 'dama-del-cigarro',
    name: 'Dama del Cibao',
    owner: 'Patricia Vargas',
    stable: 'Haras Cibao Prestige',
    photo: horsePhotos[5],
    sex: 'hembra',
    birthYear: 2020,
    pointsByYear: { 2025: 186, 2026: 205 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 58, place: 7 },
      { competitionId: 'clasico-vega-2025', points: 64, place: 7 },
      { competitionId: 'gran-premio-capital-2025', points: 64, place: 6 },
      { competitionId: 'copa-santiago-2026', points: 68, place: 6 },
      { competitionId: 'clasico-vega-2026', points: 70, place: 6 },
      { competitionId: 'copa-este-2026', points: 67, place: 6 },
    ],
  },
  {
    id: 'trueno-de-bonao',
    name: 'Trueno de Bonao',
    owner: 'Rafael Jiménez',
    stable: 'Criadero Bonao Hills',
    photo: horsePhotos[6],
    sex: 'macho',
    birthYear: 2017,
    pointsByYear: { 2025: 240, 2026: 190 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 76, place: 4 },
      { competitionId: 'clasico-vega-2025', points: 80, place: 5 },
      { competitionId: 'gran-premio-capital-2025', points: 84, place: 4 },
      { competitionId: 'copa-santiago-2026', points: 64, place: 7 },
      { competitionId: 'clasico-vega-2026', points: 66, place: 7 },
      { competitionId: 'copa-este-2026', points: 60, place: 8 },
    ],
  },
  {
    id: 'luna-de-samana',
    name: 'Luna de Samaná',
    owner: 'Elena Torres',
    stable: 'Bahía Samaná Stables',
    photo: horsePhotos[7],
    sex: 'hembra',
    birthYear: 2021,
    pointsByYear: { 2025: 142, 2026: 178 },
    history: [
      { competitionId: 'clasico-vega-2025', points: 52, place: 9 },
      { competitionId: 'gran-premio-capital-2025', points: 90, place: 8 },
      { competitionId: 'copa-santiago-2026', points: 58, place: 8 },
      { competitionId: 'clasico-vega-2026', points: 60, place: 8 },
      { competitionId: 'copa-este-2026', points: 60, place: 7 },
    ],
  },
  {
    id: 'principe-de-ozama',
    name: 'Príncipe de Ozama',
    owner: 'Diego Cabrera',
    stable: 'Haras Ozama',
    photo: horsePhotos[8],
    sex: 'macho',
    birthYear: 2018,
    pointsByYear: { 2025: 168, 2026: 164 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 54, place: 8 },
      { competitionId: 'clasico-vega-2025', points: 56, place: 8 },
      { competitionId: 'gran-premio-capital-2025', points: 58, place: 9 },
      { competitionId: 'copa-santiago-2026', points: 54, place: 9 },
      { competitionId: 'clasico-vega-2026', points: 56, place: 9 },
      { competitionId: 'copa-este-2026', points: 54, place: 9 },
    ],
  },
  {
    id: 'perla-del-yuna',
    name: 'Perla del Yuna',
    owner: 'Sofía Encarnación',
    stable: 'Criadero Río Yuna',
    photo: horsePhotos[9],
    sex: 'hembra',
    birthYear: 2022,
    pointsByYear: { 2025: 98, 2026: 152 },
    history: [
      { competitionId: 'gran-premio-capital-2025', points: 98, place: 10 },
      { competitionId: 'copa-santiago-2026', points: 50, place: 10 },
      { competitionId: 'clasico-vega-2026', points: 52, place: 10 },
      { competitionId: 'copa-este-2026', points: 50, place: 10 },
    ],
  },
  {
    id: 'galeon-de-puerto-plata',
    name: 'Galeón de Puerto Plata',
    owner: 'Andrés Núñez',
    stable: 'Costa Norte Paso',
    photo: horsePhotos[10],
    sex: 'macho',
    birthYear: 2019,
    pointsByYear: { 2025: 155, 2026: 140 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 50, place: 9 },
      { competitionId: 'clasico-vega-2025', points: 48, place: 10 },
      { competitionId: 'gran-premio-capital-2025', points: 57, place: 11 },
      { competitionId: 'copa-santiago-2026', points: 46, place: 11 },
      { competitionId: 'clasico-vega-2026', points: 48, place: 11 },
      { competitionId: 'copa-este-2026', points: 46, place: 11 },
    ],
  },
  {
    id: 'flor-de-jarabacoa',
    name: 'Flor de Jarabacoa',
    owner: 'Isabel Montás',
    stable: 'Montañas Jarabacoa',
    photo: horsePhotos[11],
    sex: 'hembra',
    birthYear: 2020,
    pointsByYear: { 2025: 120, 2026: 128 },
    history: [
      { competitionId: 'copa-santiago-2025', points: 42, place: 10 },
      { competitionId: 'clasico-vega-2025', points: 40, place: 11 },
      { competitionId: 'gran-premio-capital-2025', points: 38, place: 12 },
      { competitionId: 'copa-santiago-2026', points: 42, place: 12 },
      { competitionId: 'clasico-vega-2026', points: 44, place: 12 },
      { competitionId: 'copa-este-2026', points: 42, place: 12 },
    ],
  },
  {
    id: 'sol-de-bani',
    name: 'Sol de Baní',
    owner: 'Miguel Santana',
    stable: 'Criadero Baní Real',
    photo: horsePhotos[12],
    sex: 'macho',
    birthYear: 2023,
    pointsByYear: { 2025: 0, 2026: 0 },
    history: [],
  },
  {
    id: 'aurora-de-moca',
    name: 'Aurora de Moca',
    owner: 'Carmen De León',
    stable: 'Haras Moca Elite',
    photo: horsePhotos[13],
    sex: 'hembra',
    birthYear: 2022,
    pointsByYear: { 2025: 45, 2026: 0 },
    history: [
      { competitionId: 'gran-premio-capital-2025', points: 45, place: 13 },
    ],
  },
  {
    id: 'valiente-del-sur',
    name: 'Valiente del Sur',
    owner: 'Héctor Batista',
    stable: 'Paso del Sur',
    photo: horsePhotos[14],
    sex: 'macho',
    birthYear: 2021,
    pointsByYear: { 2025: 0, 2026: 0 },
    history: [],
  },
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function getHorseById(id: string): Horse | undefined {
  return horses.find((h) => h.id === id)
}

export function searchHorses(query: string): Horse[] {
  const q = normalize(query)
  const list = [...horses].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  if (!q) return list

  return list.filter((horse) => {
    const haystack = normalize(
      `${horse.name} ${horse.owner} ${horse.stable}`,
    )
    return haystack.includes(q)
  })
}

export function getRanking(year: Year): RankedHorse[] {
  return [...horses]
    .map((horse) => ({
      ...horse,
      points: horse.pointsByYear[year] ?? 0,
      position: 0,
    }))
    .filter((h) => h.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return a.name.localeCompare(b.name, 'es')
    })
    .map((horse, index) => ({ ...horse, position: index + 1 }))
}

export function getResultsForCompetition(competitionId: string) {
  const competition = competitions.find((c) => c.id === competitionId)
  if (!competition) return []

  return horses
    .map((horse) => {
      const entry = horse.history.find((h) => h.competitionId === competitionId)
      if (!entry) return null
      return { horse, ...entry }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.place - b.place)
}
