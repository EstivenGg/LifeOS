import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Rows3, Columns3, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '@/data/db'
import { today, addDays, displayDate } from '@/utils/date'
import { showSaved } from '@/utils/toast'
import { isAndroid, checkUsageAccess, openUsageAccessSettings, getUsageByApps, getInstalledApps } from '@/services/screentime'
import { useDebounce } from '@/hooks/useDebounce'
import { Card } from '@/components/ui/Card'
import { SECTION_DEFS, useSectionPrefs, SectionId } from '@/context/SectionPrefsContext'
import type * as T from '@/data/types'

import { MoodSection }        from './sections/MoodSection'
import { HabitsSection }      from './sections/HabitsSection'
import { SleepSection, SLEEP_QUALITY } from './sections/SleepSection'
import { MeditationSection }  from './sections/MeditationSection'
import { WeightSection }      from './sections/WeightSection'
import { WaterSection }       from './sections/WaterSection'
import { StudySection }       from './sections/StudySection'
import { ScreenTimeSection }  from './sections/ScreenTimeSection'
import { ReadingSection }     from './sections/ReadingSection'
import { WorkoutSection }     from './sections/WorkoutSection'

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYLOG_TOP_LEVEL_SECTIONS: SectionId[] = [
  'mood', 'habits', 'sleep', 'meditation', 'weight', 'water',
  'study', 'screentime', 'reading', 'workout',
]
const DAYLOG_VIEW_KEY = 'lifeos-daylog-view'

const MOOD_LABELS: Record<number, string> = {
  1: 'Muy mal', 2: 'Mal', 3: 'Normal', 4: 'Bien', 5: 'Excelente',
}

const SECTION_TONES: Record<SectionId, { icon: string; surface: string }> = {
  mood:       { icon: 'text-yellow-300',  surface: 'bg-yellow-400/10'  },
  habits:     { icon: 'text-accent',      surface: 'bg-accent/10'       },
  sleep:      { icon: 'text-indigo-300',  surface: 'bg-indigo-400/10'  },
  water:      { icon: 'text-sky-300',     surface: 'bg-sky-400/10'     },
  screentime: { icon: 'text-pink-300',    surface: 'bg-pink-400/10'    },
  study:      { icon: 'text-blue-300',    surface: 'bg-blue-400/10'    },
  reading:    { icon: 'text-emerald-300', surface: 'bg-emerald-400/10' },
  workout:    { icon: 'text-orange-300',  surface: 'bg-orange-400/10'  },
  pomodoro:   { icon: 'text-rose-300',    surface: 'bg-rose-400/10'    },
  meditation: { icon: 'text-violet-300',  surface: 'bg-violet-400/10'  },
  weight:     { icon: 'text-amber-300',   surface: 'bg-amber-400/10'   },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcSleepHours(bed?: string, wake?: string): number | undefined {
  if (!bed || !wake) return undefined
  const [bh, bm] = bed.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  let bedMin = bh * 60 + bm
  let wakeMin = wh * 60 + wm
  if (wakeMin <= bedMin) wakeMin += 1440
  return Math.round(((wakeMin - bedMin) / 60) * 10) / 10
}

function formatCompactMinutes(value?: number) {
  if (!value) return '0 min'
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

function formatWaterMl(value?: number) {
  if (!value) return '0 L'
  const liters = value / 1000
  return Number.isInteger(liters) ? `${liters} L` : `${liters.toFixed(1)} L`
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DayLog() {
  const { date: paramDate } = useParams()
  const navigate = useNavigate()
  const { enabled, advanced, activityFields, activeSports, dashboardOrder } = useSectionPrefs()
  const [date, setDate] = useState(paramDate || today())
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'vertical' | 'horizontal'>(() => {
    try {
      const v = localStorage.getItem(DAYLOG_VIEW_KEY)
      return v === 'horizontal' ? 'horizontal' : 'vertical'
    } catch { return 'vertical' }
  })
  const [activeIndex, setActiveIndex] = useState(0)

  const [entry, setEntry] = useState<T.DailyEntry>({ date })
  const [habits, setHabits] = useState<T.Habit[]>([])
  const [categories, setCategories] = useState<T.HabitCategory[]>([])
  const [entryHabits, setEntryHabits] = useState<T.EntryHabit[]>([])
  const [books, setBooks] = useState<T.Book[]>([])
  const [entryReadings, setEntryReadings] = useState<T.EntryReading[]>([])
  const [routines, setRoutines] = useState<T.Routine[]>([])
  const [routineExercises, setRoutineExercises] = useState<T.RoutineExercise[]>([])
  const [entryWorkouts, setEntryWorkouts] = useState<T.EntryWorkout[]>([])
  const [apps, setApps] = useState<T.AppCatalog[]>([])
  const [appUsages, setAppUsages] = useState<T.EntryAppUsage[]>([])
  const [platforms, setPlatforms] = useState<T.StudyPlatform[]>([])
  const [entryStudies, setEntryStudies] = useState<T.EntryStudy[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => { loadDay(date) }, [date])

  async function loadDay(d: string) {
    const e = await db.dailyEntries.get(d)
    setEntry(e || { date: d })
    setCategories(await db.habitCategories.orderBy('sortOrder').toArray())
    const all = await db.habits.toArray()
    setHabits(all.filter(h => h.active).sort((a, b) => a.sortOrder - b.sortOrder))
    setEntryHabits(await db.entryHabits.where('entryDate').equals(d).toArray())
    setBooks(await db.books.toArray())
    setEntryReadings(await db.entryReadings.where('entryDate').equals(d).toArray())
    setRoutines(await db.routines.toArray())
    setRoutineExercises(await db.routineExercises.toArray())
    const rawWorkouts = await db.entryWorkouts.where('entryDate').equals(d).toArray()
    const migrated = rawWorkouts.map(w => ({
      ...w,
      exercises: w.exercises.map((ex: any) => {
        if (Array.isArray(ex.sets)) return ex
        const numSets = typeof ex.sets === 'number' ? ex.sets : 3
        return {
          exerciseCatalogId: ex.exerciseCatalogId,
          exerciseName: ex.exerciseName,
          sets: Array.from({ length: numSets }, () => ({ reps: ex.reps || 10, weight: ex.weight, rpe: ex.rpe }))
        }
      })
    }))
    setEntryWorkouts(migrated)
    setApps(await db.appCatalog.toArray())
    setAppUsages(await db.entryAppUsage.where('entryDate').equals(d).toArray())
    setPlatforms(await db.studyPlatforms.toArray())
    setEntryStudies(await db.entryStudy.where('entryDate').equals(d).toArray())
  }

  const saveEntry = useDebounce(async (u: T.DailyEntry) => { await db.dailyEntries.put(u); showSaved() }, 400)
  function upd(p: Partial<T.DailyEntry>) { const u = { ...entry, ...p, date }; setEntry(u); saveEntry(u) }

  function getIsAdv(id: SectionId) {
    if (entry.advancedOverrides && entry.advancedOverrides[id] !== undefined) {
      return entry.advancedOverrides[id]
    }
    return advanced[id]
  }

  function toggleAdvancedDaily(id: SectionId) {
    upd({ advancedOverrides: { ...(entry.advancedOverrides || {}), [id]: !getIsAdv(id) } })
  }

  function updSleepTime(field: 'sleepBedtime' | 'sleepWakeTime', val: string | undefined) {
    const newEntry = { ...entry, [field]: val, date }
    const bed  = field === 'sleepBedtime'  ? val : entry.sleepBedtime
    const wake = field === 'sleepWakeTime' ? val : entry.sleepWakeTime
    const auto = calcSleepHours(bed, wake)
    if (auto !== undefined) newEntry.sleepHours = auto
    setEntry(newEntry); saveEntry(newEntry)
  }

  // ── Habits ──────────────────────────────────────────────────────────────────
  async function toggleHabit(habitId: number) {
    const ex = entryHabits.find(h => h.habitId === habitId)
    if (ex) {
      const d = !ex.done
      await db.entryHabits.update(ex.id!, { done: d })
      setEntryHabits(p => p.map(h => h.id === ex.id ? { ...h, done: d } : h))
    } else {
      const id = await db.entryHabits.add({ entryDate: date, habitId, done: true })
      setEntryHabits(p => [...p, { id: id as number, entryDate: date, habitId, done: true }])
    }
    showSaved()
  }

  // ── Reading ─────────────────────────────────────────────────────────────────
  async function addReading(bookId: number) {
    if (entryReadings.find(r => r.bookId === bookId)) return
    const id = await db.entryReadings.add({ entryDate: date, bookId, pagesRead: 0 })
    setEntryReadings(p => [...p, { id: id as number, entryDate: date, bookId, pagesRead: 0 }])
    showSaved()
  }
  const saveReading = useDebounce(async (r: T.EntryReading) => { await db.entryReadings.update(r.id!, { pagesRead: r.pagesRead, note: r.note }); showSaved() }, 400)
  function updReading(id: number, patch: Partial<T.EntryReading>) {
    setEntryReadings(p => p.map(r => { if (r.id === id) { const u = { ...r, ...patch }; saveReading(u); return u } return r }))
  }
  async function rmReading(id: number) { await db.entryReadings.delete(id); setEntryReadings(p => p.filter(r => r.id !== id)); showSaved() }

  // ── Workouts ─────────────────────────────────────────────────────────────────
  async function startWorkout(routineId: number) {
    if (entryWorkouts.find(w => w.routineId === routineId)) return
    const exs = routineExercises.filter(e => e.routineId === routineId).sort((a, b) => a.sortOrder - b.sortOrder)
    const exercises: T.EntryWorkoutExercise[] = exs.map(e => ({
      exerciseCatalogId: e.exerciseCatalogId,
      exerciseName: e.name,
      sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }]
    }))
    const id = await db.entryWorkouts.add({ entryDate: date, routineId, type: 'gym', exercises })
    setEntryWorkouts(p => [...p, { id: id as number, entryDate: date, routineId, type: 'gym', exercises }])
    showSaved()
  }

  async function startGenericActivity(type: T.PhysicalActivityType, label: string) {
    const trackedFields = activityFields[type] || []
    const id = await db.entryWorkouts.add({ entryDate: date, type, title: label, exercises: [], trackedFields })
    setEntryWorkouts(p => [...p, { id: id as number, entryDate: date, type, title: label, exercises: [], trackedFields }])
    showSaved()
  }

  const saveWk = useDebounce(async (w: T.EntryWorkout) => { await db.entryWorkouts.put(w); showSaved() }, 400)
  function updGenericWk(id: number, patch: Partial<T.EntryWorkout>) {
    setEntryWorkouts(p => p.map(w => { if (w.id === id) { const u = { ...w, ...patch }; saveWk(u); return u } return w }))
  }
  function updSet(wid: number, exIdx: number, setIdx: number, patch: Partial<T.WorkoutSetEntry>) {
    setEntryWorkouts(p => p.map(w => {
      if (w.id !== wid) return w
      const exercises = w.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex
        return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, ...patch } : s) }
      })
      const u = { ...w, exercises }; saveWk(u); return u
    }))
  }
  function addSet(wid: number, exIdx: number) {
    setEntryWorkouts(p => p.map(w => {
      if (w.id !== wid) return w
      const exercises = w.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex
        const lastSet = ex.sets[ex.sets.length - 1] || { reps: 10 }
        return { ...ex, sets: [...ex.sets, { ...lastSet }] }
      })
      const u = { ...w, exercises }; saveWk(u); return u
    }))
  }
  function rmSet(wid: number, exIdx: number, setIdx: number) {
    setEntryWorkouts(p => p.map(w => {
      if (w.id !== wid) return w
      const exercises = w.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex
        return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
      })
      const u = { ...w, exercises }; saveWk(u); return u
    }))
  }
  async function rmWk(id: number) { await db.entryWorkouts.delete(id); setEntryWorkouts(p => p.filter(w => w.id !== id)); showSaved() }

  // ── Apps ─────────────────────────────────────────────────────────────────────
  const saveApp = useDebounce(async (u: T.EntryAppUsage) => { await db.entryAppUsage.update(u.id!, { minutes: u.minutes }); showSaved() }, 400)
  function updApp(id: number, min: number) { setAppUsages(p => p.map(a => { if (a.id === id) { const u = { ...a, minutes: min }; saveApp(u); return u } return a })) }
  async function rmApp(id: number) { await db.entryAppUsage.delete(id); setAppUsages(p => p.filter(a => a.id !== id)); showSaved() }

  // ── Screen time import ────────────────────────────────────────────────────
  async function importTodayScreenTime(silent = false) {
    if (!isAndroid) { if (!silent) toast.error('Solo disponible en Android'); return }
    setImporting(true)
    try {
      const granted = await checkUsageAccess()
      if (!granted) {
        if (!silent) {
          toast('Activa el permiso:\nAjustes → Acceso a datos de uso → LifeOS', { icon: '🔒', duration: 6000 })
          await openUsageAccessSettings()
        }
        setImporting(false); return
      }
      const from = new Date(); from.setHours(0, 0, 0, 0)
      const usageData = await getUsageByApps(from, new Date())
      const todayEntries = usageData.filter(e => e.dateKey === date)
      if (todayEntries.length === 0) { if (!silent) toast('Sin datos de uso para hoy', { icon: 'ℹ️' }); setImporting(false); return }
      const installed = await getInstalledApps()
      const labelMap: Record<string, string> = {}
      installed.forEach(a => { labelMap[a.packageName] = a.label })
      const allCatalog = await db.appCatalog.toArray()
      const catalogByPkg: Record<string, T.AppCatalog> = {}
      allCatalog.forEach(a => { if (a.packageName) catalogByPkg[a.packageName] = a })
      let totalMs = 0
      for (const e of todayEntries) {
        totalMs += e.totalMs
        const label = labelMap[e.packageName] || e.packageName.split('.').pop() || e.packageName
        let cat = catalogByPkg[e.packageName]
        if (cat) {
          const freshLabel = labelMap[e.packageName]
          if (freshLabel && freshLabel !== cat.name) { await db.appCatalog.update(cat.id!, { name: freshLabel }); cat = { ...cat, name: freshLabel }; catalogByPkg[e.packageName] = cat }
        } else {
          const newId = await db.appCatalog.add({ name: label, icon: '📱', category: 'Importado', packageName: e.packageName } as T.AppCatalog)
          cat = { id: newId as number, name: label, icon: '📱', category: 'Importado', packageName: e.packageName }
          catalogByPkg[e.packageName] = cat
        }
        const existing = await db.entryAppUsage.where('entryDate').equals(date).and((u: T.EntryAppUsage) => u.appId === cat!.id!).first()
        if (existing) await db.entryAppUsage.update(existing.id!, { minutes: e.totalMinutes })
        else await db.entryAppUsage.add({ entryDate: date, appId: cat.id!, minutes: e.totalMinutes })
      }
      const totalMin = Math.round(totalMs / 60_000)
      const updated = { ...entry, screenTimeMinutes: totalMin, date }
      await db.dailyEntries.put(updated)
      if (!silent) toast.success(`Importado: ${Math.floor(totalMin / 60)}h ${totalMin % 60}m en pantalla`)
      loadDay(date)
    } catch (err) { console.error(err); if (!silent) toast.error('Error al importar datos') }
    finally { setImporting(false) }
  }

  useEffect(() => {
    if (enabled.screentime && isAndroid && date === today()) {
      importTodayScreenTime(true)
    }
  }, [date, enabled.screentime, isAndroid])

  // ── Study ──────────────────────────────────────────────────────────────────
  async function addStudy() {
    const id = await db.entryStudy.add({ entryDate: date, topic: '', minutes: 0 })
    setEntryStudies(p => [...p, { id: id as number, entryDate: date, topic: '', minutes: 0 }]); showSaved()
  }
  if (!entry) return null
  async function addStudyBasic() {
    if (entryStudies.length > 0) {
      for (const s of entryStudies) await db.entryStudy.delete(s.id!)
      setEntryStudies([]); showSaved()
    } else { await addStudy() }
  }
  const saveStudy = useDebounce(async (s: T.EntryStudy) => { await db.entryStudy.update(s.id!, { topic: s.topic, platformId: s.platformId, course: s.course, minutes: s.minutes, note: s.note }); showSaved() }, 400)
  function updStudy(id: number, patch: Partial<T.EntryStudy>) {
    setEntryStudies(p => p.map(s => { if (s.id === id) { const u = { ...s, ...patch }; saveStudy(u); return u } return s }))
  }
  async function rmStudy(id: number) { await db.entryStudy.delete(id); setEntryStudies(p => p.filter(s => s.id !== id)); showSaved() }

  function goDate(o: number) { const n = addDays(date, o); setDate(n); navigate(`/daylog/${n}`, { replace: true }) }

  // ── Derived state ──────────────────────────────────────────────────────────
  const doneCount = entryHabits.filter(e => e.done).length
  const sortedApps = [...appUsages].sort((a, b) => b.minutes - a.minutes)
  const meditationDone = !!(entry.meditationDone || (entry.meditationMinutes ?? 0) > 0)
  const workoutDone = !!(entry.workoutDone || entryWorkouts.length > 0)
  const studyDone = entryStudies.length > 0

  const platformOptions = useMemo(
    () => platforms
      .filter((p): p is T.StudyPlatform & { id: number } => typeof p.id === 'number')
      .map(p => ({
        value: String(p.id),
        label: p.name,
        icon: p.icon ? <span aria-hidden="true">{p.icon}</span> : undefined,
      })),
    [platforms],
  )

  const totalStudyMinutes  = entryStudies.reduce((sum, s) => sum + (s.minutes || 0), 0)
  const totalReadingPages  = entryReadings.reduce((sum, r) => sum + (r.pagesRead || 0), 0)
  const totalScreenMinutes = entry.screenTimeMinutes ?? appUsages.reduce((sum, u) => sum + (u.minutes || 0), 0)

  const orderedDaylogSections = useMemo(() => {
    const preferred = dashboardOrder.filter((id): id is SectionId =>
      DAYLOG_TOP_LEVEL_SECTIONS.includes(id as SectionId),
    )
    const merged = [...preferred, ...DAYLOG_TOP_LEVEL_SECTIONS]
    return merged.filter((id, index) => merged.indexOf(id) === index && enabled[id])
  }, [dashboardOrder, enabled])

  const sectionSnapshots = useMemo(() => (
    orderedDaylogSections.map(id => {
      const def = SECTION_DEFS.find(s => s.id === id)!
      switch (id) {
        case 'mood':
          return { id, label: def.label, icon: def.icon, summary: entry.mood ? MOOD_LABELS[entry.mood] || `${entry.mood}/5` : entry.note?.trim() ? 'Con nota' : 'Sin datos', filled: !!(entry.mood || entry.note?.trim()) }
        case 'habits':
          return { id, label: def.label, icon: def.icon, summary: habits.length > 0 ? `${doneCount}/${habits.length} hechos` : 'Sin habitos', filled: entryHabits.length > 0 }
        case 'sleep': {
          const sleepQualityLabel = entry.sleepQuality ? SLEEP_QUALITY.find(o => o.v === entry.sleepQuality)?.label : undefined
          const filled = !!(entry.sleepQuality || entry.sleepHours || entry.sleepBedtime || entry.sleepWakeTime)
          return { id, label: def.label, icon: def.icon, summary: entry.sleepHours ? `${entry.sleepHours}h` : sleepQualityLabel ?? 'Sin datos', filled }
        }
        case 'meditation':
          return { id, label: def.label, icon: def.icon, summary: meditationDone ? (entry.meditationMinutes ? `${entry.meditationMinutes} min` : 'Hecho') : 'Sin datos', filled: meditationDone }
        case 'weight':
          return { id, label: def.label, icon: def.icon, summary: entry.weightKg !== undefined ? `${entry.weightKg} kg` : 'Sin datos', filled: entry.weightKg !== undefined }
        case 'water':
          return { id, label: def.label, icon: def.icon, summary: formatWaterMl(entry.waterMl), filled: (entry.waterMl ?? 0) > 0 }
        case 'study':
          return { id, label: def.label, icon: def.icon, summary: totalStudyMinutes > 0 ? formatCompactMinutes(totalStudyMinutes) : studyDone ? `${entryStudies.length} sesion${entryStudies.length === 1 ? '' : 'es'}` : 'Sin datos', filled: studyDone }
        case 'screentime':
          return { id, label: def.label, icon: def.icon, summary: totalScreenMinutes > 0 ? formatCompactMinutes(totalScreenMinutes) : appUsages.length > 0 ? `${appUsages.length} apps` : 'Sin datos', filled: totalScreenMinutes > 0 || appUsages.length > 0 }
        case 'reading':
          return { id, label: def.label, icon: def.icon, summary: totalReadingPages > 0 ? `${totalReadingPages} pags` : entryReadings.length > 0 ? `${entryReadings.length} libro${entryReadings.length === 1 ? '' : 's'}` : 'Sin datos', filled: entryReadings.length > 0 }
        case 'workout':
          return { id, label: def.label, icon: def.icon, summary: entryWorkouts.length > 0 ? `${entryWorkouts.length} sesion${entryWorkouts.length === 1 ? '' : 'es'}` : workoutDone ? 'Marcado' : 'Sin datos', filled: workoutDone }
        default:
          return { id, label: def.label, icon: def.icon, summary: 'Sin datos', filled: false }
      }
    })
  ), [
    orderedDaylogSections,
    entry.mood, entry.note, entryHabits.length, habits.length, doneCount,
    entry.sleepQuality, entry.sleepHours, entry.sleepBedtime, entry.sleepWakeTime,
    meditationDone, entry.weightKg, entry.waterMl,
    totalStudyMinutes, studyDone, entryStudies.length,
    totalScreenMinutes, appUsages.length,
    totalReadingPages, entryReadings.length,
    entryWorkouts.length, workoutDone,
  ])

  const filledSections   = sectionSnapshots.filter(s => s.filled).length
  const progressPercent  = orderedDaylogSections.length > 0 ? (filledSections / orderedDaylogSections.length) * 100 : 0
  const isHorizontal     = viewMode === 'horizontal'

  useEffect(() => { try { localStorage.setItem(DAYLOG_VIEW_KEY, viewMode) } catch {} }, [viewMode])

  useEffect(() => {
    if (!isHorizontal) return
    const node = containerRef.current
    if (!node) return
    const onScroll = () => setActiveIndex(Math.round(node.scrollLeft / node.clientWidth))
    onScroll()
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [isHorizontal, orderedDaylogSections, date])

  useEffect(() => {
    if (isHorizontal) { setActiveIndex(0); containerRef.current?.scrollTo({ left: 0 }) }
  }, [date])

  function goToSection(idx: number) {
    containerRef.current?.scrollTo({ left: idx * (containerRef.current.clientWidth), behavior: 'smooth' })
  }

  function sectionClass(_id: SectionId, wide = false) {
    if (isHorizontal) return 'snap-center shrink-0 w-full px-2 sm:px-4 flex flex-col justify-start h-full'
    return `scroll-mt-24${wide ? ' md:col-span-2' : ''}`
  }

  function sectionStyle(id: SectionId): React.CSSProperties {
    return { order: orderedDaylogSections.indexOf(id) }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`max-w-5xl mx-auto ${isHorizontal ? 'pb-0' : 'pb-12'}`}>

      {/* Header */}
      <div className="mb-6 px-1">
        <div className="flex items-center justify-between mb-5 mt-2">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => goDate(-1)} className="w-10 h-10 rounded-full bg-surface-200/50 flex items-center justify-center text-white/50 hover:text-white hover:bg-surface-200 border border-white/[0.04] transition-all shadow-sm backdrop-blur-md">
                <ChevronLeft size={18} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => goDate(1)} className="w-10 h-10 rounded-full bg-surface-200/50 flex items-center justify-center text-white/50 hover:text-white hover:bg-surface-200 border border-white/[0.04] transition-all shadow-sm backdrop-blur-md">
                <ChevronRight size={18} />
              </motion.button>
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent/80 font-bold mb-0.5">Daylog</p>
              <h1 className="text-xl sm:text-2xl font-black capitalize tracking-tight text-white/95 truncate max-w-[170px] sm:max-w-xs">
                {displayDate(date)}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {date !== today() && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setDate(today()); navigate('/daylog', { replace: true }) }} className="px-3 py-1.5 rounded-full text-xs font-bold text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all shadow-sm">
                Hoy
              </motion.button>
            )}
            <div className="flex items-center rounded-xl bg-surface-200/60 p-1 gap-1 border border-white/[0.04] shadow-inner backdrop-blur-md">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setViewMode('vertical')} className={`p-2 rounded-lg transition-all ${!isHorizontal ? 'bg-surface-100/90 text-white shadow-md border border-white/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                <Rows3 size={16} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setViewMode('horizontal')} className={`p-2 rounded-lg transition-all ${isHorizontal ? 'bg-surface-100/90 text-white shadow-md border border-white/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                <Columns3 size={16} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-1 mb-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
            <span className="flex items-center gap-1.5 text-white/60">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Progreso
            </span>
            <span className="text-white/80 tabular-nums">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-300/40 relative overflow-hidden border border-white/5 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-[800ms] ease-out relative" style={{ width: `${progressPercent}%` }}>
              <div className="absolute inset-0 bg-white/20 w-8 blur-md transform -skew-x-12 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      {orderedDaylogSections.length === 0 ? (
        <Card className="text-center rounded-3xl border border-white/5">
          <p className="text-sm text-white/55">No hay secciones activas en el DayLog.</p>
          <p className="text-xs text-white/35 mt-1">Activa alguna desde la personalización de secciones.</p>
        </Card>
      ) : (
        <>
          <div
            ref={containerRef}
            className={isHorizontal
              ? 'flex overflow-x-auto snap-x snap-mandatory premium-wheel-scroll disable-scrollbars scroll-smooth items-stretch h-[calc(100svh-280px)] min-h-[360px]'
              : 'grid grid-cols-1 md:grid-cols-2 gap-5 px-1'
            }
          >
            {enabled.mood && (
              <section id="daylog-section-mood" data-daylog-section="mood" className={sectionClass('mood', true)} style={sectionStyle('mood')}>
                <MoodSection entry={entry} isHorizontal={isHorizontal} onUpdate={upd} />
              </section>
            )}

            {enabled.habits && (
              <section id="daylog-section-habits" data-daylog-section="habits" className={sectionClass('habits')} style={sectionStyle('habits')}>
                <HabitsSection
                  habits={habits} categories={categories} entryHabits={entryHabits}
                  doneCount={doneCount} isHorizontal={isHorizontal}
                  onToggle={toggleHabit} onNavigateToHabits={() => navigate('/habits')}
                />
              </section>
            )}

            {enabled.sleep && (
              <section id="daylog-section-sleep" data-daylog-section="sleep" className={sectionClass('sleep')} style={sectionStyle('sleep')}>
                <SleepSection
                  entry={entry} isAdv={getIsAdv('sleep')} isHorizontal={isHorizontal}
                  onToggleAdv={() => toggleAdvancedDaily('sleep')}
                  onUpdate={upd} onUpdateSleepTime={updSleepTime}
                />
              </section>
            )}

            {enabled.meditation && (
              <section id="daylog-section-meditation" data-daylog-section="meditation" className={sectionClass('meditation')} style={sectionStyle('meditation')}>
                <MeditationSection
                  entry={entry} isAdv={getIsAdv('meditation')} isHorizontal={isHorizontal}
                  meditationDone={meditationDone}
                  onToggleAdv={() => toggleAdvancedDaily('meditation')} onUpdate={upd}
                />
              </section>
            )}

            {enabled.weight && (
              <section id="daylog-section-weight" data-daylog-section="weight" className={sectionClass('weight')} style={sectionStyle('weight')}>
                <WeightSection entry={entry} isHorizontal={isHorizontal} onUpdate={upd} />
              </section>
            )}

            {enabled.water && (
              <section id="daylog-section-water" data-daylog-section="water" className={sectionClass('water', true)} style={sectionStyle('water')}>
                <WaterSection entry={entry} isHorizontal={isHorizontal} onUpdate={upd} />
              </section>
            )}

            {enabled.study && (
              <section id="daylog-section-study" data-daylog-section="study" className={sectionClass('study', true)} style={sectionStyle('study')}>
                <StudySection
                  isAdv={getIsAdv('study')} isHorizontal={isHorizontal}
                  entryStudies={entryStudies} platformOptions={platformOptions}
                  totalStudyMinutes={totalStudyMinutes} studyDone={studyDone}
                  onToggleAdv={() => toggleAdvancedDaily('study')}
                  onAdd={addStudy} onAddBasic={addStudyBasic}
                  onUpdate={updStudy} onRemove={rmStudy}
                />
              </section>
            )}

            {enabled.screentime && (
              <section id="daylog-section-screentime" data-daylog-section="screentime" className={sectionClass('screentime', true)} style={sectionStyle('screentime')}>
                <ScreenTimeSection
                  entry={entry} isHorizontal={isHorizontal}
                  apps={apps} sortedApps={sortedApps}
                  importing={importing} isToday={date === today()}
                  onImport={() => importTodayScreenTime(false)}
                />
              </section>
            )}

            {enabled.reading && (
              <section id="daylog-section-reading" data-daylog-section="reading" className={sectionClass('reading')} style={sectionStyle('reading')}>
                <ReadingSection
                  isAdv={getIsAdv('reading')} isHorizontal={isHorizontal}
                  books={books} entryReadings={entryReadings} totalReadingPages={totalReadingPages}
                  onToggleAdv={() => toggleAdvancedDaily('reading')}
                  onAdd={addReading} onUpdate={updReading} onRemove={rmReading}
                  onNavigateToBooks={() => navigate('/books')}
                />
              </section>
            )}

            {enabled.workout && (
              <section id="daylog-section-workout" data-daylog-section="workout" className={sectionClass('workout')} style={sectionStyle('workout')}>
                <WorkoutSection
                  entry={entry} isAdv={getIsAdv('workout')} isHorizontal={isHorizontal}
                  entryWorkouts={entryWorkouts} routines={routines}
                  activityFields={activityFields} activeSports={activeSports as T.PhysicalActivityType[]} workoutDone={workoutDone}
                  onToggleAdv={() => toggleAdvancedDaily('workout')} onUpdate={upd}
                  onStartWorkout={startWorkout} onStartGeneric={startGenericActivity}
                  onUpdGenericWk={updGenericWk} onUpdSet={updSet} onAddSet={addSet}
                  onRmSet={rmSet} onRmWk={rmWk}
                />
              </section>
            )}
          </div>

          {/* Horizontal bottom dock */}
          {isHorizontal && orderedDaylogSections.length > 0 && (
            <div className="fixed bottom-[96px] left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="pointer-events-auto max-w-full overflow-x-auto hide-scrollbar flex items-center gap-1.5 p-1.5 rounded-[24px] bg-surface-100/70 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5"
              >
                {sectionSnapshots.map((section, idx) => {
                  const Icon = section.icon
                  const tone = SECTION_TONES[section.id]
                  const isActive = activeIndex === idx
                  return (
                    <motion.button
                      key={section.id}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => goToSection(idx)}
                      className={`relative flex flex-col items-center justify-center shrink-0 w-[48px] h-[48px] rounded-[18px] transition-all duration-300 ${isActive ? 'bg-white/10 shadow-sm border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                      <Icon
                        size={isActive ? 22 : 18}
                        className={`transition-all duration-300 ${isActive ? 'text-white' : section.filled ? tone.icon : 'text-white/30'}`}
                      />
                      {section.filled && !isActive && (
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-surface-100" />
                      )}
                      {isActive && (
                        <div className="absolute -bottom-0.5 w-3 h-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                      )}
                    </motion.button>
                  )
                })}
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
