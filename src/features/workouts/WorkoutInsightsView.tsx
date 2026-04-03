import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { Card, EmptyState } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Activity, Dumbbell, Flame, Target, CalendarDays, TrendingUp, PieChart as PieIcon, Library, Search, Sparkles } from 'lucide-react'
import type { EntryWorkout, ExerciseCatalog, Routine } from '@/data/types'
import { parseDate, formatDate, today, isDateString } from '@/utils/date'
import { getSetTotalReps, getSetVolume } from '@/utils/workoutMetrics'
import { useWeightUnit } from '@/context/SectionPrefsContext'
import { ExerciseInsightPanel } from './ExerciseInsightPanel'
import { WorkoutAutoInsights } from './WorkoutAutoInsights'

type TabId = 'weeks' | 'exercises' | 'routines' | 'muscles' | 'exercise'
type WeekMetric = 'sets' | 'volume' | 'sessions'
type DateRange = '30d' | '90d' | '6m' | 'all'

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '6m', label: '6m' },
  { key: 'all', label: 'Todo' },
]

const tt = {
  contentStyle: {
    background: '#1c1c26',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
  },
}

function getRangeCutoff(range: DateRange) {
  if (range === 'all') return null
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 182
  const cutoff = parseDate(today())
  cutoff.setDate(cutoff.getDate() - days)
  return formatDate(cutoff)
}

function getWeekStart(dateStr: string) {
  const d = parseDate(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return formatDate(d)
}

function formatWeekRange(weekStartStr: string) {
  const start = parseDate(weekStartStr)
  const end = parseDate(weekStartStr)
  end.setDate(end.getDate() + 6)

  const startLabel = start.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  return `${startLabel} - ${endLabel}`
}

interface Props {
  weekSets: { label: string; sets: number }[]
  allWorkouts: EntryWorkout[]
  catalog: ExerciseCatalog[]
  routines: Routine[]
  dailyEntries: import('@/data/types').DailyEntry[]
}

export function WorkoutInsightsView({ allWorkouts, catalog, routines, dailyEntries }: Props) {
  const { unit, kgToDisplay } = useWeightUnit()
  const [chartTab, setChartTab] = useState<TabId>('weeks')
  const [weekMetric, setWeekMetric] = useState<WeekMetric>('sets')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [insightsOpen, setInsightsOpen] = useState(false)
  const datedWorkouts = useMemo(
    () => allWorkouts.filter(w => isDateString(w.entryDate)),
    [allWorkouts]
  )

  // Dates with workoutDone=true (basic mode) that have no EntryWorkout record
  const basicOnlyDates = useMemo(() => {
    const advancedSet = new Set(datedWorkouts.map(w => w.entryDate))
    return dailyEntries
      .filter(de => de.workoutDone && isDateString(de.date) && !advancedSet.has(de.date))
      .map(de => de.date)
  }, [dailyEntries, datedWorkouts])
  const hasInsightData = datedWorkouts.length > 0 || basicOnlyDates.length > 0

  // ── Stat calculations (always all-time) ──
  const stats = useMemo(() => {
    let totalSets = 0
    let totalReps = 0
    let totalVolume = 0
    const workoutDates = new Set<string>()

    datedWorkouts.forEach(w => {
      workoutDates.add(w.entryDate)
      w.exercises?.forEach(ex => {
        ex.sets?.forEach(s => {
          totalSets++
          totalReps += getSetTotalReps(s, ex)
          totalVolume += getSetVolume(s, ex)
        })
      })
    })

    // Include basic-mode workout days in date-based stats
    basicOnlyDates.forEach(d => workoutDates.add(d))

    const t = today()
    let streak = 0
    const hasToday = workoutDates.has(t)
    let pointerDate = parseDate(t)
    if (!hasToday) {
      pointerDate.setDate(pointerDate.getDate() - 1)
    }

    while(true) {
      const dStr = formatDate(pointerDate)
      if (workoutDates.has(dStr)) {
         streak++
         pointerDate.setDate(pointerDate.getDate() - 1)
      } else {
         break
      }
    }

    const tDate = parseDate(t)
    let days7 = 0; let days30 = 0; let days90 = 0;
    workoutDates.forEach(dStr => {
      const d = parseDate(dStr)
      const diffDays = Math.floor((tDate.getTime() - d.getTime()) / (1000 * 3600 * 24))
      if (diffDays <= 7 && diffDays >= 0) days7++
      if (diffDays <= 30 && diffDays >= 0) days30++
      if (diffDays <= 90 && diffDays >= 0) days90++
    })

    return {
      sessions: datedWorkouts.length + basicOnlyDates.length,
      totalSets,
      totalReps,
      totalVolume,
      streak,
      days7,
      days30,
      days90
    }
  }, [datedWorkouts, basicOnlyDates])

  // ── Filtered workouts by date range ──
  const cutoffDate = useMemo(() => getRangeCutoff(dateRange), [dateRange])

  const filteredWorkouts = useMemo(() => {
    if (!cutoffDate) return datedWorkouts
    return datedWorkouts.filter(w => w.entryDate >= cutoffDate)
  }, [datedWorkouts, cutoffDate])

  // ── Weekly Chart Data ──
  const weeklyData = useMemo(() => {
    const wks: Record<string, { sets: number, volume: number, sessions: number }> = {}

    filteredWorkouts.forEach(w => {
       const ws = getWeekStart(w.entryDate)
       if (!wks[ws]) wks[ws] = { sets: 0, volume: 0, sessions: 0 }

       wks[ws].sessions += 1
       w.exercises?.forEach(ex => {
         ex.sets?.forEach(s => {
           wks[ws].sets += 1
           wks[ws].volume += getSetVolume(s, ex)
         })
       })
    })

    // Also count basic-mode workout days (workoutDone=true, no EntryWorkout)
    basicOnlyDates.forEach(dateStr => {
      if (cutoffDate && dateStr < cutoffDate) return
      const ws = getWeekStart(dateStr)
      if (!wks[ws]) wks[ws] = { sets: 0, volume: 0, sessions: 0 }
      wks[ws].sessions += 1
    })

    const currentWeekStart = getWeekStart(today())
    const result: { label: string; weekLabel: string; sets: number; volume: number; sessions: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const d = parseDate(currentWeekStart)
      d.setDate(d.getDate() - i * 7)
      const weekStartStr = formatDate(d)
      const label = weekStartStr === currentWeekStart
        ? 'Esta sem.'
        : parseDate(weekStartStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
      const val = wks[weekStartStr] || { sets: 0, volume: 0, sessions: 0 }
      result.push({ label, weekLabel: formatWeekRange(weekStartStr), ...val })
    }
    return result
  }, [filteredWorkouts, basicOnlyDates, cutoffDate])

  // ── Exercise Freq ──
  const topExercises = useMemo(() => {
    const freq: Record<string, number> = {}
    filteredWorkouts.forEach(w => w.exercises?.forEach(e => {
       if(e.exerciseName) freq[e.exerciseName] = (freq[e.exerciseName] || 0) + 1
    }))
    return Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0, 10).map(x => ({ name: x[0], freq: x[1] }))
  }, [filteredWorkouts])

  // ── Routine Freq ──
  const topRoutines = useMemo(() => {
    const freq: Record<number, { count: number; name: string }> = {}
    filteredWorkouts.forEach(w => {
       if (w.routineId) {
          const current = freq[w.routineId] || { count: 0, name: w.routineName || '' }
          current.count += 1
          current.name = w.routineName || current.name
          freq[w.routineId] = current
       }
    })
    return Object.entries(freq).sort((a,b) => b[1].count - a[1].count).slice(0, 8).map(x => {
       const rId = parseInt(x[0], 10)
       const routine = routines.find(r => r.id === rId)
       return { name: x[1].name || routine?.name || 'Rutina eliminada', freq: x[1].count }
    })
  }, [filteredWorkouts, routines])

  // ── Muscle Group ──
  const muscleData = useMemo(() => {
    const catMap = new Map(catalog.map(c => [c.id, c.muscleGroup]))
    const mFreq: Record<string, number> = {}

    filteredWorkouts.forEach(w => {
       w.exercises?.forEach(e => {
          const mg = e.muscleGroup || (e.exerciseCatalogId ? (catMap.get(e.exerciseCatalogId) || 'Otros') : 'Otros')
          const setsCount = e.sets?.length || 0
          mFreq[mg] = (mFreq[mg] || 0) + setsCount
       })
    })

    const sorted = Object.entries(mFreq).sort((a,b) => b[1] - a[1]).filter(x => x[1] > 0)
    const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#facc15', '#f43f5e', '#14b8a6']
    return sorted.map((x, i) => ({
      name: x[0],
      value: x[1],
      color: colors[i % colors.length]
    }))
  }, [filteredWorkouts, catalog])

  const displayTotalVolume = kgToDisplay(stats.totalVolume)
  const displayWeeklyData = useMemo(() =>
    weeklyData.map(d => ({ ...d, volume: Math.round(kgToDisplay(d.volume) * 10) / 10 })),
    [weeklyData, kgToDisplay]
  )

  // Layout structures
  const kpiItems = [
    { label: 'Sesiones', value: stats.sessions, icon: <Activity size={16} className="text-blue-400" />, bg: 'bg-blue-500/10' },
    { label: 'Racha', value: `${stats.streak}d`, icon: <Flame size={16} className="text-orange-500" />, bg: 'bg-orange-500/10' },
    { label: 'Sets', value: stats.totalSets, icon: <Dumbbell size={16} className="text-emerald-400" />, bg: 'bg-emerald-500/10' },
    { label: 'Volumen', value: `${displayTotalVolume > 1000 ? (displayTotalVolume/1000).toFixed(1)+'k' : displayTotalVolume} ${unit}`, icon: <Target size={16} className="text-purple-400" />, bg: 'bg-purple-500/10' }
  ]

  const chartTabs = [
    { id: 'weeks' as const, label: 'Evolución', icon: <TrendingUp size={12} /> },
    { id: 'muscles' as const, label: 'Músculos', icon: <PieIcon size={12} /> },
    { id: 'exercises' as const, label: 'Ejercicios', icon: <Dumbbell size={12} /> },
    { id: 'routines' as const, label: 'Rutinas', icon: <Library size={12} /> },
    { id: 'exercise' as const, label: 'Por ejercicio', icon: <Search size={12} /> },
  ]

  if (!hasInsightData) {
    return (
      <EmptyState
        icon={<Activity size={40} />}
        title="Sin información aún"
        desc="Cuando comiences a registrar tus rutinas, generaremos analíticas sobre tu volumen, consistencia y top de ejercicios."
      />
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── KPIs: hidden in 'exercise' mode ── */}
      {chartTab !== 'exercise' && (
        <>
          {/* KPIs Row */}
          <div className="grid grid-cols-2 gap-2.5">
            {kpiItems.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-3 flex items-center gap-2.5"
              >
                <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                  {kpi.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-widest font-semibold text-white/30 truncate">{kpi.label}</p>
                  <p className="text-base font-bold leading-tight mt-0.5">{kpi.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Consistency row (compact) */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <CalendarDays size={13} className="text-accent" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Consistencia</span>
            </div>
            <div className="flex bg-surface-200/40 rounded-xl divide-x divide-white/[0.05] border border-white/[0.05]">
              <div className="px-3 py-1.5 text-center">
                <p className="text-[11px] font-bold text-white/80">{stats.days7}<span className="text-[9px] text-white/25 ml-0.5">/7d</span></p>
              </div>
              <div className="px-3 py-1.5 text-center">
                <p className="text-[11px] font-bold text-white/80">{stats.days30}<span className="text-[9px] text-white/25 ml-0.5">/30d</span></p>
              </div>
              <div className="px-3 py-1.5 text-center">
                <p className="text-[11px] font-bold text-white/80">{stats.days90}<span className="text-[9px] text-white/25 ml-0.5">/90d</span></p>
              </div>
            </div>
          </div>

          {/* ── Date Filter + Insights button ── */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex bg-surface-200/50 rounded-xl p-0.5 border border-white/[0.04]">
              {DATE_RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setDateRange(r.key)}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    dateRange === r.key
                      ? 'bg-accent/20 text-accent'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                >{r.label}</button>
              ))}
            </div>
            <button
              onClick={() => setInsightsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-amber-400/10 text-amber-400/80 border border-amber-400/15 hover:bg-amber-400/20 transition-colors shrink-0"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">Insights</span>
            </button>
          </div>
        </>
      )}

      {/* ── Chart Tabs (scrollable on mobile) ── */}
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
        <div className="flex justify-center min-w-min">
          <div className="inline-flex items-center gap-0.5 bg-surface-100/80 rounded-2xl p-1 border border-white/[0.05]">
            {chartTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setChartTab(tab.id)}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  chartTab === tab.id
                    ? 'bg-accent/15 text-accent shadow-sm shadow-accent/10'
                    : 'text-white/35 hover:bg-surface-200/60 hover:text-white/60'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart Content ── */}
      {chartTab === 'exercise' ? (
        <ExerciseInsightPanel allWorkouts={datedWorkouts} catalog={catalog} dailyEntries={dailyEntries} />
      ) : (
        <Card className="min-h-[200px] p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={chartTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >

              {/* WEEKS TAB */}
              {chartTab === 'weeks' && (
                <>
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <div>
                      <p className="text-xs text-white/40 font-medium">Evolución semanal</p>
                      <p className="text-[10px] text-white/25 mt-0.5">Cada barra agrupa de lunes a domingo</p>
                    </div>
                    <div className="flex bg-surface-200/60 rounded-md p-0.5">
                      {([
                        { key: 'sets', label: 'Sets' },
                        { key: 'volume', label: 'Vol' },
                        { key: 'sessions', label: 'Ses' }
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setWeekMetric(opt.key)}
                          className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                            weekMetric === opt.key ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(weekMetric === 'volume' ? displayWeeklyData : weeklyData).some(d => d[weekMetric] > 0) ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={weekMetric === 'volume' ? displayWeeklyData : weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} width={28} axisLine={false} tickLine={false} />
                        <Tooltip {...tt} labelFormatter={(_, payload) => payload?.[0]?.payload?.weekLabel ?? _} />
                        <Bar
                          dataKey={weekMetric}
                          fill={weekMetric === 'volume' ? '#a855f7' : '#f97316'}
                          radius={[4, 4, 0, 0]}
                          name={weekMetric === 'sets' ? 'Sets' : weekMetric === 'volume' ? unit.toUpperCase() : 'Sesiones'}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-white/20 text-center py-8">Sin datos en el período seleccionado.</p>}
                </>
              )}

              {/* MUSCLES TAB */}
              {chartTab === 'muscles' && (
                <>
                  <p className="text-xs text-white/40 font-medium mb-4">Sets por Grupo Muscular</p>
                  {muscleData.length > 0 ? (
                    <div className="flex flex-col items-center gap-5">
                      <div className="w-full max-w-[220px] mx-auto">
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={muscleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={4}>
                              {muscleData.map((e, i) => <Cell key={`c-${i}`} fill={e.color} stroke="transparent" />)}
                            </Pie>
                            <Tooltip {...tt} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full space-y-2">
                        {muscleData.map(d => (
                          <div key={d.name} className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="text-xs font-semibold text-white/60 truncate flex-1">{d.name}</span>
                            <span className="text-sm font-bold text-white/90 shrink-0">{d.value} <span className="text-[10px] text-white/30 font-normal">sets</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-xs text-white/20 text-center py-8">No hay grupos musculares registrados.</p>}
                </>
              )}

              {/* EXERCISES & ROUTINES TAB */}
              {(chartTab === 'exercises' || chartTab === 'routines') && (() => {
                const list = chartTab === 'exercises' ? topExercises : topRoutines
                const singular = chartTab === 'exercises' ? 'ejercicio' : 'rutina'

                return (
                  <>
                    <p className="text-xs text-white/40 font-medium mb-3">
                      Top {chartTab === 'exercises' ? '10 ejercicios' : '8 rutinas'}
                    </p>
                    {list.length > 0 ? (
                      <div className="space-y-1.5 overflow-hidden">
                        {list.map((item, i) => (
                          <div key={item.name} className="glass-card flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-200/80">
                            <span className={`text-[11px] font-black w-5 text-center shrink-0 ${
                              i === 0 ? 'text-amber-400' :
                              i === 1 ? 'text-slate-300' :
                              i === 2 ? 'text-orange-400/80' :
                              'text-white/20'
                            }`}>
                              #{i + 1}
                            </span>
                            <span className="text-sm font-semibold text-white/80 flex-1 truncate">{item.name}</span>
                            <span className="text-xs font-mono font-bold text-accent/80 shrink-0 bg-accent/10 px-2 py-0.5 rounded-md">
                              {item.freq}<span className="text-[10px] opacity-50 font-sans ml-0.5">×</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-white/20 text-center py-8">Sin {singular}s registradas.</p>}
                  </>
                )
              })()}

            </motion.div>
          </AnimatePresence>
        </Card>
      )}

      {/* ── Insights Modal ── */}
      <Modal open={insightsOpen} onClose={() => setInsightsOpen(false)} title="Insights automáticos" size="md">
        <WorkoutAutoInsights allWorkouts={datedWorkouts} catalog={catalog} routines={routines} />
      </Modal>

    </div>
  )
}
