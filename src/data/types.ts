// ─── Categories ───
export interface HabitCategory {
  id?: number
  name: string
  sortOrder: number
}

// ─── Habits ───
export interface Habit {
  id?: number
  name: string
  categoryId: number
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ─── Books & Authors ───
export interface Author {
  id?: number
  name: string
}

export interface Book {
  id?: number
  title: string
  authorId: number
  totalPages: number
  status: 'reading' | 'paused' | 'finished'
  rating?: number
  coverDataUrl?: string
  description?: string
  opinion?: string
  tags?: string
}

// ─── Exercise Catalog ───
export interface ExerciseCatalog {
  id?: number
  name: string
  muscleGroup: string
  trackingMode?: ExerciseTrackingMode
  loadMode?: ExerciseLoadMode
}

// ─── Routines ───
export interface Routine {
  id?: number
  name: string
  objective?: string          // Propósito o contexto de la rutina
  estimatedDuration?: number  // Duración estimada en minutos
  timeOfDay?: string          // Momento recomendado: "morning" | "afternoon" | "evening"
  notes?: string              // Notas generales de la rutina
}

export interface RoutineExercise {
  id?: number
  routineId: number
  exerciseCatalogId: number
  name: string
  sortOrder: number
  setsPlanned: number         // Cantidad de series esperadas
  repsTarget: string          // "8-12", "10", "6-8", etc
  restBetweenSets?: number    // Descanso entre series en segundos
  restAfterExercise?: number  // Descanso después del ejercicio en segundos
  notes?: string              // Notas e instrucciones para este ejercicio
}

// ─── Media (Series & Películas) ───
export interface MediaItem {
  id?: number
  type: 'series' | 'movie'
  title: string
  coverDataUrl?: string
  description?: string
  status: 'quiero_ver' | 'viendo' | 'terminado' | 'pausado'
  rating?: number
  tags?: string
  releaseYear?: number
  notes?: string
  seasonsWatched?: number
  totalSeasons?: number
  createdAt: string
}

// ─── App Catalog (Screen Time) ───
export interface AppCatalog {
  id?: number
  name: string
  icon?: string
  category: string
  packageName?: string
}

// ─── Study Platforms ───
export interface StudyPlatform {
  id?: number
  name: string
  icon?: string
}

// ─── Daily Entry ───
export interface DailyEntry {
  date: string
  mood?: number
  note?: string
  // Sleep
  sleepQuality?: number   // basic mode: 1=Mal, 2=Regular, 3=Bien, 4=Súper
  sleepHours?: number
  sleepBedtime?: string   // HH:mm format
  sleepWakeTime?: string  // HH:mm format
  // Health
  waterMl?: number
  weightKg?: number
  // Meditation
  meditationDone?: boolean  // basic mode: just marked as done
  meditationMinutes?: number
  // Screen time
  screenTimeMinutes?: number
  // Workout (basic mode)
  workoutDone?: boolean
  // Day-specific advanced modes
  advancedOverrides?: Record<string, boolean>
}

// ─── Entry sub-tables ───
export interface EntryHabit {
  id?: number
  entryDate: string
  habitId: number
  done: boolean
}

export interface EntryReading {
  id?: number
  entryDate: string
  bookId: number
  pagesRead: number
  note?: string
}

export type WorkoutSide = 'left' | 'right'
export type ExerciseTrackingMode = 'standard' | 'unilateral'
export type ExerciseLoadMode = 'total' | 'per_hand' | 'per_side'

export interface WorkoutSetSideEntry {
  reps?: number
  weight?: number
  rpe?: number
  nextWeight?: number
}

export interface WorkoutSetEntry {
  reps: number
  weight?: number
  sides?: Partial<Record<WorkoutSide, WorkoutSetSideEntry>>
  rpe?: number       // legacy, kept for old data
  nextWeight?: number // peso sugerido para la próxima vez
}

export interface EntryWorkoutExercise {
  exerciseCatalogId: number
  exerciseName: string
  muscleGroup?: string
  trackingMode?: ExerciseTrackingMode
  loadMode?: ExerciseLoadMode
  sets: WorkoutSetEntry[]
  // Fase 5: snapshot del plan al momento de la ejecución
  setsPlanned?: number      // cuántos sets tenía planeado hacer
  repsTarget?: string       // "8-12", "10", etc.
  restBetweenSets?: number  // segundos — descanso configurado ese día
}

export type PhysicalActivityType = 'gym' | 'running' | 'swimming' | 'cycling' | 'hiking' | 'walking' | 'sports' | 'other'

export interface EntryWorkout {
  id?: number
  entryDate: string
  routineId?: number // Optional for non-gym activities
  routineName?: string

  // Multi-sport extension
  type?: PhysicalActivityType // Undefined means it's a legacy 'gym' entry
  title?: string // e.g. "Natación matutina" or "Partido de Pádel"
  trackedFields?: string[] // A snapshot of the fields enabled for this activity at the moment it was created

  // Flexible metrics depending on activity
  // NOTE: pace is NOT stored here — it is always derived from distanceKm + durationMin
  distanceKm?: number
  durationMin?: number
  heartRate?: number
  laps?: number
  maxAltitude?: number
  elevationGain?: number
  steps?: number
  sportType?: string
  intensity?: string
  notes?: string

  // Existing gym exercises
  exercises: EntryWorkoutExercise[]

  // Fase 5: duración real de la sesión
  startedAt?: string   // ISO string — cuando el usuario tocó "Comenzar"
  finishedAt?: string  // ISO string — cuando se guardó la sesión
}

export interface EntryAppUsage {
  id?: number
  entryDate: string
  appId: number
  minutes: number
}

export interface EntryStudy {
  id?: number
  entryDate: string
  topic: string
  platformId?: number
  course?: string
  minutes: number
  note?: string
}

export interface PomodoroSession {
  id?: number
  entryDate: string
  startedAt: string
  durationMinutes: number
  completed: boolean
  label?: string
  context?: 'study' | 'work' | 'other'
}

// ─── Tasks & Lists ───
export interface TaskList {
  id?: number
  name: string
  color: string
  dueDate?: string
  completedAt?: string
  archiveMode?: 'manual' | 'auto_when_all_completed'
  archived?: boolean
  createdAt: string
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export interface Task {
  id?: number
  listId?: number        // null = inbox
  title: string
  description?: string
  status: TaskStatus
  dueDate?: string       // YYYY-MM-DD
  tags?: string           // JSON array string
  parentId?: number       // subtask parent
  sortOrder: number
  isRecurring?: boolean
  recurrenceRule?: string // 'daily' | 'weekly' | 'monthly'
  recurrenceEndDate?: string // YYYY-MM-DD — last day to generate occurrences (inclusive)
  recurrenceSourceId?: number
  lastGeneratedDate?: string // YYYY-MM-DD of last recurring generation
  archived?: boolean
  createdAt: string
  completedAt?: string
  price?: number
}

export interface ListTemplate {
  id?: number
  name: string
  color: string
  items: string // JSON array of strings
  createdAt: string
}
