import { describe, expect, it } from 'vitest'
import {
  createDefaultWorkoutSet,
  createPrefilledWorkoutSet,
  estimateWorkoutSet1RM,
  getExerciseLoadMode,
  getExerciseModeLabel,
  getExerciseTrackingMode,
  getNextWeightColumnLabel,
  getSetDisplayWeight,
  getSetStrengthWeight,
  getSetTotalReps,
  getSetVolume,
  getWeightColumnLabel,
  hasSetData,
  isUnilateralExercise,
  normalizeWorkoutExercise,
  normalizeWorkoutSet,
} from './workoutMetrics'

const unilateral = { trackingMode: 'unilateral' as const, loadMode: 'per_side' as const }
const perHand = { trackingMode: 'standard' as const, loadMode: 'per_hand' as const }

describe('metricas de entrenamiento', () => {
  it('resuelve los modos de seguimiento y carga', () => {
    expect(getExerciseTrackingMode()).toBe('standard')
    expect(getExerciseTrackingMode(unilateral)).toBe('unilateral')
    expect(getExerciseLoadMode()).toBe('total')
    expect(getExerciseLoadMode(perHand)).toBe('per_hand')
    expect(getExerciseLoadMode(unilateral)).toBe('per_side')
    expect(getExerciseLoadMode({ trackingMode: 'unilateral' })).toBe('per_side')
    expect(isUnilateralExercise(unilateral)).toBe(true)
  })

  it('normaliza series estandar y unilaterales heredadas', () => {
    expect(normalizeWorkoutSet(undefined)).toEqual({ reps: 10 })
    expect(normalizeWorkoutSet({ reps: 8, weight: 40 })).toEqual({ reps: 8, weight: 40 })
    expect(normalizeWorkoutSet(undefined, unilateral)).toEqual({
      reps: 0,
      sides: {
        left: { reps: undefined, weight: undefined, nextWeight: undefined, rpe: undefined },
        right: { reps: undefined, weight: undefined, nextWeight: undefined, rpe: undefined },
      },
    })

    const result = normalizeWorkoutSet(
      { reps: 12, weight: 15, nextWeight: 17.5, rpe: 8 },
      unilateral,
    )

    expect(result.sides?.left).toEqual({ reps: 12, weight: 15, nextWeight: 17.5, rpe: 8 })
    expect(result.sides?.right).toEqual(result.sides?.left)
  })

  it('crea series iniciales y precargadas', () => {
    expect(createDefaultWorkoutSet()).toEqual({ reps: 10 })
    expect(createDefaultWorkoutSet(unilateral)).toEqual({
      reps: 0,
      sides: { left: { reps: 10 }, right: { reps: 10 } },
    })
    expect(createDefaultWorkoutSet(undefined, { reps: 6, weight: 50 })).toEqual({
      reps: 6,
      weight: 50,
    })

    expect(createPrefilledWorkoutSet({ reps: 8, weight: 50, nextWeight: 55 })).toMatchObject({
      reps: 8,
      weight: 55,
    })

    const next = createPrefilledWorkoutSet({
      reps: 0,
      sides: {
        left: { reps: 10, weight: 12, nextWeight: 14 },
        right: { reps: 9, weight: 11 },
      },
    }, unilateral)

    expect(next.sides?.left?.weight).toBe(14)
    expect(next.sides?.right?.weight).toBe(11)

    const withoutSuggestion = createPrefilledWorkoutSet({
      reps: 0,
      sides: {
        left: { reps: 10, weight: 8 },
        right: { reps: 10, weight: 9 },
      },
    }, unilateral)
    expect(withoutSuggestion.sides?.left?.weight).toBe(8)
    expect(createPrefilledWorkoutSet({ reps: 8, weight: 50 }).weight).toBe(50)
  })

  it('normaliza ejercicios actuales y datos antiguos', () => {
    const current = normalizeWorkoutExercise({
      exerciseCatalogId: 4,
      exerciseName: 'Press',
      muscleGroup: 'Pecho',
      trackingMode: 'standard',
      loadMode: 'per_hand',
      sets: [{ reps: 10, weight: 20 }],
    })

    expect(current).toMatchObject({
      exerciseCatalogId: 4,
      exerciseName: 'Press',
      muscleGroup: 'Pecho',
      trackingMode: 'standard',
      loadMode: 'per_hand',
    })
    expect(current.sets).toEqual([{ reps: 10, weight: 20 }])

    const legacy = normalizeWorkoutExercise(
      { sets: 2, reps: 6, weight: 30, rpe: 7 } as never,
      { id: 9, name: 'Remo', muscleGroup: 'Espalda' },
    )

    expect(legacy.exerciseCatalogId).toBe(9)
    expect(legacy.exerciseName).toBe('Remo')
    expect(legacy.sets).toHaveLength(2)
    expect(legacy.sets[0]).toMatchObject({ reps: 6, weight: 30, rpe: 7 })

    const emptyLegacy = normalizeWorkoutExercise({} as never)
    expect(emptyLegacy).toMatchObject({
      exerciseCatalogId: 0,
      exerciseName: 'Ejercicio',
      trackingMode: 'standard',
      loadMode: 'total',
    })
    expect(emptyLegacy.sets).toEqual([
      { reps: 10, weight: undefined, rpe: undefined, nextWeight: undefined },
      { reps: 10, weight: undefined, rpe: undefined, nextWeight: undefined },
      { reps: 10, weight: undefined, rpe: undefined, nextWeight: undefined },
    ])
  })

  it('calcula repeticiones, volumen, fuerza y 1RM', () => {
    const standardSet = { reps: 10, weight: 20 }
    const unilateralSet = {
      reps: 0,
      sides: {
        left: { reps: 10, weight: 12 },
        right: { reps: 8, weight: 14 },
      },
    }

    expect(getSetTotalReps(standardSet)).toBe(10)
    expect(getSetVolume(standardSet)).toBe(200)
    expect(getSetVolume(standardSet, perHand)).toBe(400)
    expect(getSetStrengthWeight(standardSet, perHand)).toBe(40)
    expect(estimateWorkoutSet1RM(standardSet, perHand)).toBe(53)

    expect(getSetTotalReps(unilateralSet, unilateral)).toBe(18)
    expect(getSetVolume(unilateralSet, unilateral)).toBe(232)
    expect(getSetDisplayWeight(unilateralSet, unilateral)).toBe(14)
    expect(getSetStrengthWeight(unilateralSet, unilateral)).toBe(14)
    expect(estimateWorkoutSet1RM(unilateralSet, unilateral)).toBe(19)
    expect(estimateWorkoutSet1RM({ reps: 1, weight: 60 })).toBe(60)
    expect(estimateWorkoutSet1RM({ reps: 0, weight: 60 })).toBe(0)

    const emptySet = {} as never
    expect(getSetTotalReps(emptySet)).toBe(0)
    expect(getSetTotalReps({ reps: 0, sides: {} }, unilateral)).toBe(0)
    expect(getSetVolume(emptySet)).toBe(0)
    expect(getSetVolume({ reps: 0, sides: { left: { reps: 5 } } }, unilateral)).toBe(0)
    expect(getSetDisplayWeight(emptySet)).toBe(0)
    expect(getSetDisplayWeight({ reps: 0, sides: {} }, unilateral)).toBe(0)
    expect(getSetStrengthWeight(emptySet)).toBe(0)
    expect(estimateWorkoutSet1RM(emptySet)).toBe(0)
    expect(estimateWorkoutSet1RM({ reps: 0, sides: {} }, unilateral)).toBe(0)
  })

  it('detecta datos y genera etiquetas', () => {
    expect(hasSetData({ reps: 0 })).toBe(false)
    expect(hasSetData({ reps: 1 })).toBe(true)
    expect(hasSetData({ reps: 0, weight: 1 })).toBe(true)
    expect(hasSetData({ reps: 0, sides: { left: { weight: 2 } } }, unilateral)).toBe(true)
    expect(hasSetData({ reps: 0, sides: {} }, unilateral)).toBe(false)

    expect(getWeightColumnLabel(undefined, 'kg')).toBe('KG')
    expect(getWeightColumnLabel(perHand, 'lbs')).toBe('LBS/mano')
    expect(getNextWeightColumnLabel(perHand)).toContain('mano')
    expect(getNextWeightColumnLabel()).not.toContain('mano')
    expect(getExerciseModeLabel(unilateral)).toBe('Unilateral')
    expect(getExerciseModeLabel(perHand)).toBe('Por mano')
    expect(getExerciseModeLabel()).toBe('Total')
  })
})
