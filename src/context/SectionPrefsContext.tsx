import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
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
  weightUnit: 'kg' | 'lbs'
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
      const weightUnit: 'kg' | 'lbs' = p.weightUnit === 'lbs' ? 'lbs' : 'kg'
      return { enabled, advanced, dashboardOrder, activityFields, activeSports, weightUnit }
    }
  } catch { /* ignore */ }
  return { enabled: { ...DEFAULT_ENABLED }, advanced: { ...DEFAULT_ADVANCED }, dashboardOrder: [...ALL_IDS], activityFields: { ...DEFAULT_ACTIVITY_FIELDS }, activeSports: [...DEFAULT_ACTIVE_SPORTS], weightUnit: 'kg' }
}

interface SectionPrefsCtx {
  enabled: Record<SectionId, boolean>
  advanced: Record<SectionId, boolean>
  dashboardOrder: SectionId[]
  activityFields: Record<string, string[]>
  activeSports: string[]
  weightUnit: 'kg' | 'lbs'
  toggle: (id: SectionId) => void
  toggleAdvanced: (id: SectionId) => void
  moveUp: (id: SectionId) => void
  moveDown: (id: SectionId) => void
  setDashboardOrder: (order: SectionId[]) => void
  toggleActivityField: (activityType: string, field: string) => void
  toggleActiveSport: (sport: string) => void
  setWeightUnit: (unit: 'kg' | 'lbs') => void
}

const Ctx = createContext<SectionPrefsCtx | null>(null)

export function SectionPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(loadPrefs)

  const save = useCallback((next: ReturnType<typeof loadPrefs>) => {
    setPrefs(next)
    localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
  }, [])

  const toggle = useCallback((id: SectionId) => {
    setPrefs(prev => {
      const next = { ...prev, enabled: { ...prev.enabled, [id]: !prev.enabled[id] } }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const toggleAdvanced = useCallback((id: SectionId) => {
    setPrefs(prev => {
      const next = { ...prev, advanced: { ...prev.advanced, [id]: !prev.advanced[id] } }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const moveUp = useCallback((id: SectionId) => {
    setPrefs(prev => {
      const i = prev.dashboardOrder.indexOf(id)
      if (i <= 0) return prev
      const order = [...prev.dashboardOrder]
      ;[order[i - 1], order[i]] = [order[i], order[i - 1]]
      const next = { ...prev, dashboardOrder: order }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const moveDown = useCallback((id: SectionId) => {
    setPrefs(prev => {
      const i = prev.dashboardOrder.indexOf(id)
      if (i < 0 || i >= prev.dashboardOrder.length - 1) return prev
      const order = [...prev.dashboardOrder]
      ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
      const next = { ...prev, dashboardOrder: order }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const setDashboardOrder = useCallback((order: SectionId[]) => {
    setPrefs(prev => {
      const sanitized = order.filter(id => ALL_IDS.includes(id))
      const merged: SectionId[] = [
        ...sanitized,
        ...ALL_IDS.filter(id => !sanitized.includes(id)),
      ]
      const next = { ...prev, dashboardOrder: merged }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const toggleActivityField = useCallback((activityType: string, field: string) => {
    setPrefs(prev => {
      const currentFields = prev.activityFields[activityType] || []
      const nextFields = currentFields.includes(field)
        ? currentFields.filter(f => f !== field)
        : [...currentFields, field]
      const next = { ...prev, activityFields: { ...prev.activityFields, [activityType]: nextFields } }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const toggleActiveSport = useCallback((sport: string) => {
    setPrefs(prev => {
      const nextSports = prev.activeSports.includes(sport)
        ? prev.activeSports.filter(s => s !== sport)
        : [...prev.activeSports, sport]
      const next = { ...prev, activeSports: nextSports }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const setWeightUnit = useCallback((unit: 'kg' | 'lbs') => {
    setPrefs(prev => {
      const next = { ...prev, weightUnit: unit }
      localStorage.setItem('lifeos-section-prefs', JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(() => ({
    ...prefs, toggle, toggleAdvanced, moveUp, moveDown, setDashboardOrder, toggleActivityField, toggleActiveSport, setWeightUnit
  }), [prefs, toggle, toggleAdvanced, moveUp, moveDown, setDashboardOrder, toggleActivityField, toggleActiveSport, setWeightUnit])

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  )
}

export function useSectionPrefs() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSectionPrefs must be used within SectionPrefsProvider')
  return ctx
}

const KG_TO_LBS = 2.20462

export function useWeightUnit() {
  const { weightUnit, setWeightUnit } = useSectionPrefs()

  const kgToDisplay = useCallback((kg: number): number => {
    if (weightUnit === 'lbs') return Math.round(kg * KG_TO_LBS * 10) / 10
    return kg
  }, [weightUnit])

  const displayToKg = useCallback((val: number): number => {
    if (weightUnit === 'lbs') return Math.round((val / KG_TO_LBS) * 100) / 100
    return val
  }, [weightUnit])

  const fmtWeight = useCallback((kg: number): string => {
    const v = kgToDisplay(kg)
    const rounded = weightUnit === 'lbs' ? v.toFixed(1) : (Number.isInteger(v) ? String(v) : v.toFixed(1))
    return `${rounded} ${weightUnit}`
  }, [kgToDisplay, weightUnit])

  const inputStep = weightUnit === 'lbs' ? '1' : '0.5'
  const inputStepBody = weightUnit === 'lbs' ? '0.5' : '0.1'

  return { unit: weightUnit, setUnit: setWeightUnit, kgToDisplay, displayToKg, fmtWeight, inputStep, inputStepBody }
}
