import type * as T from '@/data/types'

type ExerciseMeta =
  | Partial<Pick<T.ExerciseCatalog, 'trackingMode' | 'loadMode'>>
  | Partial<Pick<T.EntryWorkoutExercise, 'trackingMode' | 'loadMode'>>

export const WORKOUT_SIDES: T.WorkoutSide[] = ['left', 'right']

export function getExerciseTrackingMode(exercise?: ExerciseMeta | null): T.ExerciseTrackingMode {
  return exercise?.trackingMode === 'unilateral' ? 'unilateral' : 'standard'
}

export function getExerciseLoadMode(exercise?: ExerciseMeta | null): T.ExerciseLoadMode {
  if (exercise?.loadMode === 'per_hand') return 'per_hand'
  if (exercise?.loadMode === 'per_side') return 'per_side'
  return getExerciseTrackingMode(exercise) === 'unilateral' ? 'per_side' : 'total'
}

export function isUnilateralExercise(exercise?: ExerciseMeta | null) {
  return getExerciseTrackingMode(exercise) === 'unilateral'
}

function normalizeSideEntry(side?: T.WorkoutSetSideEntry): T.WorkoutSetSideEntry {
  return {
    reps: side?.reps,
    weight: side?.weight,
    nextWeight: side?.nextWeight,
    rpe: side?.rpe,
  }
}

function buildLegacySideFallback(set?: Partial<T.WorkoutSetEntry>) {
  if (!set) return undefined

  const hasLegacyData =
    (set.reps ?? 0) > 0 ||
    set.weight != null ||
    set.nextWeight != null ||
    set.rpe != null

  if (!hasLegacyData) return undefined

  return {
    reps: set.reps,
    weight: set.weight,
    nextWeight: set.nextWeight,
    rpe: set.rpe,
  } satisfies T.WorkoutSetSideEntry
}

export function normalizeWorkoutSet(
  set?: Partial<T.WorkoutSetEntry>,
  exercise?: ExerciseMeta | null,
): T.WorkoutSetEntry {
  if (isUnilateralExercise(exercise)) {
    const fallback = buildLegacySideFallback(set)
    return {
      reps: set?.reps ?? 0,
      weight: set?.weight,
      nextWeight: set?.nextWeight,
      rpe: set?.rpe,
      sides: {
        left: normalizeSideEntry(set?.sides?.left ?? fallback),
        right: normalizeSideEntry(set?.sides?.right ?? fallback),
      },
    }
  }

  return {
    reps: set?.reps ?? 10,
    weight: set?.weight,
    nextWeight: set?.nextWeight,
    rpe: set?.rpe,
  }
}

export function createDefaultWorkoutSet(
  exercise?: ExerciseMeta | null,
  previous?: Partial<T.WorkoutSetEntry>,
): T.WorkoutSetEntry {
  if (previous) return normalizeWorkoutSet(previous, exercise)

  if (isUnilateralExercise(exercise)) {
    return {
      reps: 0,
      sides: {
        left: { reps: 10 },
        right: { reps: 10 },
      },
    }
  }

  return { reps: 10 }
}

export function createPrefilledWorkoutSet(
  previous: Partial<T.WorkoutSetEntry>,
  exercise?: ExerciseMeta | null,
): T.WorkoutSetEntry {
  const normalized = normalizeWorkoutSet(previous, exercise)

  if (isUnilateralExercise(exercise)) {
    return {
      ...normalized,
      sides: {
        left: {
          ...normalized.sides?.left,
          weight: normalized.sides?.left?.nextWeight ?? normalized.sides?.left?.weight,
        },
        right: {
          ...normalized.sides?.right,
          weight: normalized.sides?.right?.nextWeight ?? normalized.sides?.right?.weight,
        },
      },
    }
  }

  return {
    ...normalized,
    weight: normalized.nextWeight ?? normalized.weight,
  }
}

export function normalizeWorkoutExercise(
  rawExercise: Partial<T.EntryWorkoutExercise> & Record<string, unknown>,
  catalogExercise?: T.ExerciseCatalog,
): T.EntryWorkoutExercise {
  const trackingMode = getExerciseTrackingMode(
    rawExercise.trackingMode ? rawExercise as T.EntryWorkoutExercise : catalogExercise,
  )
  const loadMode = getExerciseLoadMode(
    rawExercise.loadMode ? rawExercise as T.EntryWorkoutExercise : catalogExercise,
  )

  const rawSets = Array.isArray(rawExercise.sets)
    ? rawExercise.sets
    : Array.from({ length: typeof rawExercise.sets === 'number' ? rawExercise.sets : 3 }, () => ({
        reps: typeof rawExercise.reps === 'number' ? rawExercise.reps : 10,
        weight: typeof rawExercise.weight === 'number' ? rawExercise.weight : undefined,
        rpe: typeof rawExercise.rpe === 'number' ? rawExercise.rpe : undefined,
      }))

  return {
    exerciseCatalogId: typeof rawExercise.exerciseCatalogId === 'number'
      ? rawExercise.exerciseCatalogId
      : (catalogExercise?.id ?? 0),
    exerciseName: typeof rawExercise.exerciseName === 'string' && rawExercise.exerciseName.trim()
      ? rawExercise.exerciseName
      : (catalogExercise?.name ?? 'Ejercicio'),
    muscleGroup: typeof rawExercise.muscleGroup === 'string' && rawExercise.muscleGroup.trim()
      ? rawExercise.muscleGroup
      : catalogExercise?.muscleGroup,
    trackingMode,
    loadMode,
    sets: rawSets.map(set => normalizeWorkoutSet(set as Partial<T.WorkoutSetEntry>, { trackingMode, loadMode })),
  }
}

export function getSetTotalReps(set: T.WorkoutSetEntry, exercise?: ExerciseMeta | null) {
  if (isUnilateralExercise(exercise)) {
    return WORKOUT_SIDES.reduce((sum, side) => sum + (set.sides?.[side]?.reps ?? 0), 0)
  }

  return set.reps ?? 0
}

export function getSetVolume(set: T.WorkoutSetEntry, exercise?: ExerciseMeta | null) {
  if (isUnilateralExercise(exercise)) {
    return WORKOUT_SIDES.reduce((sum, side) => {
      const sideEntry = set.sides?.[side]
      return sum + ((sideEntry?.reps ?? 0) * (sideEntry?.weight ?? 0))
    }, 0)
  }

  const reps = set.reps ?? 0
  const weight = set.weight ?? 0
  const multiplier = getExerciseLoadMode(exercise) === 'per_hand' ? 2 : 1
  return reps * weight * multiplier
}

export function getSetDisplayWeight(set: T.WorkoutSetEntry, exercise?: ExerciseMeta | null) {
  if (isUnilateralExercise(exercise)) {
    return WORKOUT_SIDES.reduce((max, side) => Math.max(max, set.sides?.[side]?.weight ?? 0), 0)
  }

  return set.weight ?? 0
}

export function getSetStrengthWeight(set: T.WorkoutSetEntry, exercise?: ExerciseMeta | null) {
  if (isUnilateralExercise(exercise)) return getSetDisplayWeight(set, exercise)

  const weight = set.weight ?? 0
  return getExerciseLoadMode(exercise) === 'per_hand' ? weight * 2 : weight
}

export function estimateWorkoutSet1RM(set: T.WorkoutSetEntry, exercise?: ExerciseMeta | null) {
  const reps = isUnilateralExercise(exercise)
    ? WORKOUT_SIDES.reduce((max, side) => Math.max(max, set.sides?.[side]?.reps ?? 0), 0)
    : (set.reps ?? 0)
  const weight = getSetStrengthWeight(set, exercise)

  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return Math.round(weight)
  return Math.round(weight * (1 + reps / 30))
}

export function hasSetData(set: T.WorkoutSetEntry, exercise?: ExerciseMeta | null) {
  if (isUnilateralExercise(exercise)) {
    return WORKOUT_SIDES.some(side => {
      const sideEntry = set.sides?.[side]
      return (sideEntry?.reps ?? 0) > 0 || (sideEntry?.weight ?? 0) > 0
    })
  }

  return (set.reps ?? 0) > 0 || (set.weight ?? 0) > 0
}

export function getWeightColumnLabel(exercise?: ExerciseMeta | null, unit: 'kg' | 'lbs' = 'kg') {
  const u = unit.toUpperCase()
  return getExerciseLoadMode(exercise) === 'per_hand' ? `${u}/mano` : u
}

export function getNextWeightColumnLabel(exercise?: ExerciseMeta | null, unit: 'kg' | 'lbs' = 'kg') {
  return getExerciseLoadMode(exercise) === 'per_hand' ? 'Próx/mano' : 'Próx'
}

export function getExerciseModeLabel(exercise?: ExerciseMeta | null) {
  if (isUnilateralExercise(exercise)) return 'Unilateral'
  if (getExerciseLoadMode(exercise) === 'per_hand') return 'Por mano'
  return 'Total'
}
