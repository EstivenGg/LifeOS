import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Flame, Dumbbell, TrendingUp, TrendingDown, Trophy,
  Clock, Library, Layers, Zap, Info,
} from 'lucide-react'
import type { EntryWorkout, ExerciseCatalog, Routine } from '@/data/types'
import { parseDate, today, formatDate } from '@/utils/date'

// ─── Types ───────────────────────────────────────────────────────────────────

type InsightKind =
  | 'streak'
  | 'top_exercise'
  | 'top_routine'
  | 'best_volume_week'
  | 'missing_exercise'
  | 'volume_trend'
  | 'recent_pr'
  | 'top_muscle'
  | 'consistency_drop'
  | 'volume_record'

interface Insight {
  id: InsightKind
  icon: React.ReactNode
  title: string
  body: string
  accent: string          // tailwind color token for left-border & icon bg
  badge?: string          // optional right-side pill text
  priority: number        // lower = shown first
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimate1RM(weight: number, reps: number) {
  if (reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

function daysBetween(a: Date, b: Date) {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 3600 * 24))
}

function shortDate(d: Date) {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

/** ISO week-start (Monday) string for a given date string */
function weekStart(dateStr: string): string {
  const d = parseDate(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return formatDate(d)
}

// ─── Engine ──────────────────────────────────────────────────────────────────

function buildInsights(
  allWorkouts: EntryWorkout[],
  catalog: ExerciseCatalog[],
  routines: Routine[],
): Insight[] {
  if (allWorkouts.length === 0) return []

  const insights: Insight[] = []
  const todayStr = today()
  const todayDate = parseDate(todayStr)

  // ── Pre-compute workout dates set ──────────────────────────────────────────
  const workoutDates = new Set(allWorkouts.map(w => w.entryDate))

  // ── 1. STREAK ──────────────────────────────────────────────────────────────
  {
    let streak = 0
    const hasToday = workoutDates.has(todayStr)
    let ptr = new Date(todayDate)
    if (!hasToday) ptr.setDate(ptr.getDate() - 1)
    while (true) {
      if (workoutDates.has(formatDate(ptr))) {
        streak++
        ptr.setDate(ptr.getDate() - 1)
      } else break
    }

    if (streak >= 2) {
      insights.push({
        id: 'streak',
        icon: <Flame size={15} />,
        title: streak >= 7
          ? '¡Racha increíble! 🔥'
          : streak >= 4
          ? 'Buena racha en marcha'
          : 'Estás en racha',
        body: streak >= 7
          ? `Llevas ${streak} días consecutivos entrenando. ¡Consistencia de élite!`
          : `Llevas ${streak} días seguidos entrenando. Mantén el ritmo.`,
        accent: 'orange',
        badge: `${streak}d`,
        priority: 1,
      })
    }
  }

  // ── 2. TOP EXERCISE (by frequency) ────────────────────────────────────────
  {
    const freq: Record<string, number> = {}
    allWorkouts.forEach(w =>
      w.exercises?.forEach(e => {
        if (e.exerciseName) freq[e.exerciseName] = (freq[e.exerciseName] || 0) + 1
      })
    )
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      const [name, count] = sorted[0]
      insights.push({
        id: 'top_exercise',
        icon: <Dumbbell size={15} />,
        title: 'Tu ejercicio favorito',
        body: `${name} es el ejercicio que más has entrenado, con ${count} sesiones en el historial.`,
        accent: 'blue',
        badge: `${count}×`,
        priority: 5,
      })
    }
  }

  // ── 3. TOP ROUTINE ────────────────────────────────────────────────────────
  {
    const freq: Record<number, number> = {}
    allWorkouts.forEach(w => {
      if (w.routineId != null) freq[w.routineId] = (freq[w.routineId] || 0) + 1
    })
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0) {
      const [rIdStr, count] = sorted[0]
      const routine = routines.find(r => r.id === parseInt(rIdStr))
      const name = routine?.name ?? 'Rutina eliminada'
      insights.push({
        id: 'top_routine',
        icon: <Library size={15} />,
        title: 'Rutina más frecuente',
        body: `«${name}» es la rutina que más repites: ${count} ${count === 1 ? 'vez' : 'veces'} en el historial.`,
        accent: 'purple',
        badge: `${count}×`,
        priority: 6,
      })
    }
  }

  // ── 4. BEST VOLUME WEEK ────────────────────────────────────────────────────
  {
    const weekVol: Record<string, number> = {}
    allWorkouts.forEach(w => {
      const ws = weekStart(w.entryDate)
      if (!weekVol[ws]) weekVol[ws] = 0
      w.exercises?.forEach(ex =>
        ex.sets?.forEach(s => {
          if (s.weight && s.reps) weekVol[ws] += s.reps * s.weight
        })
      )
    })
    const sorted = Object.entries(weekVol).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0 && sorted[0][1] > 0) {
      const [ws, vol] = sorted[0]
      const weekDate = parseDate(ws)
      const endDate = new Date(weekDate)
      endDate.setDate(endDate.getDate() + 6)
      const label = `${shortDate(weekDate)} – ${shortDate(endDate)}`
      const volStr = vol >= 1000 ? `${(vol / 1000).toFixed(1)}k kg` : `${vol} kg`
      insights.push({
        id: 'best_volume_week',
        icon: <Trophy size={15} />,
        title: 'Semana de mayor volumen',
        body: `Tu semana más cargada fue la del ${label}, con ${volStr} de volumen total.`,
        accent: 'amber',
        badge: volStr,
        priority: 7,
      })
    }
  }

  // ── 5. EXERCISE GONE MISSING (>21 days) ───────────────────────────────────
  {
    const lastSeen: Record<string, string> = {}
    allWorkouts.forEach(w =>
      w.exercises?.forEach(e => {
        if (e.exerciseName) {
          const prev = lastSeen[e.exerciseName]
          if (!prev || w.entryDate > prev) lastSeen[e.exerciseName] = w.entryDate
        }
      })
    )
    let longestGone = 0
    let longestName = ''
    let longestDate = ''
    Object.entries(lastSeen).forEach(([name, date]) => {
      const d = daysBetween(parseDate(date), todayDate)
      if (d > longestGone) { longestGone = d; longestName = name; longestDate = date }
    })
    if (longestGone >= 21 && longestName) {
      insights.push({
        id: 'missing_exercise',
        icon: <Clock size={15} />,
        title: 'Ejercicio en el olvido',
        body: `No haces ${longestName} desde hace ${longestGone} días (última vez: ${shortDate(parseDate(longestDate))}). ¿Es el momento de retomarlo?`,
        accent: 'rose',
        badge: `${longestGone}d`,
        priority: 4,
      })
    }
  }

  // ── 6. VOLUME TREND (this week vs last week) ───────────────────────────────
  {
    const weekVol: Record<string, number> = {}
    allWorkouts.forEach(w => {
      const ws = weekStart(w.entryDate)
      if (!weekVol[ws]) weekVol[ws] = 0
      w.exercises?.forEach(ex =>
        ex.sets?.forEach(s => {
          if (s.weight && s.reps) weekVol[ws] += s.reps * s.weight
        })
      )
    })
    // current week start
    const nowDay = todayDate.getDay()
    const diffToMon = nowDay === 0 ? -6 : 1 - nowDay
    const curWeekDate = new Date(todayDate)
    curWeekDate.setDate(todayDate.getDate() + diffToMon)
    const curWs = formatDate(curWeekDate)
    const prevWeekDate = new Date(curWeekDate)
    prevWeekDate.setDate(prevWeekDate.getDate() - 7)
    const prevWs = formatDate(prevWeekDate)

    const curVol = weekVol[curWs] ?? 0
    const prevVol = weekVol[prevWs] ?? 0

    if (prevVol > 0 && curVol > 0) {
      const pct = Math.round(((curVol - prevVol) / prevVol) * 100)
      if (Math.abs(pct) >= 10) {
        const up = pct > 0
        insights.push({
          id: 'volume_trend',
          icon: up ? <TrendingUp size={15} /> : <TrendingDown size={15} />,
          title: up ? 'Volumen en alza esta semana' : 'Volumen más bajo esta semana',
          body: up
            ? `Esta semana llevas un ${pct}% más de volumen que la semana pasada. ¡Buen ritmo!`
            : `Esta semana el volumen bajó un ${Math.abs(pct)}% respecto a la semana pasada. Puede ser descanso planeado o falta de tiempo.`,
          accent: up ? 'emerald' : 'red',
          badge: `${up ? '+' : ''}${pct}%`,
          priority: 2,
        })
      }
    } else if (prevVol > 0 && curVol === 0) {
      // No workout yet this week
      const daysSinceLastWorkout = allWorkouts.length
        ? daysBetween(parseDate(allWorkouts.sort((a, b) => b.entryDate.localeCompare(a.entryDate))[0].entryDate), todayDate)
        : 0
      if (daysSinceLastWorkout >= 4) {
        insights.push({
          id: 'consistency_drop',
          icon: <Info size={15} />,
          title: 'Llevas varios días sin entrenar',
          body: `Tu último entrenamiento fue hace ${daysSinceLastWorkout} días. La consistencia es la clave del progreso.`,
          accent: 'slate',
          badge: `${daysSinceLastWorkout}d`,
          priority: 3,
        })
      }
    }
  }

  // ── 7. RECENT PR DETECTION (last 14 days) ─────────────────────────────────
  {
    // Build all-time best weight per exercise
    const allTimeBest: Record<string, number> = {}
    const recentBest: Record<string, { weight: number; name: string; date: string }> = {}
    const cutoff14 = new Date(todayDate)
    cutoff14.setDate(cutoff14.getDate() - 14)

    allWorkouts.forEach(w => {
      w.exercises?.forEach(e => {
        if (!e.exerciseName) return
        e.sets?.forEach(s => {
          if (!s.weight || !s.reps) return
          const rm = estimate1RM(s.weight, s.reps)
          const prev = allTimeBest[e.exerciseName] ?? 0
          if (rm > prev) allTimeBest[e.exerciseName] = rm
        })
      })
    })

    // Rebuild for recent only — find exercises where the 1RM in last 14d equals allTimeBest
    allWorkouts.forEach(w => {
      const wDate = parseDate(w.entryDate)
      if (wDate < cutoff14) return
      w.exercises?.forEach(e => {
        if (!e.exerciseName) return
        e.sets?.forEach(s => {
          if (!s.weight || !s.reps) return
          const rm = estimate1RM(s.weight, s.reps)
          if (rm >= (allTimeBest[e.exerciseName] ?? 0)) {
            const prev = recentBest[e.exerciseName]
            if (!prev || rm > prev.weight) {
              recentBest[e.exerciseName] = { weight: rm, name: e.exerciseName, date: w.entryDate }
            }
          }
        })
      })
    })

    const prs = Object.values(recentBest).sort((a, b) => b.weight - a.weight)
    if (prs.length > 0) {
      const top = prs[0]
      const extra = prs.length > 1 ? ` (y ${prs.length - 1} más)` : ''
      insights.push({
        id: 'recent_pr',
        icon: <Zap size={15} />,
        title: `PR reciente en ${top.name}`,
        body: `Estimaste un 1RM de ${top.weight} kg en ${top.name} el ${shortDate(parseDate(top.date))}${extra}. ¡Nuevo máximo del historial!`,
        accent: 'cyan',
        badge: `${top.weight} kg`,
        priority: 1,
      })
    }
  }

  // ── 8. TOP MUSCLE GROUP ────────────────────────────────────────────────────
  {
    const catMap = new Map(catalog.map(c => [c.id, c.muscleGroup]))
    const mFreq: Record<string, number> = {}
    allWorkouts.forEach(w =>
      w.exercises?.forEach(e => {
        const mg = e.exerciseCatalogId ? (catMap.get(e.exerciseCatalogId) ?? 'Otros') : 'Otros'
        mFreq[mg] = (mFreq[mg] || 0) + (e.sets?.length ?? 0)
      })
    )
    const sorted = Object.entries(mFreq).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0 && sorted[0][0] !== 'Otros') {
      const [group, sets] = sorted[0]
      insights.push({
        id: 'top_muscle',
        icon: <Layers size={15} />,
        title: 'Grupo muscular más trabajado',
        body: `${group} es el grupo que más has entrenado con ${sets} series en total. ¿Hay otros grupos que merezcan más atención?`,
        accent: 'violet',
        badge: `${sets} sets`,
        priority: 8,
      })
    }
  }

  // ── Sort by priority, cap at 6 ─────────────────────────────────────────────
  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6)
}

// ─── Accent map ──────────────────────────────────────────────────────────────

const ACCENT: Record<string, { border: string; iconBg: string; iconText: string; badgeBg: string; badgeText: string }> = {
  orange:  { border: 'border-orange-400/25',  iconBg: 'bg-orange-400/15',  iconText: 'text-orange-400',  badgeBg: 'bg-orange-400/12',  badgeText: 'text-orange-300'  },
  blue:    { border: 'border-blue-400/25',    iconBg: 'bg-blue-400/15',    iconText: 'text-blue-400',    badgeBg: 'bg-blue-400/12',    badgeText: 'text-blue-300'    },
  purple:  { border: 'border-purple-400/25',  iconBg: 'bg-purple-400/15',  iconText: 'text-purple-400',  badgeBg: 'bg-purple-400/12',  badgeText: 'text-purple-300'  },
  amber:   { border: 'border-amber-400/25',   iconBg: 'bg-amber-400/15',   iconText: 'text-amber-400',   badgeBg: 'bg-amber-400/12',   badgeText: 'text-amber-300'   },
  rose:    { border: 'border-rose-400/25',    iconBg: 'bg-rose-400/15',    iconText: 'text-rose-400',    badgeBg: 'bg-rose-400/12',    badgeText: 'text-rose-300'    },
  emerald: { border: 'border-emerald-400/25', iconBg: 'bg-emerald-400/15', iconText: 'text-emerald-400', badgeBg: 'bg-emerald-400/12', badgeText: 'text-emerald-300' },
  red:     { border: 'border-red-400/25',     iconBg: 'bg-red-400/15',     iconText: 'text-red-400',     badgeBg: 'bg-red-400/12',     badgeText: 'text-red-300'     },
  cyan:    { border: 'border-cyan-400/25',    iconBg: 'bg-cyan-400/15',    iconText: 'text-cyan-400',    badgeBg: 'bg-cyan-400/12',    badgeText: 'text-cyan-300'    },
  violet:  { border: 'border-violet-400/25',  iconBg: 'bg-violet-400/15',  iconText: 'text-violet-400',  badgeBg: 'bg-violet-400/12',  badgeText: 'text-violet-300'  },
  slate:   { border: 'border-slate-400/20',   iconBg: 'bg-slate-400/10',   iconText: 'text-slate-400',   badgeBg: 'bg-slate-400/10',   badgeText: 'text-slate-400'   },
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  allWorkouts: EntryWorkout[]
  catalog: ExerciseCatalog[]
  routines: Routine[]
}

export function WorkoutAutoInsights({ allWorkouts, catalog, routines }: Props) {
  const insights = useMemo(
    () => buildInsights(allWorkouts, catalog, routines),
    [allWorkouts, catalog, routines]
  )

  if (insights.length === 0) return null

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Insights automáticos</span>
        <span className="text-[9px] text-white/15 bg-surface-200/50 px-1.5 py-0.5 rounded-full border border-white/[0.04]">
          {insights.length}
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {insights.map((ins, i) => {
          const ac = ACCENT[ins.accent] ?? ACCENT.slate
          return (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className={`
                glass-card relative overflow-hidden
                border-l-2 ${ac.border}
                px-4 py-3.5 flex items-start gap-3
              `}
            >
              {/* Icon */}
              <div className={`w-7 h-7 rounded-lg ${ac.iconBg} ${ac.iconText} flex items-center justify-center shrink-0 mt-0.5`}>
                {ins.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white/80 leading-snug">{ins.title}</p>
                <p className="text-[11px] text-white/40 leading-relaxed mt-1">{ins.body}</p>
              </div>

              {/* Badge */}
              {ins.badge && (
                <span className={`shrink-0 text-[10px] font-bold tabular-nums ${ac.badgeBg} ${ac.badgeText} px-2 py-0.5 rounded-lg self-start mt-0.5`}>
                  {ins.badge}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
