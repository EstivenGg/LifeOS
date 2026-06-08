import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, TooltipProps, Legend,
} from 'recharts'
import { EmptyState, Card } from '@/components/ui'
import {
  Search, Dumbbell, Trophy, TrendingUp, BarChart3,
  CalendarDays, Zap, ChevronDown, ChevronUp, Scale, TrendingDown, Minus,
} from 'lucide-react'
import type { EntryWorkout, ExerciseCatalog, DailyEntry } from '@/data/types'
import { parseDate } from '@/utils/date'
import { estimateWorkoutSet1RM, getSetDisplayWeight, getSetTotalReps, getSetVolume } from '@/utils/workoutMetrics'
import { useWeightUnit } from '@/context/SectionPrefsContext'


interface SetDetail {
  reps: number
  weight: number
  rpe?: number
  est1RM: number
}

interface SessionData {
  date: string
  dateLabel: string
  dateFull: string
  maxWeight: number
  totalVolume: number
  totalReps: number
  totalSets: number
  best1RM: number
  sets: SetDetail[]
}

function buildSessionData(allWorkouts: EntryWorkout[], exerciseName: string): SessionData[] {
  const result: SessionData[] = []

  const relevant = allWorkouts
    .filter(w => w.exercises?.some(e => e.exerciseName === exerciseName))
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate))

  relevant.forEach(w => {
    const exInstances = w.exercises.filter(e => e.exerciseName === exerciseName)
    let maxWeight = 0
    let totalVolume = 0
    let totalReps = 0
    let totalSets = 0
    let best1RM = 0
    const sets: SetDetail[] = []

    exInstances.forEach(ex => {
      ex.sets?.forEach(s => {
        totalSets++
        const reps = getSetTotalReps(s, ex)
        totalReps += reps
        const weight = getSetDisplayWeight(s, ex)
        const volume = getSetVolume(s, ex)
        const rm = estimateWorkoutSet1RM(s, ex)
        if (volume > 0) totalVolume += volume
        if (weight > maxWeight) maxWeight = weight
        if (weight > 0) {
          if (rm > best1RM) best1RM = rm
          sets.push({ reps, weight, rpe: s.rpe, est1RM: rm })
        } else if (reps > 0) {
          sets.push({ reps, weight: 0, rpe: s.rpe, est1RM: 0 })
        }
      })
    })

    const d = parseDate(w.entryDate)
    const dateLabel = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    const dateFull = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

    result.push({ date: w.entryDate, dateLabel, dateFull, maxWeight, totalVolume, totalReps, totalSets, best1RM, sets })
  })

  return result
}

// ── Build a map of date → bodyWeightKg from dailyEntries
function buildWeightMap(dailyEntries: DailyEntry[]): Map<string, number> {
  const m = new Map<string, number>()
  dailyEntries.forEach(e => {
    if (e.weightKg != null && e.weightKg > 0) m.set(e.date, e.weightKg)
  })
  return m
}

// ── Linear regression helper: returns { slope, intercept }
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = points.length
  if (n < 2) return null
  const sumX = points.reduce((a, p) => a + p.x, 0)
  const sumY = points.reduce((a, p) => a + p.y, 0)
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function round1(n: number) { return Math.round(n * 10) / 10 }

// ── Custom Tooltip – session chart
function SessionTooltip({ active, payload, weightUnit }: TooltipProps<number, string> & { weightUnit?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as SessionData & { label: string }
  const u = weightUnit ?? 'kg'
  return (
    <div className="bg-[#1c1c26] border border-white/[0.08] rounded-xl px-4 py-3 shadow-xl min-w-[160px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">{d.dateFull ?? d.dateLabel}</p>
      {d.sets.filter(s => s.weight > 0).map((s, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mb-1">
          <span className="text-white/30 w-4 text-right">{i + 1}.</span>
          <span className="font-bold text-white/90">{s.weight} {u}</span>
          <span className="text-white/40">× {s.reps} reps</span>
          {s.rpe && <span className="text-purple-400/70 text-[10px]">RPE {s.rpe}</span>}
        </div>
      ))}
      {d.maxWeight > 0 && (
        <div className="border-t border-white/[0.05] mt-2 pt-2 flex items-center justify-between gap-4">
          <span className="text-[10px] text-white/30">Máx</span>
          <span className="text-xs font-bold text-orange-400">{d.maxWeight} {u}</span>
        </div>
      )}
    </div>
  )
}

// ── Custom Tooltip – dual-axis body-weight chart
function BodyWeightTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c26] border border-white/[0.08] rounded-xl px-4 py-3 shadow-xl min-w-[150px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">{label}</p>
      {payload.map((p, i) => (
        p.value != null && (
          <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-white/50">{p.name}</span>
            </span>
            <span className="font-bold text-white/90">{round1(p.value as number)}</span>
          </div>
        )
      ))}
    </div>
  )
}

interface Props {
  allWorkouts: EntryWorkout[]
  catalog: ExerciseCatalog[]
  dailyEntries: DailyEntry[]
}

type ExGraph = 'weight' | 'volume' | '1rm'
type DateRange = '30d' | '90d' | '6m' | 'all'

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '6m', label: '6m' },
  { key: 'all', label: 'Todo' },
]

function filterByRange(sessions: SessionData[], range: DateRange): SessionData[] {
  if (range === 'all') return sessions
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 182
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return sessions.filter(s => parseDate(s.date) >= cutoff)
}

// ── Generate a prudent narrative text about BW vs performance
function buildNarrativeText(
  exerciseName: string,
  graphKey: 'maxWeight' | 'totalVolume' | 'best1RM',
  graphLabel: string,
  crossPoints: { date: string; perf: number; bw: number }[],
): string {
  if (crossPoints.length < 3) return ''

  const xs = crossPoints.map((_, i) => i)
  const perfReg = linearRegression(xs.map((x, i) => ({ x, y: crossPoints[i].perf })))
  const bwReg   = linearRegression(xs.map((x, i) => ({ x, y: crossPoints[i].bw })))

  if (!perfReg || !bwReg) return ''

  const perfTrend = perfReg.slope > 0.3 ? 'sube' : perfReg.slope < -0.3 ? 'baja' : 'se mantiene estable'
  const bwTrend   = bwReg.slope > 0.05 ? 'sube' : bwReg.slope < -0.05 ? 'baja' : 'se mantiene estable'

  // Find optimal BW range (bucket by 1 kg, pick best avg perf)
  const buckets: Record<number, number[]> = {}
  crossPoints.forEach(p => {
    const bucket = Math.floor(p.bw)
    if (!buckets[bucket]) buckets[bucket] = []
    buckets[bucket].push(p.perf)
  })
  let bestBucket = -1
  let bestAvg = -Infinity
  Object.entries(buckets).forEach(([b, perfs]) => {
    if (perfs.length >= 2) {
      const avg = perfs.reduce((a, v) => a + v, 0) / perfs.length
      if (avg > bestAvg) { bestAvg = avg; bestBucket = Number(b) }
    }
  })

  const name = exerciseName
  const metric = graphLabel.toLowerCase()

  // Build the sentence
  if (bwTrend === 'se mantiene estable' && perfTrend === 'sube') {
    return `Tu ${metric} en ${name} mejora aunque tu peso corporal se mantiene estable — señal de progreso real en fuerza.`
  }
  if (bwTrend === 'baja' && perfTrend === 'sube') {
    return `Tu ${metric} en ${name} subió en las últimas semanas mientras tu peso corporal bajó levemente — buen progreso relativo.`
  }
  if (bwTrend === 'sube' && perfTrend === 'sube') {
    return `Tu ${metric} en ${name} sube junto con el peso corporal. Puede ser ganancia muscular; observa el ratio de fuerza relativa.`
  }
  if (bwTrend === 'baja' && perfTrend === 'baja') {
    return `Tu ${metric} en ${name} baja mientras el peso corporal también baja. Podría reflejar un déficit calórico; monitoriza la fuerza relativa.`
  }
  if (bwTrend === 'sube' && perfTrend === 'se mantiene estable') {
    return `Tu ${metric} en ${name} se mantiene estable pese a subir de peso — la fuerza relativa está bajando ligeramente.`
  }
  if (bwTrend === 'se mantiene estable' && perfTrend === 'se mantiene estable') {
    return `Tu ${metric} en ${name} y tu peso corporal se mantienen estables. Meseta en progreso — considera variar la carga o el volumen.`
  }
  if (bestBucket > 0) {
    return `En ${name} tiendes a rendir mejor cuando tu peso corporal está en el rango de ${bestBucket}–${bestBucket + 1} kg.`
  }
  return `Tu ${metric} en ${name} ${perfTrend} mientras tu peso corporal ${bwTrend}.`
}

export function ExerciseInsightPanel({ allWorkouts, dailyEntries }: Props) {
  const { unit, kgToDisplay } = useWeightUnit()
  const [search, setSearch] = useState('')
  const [selectedEx, setSelectedEx] = useState<string | null>(null)
  const [graph, setGraph] = useState<ExGraph>('weight')
  const [showDropdown, setShowDropdown] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('all')

  // All unique exercise names from history
  const exerciseNames = useMemo(() => {
    const names = new Set<string>()
    allWorkouts.forEach(w => w.exercises?.forEach(e => {
      if (e.exerciseName) names.add(e.exerciseName)
    }))
    return [...names].sort()
  }, [allWorkouts])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return q ? exerciseNames.filter(n => n.toLowerCase().includes(q)) : exerciseNames
  }, [exerciseNames, search])

  const sessions = useMemo(() =>
    selectedEx ? buildSessionData(allWorkouts, selectedEx) : [],
    [allWorkouts, selectedEx]
  )

  const filteredSessions = useMemo(() => filterByRange(sessions, dateRange), [sessions, dateRange])

  // Body weight map
  const weightMap = useMemo(() => buildWeightMap(dailyEntries), [dailyEntries])

  const summary = useMemo(() => {
    if (!filteredSessions.length) return null

    const withWeight = filteredSessions.filter(s => s.maxWeight > 0)
    const maxWeight = withWeight.length ? Math.max(...withWeight.map(s => s.maxWeight)) : 0
    const maxVolume = filteredSessions.length ? Math.max(...filteredSessions.map(s => s.totalVolume).filter(v => v > 0), 0) : 0
    const totalVolume = filteredSessions.reduce((a, b) => a + b.totalVolume, 0)
    const allReps = filteredSessions.flatMap(s => s.sets.map(set => set.reps))
    const avgReps = allReps.length
      ? Math.round(allReps.reduce((a, b) => a + b, 0) / allReps.length * 10) / 10
      : 0
    const best1RM = Math.max(...filteredSessions.map(s => s.best1RM).filter(x => x > 0), 0)
    const lastDone = filteredSessions[filteredSessions.length - 1]?.date ?? null

    // 4-week comparison (volume) — always from full sessions
    const now = new Date()
    const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28)
    const eightWeeksAgo = new Date(now); eightWeeksAgo.setDate(now.getDate() - 56)
    const recent4Vol = sessions.filter(s => parseDate(s.date) >= fourWeeksAgo).reduce((a, b) => a + b.totalVolume, 0)
    const prev4Vol = sessions.filter(s => { const d = parseDate(s.date); return d >= eightWeeksAgo && d < fourWeeksAgo }).reduce((a, b) => a + b.totalVolume, 0)
    const volumeChange = prev4Vol > 0 ? Math.round(((recent4Vol - prev4Vol) / prev4Vol) * 100) : null

    const prSession = maxWeight > 0 ? filteredSessions.find(s => s.maxWeight === maxWeight) : null
    const prIsRecent = prSession
      ? (new Date().getTime() - parseDate(prSession.date).getTime()) / (1000 * 3600 * 24) <= 30
      : false

    return { maxWeight, maxVolume, totalVolume, avgReps, best1RM, lastDone, timesTrainedTotal: filteredSessions.length, volumeChange, recent4Vol, prev4Vol, prIsRecent }
  }, [filteredSessions, sessions])

  if (allWorkouts.length === 0) {
    return <EmptyState icon={<Dumbbell size={36} />} title="Sin historial aún" desc="Registra tus entrenamientos para ver análisis por ejercicio." />
  }

  // Graph uses filteredSessions
  const graphKey = graph === 'weight' ? 'maxWeight' : graph === 'volume' ? 'totalVolume' : 'best1RM'
  const graphColor = graph === 'volume' ? '#a855f7' : graph === '1rm' ? '#22d3ee' : '#f97316'
  const _graphUnit = graph === 'volume' ? `${unit} vol` : unit
  const graphLabel = graph === 'weight' ? 'Peso máx' : graph === 'volume' ? 'Volumen' : '1RM est.'

  // Display-converted sessions for chart
  const displayFilteredSessions = useMemo(() =>
    filteredSessions.map(s => ({
      ...s,
      maxWeight: kgToDisplay(s.maxWeight),
      totalVolume: Math.round(kgToDisplay(s.totalVolume) * 10) / 10,
      best1RM: kgToDisplay(s.best1RM),
      sets: s.sets.map(set => ({ ...set, weight: kgToDisplay(set.weight), est1RM: kgToDisplay(set.est1RM) })),
    })),
    [filteredSessions, kgToDisplay]
  )

  // ── Body-weight cross data: sessions that have a matched weight entry (±1 day tolerance)
  const crossData = useMemo(() => {
    if (!filteredSessions.length) return []
    return filteredSessions.map(s => {
      // Look for exact match first, then ±1 day
      let bw = weightMap.get(s.date)
      if (bw == null) {
        const d = parseDate(s.date)
        for (const offset of [-1, 1]) {
          const probe = new Date(d)
          probe.setDate(probe.getDate() + offset)
          const key = probe.toISOString().slice(0, 10)
          bw = weightMap.get(key)
          if (bw != null) break
        }
      }
      const perf = (s as any)[graphKey] as number
      return { date: s.date, dateLabel: s.dateLabel, perf: perf > 0 ? perf : null, bw: bw ?? null }
    })
  }, [filteredSessions, weightMap, graphKey])

  const crossPoints = useMemo(() =>
    crossData.filter(p => p.perf != null && p.bw != null) as { date: string; dateLabel: string; perf: number; bw: number }[],
    [crossData]
  )

  // Best relative strength: best set / body weight (on the day of the session)
  const bestRelativeStrength = useMemo(() => {
    let best = 0
    let bestLabel = ''
    filteredSessions.forEach(s => {
      const bw = weightMap.get(s.date)
      if (bw == null) return
      const maxW = s.maxWeight
      if (maxW > 0 && bw > 0) {
        const ratio = round1(maxW / bw)
        if (ratio > best) { best = ratio; bestLabel = s.dateLabel }
      }
    })
    return best > 0 ? { ratio: best, dateLabel: bestLabel } : null
  }, [filteredSessions, weightMap])

  // Current relative strength (last session that has both weight and bw)
  const currentRelativeStrength = useMemo(() => {
    for (let i = filteredSessions.length - 1; i >= 0; i--) {
      const s = filteredSessions[i]
      const bw = weightMap.get(s.date)
      if (bw && s.maxWeight > 0) {
        return round1(s.maxWeight / bw)
      }
    }
    return null
  }, [filteredSessions, weightMap])

  // Narrative text
  const narrativeText = useMemo(() => {
    if (!selectedEx || crossPoints.length < 3) return ''
    return buildNarrativeText(selectedEx, graphKey as any, graphLabel, crossPoints)
  }, [selectedEx, crossPoints, graphKey, graphLabel])

  // BW trend icon
  const bwTrendInfo = useMemo(() => {
    if (crossPoints.length < 3) return null
    const rec = linearRegression(crossPoints.map((p, i) => ({ x: i, y: p.bw })))
    if (!rec) return null
    if (rec.slope > 0.05) return { icon: TrendingUp, color: 'text-red-400', label: 'Peso subiendo' }
    if (rec.slope < -0.05) return { icon: TrendingDown, color: 'text-emerald-400', label: 'Peso bajando' }
    return { icon: Minus, color: 'text-white/40', label: 'Peso estable' }
  }, [crossPoints])

  return (
    <div className="space-y-5 animate-in fade-in duration-400">

      {/* ── Exercise Selector ── */}
      <div className="relative">
        <div
          onClick={() => setShowDropdown(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-surface-100/60 border border-white/[0.06] rounded-xl cursor-pointer hover:border-white/15 transition-colors"
        >
          <Search size={14} className="text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
            onClick={e => { e.stopPropagation(); setShowDropdown(true) }}
            placeholder={selectedEx ?? 'Buscar o seleccionar ejercicio...'}
            className="flex-1 bg-transparent text-sm placeholder:text-white/30 focus:outline-none"
          />
          {selectedEx && (
            <button onClick={e => { e.stopPropagation(); setSelectedEx(null); setSearch('') }} className="text-white/20 hover:text-white/60 shrink-0">✕</button>
          )}
          <ChevronDown size={13} className={`text-white/30 transition-transform shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface-100 border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="max-h-52 overflow-y-auto">
                {filtered.length === 0
                  ? <p className="text-xs text-white/30 text-center py-4">Sin coincidencias</p>
                  : filtered.map(name => (
                    <button
                      key={name}
                      onClick={() => { setSelectedEx(name); setSearch(''); setShowDropdown(false); setExpandedSession(null) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-white/[0.03] last:border-0 ${selectedEx === name ? 'bg-accent/15 text-accent' : 'text-white/60 hover:bg-surface-200/60 hover:text-white/90'}`}
                    >{name}</button>
                  ))
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {showDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />}
      </div>

      {/* Date range filter — centered */}
      <div className="flex justify-center">
        <div className="inline-flex bg-surface-200/50 rounded-xl p-0.5 border border-white/[0.04]">
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
      </div>

      {/* ── Placeholder ── */}
      {!selectedEx && (
        <div className="glass-card p-8 text-center">
          <Dumbbell size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Selecciona un ejercicio para ver su progresión</p>
          <p className="text-xs text-white/20 mt-1">{exerciseNames.length} ejercicios en tu historial</p>
        </div>
      )}

      {/* ── Detail ── */}
      {selectedEx && summary && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedEx}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-lg font-bold tracking-tight">{selectedEx}</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {summary.timesTrainedTotal} sesiones · {summary.lastDone
                    ? `Última vez: ${parseDate(summary.lastDone).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`
                    : 'Sin fecha'}
                </p>
              </div>
              {summary.prIsRecent && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30">
                  <Trophy size={11} /> PR reciente 🏆
                </span>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Peso máximo', value: summary.maxWeight > 0 ? `${kgToDisplay(summary.maxWeight)} ${unit}` : '—', icon: <Trophy size={15} className="text-amber-400" />, bg: 'bg-amber-500/10' },
                { label: '1RM estimado', value: summary.best1RM > 0 ? `${kgToDisplay(summary.best1RM)} ${unit}` : '—', icon: <Zap size={15} className="text-cyan-400" />, bg: 'bg-cyan-500/10' },
                { label: 'Mejor sesión', value: summary.maxVolume > 0 ? `${kgToDisplay(summary.maxVolume)} ${unit} vol` : '—', icon: <BarChart3 size={15} className="text-purple-400" />, bg: 'bg-purple-500/10' },
                { label: 'Volumen total', value: kgToDisplay(summary.totalVolume) > 1000 ? `${(kgToDisplay(summary.totalVolume) / 1000).toFixed(1)}k ${unit}` : `${kgToDisplay(summary.totalVolume)} ${unit}`, icon: <TrendingUp size={15} className="text-emerald-400" />, bg: 'bg-emerald-500/10' },
                { label: 'Media reps/serie', value: summary.avgReps > 0 ? `${summary.avgReps}` : '—', icon: <Dumbbell size={15} className="text-blue-400" />, bg: 'bg-blue-500/10' },
                { label: 'Últ. entrenado', value: summary.lastDone ? parseDate(summary.lastDone).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—', icon: <CalendarDays size={15} className="text-rose-400" />, bg: 'bg-rose-500/10' },
              ].map((kpi, i) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-3.5 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>{kpi.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-semibold text-white/30 truncate">{kpi.label}</p>
                    <p className="text-sm font-bold leading-tight mt-0.5">{kpi.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 4-week badge */}
            {summary.volumeChange !== null && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${
                summary.volumeChange > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : summary.volumeChange < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-surface-200/40 border-white/[0.05] text-white/50'
              }`}>
                <TrendingUp size={14} className="shrink-0" />
                <span>Volumen últ. 4 semanas: <strong>{summary.volumeChange > 0 ? '+' : ''}{summary.volumeChange}%</strong></span>
                <span className="text-[11px] font-normal opacity-60 ml-1">({kgToDisplay(summary.prev4Vol)} → {kgToDisplay(summary.recent4Vol)} {unit})</span>
              </div>
            )}

            {/* ── EVOLUTION CHART (protagonista) ── */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <p className="text-sm font-bold">Evolución de peso por sesión</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Pasa el cursor sobre cada punto para ver los sets</p>
                </div>
                <div className="flex bg-surface-200/60 rounded-lg p-0.5">
                  {([
                    { key: 'weight' as const, label: 'Peso máx' },
                    { key: 'volume' as const, label: 'Volumen' },
                    { key: '1rm' as const, label: '1RM est.' },
                  ]).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setGraph(opt.key)}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${graph === opt.key ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {sessions.filter(s => (s as any)[graphKey] > 0).length >= 2 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={displayFilteredSessions} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                      axisLine={false} tickLine={false}
                      interval={sessions.length <= 8 ? 0 : 'preserveStartEnd'}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                      width={36} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => graph === 'volume' && v > 999 ? `${(v/1000).toFixed(1)}k` : `${v}`}
                    />
                    <Tooltip content={<SessionTooltip weightUnit={unit} />} />
                    <Line
                      type="monotone"
                      dataKey={graphKey}
                      stroke={graphColor}
                      strokeWidth={2.5}
                      name={graphLabel}
                      dot={(props: any) => {
                        const maxVal = Math.max(...displayFilteredSessions.map((s: any) => s[graphKey]))
                        const isMax = props.payload[graphKey] === maxVal
                        return (
                          <circle
                            key={props.key}
                            cx={props.cx}
                            cy={props.cy}
                            r={isMax ? 6 : 4}
                            fill={isMax ? '#facc15' : graphColor}
                            stroke={isMax ? '#facc1560' : 'transparent'}
                            strokeWidth={isMax ? 6 : 0}
                          />
                        )
                      }}
                      activeDot={{ r: 6, fill: graphColor, strokeWidth: 2, stroke: 'rgba(255,255,255,0.3)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-white/20 text-center py-10">Necesitas al menos 2 sesiones con peso registrado para ver la evolución.</p>
              )}

              <p className="text-[9px] text-white/20 text-right mt-2">⭐ = punto máximo histórico</p>
            </Card>

            {/* ══════════════════════════════════════════════════
                PESO CORPORAL VS RENDIMIENTO
            ══════════════════════════════════════════════════ */}
            <Card className="p-5">
              {/* Section header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Scale size={14} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">Peso corporal vs rendimiento</p>
                  <p className="text-[10px] text-white/35 mt-0.5">Cruza tu peso corporal con la evolución del ejercicio</p>
                </div>
              </div>

              {crossPoints.length === 0 ? (
                /* ── Empty state ── */
                <div className="py-10 text-center">
                  <Scale size={30} className="text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Sin datos de peso corporal disponibles</p>
                  <p className="text-xs text-white/20 mt-1">
                    Registra tu peso en el <span className="text-amber-400/60">Diario</span> en los días que entrenas para ver este análisis
                  </p>
                </div>
              ) : (
                <div className="space-y-5">

                  {/* ── Mini KPIs for relative strength ── */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Current relative strength */}
                    <div className="glass-card p-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Zap size={14} className="text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-widest font-semibold text-white/30 truncate">Fuerza relativa actual</p>
                        <p className="text-sm font-bold leading-tight mt-0.5">
                          {currentRelativeStrength != null
                            ? <>{currentRelativeStrength}<span className="text-[10px] text-white/30 ml-1 font-normal">× PC</span></>
                            : '—'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Best relative strength */}
                    <div className="glass-card p-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Trophy size={14} className="text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-widest font-semibold text-white/30 truncate">Mejor fuerza relativa</p>
                        <p className="text-sm font-bold leading-tight mt-0.5">
                          {bestRelativeStrength
                            ? <>{bestRelativeStrength.ratio}<span className="text-[10px] text-white/30 ml-1 font-normal">× PC ({bestRelativeStrength.dateLabel})</span></>
                            : '—'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Dual-line chart ── */}
                  {crossPoints.length >= 2 ? (
                    <>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-3">
                          Evolución conjunta ({crossPoints.length} sesiones con peso registrado)
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart
                            data={crossPoints}
                            margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                            <XAxis
                              dataKey="dateLabel"
                              tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                              axisLine={false} tickLine={false}
                              interval={crossPoints.length <= 8 ? 0 : 'preserveStartEnd'}
                            />
                            {/* Left axis: performance */}
                            <YAxis
                              yAxisId="perf"
                              orientation="left"
                              tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                              width={36} axisLine={false} tickLine={false}
                              tickFormatter={(v: number) => graph === 'volume' && v > 999 ? `${(v/1000).toFixed(1)}k` : `${v}`}
                            />
                            {/* Right axis: body weight */}
                            <YAxis
                              yAxisId="bw"
                              orientation="right"
                              tick={{ fontSize: 9, fill: 'rgba(255,255,255,.20)' }}
                              width={32} axisLine={false} tickLine={false}
                              tickFormatter={(v: number) => `${v}`}
                              domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                            />
                            <Tooltip content={<BodyWeightTooltip />} />
                            <Legend
                              wrapperStyle={{ fontSize: '10px', paddingTop: '8px', color: 'rgba(255,255,255,.35)' }}
                              iconSize={8}
                            />
                            {/* Performance line */}
                            <Line
                              yAxisId="perf"
                              type="monotone"
                              dataKey="perf"
                              stroke={graphColor}
                              strokeWidth={2.5}
                              name={graphLabel}
                              dot={{ r: 3, fill: graphColor, strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: graphColor, strokeWidth: 2, stroke: 'rgba(255,255,255,0.3)' }}
                            />
                            {/* Body weight line */}
                            <Line
                              yAxisId="bw"
                              type="monotone"
                              dataKey="bw"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              strokeDasharray="5 3"
                              name="Peso corporal (kg)"
                              dot={{ r: 2.5, fill: '#f59e0b', strokeWidth: 0 }}
                              activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: 'rgba(255,255,255,0.2)' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <p className="text-[9px] text-white/20 mt-1.5">
                          Eje izquierdo: {graphLabel.toLowerCase()} · Eje derecho: peso corporal (kg) — línea punteada
                        </p>
                      </div>

                      {/* ── BW trend + narrative ── */}
                      {(narrativeText || bwTrendInfo) && (
                        <div className="space-y-2.5">
                          {/* BW trend pill */}
                          {bwTrendInfo && (() => {
                            const Icon = bwTrendInfo.icon
                            return (
                              <div className="flex items-center gap-2">
                                <Icon size={12} className={bwTrendInfo.color} />
                                <span className={`text-[11px] font-semibold ${bwTrendInfo.color}`}>{bwTrendInfo.label}</span>
                                <span className="text-[10px] text-white/25">durante el período analizado</span>
                              </div>
                            )
                          })()}

                          {/* Narrative insight */}
                          {narrativeText && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-400/5 border border-amber-400/15"
                            >
                              <span className="text-amber-400 text-base leading-none mt-0.5 shrink-0">💡</span>
                              <p className="text-xs text-white/60 leading-relaxed">{narrativeText}</p>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-white/30 text-center py-4">
                      Necesitas al menos 2 sesiones con peso corporal registrado para ver el gráfico combinado.
                    </p>
                  )}
                </div>
              )}
            </Card>
            {/* ══════════════════════════════════════════════════ */}

            {/* ── SESSION HISTORY — expandible ── */}
            <Card className="p-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-white/30 mb-4">Historial de sesiones</p>
              <div className="space-y-2">
                {[...filteredSessions].reverse().map((s) => {
                  const isMaxWeight = s.maxWeight === summary.maxWeight && summary.maxWeight > 0
                  const isMaxVol = s.totalVolume === summary.maxVolume && summary.maxVolume > 0
                  const isExpanded = expandedSession === s.date
                  const hasSets = s.sets.filter(set => set.weight > 0).length > 0
                  const bw = weightMap.get(s.date)

                  return (
                    <div
                      key={s.date}
                      className={`rounded-xl overflow-hidden border transition-colors ${isMaxWeight || isMaxVol ? 'border-amber-400/20 bg-amber-400/5' : 'border-white/[0.04] bg-surface-200/30'}`}
                    >
                      {/* Row header — always visible */}
                      <button
                        onClick={() => hasSets && setExpandedSession(isExpanded ? null : s.date)}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${hasSets ? 'hover:bg-white/[0.03] cursor-pointer' : 'cursor-default'}`}
                      >
                        <span className="text-[11px] font-bold text-white/30 shrink-0 w-16">{s.dateLabel}</span>

                        <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
                          {s.maxWeight > 0 ? (
                            <span className={`text-sm font-bold ${isMaxWeight ? 'text-amber-400' : 'text-white/80'}`}>
                              {s.maxWeight} kg
                              {isMaxWeight && <span className="ml-1 text-[10px]">🏆</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-white/30">Sin peso</span>
                          )}
                          <span className="text-[11px] text-white/30">{s.totalSets} series · {s.totalReps} reps</span>
                          {s.totalVolume > 0 && (
                            <span className={`text-[11px] font-semibold ${isMaxVol ? 'text-purple-400' : 'text-white/25'}`}>
                              {s.totalVolume} kg vol
                            </span>
                          )}
                          {/* Body weight tag */}
                          {bw != null && (
                            <span className="text-[10px] text-amber-400/60 bg-amber-400/8 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Scale size={9} /> {bw} kg
                            </span>
                          )}
                        </div>

                        {hasSets && (
                          <span className="text-white/20 shrink-0">
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </span>
                        )}
                      </button>

                      {/* Expanded — set breakdown */}
                      <AnimatePresence>
                        {isExpanded && hasSets && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-white/[0.05] px-3 py-2.5 space-y-1.5">
                              {s.sets.filter(set => set.weight > 0).map((set, idx) => {
                                const sessionMax = Math.max(...s.sets.map(x => x.weight))
                                const isSetPR = set.weight === summary.maxWeight
                                const isSessionMax = set.weight === sessionMax
                                return (
                                  <div key={idx} className="flex items-center gap-3">
                                    <span className="text-[10px] text-white/20 w-5 text-right shrink-0">{idx + 1}</span>
                                    <div className="flex-1 flex items-center gap-2">
                                      <span className={`text-sm font-bold ${isSetPR ? 'text-amber-400' : isSessionMax ? 'text-white/80' : 'text-white/60'}`}>
                                        {set.weight} kg
                                      </span>
                                      <span className="text-xs text-white/30">×</span>
                                      <span className="text-sm font-semibold text-white/70">{set.reps} reps</span>
                                      {set.rpe && <span className="text-[10px] font-medium text-purple-400/60 bg-purple-400/10 px-1.5 py-0.5 rounded-md">RPE {set.rpe}</span>}
                                      {isSetPR && <span className="text-[10px] font-bold text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-md">PR 🏆</span>}
                                    </div>
                                    {set.est1RM > 0 && (
                                      <span className="text-[9px] font-mono text-cyan-400/50 shrink-0">1RM≈{set.est1RM}</span>
                                    )}
                                  </div>
                                )
                              })}
                              {/* Relative strength for this session */}
                              {bw != null && s.maxWeight > 0 && (
                                <div className="border-t border-white/[0.04] mt-2 pt-2 flex items-center gap-2">
                                  <Scale size={10} className="text-amber-400/50" />
                                  <span className="text-[10px] text-white/30">
                                    Fuerza relativa: <span className="text-amber-400/70 font-semibold">{round1(s.maxWeight / bw)}× PC</span>
                                    <span className="text-white/20 ml-1">({bw} kg)</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </Card>

          </motion.div>
        </AnimatePresence>
      )}

      {selectedEx && !summary && (
        <EmptyState icon={<BarChart3 size={36} />} title="Sin datos de series" desc="Este ejercicio no tiene sets registrados todavía." />
      )}
    </div>
  )
}
