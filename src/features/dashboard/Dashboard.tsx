import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon, BookOpen, Dumbbell, Flame, Droplets, Timer,
  Smartphone, GraduationCap, Scale, Brain, Settings2,
  CheckCircle2, PenLine, ListChecks, X,
} from 'lucide-react'
import { db } from '@/data/db'
import { today, daysAgo, shortDate, fmtMin, displayDate } from '@/utils/date'
import { Card } from '@/components/ui/Card'
import { getMoodColor } from '@/components/ui/MoodPicker'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { SectionPrefsModal } from '@/components/ui/SectionPrefsModal'
import { DashboardModal } from './DashboardModal'
import { useSectionPrefs, SectionId } from '@/context/SectionPrefsContext'
import { useTheme } from '@/context/ThemeContext'

/* ─── Circular progress ring ─────────────────────────────────────────────── */
function ProgressRing({ pct, size = 120, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} className="block -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgb(var(--surface-300))" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgb(var(--accent))" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  )
}

/* ─── Section icon color map ──────────────────────────────────────────────── */
const IC: Record<string, { icon: any; color: string }> = {
  mood: { icon: CheckCircle2, color: 'text-yellow-400' },
  habits: { icon: ListChecks, color: 'text-accent' },
  sleep: { icon: Moon, color: 'text-indigo-400' },
  water: { icon: Droplets, color: 'text-sky-400' },
  screentime: { icon: Smartphone, color: 'text-pink-400' },
  study: { icon: GraduationCap, color: 'text-blue-400' },
  reading: { icon: BookOpen, color: 'text-emerald-400' },
  workout: { icon: Dumbbell, color: 'text-orange-400' },
  pomodoro: { icon: Timer, color: 'text-rose-400' },
  meditation: { icon: Brain, color: 'text-violet-400' },
  weight: { icon: Scale, color: 'text-amber-400' },
}

interface Summary {
  mood?: number; checklistDone: number; checklistTotal: number
  measurableDone: number; measurableTotal: number
  sleepHours?: number; sleepQuality?: number; pagesRead: number; trained: boolean; workoutCount: number
  waterMl: number; pomodoroSessions: number; screenMin: number
  studyMin: number; meditationMin: number; weightKg?: number
  studyOk: boolean; readOk: boolean; meditOk: boolean
  advOverrides?: Record<string, boolean>
}

interface WeekDay {
  label: string; date: string; mood?: number
  habitsDone: number; habitsTotal: number; hasEntry: boolean
}

export function Dashboard() {
  const navigate = useNavigate()
  const { enabled, advanced, dashboardOrder } = useSectionPrefs()
  const { accentHex } = useTheme()
  const [selectedDate, setSelectedDate] = useState(today())
  const [s, setS] = useState<Summary | null>(null)
  const [week, setWeek] = useState<WeekDay[]>([])
  const [showPrefs, setShowPrefs] = useState(false)
  const [modalMetric, setModalMetric] = useState<{ id: SectionId, label: string, value: string, navSection?: string } | null>(null)

  useEffect(() => { load() }, [selectedDate])

  async function load() {
    const d = selectedDate
    const allH = await db.habits.toArray()
    const habits = allH.filter(h => h.active)
    const entry = await db.dailyEntries.get(d)
    const eh = await db.entryHabits.where('entryDate').equals(d).toArray()
    const readings = await db.entryReadings.where('entryDate').equals(d).toArray()
    const workouts = await db.entryWorkouts.where('entryDate').equals(d).toArray()
    const poms = await db.pomodoroSessions.where('entryDate').equals(d).toArray()
    const studies = await db.entryStudy.where('entryDate').equals(d).toArray()

    const pagesRead = readings.reduce((s, r) => s + r.pagesRead, 0)
    const trained = entry?.workoutDone === true || (workouts.length > 0 && workouts.some(w =>
      (w.type && w.type !== 'gym') ||
      (w.exercises?.some(e => e.sets?.length > 0))
    ))
    const waterOk = (entry?.waterMl ?? 0) > 0
    const meditOk = entry?.meditationDone === true || (entry?.meditationMinutes ?? 0) > 0
    const studyOk = studies.length > 0
    const readOk = readings.length > 0

    const measurableTotal = 5
    const measurableDone = [readOk, trained, waterOk, meditOk, studyOk].filter(Boolean).length

    setS({
      mood: entry?.mood,
      checklistDone: eh.filter(h => h.done).length,
      checklistTotal: habits.length,
      measurableDone, measurableTotal,
      sleepHours: entry?.sleepHours,
      sleepQuality: entry?.sleepQuality,
      pagesRead, trained, workoutCount: workouts.length,
      waterMl: entry?.waterMl ?? 0,
      pomodoroSessions: poms.filter(p => p.completed).length,
      screenMin: entry?.screenTimeMinutes ?? 0,
      studyMin: studies.reduce((s, st) => s + st.minutes, 0),
      meditationMin: entry?.meditationMinutes ?? 0,
      weightKg: entry?.weightKg,
      studyOk, readOk, meditOk,
      advOverrides: entry?.advancedOverrides
    })

    // 7-day week strip
    const weekDays: WeekDay[] = []
    const dayNames = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
    for (let i = 6; i >= 0; i--) {
      const dt = daysAgo(i)
      const e = await db.dailyEntries.get(dt)
      const dayH = await db.entryHabits.where('entryDate').equals(dt).toArray()
      const dateObj = new Date(dt + 'T12:00:00')
      weekDays.push({
        label: dayNames[dateObj.getDay()],
        date: dt,
        mood: e?.mood,
        habitsDone: dayH.filter(h => h.done).length,
        habitsTotal: habits.length,
        hasEntry: !!e,
      })
    }
    setWeek(weekDays)
  }

  // ── Derived ──
  const totalDone = (s?.checklistDone ?? 0) + (s?.measurableDone ?? 0)
  const totalMax = (s?.checklistTotal ?? 0) + (s?.measurableTotal ?? 0)
  const pct = totalMax > 0 ? Math.round((totalDone / totalMax) * 100) : 0

  const tt = { contentStyle: { background: 'rgb(var(--surface-100))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '12px', color: '#fff' } }

  // ── Metric items for the grid (respects order + enabled) ──
  function getMetricValue(id: SectionId): { label: string; value: string; sub?: string; navSection?: string } | null {
    if (!s) return null
    const isAdv = s.advOverrides?.[id] ?? advanced[id]
    switch (id) {
      case 'mood': return { label: 'Mood', value: s.mood ? `${s.mood}/5` : '--', navSection: 'mood' }
      case 'habits': return { label: 'Habitos', value: `${totalDone}/${totalMax}`, navSection: 'habits' }
      case 'sleep': {
        const QUALITY_LABELS: Record<number, string> = { 1: 'Mal', 2: 'Regular', 3: 'Bien', 4: 'Súper' }
        if (isAdv) return { label: 'Sueño', value: s.sleepHours ? `${s.sleepHours}h` : '--', navSection: 'sleep' }
        return { label: 'Sueño', value: s.sleepQuality ? QUALITY_LABELS[s.sleepQuality] ?? '--' : '--', navSection: 'sleep' }
      }
      case 'water': return { label: 'Agua', value: s.waterMl ? `${(s.waterMl / 1000).toFixed(1)}L` : '--', navSection: 'water' }
      case 'screentime': return { label: 'Pantalla', value: s.screenMin ? fmtMin(s.screenMin) : '--', navSection: 'screentime' }
      case 'study':
        if (isAdv) return { label: 'Estudio', value: s.studyMin ? fmtMin(s.studyMin) : '--', navSection: 'study' }
        return { label: 'Estudio', value: s.studyOk ? 'Si' : '--', navSection: 'study' }
      case 'reading':
        if (isAdv) return { label: 'Lectura', value: s.pagesRead ? `${s.pagesRead}pp` : '--', navSection: 'reading' }
        return { label: 'Lectura', value: s.readOk ? 'Si' : '--', navSection: 'reading' }
      case 'workout':
        if (isAdv) return { label: 'Actividad', value: s.trained ? (s.workoutCount > 1 ? `${s.workoutCount} Actividades` : 'Realizada') : '--', navSection: 'workout' }
        return { label: 'Actividad', value: s.trained ? 'Si' : '--', navSection: 'workout' }
      case 'pomodoro': return { label: 'Pomodoro', value: s.pomodoroSessions ? `${s.pomodoroSessions}` : '--', navSection: 'pomodoro' }
      case 'meditation':
        if (isAdv) return { label: 'Meditacion', value: s.meditationMin ? `${s.meditationMin}m` : '--', navSection: 'meditation' }
        return { label: 'Meditacion', value: s.meditOk ? 'Si' : '--', navSection: 'meditation' }
      case 'weight': return { label: 'Peso', value: s.weightKg ? `${s.weightKg}kg` : '--', navSection: 'weight' }
      default: return null
    }
  }

  const visibleMetrics = dashboardOrder.filter(id => {
    if (enabled[id]) return true
    if (!s) return false
    // Rule: if disabled but day has data, show it
    switch (id) {
      case 'mood': return s.mood !== undefined
      case 'sleep': return s.sleepHours !== undefined
      case 'water': return s.waterMl > 0
      case 'screentime': return s.screenMin > 0
      case 'study': return s.studyOk
      case 'reading': return s.readOk
      case 'workout': return s.trained
      case 'pomodoro': return s.pomodoroSessions > 0
      case 'meditation': return s.meditOk
      case 'weight': return s.weightKg !== undefined
      default: return false
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold capitalize">{displayDate(selectedDate)}</h1>
          <p className="text-[11px] md:text-sm text-white/35 mt-0.5">{selectedDate === today() ? 'Tu progreso de hoy' : 'Registro histórico'}</p>
        </div>
        <button
          onClick={() => setShowPrefs(true)}
          className="w-9 h-9 rounded-xl bg-surface-200/60 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          title="Personalizar"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {/* ── Hero: Progress Ring + Quick Stats ── */}
      <Card className="p-5">
        <div className="flex items-center gap-5">
          {/* Ring */}
          <div className="relative shrink-0">
            <ProgressRing pct={pct} size={100} stroke={7} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{pct}</span>
              <span className="text-[9px] text-white/30 -mt-0.5">%</span>
            </div>
          </div>
          {/* Summary breakdown */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Checklist</span>
              <span className="text-sm font-semibold">{s?.checklistDone ?? 0}<span className="text-white/25">/{s?.checklistTotal ?? 0}</span></span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-300 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(s?.checklistTotal ?? 0) > 0 ? ((s?.checklistDone ?? 0) / (s?.checklistTotal ?? 1)) * 100 : 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Actividades</span>
              <span className="text-sm font-semibold">{s?.measurableDone ?? 0}<span className="text-white/25">/{s?.measurableTotal ?? 0}</span></span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-300 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${(s?.measurableTotal ?? 0) > 0 ? ((s?.measurableDone ?? 0) / (s?.measurableTotal ?? 1)) * 100 : 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>
        </div>

        {/* Full Journal Button Overlay/Bottom */}
        <div className="mt-5 w-full">
          <button
            onClick={() => navigate(`/daylog/${selectedDate}`)}
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
          >
            <PenLine size={16} /> Abrir Diario de {displayDate(selectedDate).split(' ')[0]}
          </button>
        </div>
      </Card>

      {/* ── 7-Day Week Strip ── */}
      <div className="flex gap-1.5">
        {week.map((d, i) => {
          const isToday = d.date === selectedDate
          const moodColor = getMoodColor(d.mood)
          const habitPct = d.habitsTotal > 0 ? d.habitsDone / d.habitsTotal : 0
          return (
            <motion.button
              key={d.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => setSelectedDate(d.date)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${isToday
                ? 'bg-accent/15 ring-1 ring-accent/30'
                : 'bg-surface-200/40 hover:bg-surface-200/70'
                }`}
            >
              <span className={`text-[9px] font-medium uppercase ${isToday ? 'text-accent' : 'text-white/30'}`}>
                {d.label}
              </span>
              {/* Mood dot */}
              <div
                className="w-5 h-5 rounded-full border-2"
                style={{
                  backgroundColor: d.mood ? moodColor : 'transparent',
                  borderColor: d.mood ? moodColor : 'rgba(255,255,255,0.1)',
                  opacity: d.hasEntry ? 1 : 0.3,
                }}
              />
              {/* Habit mini-bar */}
              <div className="w-4 h-0.5 rounded-full bg-surface-400 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${habitPct * 100}%` }}
                />
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* ── Metric Cards Grid ── */}
      {visibleMetrics.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {visibleMetrics.map((id, i) => {
            const m = getMetricValue(id)
            if (!m) return null
            const { icon: Icon, color } = IC[id] || { icon: CheckCircle2, color: 'text-white/50' }
            return (
              <motion.button
                key={id}
                onClick={() => setModalMetric({ id, ...m })}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
                className="glass-card p-3 flex flex-col items-center gap-1.5 text-center hover:bg-surface-200/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-lg bg-surface-300/60 flex items-center justify-center ${color}`}>
                  <Icon size={15} />
                </div>
                <span className="text-lg font-bold leading-none">{m.value}</span>
                <span className="text-[9px] text-white/25 uppercase tracking-wide leading-none">{m.label}</span>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Section prefs modal */}
      <SectionPrefsModal open={showPrefs} onClose={() => setShowPrefs(false)} />

      {/* Quick-View Deep Metric Modal */}
      <DashboardModal
        isOpen={!!modalMetric}
        onClose={() => setModalMetric(null)}
        date={selectedDate}
        metric={modalMetric}
        icon={modalMetric ? IC[modalMetric.id]?.icon : null}
        colorStr={modalMetric ? IC[modalMetric.id]?.color || 'text-white/50' : 'text-white/50'}
      />
    </div>
  )
}
