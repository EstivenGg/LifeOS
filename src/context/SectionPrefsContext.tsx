import { createContext, useContext, useState, ReactNode } from 'react'
import {
  Smile, ListChecks, Moon, Droplets, Smartphone,
  GraduationCap, BookOpen, Dumbbell, Timer, Brain, Scale,
  type LucideIcon,
} from 'lucide-react'

export const SECTION_DEFS = [
  { id: 'mood' as const, label: 'Mood', icon: Smile, daylog: true, hasAdvanced: false },
  { id: 'habits' as const, label: 'Habitos', icon: ListChecks, daylog: true, hasAdvanced: false },
  { id: 'sleep' as const, label: 'Sueno', icon: Moon, daylog: true, hasAdvanced: true },
  { id: 'water' as const, label: 'Agua', icon: Droplets, daylog: true, hasAdvanced: false },
  { id: 'screentime' as const, label: 'Pantalla', icon: Smartphone, daylog: true, hasAdvanced: false },
  { id: 'study' as const, label: 'Estudio', icon: GraduationCap, daylog: true, hasAdvanced: true },
  { id: 'reading' as const, label: 'Lectura', icon: BookOpen, daylog: true, hasAdvanced: true },
  { id: 'workout' as const, label: 'Actividad Fisica', icon: Dumbbell, daylog: true, hasAdvanced: true },
  { id: 'pomodoro' as const, label: 'Pomodoro', icon: Timer, daylog: false, hasAdvanced: false },
  { id: 'meditation' as const, label: 'Meditacion', icon: Brain, daylog: true, hasAdvanced: true },
  { id: 'weight' as const, label: 'Peso', icon: Scale, daylog: true, hasAdvanced: false },
]

export type SectionDef = typeof SECTION_DEFS[number]
export type SectionId = SectionDef['id']

// Default fields per activity type
export const DEFAULT_ACTIVITY_FIELDS: Record<string, string[]> = {
  running: ['distanceKm', 'durationMin', 'pace'],
  swimming: ['distanceKm', 'durationMin', 'laps'],
  cycling: ['distanceKm', 'durationMin', 'speed', 'elevationGain'],
  hiking: ['distanceKm', 'durationMin', 'elevationGain', 'maxAltitude'],
  walking: ['distanceKm', 'durationMin', 'steps'],
  sports: ['sportType', 'durationMin', 'intensity'],
  other: ['title', 'durationMin', 'notes']
}

export const DEFAULT_ACTIVE_SPORTS: string[] = ['gym', 'running', 'swimming', 'cycling']

const ALL_IDS: SectionId[] = SECTION_DEFS.map(s => s.id)

const DEFAULT_ENABLED = Object.fromEntries(ALL_IDS.map(id => [id, true])) as Record<SectionId, boolean>
const DEFAULT_ADVANCED = Object.fromEntries(ALL_IDS.map(id => [id, false])) as Record<SectionId, boolean>

function loadPrefs(): {
  enabled: Record<SectionId, boolean>
  advanced: Record<SectionId, boolean>
  dashboardOrder: SectionId[]
  activityFields: Record<string, string[]>
  activeSports: string[]
} {
  try {
    const raw = localStorage.getItem('lifeos-section-prefs')
    if (raw) {
      const p = JSON.parse(raw)
      const enabled: Record<SectionId, boolean> = { ...DEFAULT_ENABLED, ...(p.enabled || {}) }
      const advanced: Record<SectionId, boolean> = { ...DEFAULT_ADVANCED, ...(p.advanced || {}) }
      const stored: SectionId[] = ((p.dashboardOrder as string[]) || []).filter(id => ALL_IDS.includes(id as SectionId)) as SectionId[]
      const dashboardOrder: SectionId[] = [
        ...stored,
        ...ALL_IDS.filter(id => !stored.includes(id)),
      ]
      const activityFields: Record<string, string[]> = { ...DEFAULT_ACTIVITY_FIELDS, ...(p.activityFields || {}) }
      const activeSports: string[] = p.activeSports || DEFAULT_ACTIVE_SPORTS
      return { enabled, advanced, dashboardOrder, activityFields, activeSports }
    }
  } catch { /* ignore */ }
  return { enabled: { ...DEFAULT_ENABLED }, advanced: { ...DEFAULT_ADVANCED }, dashboardOrder: [...ALL_IDS], activityFields: { ...DEFAULT_ACTIVITY_FIELDS }, activeSports: [...DEFAULT_ACTIVE_SPORTS] }
}

interface SectionPrefsCtx {
  enabled: Record<SectionId, boolean>
  advanced: Record<SectionId, boolean>
  dashboardOrder: SectionId[]
  activityFields: Record<string, string[]>
  activeSports: string[]
  toggle: (id: SectionId) => void
  toggleAdvanced: (id: SectionId) => void
  moveUp: (id: SectionId) => void
  moveDown: (id: SectionId) => void
  setDashboardOrder: (order: SectionId[]) => void
  toggleActivityField: (activityType: string, field: string) => void
  toggleActiveSport: (sport: string) => void
}

const Ctx = createContext<SectionPrefsCtx | null>(null)

export function SectionPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(loadPrefs)

  function save(next: typeof prefs) {
    setPrefs(next)
    localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
  }

  function toggle(id: SectionId) {
    save({ ...prefs, enabled: { ...prefs.enabled, [id]: !prefs.enabled[id] } })
  }

  function toggleAdvanced(id: SectionId) {
    save({ ...prefs, advanced: { ...prefs.advanced, [id]: !prefs.advanced[id] } })
  }

  function moveUp(id: SectionId) {
    const i = prefs.dashboardOrder.indexOf(id)
    if (i <= 0) return
    const next = [...prefs.dashboardOrder]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    save({ ...prefs, dashboardOrder: next })
  }

  function moveDown(id: SectionId) {
    const i = prefs.dashboardOrder.indexOf(id)
    if (i < 0 || i >= prefs.dashboardOrder.length - 1) return
    const next = [...prefs.dashboardOrder]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    save({ ...prefs, dashboardOrder: next })
  }

  function setDashboardOrder(order: SectionId[]) {
    const sanitized = order.filter(id => ALL_IDS.includes(id))
    const next: SectionId[] = [
      ...sanitized,
      ...ALL_IDS.filter(id => !sanitized.includes(id)),
    ]
    save({ ...prefs, dashboardOrder: next })
  }

  function toggleActivityField(activityType: string, field: string) {
    const currentFields = prefs.activityFields[activityType] || []
    const nextFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field]

    save({
      ...prefs,
      activityFields: { ...prefs.activityFields, [activityType]: nextFields }
    })
  }

  function toggleActiveSport(sport: string) {
    const next = prefs.activeSports.includes(sport)
      ? prefs.activeSports.filter(s => s !== sport)
      : [...prefs.activeSports, sport]
    save({ ...prefs, activeSports: next })
  }

  return (
    <Ctx.Provider value={{ ...prefs, toggle, toggleAdvanced, moveUp, moveDown, setDashboardOrder, toggleActivityField, toggleActiveSport }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSectionPrefs() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSectionPrefs must be used within SectionPrefsProvider')
  return ctx
}
