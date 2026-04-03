import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart,
} from 'recharts'
import {
  Moon, BookOpen, Dumbbell, Flame, TrendingUp, Brain,
  Droplets, Smile, ListChecks, MonitorSmartphone,
  GraduationCap, Scale, Trophy, Zap, Calendar, Activity,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { db } from '@/data/db'
import { daysAgo, shortDate, fmtMin } from '@/utils/date'
import { Card } from '@/components/ui/Card'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { useSectionPrefs } from '@/context/SectionPrefsContext'
import { useTheme } from '@/context/ThemeContext'

/* ── color map per section ── */
const SC = {
  mood:       { icon: Smile,              color: 'text-yellow-400',  bg: 'bg-yellow-400/12',  border: 'border-yellow-400/20', hex: '#facc15' },
  habits:     { icon: ListChecks,         color: 'text-accent',      bg: 'bg-accent/12',      border: 'border-accent/20',     hex: '' },
  sleep:      { icon: Moon,               color: 'text-indigo-400',  bg: 'bg-indigo-400/12',  border: 'border-indigo-400/20', hex: '#818cf8' },
  water:      { icon: Droplets,           color: 'text-sky-400',     bg: 'bg-sky-400/12',     border: 'border-sky-400/20',    hex: '#38bdf8' },
  screentime: { icon: MonitorSmartphone,  color: 'text-rose-400',    bg: 'bg-rose-400/12',    border: 'border-rose-400/20',   hex: '#fb7185' },
  study:      { icon: GraduationCap,      color: 'text-cyan-400',    bg: 'bg-cyan-400/12',    border: 'border-cyan-400/20',   hex: '#22d3ee' },
  reading:    { icon: BookOpen,           color: 'text-emerald-400', bg: 'bg-emerald-400/12', border: 'border-emerald-400/20',hex: '#34d399' },
  workout:    { icon: Dumbbell,           color: 'text-orange-400',  bg: 'bg-orange-400/12',  border: 'border-orange-400/20', hex: '#fb923c' },
  meditation: { icon: Brain,              color: 'text-purple-400',  bg: 'bg-purple-400/12',  border: 'border-purple-400/20', hex: '#c084fc' },
  weight:     { icon: Scale,              color: 'text-teal-400',    bg: 'bg-teal-400/12',    border: 'border-teal-400/20',   hex: '#2dd4bf' },
} as const

/* ── types ── */
interface Stats {
  mood: number; moodCount: number
  sleepHours: number; sleepQual: number; sleepCount: number
  habitPct: number
  readDays: number; readPages: number
  workoutDays: number
  studyMin: number
  screenMin: number
  waterAvg: number; waterCount: number
  meditationMin: number; meditationDays: number
  weightStart: number; weightEnd: number; weightCount: number
}

interface Streaks { habits: number; reading: number; sleep: number; exercise: number; meditation: number }

interface ChartPoint { label: string; [k: string]: any }

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function InsightsPage() {
  const { enabled, advanced } = useSectionPrefs()
  const { accentHex } = useTheme()
  const [range, setRange] = useState('30d')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<Stats>({
    mood: 0, moodCount: 0, sleepHours: 0, sleepQual: 0, sleepCount: 0,
    habitPct: 0, readDays: 0, readPages: 0, workoutDays: 0, studyMin: 0,
    screenMin: 0, waterAvg: 0, waterCount: 0, meditationMin: 0, meditationDays: 0,
    weightStart: 0, weightEnd: 0, weightCount: 0,
  })
  const [streaks, setStreaks] = useState<Streaks>({ habits: 0, reading: 0, sleep: 0, exercise: 0, meditation: 0 })
  const [moodData, setMoodData] = useState<ChartPoint[]>([])
  const [habitData, setHabitData] = useState<ChartPoint[]>([])
  const [sleepData, setSleepData] = useState<ChartPoint[]>([])
  const [readData, setReadData] = useState<ChartPoint[]>([])
  const [studyData, setStudyData] = useState<ChartPoint[]>([])
  const [screenData, setScreenData] = useState<ChartPoint[]>([])
  const [bestDay, setBestDay] = useState<{ day: string; score: number } | null>(null)
  const [consistency, setConsistency] = useState(0)

  // Fill accent hex into SC
  const scWithAccent = useMemo(() => ({ ...SC, habits: { ...SC.habits, hex: accentHex } }), [accentHex])

  const load = useCallback(async () => {
    setLoading(true)
    const allH = await db.habits.toArray()
    const activeHabits = allH.filter(h => h.active)
    const days = Math.min(rangeToDays(range), 365)

    // Build date array
    const dates: string[] = []
    for (let i = days - 1; i >= 0; i--) dates.push(daysAgo(i))

    // Parallel fetch all entries for the range
    const [entries, allEntryHabits, allEntryReadings, allEntryWorkouts, allEntryStudy, allEntryAppUsage] = await Promise.all([
      db.dailyEntries.where('date').anyOf(dates).toArray(),
      db.entryHabits.where('entryDate').anyOf(dates).toArray(),
      db.entryReadings.where('entryDate').anyOf(dates).toArray(),
      db.entryWorkouts.where('entryDate').anyOf(dates).toArray(),
      db.entryStudy.where('entryDate').anyOf(dates).toArray(),
      db.entryAppUsage.where('entryDate').anyOf(dates).toArray(),
    ])

    // Index by date for fast lookup
    const entryMap = new Map(entries.map(e => [e.date, e]))
    const habitsByDate = new Map<string, typeof allEntryHabits>()
    for (const h of allEntryHabits) { const arr = habitsByDate.get(h.entryDate) || []; arr.push(h); habitsByDate.set(h.entryDate, arr) }
    const readingsByDate = new Map<string, typeof allEntryReadings>()
    for (const r of allEntryReadings) { const arr = readingsByDate.get(r.entryDate) || []; arr.push(r); readingsByDate.set(r.entryDate, arr) }
    const workoutsByDate = new Map<string, typeof allEntryWorkouts>()
    for (const w of allEntryWorkouts) { const arr = workoutsByDate.get(w.entryDate) || []; arr.push(w); workoutsByDate.set(w.entryDate, arr) }
    const studyByDate = new Map<string, typeof allEntryStudy>()
    for (const s of allEntryStudy) { const arr = studyByDate.get(s.entryDate) || []; arr.push(s); studyByDate.set(s.entryDate, arr) }
    const appByDate = new Map<string, typeof allEntryAppUsage>()
    for (const a of allEntryAppUsage) { const arr = appByDate.get(a.entryDate) || []; arr.push(a); appByDate.set(a.entryDate, arr) }

    // Accumulators
    let moodSum = 0, moodCount = 0
    let sleepHSum = 0, sleepHCount = 0, sleepQSum = 0, sleepQCount = 0
    let habitDoneSum = 0, habitDayCount = 0
    let readDaysCount = 0, readPagesSum = 0
    let workoutDaysCount = 0
    let studyMinSum = 0
    let screenMinSum = 0
    let waterSum = 0, waterCount = 0
    let meditMinSum = 0, meditDaysCount = 0
    let weightFirst = 0, weightLast = 0, weightCount = 0
    let activeDays = 0

    const moodArr: ChartPoint[] = []
    const habArr: ChartPoint[] = []
    const slpArr: ChartPoint[] = []
    const rdArr: ChartPoint[] = []
    const studArr: ChartPoint[] = []
    const scrArr: ChartPoint[] = []

    // Per-weekday scoring
    const dayScores = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))

    for (const dt of dates) {
      const lbl = shortDate(dt)
      const e = entryMap.get(dt)
      const dayHabits = habitsByDate.get(dt) || []
      const dayReads = readingsByDate.get(dt) || []
      const dayWorkouts = workoutsByDate.get(dt) || []
      const dayStudy = studyByDate.get(dt) || []
      const dayApps = appByDate.get(dt) || []

      let dayActive = false
      let dayScore = 0
      let dayMetrics = 0

      // Mood
      if (e?.mood) {
        moodArr.push({ label: lbl, mood: e.mood })
        moodSum += e.mood; moodCount++
        dayScore += (e.mood / 5) * 100; dayMetrics++
        dayActive = true
      }

      // Habits
      const done = dayHabits.filter(h => h.done).length
      habArr.push({ label: lbl, done })
      if (activeHabits.length > 0) {
        habitDoneSum += done; habitDayCount++
        const pct = (done / activeHabits.length) * 100
        dayScore += pct; dayMetrics++
        if (done > 0) dayActive = true
      }

      // Sleep
      if (e?.sleepHours || e?.sleepQuality) {
        slpArr.push({ label: lbl, hours: e.sleepHours || 0, quality: e.sleepQuality || 0 })
        if (e.sleepHours) { sleepHSum += e.sleepHours; sleepHCount++ }
        if (e.sleepQuality) { sleepQSum += e.sleepQuality; sleepQCount++ }
        dayScore += Math.min((e.sleepHours || 0) / 8, 1) * 100; dayMetrics++
        dayActive = true
      }

      // Reading
      const pages = dayReads.reduce((s, r) => s + r.pagesRead, 0)
      const readDone = dayReads.length > 0
      rdArr.push({ label: lbl, pages, done: readDone ? 1 : 0 })
      if (readDone) { readDaysCount++; dayActive = true }
      readPagesSum += pages

      // Workouts
      if (e?.workoutDone || dayWorkouts.length > 0) {
        workoutDaysCount++; dayActive = true
        dayScore += 100; dayMetrics++
      }

      // Study
      const studyMin = dayStudy.reduce((s, x) => s + x.minutes, 0)
      studArr.push({ label: lbl, min: studyMin })
      studyMinSum += studyMin
      if (studyMin > 0) { dayActive = true }

      // Screen time
      const screenMin = dayApps.reduce((s, x) => s + x.minutes, 0) + (e?.screenTimeMinutes || 0)
      scrArr.push({ label: lbl, min: screenMin })
      screenMinSum += screenMin

      // Water
      if (e?.waterMl) { waterSum += e.waterMl; waterCount++; dayActive = true }

      // Meditation
      if (e?.meditationDone || (e?.meditationMinutes && e.meditationMinutes > 0)) {
        meditDaysCount++; dayActive = true
        meditMinSum += e?.meditationMinutes || 0
        dayScore += 100; dayMetrics++
      }

      // Weight
      if (e?.weightKg) {
        if (weightCount === 0) weightFirst = e.weightKg
        weightLast = e.weightKg
        weightCount++
      }

      if (dayActive) activeDays++

      // Per-weekday
      const dow = new Date(`${dt}T12:00:00`).getDay()
      if (dayMetrics > 0) {
        dayScores[dow].total += dayScore / dayMetrics
        dayScores[dow].count++
      }
    }

    // Stats
    const newStats: Stats = {
      mood: moodCount > 0 ? Math.round((moodSum / moodCount) * 10) / 10 : 0,
      moodCount,
      sleepHours: sleepHCount > 0 ? Math.round((sleepHSum / sleepHCount) * 10) / 10 : 0,
      sleepQual: sleepQCount > 0 ? Math.round((sleepQSum / sleepQCount) * 10) / 10 : 0,
      sleepCount: sleepHCount + sleepQCount,
      habitPct: habitDayCount > 0 && activeHabits.length > 0 ? Math.round((habitDoneSum / (habitDayCount * activeHabits.length)) * 100) : 0,
      readDays: readDaysCount,
      readPages: readPagesSum,
      workoutDays: workoutDaysCount,
      studyMin: studyMinSum,
      screenMin: screenMinSum,
      waterAvg: waterCount > 0 ? Math.round(waterSum / waterCount) : 0,
      waterCount,
      meditationMin: meditMinSum,
      meditationDays: meditDaysCount,
      weightStart: weightFirst,
      weightEnd: weightLast,
      weightCount,
    }
    setStats(newStats)

    // Chart data
    setMoodData(moodArr); setHabitData(habArr); setSleepData(slpArr)
    setReadData(rdArr); setStudyData(studArr); setScreenData(scrArr)

    // Consistency
    setConsistency(days > 0 ? Math.round((activeDays / days) * 100) : 0)

    // Best day of the week
    let bestIdx = -1, bestAvg = 0
    for (let i = 0; i < 7; i++) {
      const avg = dayScores[i].count > 0 ? dayScores[i].total / dayScores[i].count : 0
      if (avg > bestAvg) { bestAvg = avg; bestIdx = i }
    }
    setBestDay(bestIdx >= 0 ? { day: DAY_NAMES[bestIdx], score: Math.round(bestAvg) } : null)

    // Streaks (last 365 days from today backwards)
    let hS = 0, rS = 0, sS = 0, eS = 0, mS = 0
    const streakDates: string[] = []
    for (let i = 0; i < 365; i++) streakDates.push(daysAgo(i))

    const [sEntries, sHabits, sReadings, sWorkouts] = await Promise.all([
      db.dailyEntries.where('date').anyOf(streakDates).toArray(),
      db.entryHabits.where('entryDate').anyOf(streakDates).toArray(),
      db.entryReadings.where('entryDate').anyOf(streakDates).toArray(),
      db.entryWorkouts.where('entryDate').anyOf(streakDates).toArray(),
    ])
    const sEntryMap = new Map(sEntries.map(e => [e.date, e]))
    const sHabitMap = new Map<string, typeof sHabits>()
    for (const h of sHabits) { const a = sHabitMap.get(h.entryDate) || []; a.push(h); sHabitMap.set(h.entryDate, a) }
    const sReadMap = new Set<string>()
    for (const r of sReadings) sReadMap.add(r.entryDate)
    const sWorkMap = new Set<string>()
    for (const w of sWorkouts) sWorkMap.add(w.entryDate)

    for (let i = 0; i < 365; i++) {
      const dt = streakDates[i]
      const e = sEntryMap.get(dt)
      const dayH = sHabitMap.get(dt) || []
      if (activeHabits.length > 0 && dayH.filter(h => h.done).length === activeHabits.length && hS === i) hS++
      if (sReadMap.has(dt) && rS === i) rS++
      if ((e?.sleepHours || e?.sleepQuality) && sS === i) sS++
      if ((e?.workoutDone || sWorkMap.has(dt)) && eS === i) eS++
      if ((e?.meditationDone || (e?.meditationMinutes && e.meditationMinutes > 0)) && mS === i) mS++
    }
    setStreaks({ habits: hS, reading: rS, sleep: sS, exercise: eS, meditation: mS })

    setLoading(false)
  }, [range])

  useEffect(() => { load() }, [load])

  // Life Score: weighted average of enabled sections
  const lifeScore = useMemo(() => {
    let total = 0, count = 0
    if (enabled.mood && stats.moodCount > 0)    { total += (stats.mood / 5) * 100; count++ }
    if (enabled.habits && stats.habitPct > 0)    { total += stats.habitPct; count++ }
    if (enabled.sleep && stats.sleepCount > 0)   { total += Math.min(stats.sleepHours / 8, 1) * 100; count++ }
    if (enabled.workout && stats.workoutDays > 0){ total += Math.min(stats.workoutDays / rangeToDays(range) * 3, 1) * 100; count++ }
    if (enabled.meditation && stats.meditationDays > 0) { total += Math.min(stats.meditationDays / rangeToDays(range), 1) * 100; count++ }
    if (consistency > 0) { total += consistency; count++ }
    return count > 0 ? Math.round(total / count) : 0
  }, [stats, enabled, consistency, range])

  const scoreColor = lifeScore >= 75 ? '#34d399' : lifeScore >= 50 ? '#facc15' : lifeScore >= 25 ? '#fb923c' : '#fb7185'

  const tt = useMemo(() => ({
    contentStyle: {
      background: 'rgb(var(--surface-100))',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', fontSize: '12px', color: '#fff',
    },
  }), [])

  const chartInterval = useCallback((data: any[]) =>
    data.length > 14 ? Math.floor(data.length / 6) : 'preserveStartEnd' as const
  , [])

  /* ── build stat cards ── */
  const statCards = useMemo(() => {
    const cards: { key: string; label: string; value: string; sub?: string; icon: any; color: string; bg: string; border: string }[] = []
    if (enabled.mood && stats.moodCount > 0)
      cards.push({ key: 'mood', label: 'Mood promedio', value: `${stats.mood}`, sub: '/5', icon: SC.mood.icon, ...pick(SC.mood) })
    if (enabled.habits && stats.habitPct > 0)
      cards.push({ key: 'habits', label: 'Hábitos', value: `${stats.habitPct}`, sub: '%', icon: SC.habits.icon, color: 'text-accent', bg: 'bg-accent/12', border: 'border-accent/20' })
    if (enabled.sleep && advanced.sleep && stats.sleepHours > 0)
      cards.push({ key: 'sleep', label: 'Sueño prom.', value: `${stats.sleepHours}`, sub: 'h', icon: SC.sleep.icon, ...pick(SC.sleep) })
    if (enabled.sleep && !advanced.sleep && stats.sleepQual > 0)
      cards.push({ key: 'sleepq', label: 'Calidad sueño', value: `${stats.sleepQual}`, sub: '/4', icon: SC.sleep.icon, ...pick(SC.sleep) })
    if (enabled.workout && stats.workoutDays > 0)
      cards.push({ key: 'workout', label: 'Entrenamientos', value: `${stats.workoutDays}`, sub: 'días', icon: SC.workout.icon, ...pick(SC.workout) })
    if (enabled.reading && stats.readDays > 0)
      cards.push({ key: 'read', label: 'Lectura', value: advanced.reading ? `${stats.readPages}` : `${stats.readDays}`, sub: advanced.reading ? 'págs' : 'días', icon: SC.reading.icon, ...pick(SC.reading) })
    if (enabled.study && stats.studyMin > 0)
      cards.push({ key: 'study', label: 'Estudio', value: fmtMin(stats.studyMin), icon: SC.study.icon, ...pick(SC.study) })
    if (enabled.meditation && stats.meditationDays > 0)
      cards.push({ key: 'medit', label: 'Meditación', value: advanced.meditation ? fmtMin(stats.meditationMin) : `${stats.meditationDays}`, sub: advanced.meditation ? undefined : 'días', icon: SC.meditation.icon, ...pick(SC.meditation) })
    if (enabled.water && stats.waterCount > 0)
      cards.push({ key: 'water', label: 'Agua prom.', value: `${stats.waterAvg}`, sub: 'ml', icon: SC.water.icon, ...pick(SC.water) })
    if (enabled.screentime && stats.screenMin > 0)
      cards.push({ key: 'screen', label: 'Pantalla total', value: fmtMin(stats.screenMin), icon: SC.screentime.icon, ...pick(SC.screentime) })
    return cards
  }, [stats, enabled, advanced])

  /* ── streak items ── */
  const streakItems = useMemo(() => {
    const items: { key: string; label: string; value: number; icon: any; color: string; bg: string; border: string }[] = []
    if (enabled.habits)    items.push({ key: 'habits', label: 'Hábitos', value: streaks.habits, icon: Flame, ...pick(SC.habits) })
    if (enabled.reading)   items.push({ key: 'reading', label: 'Lectura', value: streaks.reading, icon: BookOpen, ...pick(SC.reading) })
    if (enabled.sleep)     items.push({ key: 'sleep', label: 'Sueño', value: streaks.sleep, icon: Moon, ...pick(SC.sleep) })
    if (enabled.workout)   items.push({ key: 'workout', label: 'Ejercicio', value: streaks.exercise, icon: Dumbbell, ...pick(SC.workout) })
    if (enabled.meditation) items.push({ key: 'meditation', label: 'Meditación', value: streaks.meditation, icon: Brain, ...pick(SC.meditation) })
    return items
  }, [streaks, enabled])

  /* ── weight insight ── */
  const weightDelta = stats.weightCount >= 2 ? Math.round((stats.weightEnd - stats.weightStart) * 10) / 10 : null

  if (loading) {
    return (
      <div className="max-w-3xl md:max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Insights</h1>
            <p className="text-xs text-white/30 mt-0.5">Cargando datos…</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl md:max-w-5xl mx-auto space-y-4 md:space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)] shrink-0">
            <TrendingUp size={20} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Insights</h1>
            <p className="text-xs text-white/30 mt-0.5">Resumen y tendencias</p>
          </div>
        </div>
      </div>

      <RangeSelector value={range} onChange={setRange} />

      {/* ── Hero: Life Score + Quick Insights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Score ring */}
        <Card className="p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: `radial-gradient(circle at 50% 30%, ${scoreColor}, transparent 70%)` }} />
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-3">Life Score</p>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              <motion.circle
                cx="60" cy="60" r="52" fill="none"
                stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - lifeScore / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: scoreColor }}>{lifeScore}</span>
              <span className="text-[9px] text-white/25 uppercase tracking-wider">de 100</span>
            </div>
          </div>
          <p className="text-[10px] text-white/20 mt-3 text-center">
            Basado en tus métricas activas
          </p>
        </Card>

        {/* Quick insights */}
        <Card className="p-5 flex flex-col gap-3 justify-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-1">Resumen rápido</p>
          <InsightRow icon={Activity} color="text-emerald-400" text={`${consistency}% consistencia`} sub={`${range === 'all' ? '' : `últimos ${range}`}`} />
          {bestDay && <InsightRow icon={Calendar} color="text-sky-400" text={`Mejor día: ${bestDay.day}`} sub={`Score ~${bestDay.score}`} />}
          {weightDelta !== null && (
            <InsightRow
              icon={Scale}
              color={weightDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}
              text={`Peso: ${weightDelta > 0 ? '+' : ''}${weightDelta} kg`}
              sub={`${stats.weightStart} → ${stats.weightEnd} kg`}
            />
          )}
          {enabled.workout && stats.workoutDays > 0 && (
            <InsightRow icon={Zap} color="text-orange-400" text={`${stats.workoutDays} entrenamientos`} sub={`~${Math.round(stats.workoutDays / (rangeToDays(range) / 7))}/semana`} />
          )}
          {enabled.study && stats.studyMin > 0 && (
            <InsightRow icon={GraduationCap} color="text-cyan-400" text={`${fmtMin(stats.studyMin)} de estudio`} sub={`~${fmtMin(Math.round(stats.studyMin / rangeToDays(range)))}/día`} />
          )}
        </Card>
      </div>

      {/* ── Stat Cards Grid ── */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {statCards.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
              className="bg-surface-100/80 border border-white/[0.05] rounded-2xl p-3 flex flex-col items-center gap-1.5"
            >
              <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
                <c.icon size={16} className={c.color} />
              </div>
              <p className="text-lg font-bold leading-tight">
                {c.value}
                {c.sub && <span className="text-[10px] text-white/25 font-normal ml-0.5">{c.sub}</span>}
              </p>
              <p className="text-[9px] text-white/25 uppercase tracking-wide text-center leading-tight">{c.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Streaks ── */}
      {streakItems.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-2 ml-1">Rachas actuales</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {streakItems.map((x, i) => (
              <motion.div
                key={x.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
                className="bg-surface-100/80 border border-white/[0.05] rounded-2xl p-3 flex items-center gap-2.5"
              >
                <div className={`w-8 h-8 rounded-lg ${x.bg} border ${x.border} flex items-center justify-center shrink-0`}>
                  <x.icon size={14} className={x.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">
                    {x.value}<span className="text-[9px] text-white/20 ml-0.5 font-normal">días</span>
                  </p>
                  <p className="text-[9px] text-white/25 leading-tight truncate">{x.label}</p>
                </div>
                {x.value >= 7 && <Trophy size={12} className="text-yellow-500/40 ml-auto shrink-0" />}
                {x.value >= 3 && x.value < 7 && <Flame size={12} className="text-orange-500/40 ml-auto shrink-0" />}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {enabled.mood && moodData.length > 0 && (
          <ChartCard title="Mood" icon={Smile} color={SC.mood} delay={0.05}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={moodData}>
                <defs>
                  <linearGradient id="mG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SC.mood.hex} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SC.mood.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval={chartInterval(moodData)} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Area type="monotone" dataKey="mood" stroke={SC.mood.hex} fill="url(#mG)" strokeWidth={2} dot={{ fill: SC.mood.hex, r: 1.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {enabled.habits && habitData.length > 0 && (
          <ChartCard title="Hábitos" icon={ListChecks} color={{ color: 'text-accent', bg: 'bg-accent/12', border: 'border-accent/20' }} delay={0.1}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={habitData}>
                <defs>
                  <linearGradient id="hbG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentHex} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={accentHex} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval={chartInterval(habitData)} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Bar dataKey="done" fill="url(#hbG)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {enabled.sleep && sleepData.length > 0 && (
          <ChartCard title="Sueño" icon={Moon} color={SC.sleep} delay={0.15}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={sleepData}>
                <defs>
                  <linearGradient id="sG2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SC.sleep.hex} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SC.sleep.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval={chartInterval(sleepData)} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Area type="monotone" dataKey={advanced.sleep ? 'hours' : 'quality'} stroke={SC.sleep.hex} fill="url(#sG2)" strokeWidth={2} dot={{ fill: SC.sleep.hex, r: 1.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {enabled.reading && readData.length > 0 && (
          <ChartCard title="Lectura" icon={BookOpen} color={SC.reading} delay={0.2}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={readData}>
                <defs>
                  <linearGradient id="rdG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SC.reading.hex} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={SC.reading.hex} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval={chartInterval(readData)} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Bar dataKey={advanced.reading ? 'pages' : 'done'} fill="url(#rdG)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {enabled.study && studyData.some(d => d.min > 0) && (
          <ChartCard title="Estudio" icon={GraduationCap} color={SC.study} delay={0.25}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={studyData}>
                <defs>
                  <linearGradient id="stG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SC.study.hex} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={SC.study.hex} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval={chartInterval(studyData)} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} tickFormatter={(v: number) => fmtMin(v)} />
                <Tooltip {...tt} formatter={(v: number) => fmtMin(v)} />
                <Bar dataKey="min" fill="url(#stG)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {enabled.screentime && screenData.some(d => d.min > 0) && (
          <ChartCard title="Pantalla" icon={MonitorSmartphone} color={SC.screentime} delay={0.3}>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={screenData}>
                <defs>
                  <linearGradient id="scG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SC.screentime.hex} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SC.screentime.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval={chartInterval(screenData)} />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={24} tickFormatter={(v: number) => fmtMin(v)} />
                <Tooltip {...tt} formatter={(v: number) => fmtMin(v)} />
                <Area type="monotone" dataKey="min" stroke={SC.screentime.hex} fill="url(#scG)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ── */
function pick(s: { color: string; bg: string; border: string }) {
  return { color: s.color, bg: s.bg, border: s.border }
}

function InsightRow({ icon: Icon, color, text, sub }: { icon: any; color: string; text: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-surface-200/60 flex items-center justify-center shrink-0">
        <Icon size={13} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/80 leading-tight truncate">{text}</p>
        {sub && <p className="text-[9px] text-white/20 leading-tight">{sub}</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, icon: Icon, color, delay, children }: {
  title: string; icon: any; color: { color: string; bg: string; border: string }; delay: number; children: React.ReactNode
}) {
  return (
    <Card delay={delay} className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-lg ${color.bg} border ${color.border} flex items-center justify-center`}>
          <Icon size={12} className={color.color} />
        </div>
        <h3 className="text-xs font-semibold text-white/40">{title}</h3>
      </div>
      {children}
    </Card>
  )
}
