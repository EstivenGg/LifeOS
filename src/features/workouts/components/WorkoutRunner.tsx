import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, ChevronLeft, ChevronRight, Plus, Check, Minus, FastForward, ChevronDown } from 'lucide-react'
import { db } from '@/data/db'
import toast from 'react-hot-toast'
import { showSaved } from '@/utils/toast'
import { ProgressBar } from '@/components/ui'
import { useWorkoutStarter } from '../hooks'
import {
  normalizeWorkoutSet,
  createDefaultWorkoutSet,
  isUnilateralExercise,
  WORKOUT_SIDES,
  getSetTotalReps,
  getSetDisplayWeight,
} from '@/utils/workoutMetrics'
import { useWeightUnit } from '@/context/SectionPrefsContext'
import { parseDate, isDateString, today } from '@/utils/date'
import type * as T from '@/data/types'

// ─── Exercise history types & panel ─────────────────────────────────────────

type HistoryEntry = {
  date: string
  routineId?: number
  routineName?: string
  sets: { reps: number; weight: number | undefined }[]
}

function ExerciseHistoryPanel({
  history,
  currentRoutineId,
  kgToDisplay,
  unit,
}: {
  history: HistoryEntry[]
  currentRoutineId?: number
  kgToDisplay: (kg: number) => number
  unit: string
}) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<'routine' | 'all'>('routine')

  if (history.length === 0) return null

  const filtered = scope === 'routine'
    ? history.filter(h => h.routineId === currentRoutineId)
    : history

  const preview = history[0]?.sets.slice(0, 3)
    .map(s => `${s.reps > 0 ? s.reps + '×' : ''}${s.weight != null ? kgToDisplay(s.weight) : '—'}`)
    .join(' · ')

  return (
    <div className="rounded-xl border border-white/[0.05] bg-surface-200/15 overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Historial</span>
        <div className="flex items-center gap-2.5">
          {!open && preview && (
            <span className="text-[10px] text-white/20 font-medium tabular-nums">{preview}</span>
          )}
          <ChevronDown
            size={13}
            className={`text-white/25 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-white/[0.05]">
              <div className="flex gap-1 mt-2.5 mb-3 bg-surface-300/20 rounded-lg p-0.5">
                {(['routine', 'all'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                      scope === s ? 'bg-white/10 text-white/80' : 'text-white/25 hover:text-white/50'
                    }`}
                  >
                    {s === 'routine' ? 'Esta rutina' : 'General'}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <p className="text-[11px] text-white/20 text-center py-1">Sin historial en esta rutina</p>
              ) : (
                <div className="space-y-2">
                  {filtered.slice(0, 5).map((session, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-[10px] text-white/30 font-semibold shrink-0 w-[2.8rem] mt-0.5 tabular-nums">
                        {parseDate(session.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {session.sets.map((s, si) => (
                          <span
                            key={si}
                            className="text-[10px] font-semibold bg-surface-300/40 rounded-md px-1.5 py-0.5 text-white/55 tabular-nums"
                          >
                            {s.reps > 0 ? `${s.reps}×` : ''}{s.weight != null ? `${kgToDisplay(s.weight)}${unit}` : '—'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function hasMeaningfulSetData(
  set: T.WorkoutSetEntry,
  exercise?: Pick<T.EntryWorkoutExercise, 'trackingMode' | 'loadMode'> | null,
) {
  if (isUnilateralExercise(exercise)) {
    const sideHasData = WORKOUT_SIDES.some(side => {
      const sideEntry = set.sides?.[side]
      return (
        (sideEntry?.reps ?? 0) > 0 ||
        sideEntry?.weight != null ||
        sideEntry?.nextWeight != null ||
        sideEntry?.rpe != null
      )
    })

    return (
      sideHasData ||
      (set.reps ?? 0) > 0 ||
      set.weight != null ||
      set.nextWeight != null ||
      set.rpe != null
    )
  }

  return (
    (set.reps ?? 0) > 0 ||
    set.weight != null ||
    set.nextWeight != null ||
    set.rpe != null
  )
}

interface WorkoutRunnerProps {
  open: boolean
  onClose: () => void
  routine: T.Routine
  routineExercises: T.RoutineExercise[]
  exerciseCatalog?: T.ExerciseCatalog[]
  entryDate: string
  allWorkouts: T.EntryWorkout[]
  onComplete: (workout: T.EntryWorkout) => void
}

export function WorkoutRunner({
  open,
  onClose,
  routine,
  routineExercises,
  exerciseCatalog = [],
  entryDate,
  allWorkouts,
  onComplete,
}: WorkoutRunnerProps) {
  const { unit, kgToDisplay, displayToKg, inputStep } = useWeightUnit()
  const [status, setStatus] = useState<'preview' | 'active'>('preview')
  const [isSaving, setIsSaving] = useState(false)
  const [sessionExercises, setSessionExercises] = useState<T.EntryWorkoutExercise[]>([])
  const [startedAt, setStartedAt] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Fase 3: Progreso y tracking de sets
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [setsDone, setSetsDone] = useState<boolean[][]>([])
  const [setsTouched, setSetsTouched] = useState<boolean[][]>([])

  // Historial del ejercicio actual
  const [exHistory, setExHistory] = useState<HistoryEntry[]>([])

  // Fase 4: Timer de descanso automatico
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState<number>(0)
  const [isRestPaused, setIsRestPaused] = useState<boolean>(false)
  const restIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const restEndTimeRef = useRef<number | null>(null)      // wall-clock end timestamp (ms)
  const restPausedMsLeftRef = useRef<number>(0)           // remaining ms when paused

  const formatRestTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}`
  }

  const addRestTime = useCallback((secs: number) => {
    setRestSecondsLeft(p => {
      if (p === null) return null
      const next = Math.max(0, p + secs)
      if (next === 0) {
        restEndTimeRef.current = null
        return null
      }
      if (restEndTimeRef.current !== null) restEndTimeRef.current += secs * 1000
      else if (restPausedMsLeftRef.current > 0) restPausedMsLeftRef.current = Math.max(0, restPausedMsLeftRef.current + secs * 1000)
      return next
    })
    setRestTotal(p => Math.max(0, p + secs))
  }, [])

  const { buildInitialSession } = useWorkoutStarter()

  // Initialize session on open
  useEffect(() => {
    if (open && status === 'preview') {
      loadSession()
    }
  }, [open])

  const loadSession = async () => {
    setLoading(true)
    try {
      const exercises = await buildInitialSession({
        routine,
        routineExercises,
        exerciseCatalog,
        allWorkouts,
        entryDate,
      })
      setSessionExercises(exercises)
    } catch (error) {
      console.error('Error loading session:', error)
      toast.error('Error al cargar la sesion')
    } finally {
      setLoading(false)
    }
  }

  // Fase 4: Cleanup en unmount
  useEffect(() => {
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current) }
  }, [])

  // Fase 4: Recalcular al volver de background/pantalla bloqueada
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState !== 'visible' || restEndTimeRef.current === null) return
      const remaining = Math.ceil((restEndTimeRef.current - Date.now()) / 1000)
      if (remaining <= 0) {
        restEndTimeRef.current = null
        setRestSecondsLeft(null)
        try { navigator.vibrate([300, 100, 300, 100, 300]) } catch {}
      } else {
        setRestSecondsLeft(remaining)
      }
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [])

  // Fase 4: Arranque/parada del countdown (wall-clock)
  useEffect(() => {
    if (restSecondsLeft !== null && !isRestPaused) {
      // Resume: restaurar end time desde los ms pausados
      if (restPausedMsLeftRef.current > 0) {
        restEndTimeRef.current = Date.now() + restPausedMsLeftRef.current
        restPausedMsLeftRef.current = 0
      } else if (!restEndTimeRef.current) {
        restEndTimeRef.current = Date.now() + restSecondsLeft * 1000
      }
      restIntervalRef.current = setInterval(() => {
        const remaining = Math.ceil((restEndTimeRef.current! - Date.now()) / 1000)
        if (remaining <= 0) {
          clearInterval(restIntervalRef.current)
          restEndTimeRef.current = null
          setRestSecondsLeft(null)
          try { navigator.vibrate([300, 100, 300, 100, 300]) } catch {}
        } else {
          setRestSecondsLeft(remaining)
        }
      }, 300)
    } else {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
      // Pause: guardar ms restantes para poder resumir correctamente
      if (isRestPaused && restEndTimeRef.current !== null) {
        restPausedMsLeftRef.current = Math.max(0, restEndTimeRef.current - Date.now())
        restEndTimeRef.current = null
      }
    }
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current) }
  }, [restSecondsLeft !== null, isRestPaused]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = () => {
    setStartedAt(new Date().toISOString())
    setSetsDone(sessionExercises.map(ex => ex.sets.map(() => false)))
    setSetsTouched(sessionExercises.map(ex => ex.sets.map(() => false)))
    setCurrentExIdx(0)
    restEndTimeRef.current = null
    restPausedMsLeftRef.current = 0
    setRestSecondsLeft(null)
    setRestTotal(0)
    setIsRestPaused(false)
    setStatus('active')
  }

  const handleFinish = async () => {
    setIsSaving(true)
    try {
      // Fase 5 - snapshot del plan + filtro de sets significativos
      const enrichedExercises: T.EntryWorkoutExercise[] = sessionExercises.map((ex, exIdx) => {
        const routineEx = routineExercises.find(r => r.exerciseCatalogId === ex.exerciseCatalogId)
        const doneSets = setsDone[exIdx] ?? []
        const touchedSets = setsTouched[exIdx] ?? []
        const meaningfulSets = ex.sets.filter((set, setIdx) => {
          if (doneSets[setIdx]) return true
          if (!touchedSets[setIdx]) return false
          return hasMeaningfulSetData(set, ex)
        })

        return {
          ...ex,
          sets: meaningfulSets,
          setsPlanned:     routineEx?.setsPlanned,
          repsTarget:      routineEx?.repsTarget,
          restBetweenSets: routineEx?.restBetweenSets,
        }
      })

      const workout: T.EntryWorkout = {
        entryDate,
        routineId: routine.id,
        routineName: routine.name,
        type: 'gym',
        exercises: enrichedExercises,
        startedAt,
        finishedAt: new Date().toISOString(),
      }

      const id = await db.entryWorkouts.add(workout)
      const savedWorkout = { id: id as number, ...workout }

      showSaved()
      onComplete(savedWorkout)
      onClose()
    } catch (error) {
      console.error('Error saving workout:', error)
      toast.error('Error al guardar el entrenamiento')
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (status === 'active') {
      const confirmed = window.confirm('Cerrar sin guardar? Se perdera el progreso.')
      if (!confirmed) return
    }
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    restEndTimeRef.current = null
    restPausedMsLeftRef.current = 0
    setRestSecondsLeft(null)
    setRestTotal(0)
    setIsRestPaused(false)
    setStatus('preview')
    setSessionExercises([])
    setStartedAt('')
    setCurrentExIdx(0)
    setSetsDone([])
    setSetsTouched([])
    onClose()
  }

  // Fase 3: Funciones de mutacion de sets
  const updateSet = useCallback((exIdx: number, setIdx: number, patch: Partial<T.WorkoutSetEntry>) => {
    setSessionExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) =>
          si !== setIdx ? s : normalizeWorkoutSet({ ...s, ...patch }, ex)
        ),
      }
    ))
    setSetsTouched(prev => prev.map((touchedSets, ei) =>
      ei !== exIdx ? touchedSets : touchedSets.map((touched, si) => (si === setIdx ? true : touched))
    ))
  }, [])

  const updateSideSet = useCallback((
    exIdx: number,
    setIdx: number,
    side: T.WorkoutSide,
    patch: Partial<T.WorkoutSetSideEntry>
  ) => {
    setSessionExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex
      return {
        ...ex,
        sets: ex.sets.map((s, si) => {
          if (si !== setIdx) return s
          const normalized = normalizeWorkoutSet(s, ex)
          return normalizeWorkoutSet({
            ...normalized,
            sides: {
              ...normalized.sides,
              [side]: { ...normalized.sides?.[side], ...patch },
            },
          }, ex)
        }),
      }
    }))
    setSetsTouched(prev => prev.map((touchedSets, ei) =>
      ei !== exIdx ? touchedSets : touchedSets.map((touched, si) => (si === setIdx ? true : touched))
    ))
  }, [])

  const addExtraSet = useCallback((exIdx: number) => {
    setSessionExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex
      const lastSet = ex.sets[ex.sets.length - 1]
      return { ...ex, sets: [...ex.sets, createDefaultWorkoutSet(ex, lastSet)] }
    }))
    setSetsDone(prev => prev.map((doneSets, ei) =>
      ei === exIdx ? [...doneSets, false] : doneSets
    ))
    setSetsTouched(prev => prev.map((touchedSets, ei) =>
      ei === exIdx ? [...touchedSets, false] : touchedSets
    ))
  }, [])

  const removeSet = useCallback((exIdx: number, setIdx: number) => {
    setSessionExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex
      if (ex.sets.length <= 1) return ex
      return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
    }))
    setSetsDone(prev => prev.map((doneSets, ei) =>
      ei === exIdx ? doneSets.filter((_, si) => si !== setIdx) : doneSets
    ))
    setSetsTouched(prev => prev.map((touchedSets, ei) =>
      ei === exIdx ? touchedSets.filter((_, si) => si !== setIdx) : touchedSets
    ))
  }, [])

  // Cargar historial del ejercicio actual desde la DB
  useEffect(() => {
    const catId = status === 'active' ? sessionExercises[currentExIdx]?.exerciseCatalogId : undefined
    if (!catId) { setExHistory([]); return }
    let cancelled = false
    db.entryWorkouts.toArray().then(all => {
      if (cancelled) return
      const sorted = all
        .filter(w => isDateString(w.entryDate) && w.entryDate < today())
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      const found: HistoryEntry[] = []
      for (const workout of sorted) {
        if (found.length >= 10) break
        const ex = workout.exercises?.find(e => e.exerciseCatalogId === catId)
        if (!ex?.sets?.length) continue
        found.push({
          date: workout.entryDate,
          routineId: workout.routineId,
          routineName: workout.routineName,
          sets: ex.sets.map(s => ({
            reps: getSetTotalReps(s, ex),
            weight: getSetDisplayWeight(s, ex) ?? undefined,
          })),
        })
      }
      setExHistory(found)
    })
    return () => { cancelled = true }
  }, [currentExIdx, status, sessionExercises])

  // Fase 3: Valores derivados
  const currentExercise = sessionExercises[currentExIdx]

  const currentRoutineEx = useMemo(() =>
    routineExercises.find(e => e.exerciseCatalogId === currentExercise?.exerciseCatalogId),
    [routineExercises, currentExercise]
  )

  const completedExCount = useMemo(() =>
    setsDone.filter(doneSets => doneSets.length > 0 && doneSets.every(Boolean)).length,
    [setsDone]
  )

  const isCurrentExDone = useMemo(() =>
    (setsDone[currentExIdx] ?? []).length > 0 && (setsDone[currentExIdx] ?? []).every(Boolean),
    [setsDone, currentExIdx]
  )

  const activeSetIdx = useMemo(() =>
    (setsDone[currentExIdx] ?? []).findIndex(d => !d),
    [setsDone, currentExIdx]
  )

  const markSetDone = useCallback((exIdx: number, setIdx: number) => {
    setSetsDone(prev => {
      const isCurrentlyDone = prev[exIdx]?.[setIdx] ?? false
      const newState = prev.map((doneSets, ei) => {
        if (ei !== exIdx) return doneSets
        return doneSets.map((done, si) => si === setIdx ? !done : done)
      })

      // Solo disparar si se esta MARCANDO como done (no desmarcando)
      if (!isCurrentlyDone) {
        const allDoneAfter = newState[exIdx]?.every(Boolean) ?? false
        const seconds = allDoneAfter
          ? currentRoutineEx?.restAfterExercise
          : currentRoutineEx?.restBetweenSets

        if (seconds && seconds > 0) {
          setTimeout(() => {
            restEndTimeRef.current = Date.now() + seconds * 1000
            restPausedMsLeftRef.current = 0
            setRestTotal(seconds)
            setIsRestPaused(false)
            setRestSecondsLeft(seconds)
          }, 0)
        }
      }

      return newState
    })
  }, [currentRoutineEx])

  // Fase 3: Navegacion entre ejercicios
  const goToPrevEx = useCallback(() => {
    setCurrentExIdx(i => Math.max(0, i - 1))
  }, [])

  const goToNextEx = useCallback(() => {
    setCurrentExIdx(i => Math.min(sessionExercises.length - 1, i + 1))
  }, [sessionExercises.length])



  if (!open) return null

  // Usamos un portal para que el Runner escape del layout (.max-w-lg y transforms) del DayLog/Card
  // y ocupe siempre la pantalla completa sin deformarse ("lo nuevo mide mas que la card").
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Full Screen View */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full h-[100dvh] md:h-[90vh] md:max-w-md bg-surface-100 flex flex-col shadow-2xl overflow-hidden md:rounded-[2rem] md:border border-white/5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Sticky */}
            <div className="flex-none px-5 pt-6 pb-4 border-b border-white/[0.04] bg-surface-100/95 backdrop-blur-xl z-20 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{routine.name}</h2>
                {routine.objective && (
                  <p className="text-xs text-white/50 mt-1 font-medium">{routine.objective}</p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="btn-ghost p-2 rounded-full hover:bg-white/5 active:scale-95 transition-all text-white/70 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto w-full p-5 flex flex-col">

            {/* Preview state */}
            {status === 'preview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {loading ? (
                  <div className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    <p className="text-sm text-white/40 mt-3">Cargando sesion...</p>
                  </div>
                ) : (
                  <>
                    {/* Routine info */}
                    <div className="bg-surface-200/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Ejercicios:</span>
                        <span className="font-semibold">{sessionExercises.length}</span>
                      </div>
                      {routine.estimatedDuration && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Duracion estimada:</span>
                          <span className="font-semibold">{routine.estimatedDuration} min</span>
                        </div>
                      )}
                    </div>

                    {/* Exercises preview */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-white/50 uppercase">Ejercicios</p>
                      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                        {sessionExercises.map((ex, idx) => {
                          const routineEx = routineExercises.find(
                            e => e.exerciseCatalogId === ex.exerciseCatalogId
                          )
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between px-3 py-2.5 bg-surface-200/30 rounded-lg text-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{ex.exerciseName}</p>
                                <p className="text-xs text-white/40">
                                  {routineEx?.setsPlanned}x{routineEx?.repsTarget}
                                  {routineEx?.restBetweenSets && ` - ${routineEx.restBetweenSets}s descanso`}
                                </p>
                              </div>
                              <span className="text-xs text-accent font-semibold ml-2 shrink-0">
                                {ex.sets.length} sets
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Start button */}
                    <button
                      onClick={handleStart}
                      className="mt-6 w-full py-3 rounded-lg bg-accent/20 hover:bg-accent/30 active:bg-accent/40 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      Comenzar entrenamiento
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* Active state - Fase 3 runner interactivo */}
            {status === 'active' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 flex flex-col"
              >
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span className="font-semibold">{completedExCount} / {sessionExercises.length} ejercicios</span>
                  </div>
                  <ProgressBar value={completedExCount} max={sessionExercises.length} />
                </div>

                {/* Exercise navigation */}
                <div className="flex items-center gap-3 justify-between">
                  <button
                    onClick={goToPrevEx}
                    disabled={currentExIdx === 0}
                    className="p-1.5 rounded-lg disabled:opacity-30 text-white/60 hover:text-white transition-colors active:scale-95"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex-1 text-center min-w-0">
                    <p className="font-bold text-base truncate text-white/90">{currentExercise?.exerciseName || 'Cargando...'}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {isCurrentExDone ? (
                        <span className="text-green-400">Completado</span>
                      ) : (
                        <>Set {Math.max(1, activeSetIdx + 1)} / {currentExercise?.sets.length || 0}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={goToNextEx}
                    disabled={currentExIdx === sessionExercises.length - 1}
                    className="p-1.5 rounded-lg disabled:opacity-30 text-white/60 hover:text-white transition-colors active:scale-95"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Routine info */}
                {currentRoutineEx && (
                  <div className="bg-surface-200/30 rounded-lg px-3 py-2 text-xs text-white/60">
                    <p>
                      {currentRoutineEx.setsPlanned}x{currentRoutineEx.repsTarget}
                      {currentRoutineEx.restBetweenSets && ` - ${currentRoutineEx.restBetweenSets}s desc`}
                      {currentRoutineEx.notes && ` - ${currentRoutineEx.notes}`}
                    </p>
                  </div>
                )}

                {/* Exercise history panel */}
                <ExerciseHistoryPanel
                  key={currentExercise?.exerciseCatalogId}
                  history={exHistory}
                  currentRoutineId={routine.id}
                  kgToDisplay={kgToDisplay}
                  unit={unit}
                />

                {/* Sets list OR Rest banner */}
                <AnimatePresence mode="wait">
                  {restSecondsLeft !== null ? (
                    <motion.div
                      key="rest-banner"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                      className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8"
                    >
                      <div className="relative flex flex-col items-center justify-center w-full max-w-sm aspect-square bg-surface-200/20 rounded-[3rem] border border-white/[0.04] p-8 shadow-2xl">
                        
                        {/* Fake Circular Progress (Bar at the bottom) */}
                        <div className="absolute inset-x-8 bottom-8 h-2 bg-surface-300/30 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-accent"
                            animate={{ width: `${Math.max(0, Math.min(100, ((restTotal - restSecondsLeft!) / restTotal) * 100))}%` }}
                            transition={{ duration: 1, ease: 'linear' }}
                          />
                        </div>

                        <p className="text-sm font-bold text-accent uppercase tracking-[0.2em] mb-2 lg:mb-4">Descanso</p>

                        <div className="flex flex-col items-center mb-6 lg:mb-8">
                          <span className="text-[5.5rem] lg:text-[7rem] font-bold tabular-nums leading-none tracking-tighter shadow-black/50 drop-shadow-lg text-white">
                            {formatRestTime(restSecondsLeft!)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 lg:gap-6 mt-2">
                          <button
                            onClick={() => addRestTime(-15)}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-surface-300/30 flex items-center justify-center hover:bg-surface-300/50 active:scale-95 transition-all text-white/70 hover:text-white font-medium"
                          >
                            -15s
                          </button>
                          
                          <button
                            onClick={() => setIsRestPaused(p => !p)}
                            className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all pulse-if-paused ${isRestPaused ? 'bg-surface-300/60 text-white border-2 border-white/10' : 'bg-accent text-back-100 hover:bg-accent/90'}`}
                          >
                            {isRestPaused ? <Play size={28} className="ml-1 opacity-90" /> : <Pause size={28} />}
                          </button>

                          <button
                            onClick={() => addRestTime(15)}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-surface-300/30 flex items-center justify-center hover:bg-surface-300/50 active:scale-95 transition-all text-white/70 hover:text-white font-medium"
                          >
                            +15s
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setRestSecondsLeft(null);
                          setIsRestPaused(false);
                        }}
                        className="mt-8 text-white/40 hover:text-white uppercase tracking-widest text-[11px] lg:text-xs font-bold px-6 py-3 rounded-full hover:bg-white/5 transition-all active:scale-95 flex items-center gap-2"
                      >
                        Saltar <FastForward size={14} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sets-list"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2 flex-1 overflow-y-auto pr-1"
                    >
                      {currentExercise?.sets.map((set, setIdx) => {
                        const isDone = setsDone[currentExIdx]?.[setIdx] ?? false
                        const isActive = setIdx === activeSetIdx
                        const isUnilateral = isUnilateralExercise(currentExercise)

                        return (
                          <div
                            key={setIdx}
                            className={`relative rounded-2xl border p-4 transition-all duration-300 ${
                              isActive
                                ? 'bg-surface-200/50 border-accent/40 shadow-lg shadow-accent/5'
                                : isDone
                                  ? 'bg-surface-200/10 border-white/[0.02] opacity-50'
                                  : 'bg-surface-200/20 border-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Set Info Header + Inputs (Flex 1) */}
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${isActive ? 'bg-accent text-back-100' : 'bg-surface-300/50 text-white/70'}`}>
                                      {setIdx + 1}
                                    </div>
                                    <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Serie</span>
                                  </div>
                                  {currentExercise.sets.length > 1 && (
                                    <button
                                      onClick={() => removeSet(currentExIdx, setIdx)}
                                      className="p-2 -mr-2 text-white/20 hover:text-red-400 active:scale-95 transition-all"
                                    >
                                      <Minus size={16} />
                                    </button>
                                  )}
                                </div>

                                {/* Set inputs */}
                                {!isUnilateral ? (
                                  // Standard bilateral
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] text-white/40 uppercase font-semibold mb-1.5 block tracking-wider truncate">Reps</label>
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        value={set.reps || ''}
                                        onChange={e => updateSet(currentExIdx, setIdx, { reps: parseInt(e.target.value) || 0 })}
                                        className="input-field w-full h-11 text-center text-base font-bold px-1 bg-surface-300/30 border-transparent focus:border-accent focus:bg-surface-300/50 rounded-xl transition-colors outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-white/40 uppercase font-semibold mb-1.5 block tracking-wider truncate">{unit.toUpperCase()}</label>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step={inputStep}
                                        value={set.weight != null ? kgToDisplay(set.weight) : ''}
                                        onChange={e => updateSet(currentExIdx, setIdx, { weight: e.target.value ? displayToKg(parseFloat(e.target.value)) : undefined })}
                                        placeholder="-"
                                        className="input-field w-full h-11 text-center text-base font-bold px-1 bg-surface-300/30 border-transparent focus:border-accent focus:bg-surface-300/50 rounded-xl transition-colors outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-white/30 uppercase font-semibold mb-1.5 block tracking-wider truncate">Próx. {unit.toUpperCase()}</label>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step={inputStep}
                                        value={set.nextWeight != null ? kgToDisplay(set.nextWeight) : ''}
                                        onChange={e => updateSet(currentExIdx, setIdx, {
                                          nextWeight: e.target.value ? displayToKg(parseFloat(e.target.value)) : undefined,
                                        })}
                                        placeholder="-"
                                        className="input-field w-full h-11 text-center text-base font-bold px-1 text-orange-200/50 bg-surface-300/30 border-transparent focus:border-accent focus:bg-surface-300/50 rounded-xl transition-colors outline-none"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  // Unilateral: left and right
                                  <div className="space-y-3">
                                    {WORKOUT_SIDES.map(side => {
                                      const sideLabel = side === 'left' ? 'Izq' : 'Der'
                                      const sideSet = set.sides?.[side]
                                      return (
                                        <div key={side} className="grid grid-cols-3 gap-2 pb-3 border-b border-white/[0.04] last:border-0 last:pb-0">
                                          <div>
                                            <label className="text-[10px] text-white/40 uppercase font-semibold mb-1.5 block tracking-wider truncate">{sideLabel} Reps</label>
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              value={sideSet?.reps ?? ''}
                                              onChange={e => updateSideSet(currentExIdx, setIdx, side, { reps: e.target.value ? parseInt(e.target.value) : undefined })}
                                              className="input-field w-full h-11 text-center text-base font-bold px-1 bg-surface-300/30 border-transparent focus:border-accent focus:bg-surface-300/50 rounded-xl transition-colors outline-none"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-white/40 uppercase font-semibold mb-1.5 block tracking-wider truncate">{sideLabel} {unit.toUpperCase()}</label>
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              step={inputStep}
                                              value={sideSet?.weight != null ? kgToDisplay(sideSet.weight) : ''}
                                              onChange={e => updateSideSet(currentExIdx, setIdx, side, { weight: e.target.value ? displayToKg(parseFloat(e.target.value)) : undefined })}
                                              placeholder="-"
                                              className="input-field w-full h-11 text-center text-base font-bold px-1 bg-surface-300/30 border-transparent focus:border-accent focus:bg-surface-300/50 rounded-xl transition-colors outline-none"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-white/30 uppercase font-semibold mb-1.5 block tracking-wider truncate">Próx. {unit.toUpperCase()}</label>
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              step={inputStep}
                                              value={sideSet?.nextWeight != null ? kgToDisplay(sideSet.nextWeight) : ''}
                                              onChange={e => updateSideSet(currentExIdx, setIdx, side, { nextWeight: e.target.value ? displayToKg(parseFloat(e.target.value)) : undefined })}
                                              placeholder="-"
                                              className="input-field w-full h-11 text-center text-base font-bold px-1 text-orange-200/50 bg-surface-300/30 border-transparent focus:border-accent focus:bg-surface-300/50 rounded-xl transition-colors outline-none"
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Big Check Button */}
                              <div className="shrink-0 flex items-center justify-center self-stretch">
                                <button
                                  onClick={() => markSetDone(currentExIdx, setIdx)}
                                  className={`w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                                    isDone
                                      ? 'bg-green-500 text-back-100 shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-100'
                                      : isActive
                                        ? 'bg-accent/10 border-2 border-accent text-accent scale-100 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:bg-accent hover:text-back-100'
                                        : 'bg-surface-300/30 border-2 border-white/10 text-white/30 hover:border-white/30 scale-95'
                                  }`}
                                >
                                  {isDone ? (
                                    <Check size={36} strokeWidth={3} />
                                  ) : (
                                    <Check size={32} strokeWidth={2} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Add extra set button */}
                <button
                  onClick={() => addExtraSet(currentExIdx)}
                  className="w-full py-4 mt-2 rounded-xl border-2 border-dashed border-white/10 text-white/50 hover:text-white hover:bg-white/5 focus:bg-white/5 text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Plus size={18} /> Agregar Set Adicional
                </button>
                
                {/* Spacer so content doesn't get hidden behind footer blur in some cases */}
                <div className="h-4"></div>
              </motion.div>
            )}
            </div>

            {/* Fase 4: Sticky Footer Premium */}
            {status === 'active' && (
              <div className="flex-none p-5 border-t border-white/[0.04] bg-surface-100/95 backdrop-blur-xl z-20 flex gap-3">
                {isCurrentExDone && currentExIdx < sessionExercises.length - 1 && (
                  <button 
                    onClick={goToNextEx} 
                    className="flex-[2] py-4 rounded-xl bg-accent text-back-100 font-bold text-sm shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Siguiente</span>
                    <ChevronRight size={18} className="shrink-0" />
                  </button>
                )}
                
                <button
                  onClick={handleFinish}
                  disabled={isSaving}
                  className={`py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${
                    completedExCount === sessionExercises.length
                      ? 'flex-1 bg-accent text-back-100 shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-95'
                      : (isCurrentExDone && currentExIdx < sessionExercises.length - 1)
                        ? 'flex-[1] bg-surface-200/40 text-white/40 active:scale-95'
                        : 'flex-1 bg-surface-200/40 text-white/60 active:scale-95 hover:bg-surface-200/60 hover:text-white'
                  } disabled:opacity-50`}
                >
                  {isSaving 
                    ? 'Guardando...' 
                    : completedExCount === sessionExercises.length 
                      ? 'Finalizar todo' 
                      : (isCurrentExDone && currentExIdx < sessionExercises.length - 1) 
                        ? 'Terminar' 
                        : `Finalizar ${completedExCount}/${sessionExercises.length}`}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
