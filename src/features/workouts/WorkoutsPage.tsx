import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus, Pencil, Trash2, Dumbbell, X, Library, Search,
  BarChart3, Settings2, Activity, Bike, Footprints, Mountain,
  Trophy, Waves, ChevronDown, ChevronRight,
} from 'lucide-react'
// recharts removed – charts live in InsightsView now
import { db } from '@/data/db'
// Card removed – charts moved to InsightsView
import { Modal } from '@/components/ui/Modal'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { showSaved } from '@/utils/toast'
import { useSectionPrefs } from '@/context/SectionPrefsContext'
import { daysAgo, shortDate } from '@/utils/date'
import type { Routine, RoutineExercise, ExerciseCatalog, EntryWorkout, DailyEntry } from '@/data/types'
import type * as T from '@/data/types'
import toast from 'react-hot-toast'
import { WorkoutInsightsView } from './WorkoutInsightsView'
import { RoutineEditor, WorkoutRunner } from './components'

// ─── Activity type config ────────────────────────────────────────────────────
const ACTIVITY_TYPES: { type: T.PhysicalActivityType; label: string; icon: any }[] = [
  { type: 'gym', label: 'Gym', icon: Dumbbell },
  { type: 'running', label: 'Correr', icon: Footprints },
  { type: 'swimming', label: 'Nadar', icon: Waves },
  { type: 'cycling', label: 'Bici', icon: Bike },
  { type: 'hiking', label: 'Montaña', icon: Mountain },
  { type: 'walking', label: 'Caminar', icon: Footprints },
  { type: 'sports', label: 'Deporte', icon: Trophy },
  { type: 'other', label: 'Otro', icon: Activity },
]

const FIELD_LABELS: Record<string, string> = {
  distanceKm: 'Distancia', durationMin: 'Duración', pace: 'Ritmo (Auto)',
  heartRate: 'Cardio', laps: 'Vueltas', maxAltitude: 'Altitud',
  elevationGain: 'Desnivel', steps: 'Pasos', sportType: 'Deporte', intensity: 'Intensidad',
}
const ALL_FIELDS = Object.keys(FIELD_LABELS)

const MUSCLE_GROUPS = ['Pecho', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Pierna', 'Glúteo', 'Core', 'Cardio', 'Otros']

// tt tooltip removed – charts live in InsightsView now

// ─── Main component ──────────────────────────────────────────────────────────
const EMPTY_CAT_FORM: { name: string; muscleGroup: string; trackingMode: T.ExerciseTrackingMode; loadMode: T.ExerciseLoadMode } = {
  name: '',
  muscleGroup: '',
  trackingMode: 'standard',
  loadMode: 'total',
}
const TRACKING_OPTIONS = [
  { value: 'standard', label: 'Bilateral' },
  { value: 'unilateral', label: 'Unilateral' },
]

function buildWeekSets(allWorkouts: EntryWorkout[]) {
  const w: { label: string; sets: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i)
    const dw = allWorkouts.filter(x => x.entryDate === d && Array.isArray(x.exercises))
    w.push({
      label: shortDate(d),
      sets: dw.reduce((s, x) => s + (x.exercises || []).reduce((s2, ex: any) => s2 + (Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 0)), 0), 0),
    })
  }
  return w
}

export function WorkoutsPage() {
  // ── Data ──
  const [routines, setRoutines] = useState<Routine[]>([])
  const [exercises, setExercises] = useState<RoutineExercise[]>([])
  const [catalog, setCatalog] = useState<ExerciseCatalog[]>([])
  const [allWorkouts, setAllWorkouts] = useState<EntryWorkout[]>([])
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([])

  // ── Modals / sheets ──
  const [routineFormOpen, setRoutineFormOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [detailRoutine, setDetailRoutine] = useState<Routine | null>(null)
  const [detailTab, setDetailTab] = useState<'catalog' | 'custom'>('catalog')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [view, setView] = useState<'routines' | 'insights'>('routines')
  const [sportsConfigOpen, setSportsConfigOpen] = useState(false)
  const [expandedSport, setExpandedSport] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'routine' | 'exercise'; id: number; name: string } | null>(null)
  const [runnerRoutine, setRunnerRoutine] = useState<Routine | null>(null)

  // ── Catalog form ──
  const [catForm, setCatForm] = useState<{
    name: string
    muscleGroup: string
    trackingMode?: T.ExerciseTrackingMode
    loadMode?: T.ExerciseLoadMode
  }>(EMPTY_CAT_FORM)
  const [editCat, setEditCat] = useState<ExerciseCatalog | null>(null)
  const [catSearch, setCatSearch] = useState('')
  const [newExName, setNewExName] = useState('')
  const [detailCatSearch, setDetailCatSearch] = useState('')

  const { activeSports, toggleActiveSport, activityFields, toggleActivityField } = useSectionPrefs()
  const liveWorkouts = useLiveQuery(() => db.entryWorkouts.toArray(), [])
  const liveDailyEntries = useLiveQuery(() => db.dailyEntries.toArray(), [])

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (liveWorkouts) setAllWorkouts(liveWorkouts)
  }, [liveWorkouts])

  useEffect(() => {
    if (liveDailyEntries) setDailyEntries(liveDailyEntries)
  }, [liveDailyEntries])

  async function load() {
    const [r, e, c, aw, de] = await Promise.all([
      db.routines.toArray(),
      db.routineExercises.toArray(),
      db.exerciseCatalog.toArray(),
      db.entryWorkouts.toArray(),
      db.dailyEntries.toArray(),
    ])
    setRoutines(r); setExercises(e); setCatalog(c); setAllWorkouts(aw); setDailyEntries(de)
  }

  // ── CRUD ──
  async function saveRoutine(routine: Routine, routineExercises: RoutineExercise[]) {
    try {
      if (editingRoutine) {
        // Update routine
        await db.routines.update(editingRoutine.id!, {
          name: routine.name,
          objective: routine.objective,
          estimatedDuration: routine.estimatedDuration,
          timeOfDay: routine.timeOfDay,
          notes: routine.notes,
        })
        // Update exercises order and params
        for (const ex of routineExercises) {
          if (ex.id) {
            await db.routineExercises.update(ex.id, {
              setsPlanned: ex.setsPlanned,
              repsTarget: ex.repsTarget,
              restBetweenSets: ex.restBetweenSets,
              restAfterExercise: ex.restAfterExercise,
              notes: ex.notes,
              sortOrder: ex.sortOrder,
            })
          }
        }
      } else {
        // Create new routine
        const routineId = await db.routines.add({
          name: routine.name,
          objective: routine.objective,
          estimatedDuration: routine.estimatedDuration,
          timeOfDay: routine.timeOfDay,
          notes: routine.notes,
        }) as number
        // Add exercises
        for (const ex of routineExercises) {
          await db.routineExercises.add({
            routineId,
            exerciseCatalogId: ex.exerciseCatalogId,
            name: ex.name,
            sortOrder: ex.sortOrder,
            setsPlanned: ex.setsPlanned,
            repsTarget: ex.repsTarget,
            restBetweenSets: ex.restBetweenSets,
            restAfterExercise: ex.restAfterExercise,
            notes: ex.notes,
          })
        }
      }
      setRoutineFormOpen(false)
      setEditingRoutine(null)
      showSaved()
      load()
    } catch (error) {
      console.error('Error saving routine:', error)
      toast.error('Error al guardar la rutina')
    }
  }

  async function updateRoutineExercise(exercise: RoutineExercise) {
    try {
      if (exercise.id) {
        await db.routineExercises.update(exercise.id, {
          setsPlanned: exercise.setsPlanned,
          repsTarget: exercise.repsTarget,
          restBetweenSets: exercise.restBetweenSets,
          restAfterExercise: exercise.restAfterExercise,
          notes: exercise.notes,
        })
        showSaved()
        load()
      }
    } catch (error) {
      console.error('Error updating exercise:', error)
      toast.error('Error al actualizar el ejercicio')
    }
  }

  async function addExerciseToRoutine(routineId: number, catalogId: number, customName?: string) {
    try {
      const mx = exercises.filter(e => e.routineId === routineId).length
      const catalogEx = catalog.find(c => c.id === catalogId)
      const name = customName || catalogEx?.name || 'Ejercicio'

      // If custom name and not in catalog, create it first
      let actualCatalogId = catalogId
      if (customName && catalogId === 0) {
        actualCatalogId = await db.exerciseCatalog.add({
          name: customName,
          muscleGroup: 'Otros',
        }) as number
      }

      await db.routineExercises.add({
        routineId,
        exerciseCatalogId: actualCatalogId,
        name,
        sortOrder: mx,
        setsPlanned: 3,
        repsTarget: '8-12',
        restBetweenSets: 90,
      })
      showSaved()
      load()
    } catch (error) {
      console.error('Error adding exercise:', error)
      toast.error('Error al agregar ejercicio')
    }
  }

  async function delRoutine(id: number) {
    await db.routines.delete(id)
    await db.routineExercises.where('routineId').equals(id).delete()
    setDetailRoutine(null); setConfirmDelete(null); showSaved(); load()
  }

  async function addCatEx(rid: number, c: ExerciseCatalog) {
    const mx = exercises.filter(e => e.routineId === rid).length
    await db.routineExercises.add({ routineId: rid, exerciseCatalogId: c.id!, name: c.name, sortOrder: mx, setsPlanned: 3, repsTarget: '8-12', restBetweenSets: 90 })
    showSaved(); load()
  }

  async function addCustomEx(rid: number) {
    if (!newExName.trim()) return
    let c = catalog.find(x => x.name.toLowerCase() === newExName.trim().toLowerCase())
    let cid: number
    if (c) cid = c.id!
    else cid = await db.exerciseCatalog.add({ name: newExName.trim(), muscleGroup: 'Otros' }) as number
    const mx = exercises.filter(e => e.routineId === rid).length
    await db.routineExercises.add({ routineId: rid, exerciseCatalogId: cid, name: newExName.trim(), sortOrder: mx, setsPlanned: 3, repsTarget: '8-12', restBetweenSets: 90 })
    setNewExName(''); showSaved(); load()
  }

  async function delExFromRoutine(id: number) {
    await db.routineExercises.delete(id); showSaved(); load()
  }

  async function saveCatEx() {
    const trackingMode = catForm.trackingMode || 'standard'
    const loadMode = catForm.loadMode || (trackingMode === 'unilateral' ? 'per_side' : 'total')
    const payload = { ...catForm, trackingMode, loadMode }
    if (editCat) {
      await db.exerciseCatalog.update(editCat.id!, payload)
      if (editCat.name !== payload.name) {
        const linkedExercises = await db.routineExercises.where('exerciseCatalogId').equals(editCat.id!).toArray()
        await Promise.all(linkedExercises.map(ex => db.routineExercises.update(ex.id!, { name: payload.name })))
      }
    } else {
      await db.exerciseCatalog.add(payload)
    }
    setCatForm(EMPTY_CAT_FORM); setEditCat(null); showSaved(); load()
  }

  async function delCatEx(id: number) {
    const routinesUsing = await db.routineExercises.where('exerciseCatalogId').equals(id).count()
    const usedInHistory = allWorkouts.some(w => w.exercises.some(ex => ex.exerciseCatalogId === id))
    if (routinesUsing > 0 || usedInHistory) {
      setConfirmDelete(null)
      toast.error('Ese ejercicio ya se usa en rutinas o historial. Editalo o dejalo activo para conservar consistencia.')
      return
    }
    await db.exerciseCatalog.delete(id); setConfirmDelete(null); showSaved(); load()
  }

  // ── Derived data ──
  const weekSets = useMemo(() => buildWeekSets(allWorkouts), [allWorkouts])
  const groups = useMemo(() => [...new Set(catalog.map(c => c.muscleGroup))].sort(), [catalog])

  const totalWeekSets = weekSets.reduce((s, d) => s + d.sets, 0)

  // ── Helpers for detail sheet ──
  const detailExs = useMemo(() =>
    detailRoutine ? exercises.filter(e => e.routineId === detailRoutine.id).sort((a, b) => a.sortOrder - b.sortOrder) : [],
    [detailRoutine, exercises]
  )

  const detailCatalogFiltered = useMemo(() => {
    const used = new Set(detailExs.map(e => e.exerciseCatalogId))
    let list = catalog.filter(c => !used.has(c.id!))
    if (detailCatSearch.trim()) {
      const q = detailCatSearch.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.muscleGroup.toLowerCase().includes(q))
    }
    return list
  }, [catalog, detailExs, detailCatSearch])

  const catalogFiltered = useMemo(() => {
    if (!catSearch.trim()) return catalog
    const q = catSearch.toLowerCase()
    return catalog.filter(c => c.name.toLowerCase().includes(q) || c.muscleGroup.toLowerCase().includes(q))
  }, [catalog, catSearch])

  const catalogGroups = useMemo(() => {
    const gs = [...new Set(catalogFiltered.map(c => c.muscleGroup))].sort()
    return gs
  }, [catalogFiltered])

  // ── Nav chips ──
  type NavItem = { id: string; label: string; icon: any; action: () => void }
  const navChips: NavItem[] = [
    { id: 'sports', label: 'Deportes', icon: Settings2, action: () => setSportsConfigOpen(true) },
    { id: 'catalog', label: 'Catálogo', icon: Library, action: () => setCatalogOpen(true) },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto pb-8">

      {/* ── Hero header ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)]">
              <Dumbbell size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Actividad Física</h1>
              <p className="text-xs text-white/30 mt-0.5">Rutinas · deportes · progreso</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setView(v => v === 'routines' ? 'insights' : 'routines')}
              className={`btn-secondary text-xs flex items-center gap-1.5 ${view === 'insights' ? 'bg-accent/15 text-accent border-accent/30' : ''}`}
            >
              <BarChart3 size={13} />
              <span className="hidden sm:inline">{view === 'insights' ? 'Rutinas' : 'Insights'}</span>
            </button>
            <button
              onClick={() => { setEditingRoutine(null); setRoutineFormOpen(true) }}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus size={14} /> <span className="hidden sm:inline">Nueva rutina</span><span className="sm:hidden">Rutina</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {view === 'routines' && (
            <>
              {/* ── Quick stats ── */}
              {allWorkouts.length > 0 && (
                <div className="flex items-center justify-center gap-5 mb-5 py-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-orange-400">{totalWeekSets}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Sets / sem</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold">{routines.length}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Rutinas</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold">{catalog.length}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Ejercicios</p>
                  </div>
                </div>
              )}

              {/* ── Routines section ── */}
              <div className="mb-6">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Mis rutinas</p>
                {routines.length === 0 ? (
                  <div className="glass-card p-10 text-center">
                    <Dumbbell size={36} className="text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">Sin rutinas todavía</p>
                    <p className="text-xs text-white/20 mt-1">Crea tu primera rutina para empezar</p>
                    <button onClick={() => { setEditingRoutine(null); setRoutineFormOpen(true) }} className="btn-primary text-xs mt-4">
                      <Plus size={14} /> Crear rutina
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {routines.map((r, i) => {
                      const rExs = exercises.filter(e => e.routineId === r.id).sort((a, b) => a.sortOrder - b.sortOrder)
                      const previewNames = rExs.slice(0, 3).map(e => e.name)
                      return (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => { setEditingRoutine(r); setRoutineFormOpen(true) }}
                          className="glass-card-hover p-3.5 cursor-pointer group active:scale-[0.98] transition-transform"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center shrink-0">
                              <Dumbbell size={18} className="text-orange-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate group-hover:text-orange-400 transition-colors">{r.name}</p>
                                <span className="text-[9px] text-white/20 bg-surface-300/50 px-1.5 py-0.5 rounded-full shrink-0">
                                  {rExs.length} ej.
                                </span>
                              </div>
                              {previewNames.length > 0 && (
                                <p className="text-[10px] text-white/25 mt-0.5 truncate">
                                  {previewNames.join(' · ')}{rExs.length > 3 && ` +${rExs.length - 3}`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setRunnerRoutine(r) }}
                                className="btn-secondary text-xs active:scale-95 transition-transform"
                              >
                                Iniciar
                              </button>
                              <ChevronRight size={16} className="text-white/15" />
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Config buttons ── */}
              <div className="flex items-center gap-2">
                {navChips.map(chip => (
                  <button
                    key={chip.id}
                    onClick={chip.action}
                    className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
                  >
                    <chip.icon size={13} /> {chip.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'insights' && (
            <WorkoutInsightsView weekSets={weekSets} allWorkouts={allWorkouts} catalog={catalog} routines={routines} dailyEntries={dailyEntries} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
         MODALS / SHEETS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Routine Detail Sheet ── */}
      <Modal open={!!detailRoutine} onClose={() => setDetailRoutine(null)} title={detailRoutine?.name || ''} size="md">
        {detailRoutine && (
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => { setDetailRoutine(null); setEditingRoutine(detailRoutine); setRoutineFormOpen(true) }}
                className="btn-secondary text-xs flex-1"
              >
                <Pencil size={13} /> Editar nombre
              </button>
              <button
                onClick={() => { setConfirmDelete({ type: 'routine', id: detailRoutine.id!, name: detailRoutine.name }) }}
                className="btn-ghost text-xs text-red-400/50 hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Exercises list */}
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">
                Ejercicios ({detailExs.length})
              </p>
              {detailExs.length === 0 ? (
                <p className="text-xs text-white/20 text-center py-4">Sin ejercicios — agrega desde abajo</p>
              ) : (
                <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1">
                  {detailExs.map((ex, i) => (
                    <div key={ex.id} className="flex items-center gap-3 px-3 py-3 bg-surface-200/40 rounded-xl min-h-[48px]">
                      <span className="text-[10px] text-white/20 font-bold w-4 text-center shrink-0">{i + 1}</span>
                      <div className="w-1.5 h-5 rounded-full bg-orange-400/30 shrink-0" />
                      <span className="text-sm truncate flex-1">{ex.name}</span>
                      <button
                        onClick={() => delExFromRoutine(ex.id!)}
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-white/15 hover:text-red-400 hover:bg-red-400/10 active:bg-red-400/15 transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add exercise — tabbed */}
            <div className="border-t border-white/[0.04] pt-3">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">Agregar ejercicio</p>
              <div className="flex bg-surface-200/40 rounded-xl p-0.5 mb-3">
                {(['catalog', 'custom'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-2.5 rounded-[10px] text-xs font-semibold transition-colors ${detailTab === tab ? 'bg-accent/15 text-accent' : 'text-white/30 hover:text-white/50'
                      }`}
                  >
                    {tab === 'catalog' ? 'Catálogo' : 'Personalizado'}
                  </button>
                ))}
              </div>

              {detailTab === 'catalog' && (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                    <input
                      value={detailCatSearch}
                      onChange={e => setDetailCatSearch(e.target.value)}
                      className="input-field text-sm py-3 pl-10"
                      placeholder="Buscar ejercicio..."
                    />
                    {detailCatSearch && (
                      <button
                        onClick={() => setDetailCatSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/50 active:bg-surface-300/50 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Catalog list grouped by muscle */}
                  <div className="max-h-[38vh] overflow-y-auto rounded-2xl bg-surface-200/20 border border-white/[0.04]">
                    {detailCatalogFiltered.length === 0 ? (
                      <div className="text-center py-8">
                        <Library size={24} className="text-white/10 mx-auto mb-2" />
                        <p className="text-xs text-white/25">Sin resultados</p>
                        <p className="text-[10px] text-white/15 mt-1">Prueba otra búsqueda o agrega personalizado</p>
                      </div>
                    ) : (
                      (() => {
                        const grouped = detailCatalogFiltered.reduce<Record<string, ExerciseCatalog[]>>((acc, c) => {
                          ;(acc[c.muscleGroup] ??= []).push(c)
                          return acc
                        }, {})
                        const sortedGroups = Object.keys(grouped).sort()
                        return sortedGroups.map(group => (
                          <div key={group}>
                            <div className="sticky top-0 z-10 px-3 py-1.5 bg-surface-100/95 border-b border-white/[0.04]">
                              <span className="text-[9px] font-bold text-white/25 uppercase tracking-widest">{group}</span>
                            </div>
                            {grouped[group].map(c => (
                              <button
                                key={c.id}
                                onClick={() => addCatEx(detailRoutine.id!, c)}
                                className="w-full text-left flex items-center gap-3 px-3 py-3.5 min-h-[52px] hover:bg-surface-300/40 active:bg-accent/10 border-b border-white/[0.03] last:border-0 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-surface-300/50 flex items-center justify-center shrink-0">
                                  <Plus size={15} className="text-white/25" />
                                </div>
                                <span className="text-sm truncate flex-1">{c.name}</span>
                                <span className="text-[9px] text-white/15 shrink-0 bg-surface-300/30 px-2 py-1 rounded-lg">{c.muscleGroup}</span>
                              </button>
                            ))}
                          </div>
                        ))
                      })()
                    )}
                  </div>
                  <p className="text-[10px] text-white/15 text-center mt-2">
                    {detailCatalogFiltered.length} ejercicio{detailCatalogFiltered.length !== 1 ? 's' : ''} disponible{detailCatalogFiltered.length !== 1 ? 's' : ''}
                  </p>
                </>
              )}

              {detailTab === 'custom' && (
                <div className="flex gap-2">
                  <input
                    value={newExName}
                    onChange={e => setNewExName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomEx(detailRoutine.id!)}
                    placeholder="Nombre del ejercicio..."
                    className="input-field text-sm py-3 flex-1"
                  />
                  <button onClick={() => addCustomEx(detailRoutine.id!)} disabled={!newExName.trim()} className="btn-primary px-5 shrink-0 disabled:opacity-30">
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Routine Editor ── */}
      <RoutineEditor
        open={routineFormOpen}
        onClose={() => setRoutineFormOpen(false)}
        routine={editingRoutine}
        exercises={exercises}
        catalog={catalog}
        onSave={saveRoutine}
        onAddExercise={addExerciseToRoutine}
        onDeleteExercise={delExFromRoutine}
        onUpdateExercise={updateRoutineExercise}
        onDeleteRoutine={(id) => {
          delRoutine(id)
          setRoutineFormOpen(false)
        }}
      />

      {/* ── Sports config sheet ── */}
      <Modal open={sportsConfigOpen} onClose={() => setSportsConfigOpen(false)} title="Deportes activos" size="md">
        <p className="text-[11px] text-white/30 mb-4">Elige qué deportes practicas y sus campos en el Diario.</p>
        <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {ACTIVITY_TYPES.map(act => {
            const isActive = activeSports.includes(act.type)
            const isExpanded = expandedSport === act.type
            return (
              <div key={act.type} className={`rounded-xl border transition-colors ${isActive ? 'bg-surface-200/50 border-orange-400/20' : 'bg-surface-100/50 border-white/[0.04] opacity-60'}`}>
                <div className="flex items-center gap-3 p-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-orange-400/15 text-orange-400' : 'bg-surface-300 text-white/30'}`}>
                    <act.icon size={17} />
                  </div>
                  <span className="font-medium text-sm flex-1">{act.label}</span>
                  {/* Expand fields button */}
                  {isActive && act.type !== 'gym' && (
                    <button
                      onClick={() => setExpandedSport(isExpanded ? null : act.type)}
                      className="p-1.5 rounded-lg text-white/20 hover:text-white/50 transition-colors"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  {/* Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={isActive} onChange={() => toggleActiveSport(act.type)} />
                    <div className="w-9 h-5 bg-surface-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:bg-orange-400" />
                  </label>
                </div>

                {/* Expanded fields */}
                <AnimatePresence>
                  {isActive && isExpanded && act.type !== 'gym' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2">Campos en Diario</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_FIELDS.map(f => {
                            const activeFields = activityFields[act.type] || []
                            const isSelected = activeFields.includes(f)
                            const isDerived = f === 'pace'
                            return (
                              <label
                                key={f}
                                className={`flex items-center gap-1 text-[11px] font-medium cursor-pointer select-none px-2 py-1 rounded-lg border transition-colors ${isDerived
                                    ? 'bg-surface-300/20 border-white/[0.04] text-white/25 cursor-default'
                                    : isSelected
                                      ? 'bg-orange-400/10 border-orange-400/25 text-orange-400'
                                      : 'bg-surface-300/20 border-white/[0.04] text-white/35 hover:text-white/60'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => !isDerived && toggleActivityField(act.type, f)}
                                  className="hidden"
                                />
                                <span>{FIELD_LABELS[f]}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isActive && act.type === 'gym' && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
                    <p className="text-[11px] text-white/30">Usa tus rutinas y ejercicios para registrar sets.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Modal>

      {/* ── Catalog modal ── */}
      <Modal open={catalogOpen} onClose={() => { setCatalogOpen(false); setEditCat(null); setCatForm({ name: '', muscleGroup: '' }); setCatSearch('') }} title="Catálogo de Ejercicios" size="md">
        
        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            value={catSearch}
            onChange={e => setCatSearch(e.target.value)}
            className="input-field w-full h-12 pl-10 pr-4 bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-medium text-white/90 shadow-inner"
            placeholder="Buscar ejercicio ej. Press banca..."
          />
        </div>

        {/* Grouped list */}
        <div className="max-h-[35vh] overflow-y-auto pr-1 space-y-4 mb-5 hide-scrollbar">
          {catalogGroups.length === 0 ? (
            <div className="text-center py-8">
              <Library size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/25">Sin ejercicios encontrados</p>
            </div>
          ) : (
            catalogGroups.map(g => (
              <div key={g}>
                <div className="sticky top-0 z-10 py-1.5 bg-surface-100/95 backdrop-blur-md">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">{g}</span>
                </div>
                <div className="space-y-1.5 mt-1">
                  {catalogFiltered.filter(c => c.muscleGroup === g).map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-3 bg-surface-200/40 rounded-xl border border-white/[0.03] hover:bg-surface-300/30 transition-colors group">
                      <span className="text-sm font-semibold truncate flex-1 pr-2">{c.name}</span>
                      
                      <div className="flex gap-1.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditCat(c); setCatForm({ name: c.name, muscleGroup: c.muscleGroup, trackingMode: c.trackingMode || 'standard', loadMode: c.loadMode || 'total' }) }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-300/40 hover:bg-surface-300/80 active:bg-accent/20 text-white/50 hover:text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: 'exercise', id: c.id!, name: c.name })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/edit form fixed at bottom */}
        <div className="bg-surface-200/30 border border-white/[0.04] rounded-2xl p-4">
          {editCat ? (
            <div className="flex items-center justify-between mb-3">
               <p className="text-[10px] text-accent uppercase tracking-wider font-bold flex items-center gap-1.5">
                 <Pencil size={12}/> Editando: {editCat.name}
               </p>
               <button onClick={() => { setEditCat(null); setCatForm({ name: '', muscleGroup: '' }) }} className="text-[10px] text-white/30 hover:text-white font-medium">Cancelar</button>
            </div>
          ) : (
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-3 pl-1 flex items-center gap-1.5">
              <Plus size={12}/> Crear Ejercicio
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <input
                value={catForm.name}
                onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                className="input-field w-full h-11 px-3 bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-medium text-sm shadow-inner"
                placeholder="Nombre del Ejercicio"
              />
            </div>
            <div className="[&>select]:h-11 [&>select]:bg-surface-200/50">
              <SheetSelect
                value={catForm.muscleGroup}
                onChange={v => setCatForm(f => ({ ...f, muscleGroup: v }))}
                className="w-full text-sm h-11"
                placeholder="Grupo muscular"
                options={MUSCLE_GROUPS.map(g => ({ value: g, label: g }))}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 grid grid-cols-2 gap-3 [&>select]:h-11 [&>select]:bg-surface-200/50">
              <SheetSelect
                value={catForm.trackingMode || 'standard'}
                onChange={v => setCatForm(f => ({
                  ...f,
                  trackingMode: (v as T.ExerciseTrackingMode) || 'standard',
                  loadMode: (v as T.ExerciseTrackingMode) === 'unilateral' ? 'per_side' : 'total',
                }))}
                className="w-full text-sm h-11"
                placeholder="Registro"
                options={TRACKING_OPTIONS}
              />
              <SheetSelect
                value={catForm.loadMode || (catForm.trackingMode === 'unilateral' ? 'per_side' : 'total')}
                onChange={v => setCatForm(f => ({ ...f, loadMode: (v as T.ExerciseLoadMode) || 'total' }))}
                className="w-full text-sm h-11"
                placeholder="Carga"
                options={(catForm.trackingMode === 'unilateral'
                  ? [{ value: 'per_side', label: 'Peso un lado' }]
                  : [{ value: 'total', label: 'Peso total' }, { value: 'per_hand', label: 'Por mano' }])}
              />
            </div>

            <button
              onClick={saveCatEx}
              disabled={!catForm.name || !catForm.muscleGroup}
              className="w-11 h-11 flex shrink-0 items-center justify-center rounded-xl bg-accent text-back-100 disabled:opacity-50 disabled:bg-surface-300 disabled:text-white/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,165,0,0.15)] disabled:shadow-none"
            >
              {editCat ? <Pencil size={18} /> : <Plus size={20} />}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar eliminar" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-white/50">
              ¿Eliminar <span className="font-semibold text-white/80">{confirmDelete.name}</span>?
              {confirmDelete.type === 'routine' && ' Se eliminarán también sus ejercicios.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={() => confirmDelete.type === 'routine' ? delRoutine(confirmDelete.id) : delCatEx(confirmDelete.id)}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Workout Runner ── */}
      {runnerRoutine && (
        <WorkoutRunner
          open={!!runnerRoutine}
          onClose={() => setRunnerRoutine(null)}
          routine={runnerRoutine}
          routineExercises={exercises.filter(e => e.routineId === runnerRoutine.id).sort((a, b) => a.sortOrder - b.sortOrder)}
          entryDate={new Date().toISOString().split('T')[0]}
          allWorkouts={allWorkouts}
          onComplete={() => {
            setRunnerRoutine(null)
            load()
            showSaved()
          }}
        />
      )}
    </div>
  )
}
