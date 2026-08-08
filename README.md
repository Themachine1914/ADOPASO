# ADOPASO — Ranking Oficial

Aplicación web del ranking de puntuaciones de caballos de Paso Fino de la **Asociación Dominicana de Caballos de Paso (ADOPASO)**.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite (por defecto `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Páginas

- `/` — Home con hero, Top 3 y resumen de temporada
- `/ranking` — Leaderboard completo con filtro por año
- `/caballos` — Directorio y búsqueda (incluye caballos fuera del ranking)
- `/caballo/:id` — Ficha del caballo e historial
- `/competencias` — Eventos del año y resultados

Los datos son de demostración (mock) en `src/data/`.
