# LifeOS — Daily Tracking Web App

**Local-first** daily tracking app for habits, mood, sleep, reading, and workouts. All data persists in IndexedDB (via Dexie). No backend needed.

## Stack
- React + Vite + TypeScript
- TailwindCSS (dark mode premium UI)
- Zustand (state management)
- Dexie (IndexedDB)
- Recharts (charts)
- FullCalendar (calendar view)
- Framer Motion (animations)
- PapaParse + SheetJS (CSV/XLSX export)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## Build for Production

```bash
npm run build
npm run preview
```

## Features
- **Dashboard** — Today's summary, streaks, mood/habits/sleep/reading charts
- **Day Log** — Full daily entry with mood, habits, sleep, reading, workout tracking. Auto-saves (debounce 400ms)
- **Calendar** — Monthly view with mood colors, click day for summary
- **Habits** — CRUD with categories, sort order, soft delete
- **Books** — CRUD with progress tracking and weekly stats
- **Workouts** — Routine/exercise management, log sets/reps/weight/RPE
- **Sleep** — 30-day charts for hours and quality, averages
- **Export** — CSV + XLSX with date range selector, Power BI-ready structure

## Data Models
All data stored in IndexedDB via Dexie:
- `habits` — name, category, active, sortOrder
- `books` — title, author, totalPages, status
- `routines` / `routineExercises` — workout templates
- `dailyEntries` — mood, note, sleep
- `entryHabits` / `entryReadings` / `entryWorkouts` — daily logs

## Seed Data
On first launch, the app seeds:
- 7 default habits (agua, comer sano, meditar, caminar, deep work, relax, leer)
- 2 books (Atomic Habits, Deep Work)
- 3 routines (Push, Pull, Pierna) with exercises
