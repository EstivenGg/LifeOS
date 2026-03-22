import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Moon, BookOpen, Dumbbell, Droplets, Timer,
  Smartphone, GraduationCap, Scale, Brain, Settings2,
  CheckCircle2, PenLine, ListChecks, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { db } from '@/data/db'
import { today, daysAgo, fmtMin, displayDate } from '@/utils/date'
import { Card } from '@/components/ui/Card'
import { getMoodColor } from '@/components/ui/MoodPicker'
import { SectionPrefsModal } from '@/components/ui/SectionPrefsModal'
import { DashboardModal } from './DashboardModal'
import { useSectionPrefs, SectionId } from '@/context/SectionPrefsContext'
import { useTheme } from '@/context/ThemeContext'

/* ─── Progress ring ──────────────────────────────────────────────────────── */
function ProgressRing({ pct, size = 120, stroke = 8 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} className="block -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface-300))" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgb(var(--accent))" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />
    </svg>
  )
}

/* ─── Section color palette ──────────────────────────────────────────────── */
const SC: Record<string, { icon: any; iconBg: string; iconBorder: string; iconText: string }> = {
  mood:       { icon: CheckCircle2,  iconBg: 'bg-yellow-400/12',  iconBorder: 'border-yellow-400/20',  iconText: 'text-yellow-400'  },
  habits:     { icon: ListChecks,    iconBg: 'bg-accent/12',      iconBorder: 'border-accent/20',      iconText: 'text-accent'      },
  sleep:      { icon: Moon,          iconBg: 'bg-indigo-400/12',  iconBorder: 'border-indigo-400/20',  iconText: 'text-indigo-400'  },
  water:      { icon: Droplets,      iconBg: 'bg-sky-400/12',     iconBorder: 'border-sky-400/20',     iconText: 'text-sky-400'     },
  screentime: { icon: Smartphone,    iconBg: 'bg-pink-400/12',    iconBorder: 'border-pink-400/20',    iconText: 'text-pink-400'    },
  study:      { icon: GraduationCap, iconBg: 'bg-blue-400/12',    iconBorder: 'border-blue-400/20',    iconText: 'text-blue-400'    },
  reading:    { icon: BookOpen,      iconBg: 'bg-emerald-400/12', iconBorder: 'border-emerald-400/20', iconText: 'text-emerald-400' },
  workout:    { icon: Dumbbell,      iconBg: 'bg-orange-400/12',  iconBorder: 'border-orange-400/20',  iconText: 'text-orange-400'  },
  pomodoro:   { icon: Timer,         iconBg: 'bg-rose-400/12',    iconBorder: 'border-rose-400/20',    iconText: 'text-rose-400'    },
  meditation: { icon: Brain,         iconBg: 'bg-violet-400/12',  iconBorder: 'border-violet-400/20',  iconText: 'text-violet-400'  },
  weight:     { icon: Scale,         iconBg: 'bg-amber-400/12',   iconBorder: 'border-amber-400/20',   iconText: 'text-amber-400'   },
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
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

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
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
      (w.type && w.type !== 'gym') || (w.exercises?.some(e => e.sets?.length > 0))
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
      advOverrides: entry?.advancedOverrides,
    })

    const weekDays: WeekDay[] = []
    const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
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

  function goDate(delta: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    const nd = d.toISOString().slice(0, 10)
    if (nd <= today()) setSelectedDate(nd)
  }

  // ── Derived ──
  const totalDone = (s?.checklistDone ?? 0) + (s?.measurableDone ?? 0)
  const totalMax  = (s?.checklistTotal ?? 0) + (s?.measurableTotal ?? 0)
  const pct = totalMax > 0 ? Math.round((totalDone / totalMax) * 100) : 0
  const habitPctHero = (s?.checklistTotal ?? 0) > 0 ? (s!.checklistDone / s!.checklistTotal) * 100 : 0
  const actPctHero   = (s?.measurableTotal ?? 0) > 0 ? (s!.measurableDone / s!.measurableTotal) * 100 : 0

  function getMetricValue(id: SectionId): { label: string; value: string; sub?: string; navSection?: string } | null {
    if (!s) return null
    const isAdv = s.advOverrides?.[id] ?? advanced[id]
    switch (id) {
      case 'mood':       return { label: 'Mood',       value: s.mood ? `${s.mood}/5` : '—',                        navSection: 'mood'       }
      case 'habits':     return { label: 'Hábitos',    value: `${s.checklistDone}/${s.checklistTotal}`,                           navSection: 'habits'     }
      case 'sleep': {
        const QL: Record<number, string> = { 1: 'Mal', 2: 'Regular', 3: 'Bien', 4: 'Súper' }
        if (isAdv) return { label: 'Sueño',      value: s.sleepHours ? `${s.sleepHours}h` : '—',               navSection: 'sleep' }
        return             { label: 'Sueño',      value: s.sleepQuality ? QL[s.sleepQuality] ?? '—' : '—',       navSection: 'sleep' }
      }
      case 'water':      return { label: 'Agua',       value: s.waterMl ? `${(s.waterMl/1000).toFixed(1)}L` : '—', navSection: 'water'      }
      case 'screentime': return { label: 'Pantalla',   value: s.screenMin ? fmtMin(s.screenMin) : '—',              navSection: 'screentime' }
      case 'study':
        if (isAdv) return { label: 'Estudio',    value: s.studyMin ? fmtMin(s.studyMin) : '—',                  navSection: 'study' }
        return             { label: 'Estudio',    value: s.studyOk ? 'Sí' : '—',                                 navSection: 'study' }
      case 'reading':
        if (isAdv) return { label: 'Lectura',    value: s.pagesRead ? `${s.pagesRead}pp` : '—',                  navSection: 'reading' }
        return             { label: 'Lectura',    value: s.readOk ? 'Sí' : '—',                                  navSection: 'reading' }
      case 'workout':
        if (isAdv) return { label: 'Actividad',  value: s.trained ? (s.workoutCount > 1 ? `${s.workoutCount}x` : 'Sí') : '—', navSection: 'workout' }
        return             { label: 'Actividad',  value: s.trained ? 'Sí' : '—',                                 navSection: 'workout' }
      case 'pomodoro':   return { label: 'Pomodoro',   value: s.pomodoroSessions ? `${s.pomodoroSessions}` : '—',   navSection: 'pomodoro'   }
      case 'meditation':
        if (isAdv) return { label: 'Meditación', value: s.meditationMin ? `${s.meditationMin}m` : '—',           navSection: 'meditation' }
        return             { label: 'Meditación', value: s.meditOk ? 'Sí' : '—',                                  navSection: 'meditation' }
      case 'weight':     return { label: 'Peso',       value: s.weightKg ? `${s.weightKg}kg` : '—',                navSection: 'weight'     }
      default:           return null
    }
  }

  const visibleMetrics = dashboardOrder.filter(id => {
    if (enabled[id]) return true
    if (!s) return false
    switch (id) {
      case 'mood':       return s.mood !== undefined
      case 'sleep':      return s.sleepHours !== undefined
      case 'water':      return s.waterMl > 0
      case 'screentime': return s.screenMin > 0
      case 'study':      return s.studyOk
      case 'reading':    return s.readOk
      case 'workout':    return s.trained
      case 'pomodoro':   return s.pomodoroSessions > 0
      case 'meditation': return s.meditOk
      case 'weight':     return s.weightKg !== undefined
      default:           return false
    }
  })

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-accent/70 font-black mb-0.5">
            {selectedDate === today() ? greeting() : 'Registro histórico'}
          </p>
          <h1 className="text-xl md:text-2xl font-black capitalize tracking-tight text-white/95">
            {displayDate(selectedDate)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Date nav */}
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => goDate(-1)}
              className="w-8 h-8 rounded-full bg-surface-200/50 flex items-center justify-center text-white/40 hover:text-white border border-white/[0.04] transition-all"
            >
              <ChevronLeft size={15} />
            </motion.button>
            {selectedDate !== today() && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDate(today())}
                className="px-3 h-8 rounded-full text-xs font-bold text-accent bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all"
              >
                Hoy
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => goDate(1)}
              disabled={selectedDate >= today()}
              className="w-8 h-8 rounded-full bg-surface-200/50 flex items-center justify-center text-white/40 hover:text-white border border-white/[0.04] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPrefs(true)}
            className="w-9 h-9 rounded-xl bg-surface-200/50 flex items-center justify-center text-white/35 hover:text-white/70 border border-white/[0.04] transition-all"
            title="Personalizar"
          >
            <Settings2 size={16} />
          </motion.button>
        </div>
      </div>

      {/* ── Hero card — tappable → opens diary ── */}
      <motion.div
        whileTap={{ scale: 0.985 }}
        onClick={() => navigate(`/daylog/${selectedDate}`)}
        className="glass-card p-5 cursor-pointer relative group active:bg-surface-200/60 transition-colors"
      >
        {/* PenLine hint top-right */}
        <div className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/[0.05] group-hover:bg-accent/15 flex items-center justify-center transition-all duration-200">
          <PenLine size={13} className="text-white/20 group-hover:text-accent transition-colors duration-200" />
        </div>

        <div className="flex items-center gap-5">
          {/* Ring */}
          <div className="relative shrink-0">
            <ProgressRing pct={pct} size={112} stroke={8} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-white leading-none tabular-nums">{pct}</span>
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0 space-y-3 pr-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Hábitos</span>
                <span className="text-sm font-black text-white/90 tabular-nums">
                  {s?.checklistDone ?? 0}<span className="text-white/25 font-bold">/{s?.checklistTotal ?? 0}</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-300/60 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
                  initial={{ width: 0 }}
                  animate={{ width: `${habitPctHero}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Actividades</span>
                <span className="text-sm font-black text-white/90 tabular-nums">
                  {s?.measurableDone ?? 0}<span className="text-white/25 font-bold">/{s?.measurableTotal ?? 0}</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-300/60 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${actPctHero}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 7-day strip ── */}
      <div className="flex gap-1.5">
        {week.map((d, i) => {
          const isSelected = d.date === selectedDate
          const isToday    = d.date === today()
          const moodColor  = getMoodColor(d.mood)
          const habitPct   = d.habitsTotal > 0 ? d.habitsDone / d.habitsTotal : 0
          const dayNum     = new Date(d.date + 'T12:00:00').getDate()
          return (
            <motion.button
              key={d.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => setSelectedDate(d.date)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl transition-all duration-200 ${
                isSelected
                  ? 'bg-accent/15 ring-1 ring-accent/30'
                  : 'bg-surface-200/40 hover:bg-surface-200/70'
              }`}
            >
              {/* Day label */}
              <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isSelected ? 'text-accent' : 'text-white/25'}`}>
                {d.label}
              </span>
              {/* Day number */}
              <span className={`text-[12px] font-black leading-none tabular-nums ${isSelected ? 'text-white/95' : isToday ? 'text-white/60' : 'text-white/35'}`}>
                {dayNum}
              </span>
              {/* Mood dot */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: d.mood ? `${moodColor}25` : 'transparent',
                  border: `2px solid ${d.mood ? moodColor : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {d.mood && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: moodColor }} />
                )}
              </div>
              {/* Habit bar */}
              <div className="w-full px-1">
                <div className="h-1 rounded-full bg-surface-400/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-accent/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${habitPct * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                  />
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* ── Metric cards ── */}
      {visibleMetrics.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {visibleMetrics.map((id, i) => {
            const m = getMetricValue(id)
            if (!m) return null
            const { icon: Icon, iconBg, iconBorder, iconText } = SC[id] || { icon: CheckCircle2, iconBg: 'bg-surface-300/60', iconBorder: 'border-white/5', iconText: 'text-white/50' }
            return (
              <motion.button
                key={id}
                onClick={() => setModalMetric({ id, ...m })}
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
                className="glass-card p-3.5 flex flex-col items-center gap-2.5 text-center hover:bg-surface-200/40 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 cursor-pointer"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-2xl ${iconBg} border ${iconBorder} flex items-center justify-center`}>
                  <Icon size={18} className={iconText} />
                </div>
                {/* Value */}
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-[18px] font-black leading-none text-white/95 tabular-nums">
                    {m.value}
                  </div>
                  <div className="text-[9px] font-black text-white/28 uppercase tracking-[0.14em] leading-none">
                    {m.label}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <SectionPrefsModal open={showPrefs} onClose={() => setShowPrefs(false)} />
      <DashboardModal
        isOpen={!!modalMetric}
        onClose={() => setModalMetric(null)}
        date={selectedDate}
        metric={modalMetric}
        icon={modalMetric ? SC[modalMetric.id]?.icon : null}
        colorStr={modalMetric ? SC[modalMetric.id]?.iconText || 'text-white/50' : 'text-white/50'}
      />
    </div>
  )
}
