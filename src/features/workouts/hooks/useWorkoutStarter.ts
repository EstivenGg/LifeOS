import { useCallback } from 'react'
import { db } from '@/data/db'
import type * as T from '@/data/types'
import {
  createDefaultWorkoutSet,
  createPrefilledWorkoutSet,
  normalizeWorkoutExercise,
} from '@/utils/workoutMetrics'

/**
 * Hook para construir una sesión inicial de entrenamiento basada en una rutina.
 *
 * Pre-rellena pesos usando el historial previo de esa rutina.
 * No persiste nada — solo construye el estado de la sesión en memoria.
 */
export function useWorkoutStarter() {
  const buildInitialSession = useCallback(
    async (args: {
      routine: T.Routine
      routineExercises: T.RoutineExercise[]
      exerciseCatalog: T.ExerciseCatalog[]
      allWorkouts: T.EntryWorkout[]
      entryDate: string
    }): Promise<T.EntryWorkoutExercise[]> => {
      const { routine, routineExercises, exerciseCatalog, allWorkouts, entryDate } = args

      const catalogById = new Map(exerciseCatalog.map(ex => [ex.id, ex]))

      // Find the last time this routine was done to pre-fill weights
      const prevWorkouts = allWorkouts.filter(w => w.routineId === routine.id)
      const prev = prevWorkouts
        .filter(w => w.entryDate < entryDate)
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate))[0]

      // Build a map: exerciseCatalogId → last sets data
      const lastExMap = new Map<number, T.WorkoutSetEntry[]>()
      if (prev?.exercises) {
        for (const rawExercise of prev.exercises) {
          const exercise = normalizeWorkoutExercise(
            rawExercise as unknown as Partial<T.EntryWorkoutExercise> & Record<string, unknown>,
            typeof rawExercise.exerciseCatalogId === 'number' ? catalogById.get(rawExercise.exerciseCatalogId) : undefined,
          )
          lastExMap.set(exercise.exerciseCatalogId, exercise.sets)
        }
      }

      // Build the exercises array with pre-filled sets
      const exercises: T.EntryWorkoutExercise[] = routineExercises.map(e => {
        const catalogExercise = catalogById.get(e.exerciseCatalogId)
        const lastSets = lastExMap.get(e.exerciseCatalogId)

        if (lastSets && lastSets.length > 0) {
          return {
            exerciseCatalogId: e.exerciseCatalogId,
            exerciseName: e.name,
            muscleGroup: catalogExercise?.muscleGroup,
            trackingMode: catalogExercise?.trackingMode,
            loadMode: catalogExercise?.loadMode,
            sets: lastSets.map(s => createPrefilledWorkoutSet(s, catalogExercise)),
          }
        }

        return {
          exerciseCatalogId: e.exerciseCatalogId,
          exerciseName: e.name,
          muscleGroup: catalogExercise?.muscleGroup,
          trackingMode: catalogExercise?.trackingMode,
          loadMode: catalogExercise?.loadMode,
          sets: [
            createDefaultWorkoutSet(catalogExercise),
            createDefaultWorkoutSet(catalogExercise),
            createDefaultWorkoutSet(catalogExercise),
          ],
        }
      })

      return exercises
    },
    []
  )

  return { buildInitialSession }
}
