import { Circle, Clock, CheckCircle2 } from 'lucide-react'
import type { TaskStatus } from '@/data/types'
import { todayStr } from './taskOperations'

export const STATUS_CFG: Record<TaskStatus, { label: string; icon: any; color: string }> = {
  pending:     { label: 'Pendiente',   icon: Circle,       color: 'text-white/40' },
  in_progress: { label: 'En progreso', icon: Clock,        color: 'text-amber-400' },
  completed:   { label: 'Completada',  icon: CheckCircle2, color: 'text-emerald-400' },
}

export const LIST_COLORS = ['#7c5bf5', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']

export const RECURRENCE_OPTIONS = [
  { value: '', label: 'No repetir' },
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
]

export const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'date', label: 'Fecha' },
  { value: 'recent', label: 'Recientes' },
]

export const TASK_FOCUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Sin filtro' },
  { value: 'today', label: 'Vence hoy' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'unassigned', label: 'Sin lista' },
]

export const RECURRENCE_EDIT_SCOPE_OPTIONS = [
  { value: 'single', label: 'Solo esta ocurrencia' },
  { value: 'series', label: 'Serie desde aqui' },
]

export type ViewTab = 'tasks' | 'lists'
export type SortMode = 'manual' | 'date' | 'recent'
export type CompletionVisibility = 'active' | 'completed' | 'all'
export type TaskFocusFilter = 'all' | 'today' | 'overdue' | 'scheduled' | 'unassigned'
export type RecurrenceEditScope = 'single' | 'series'

export function parseQuickCapture(raw: string) {
  let title = raw.trim()
  let dueDate: string | undefined
  const tags: string[] = []

  title = title.replace(/#(\S+)/g, (_, tag) => { tags.push(tag); return '' })

  const t = todayStr()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  const dateKeywords: Record<string, string> = {
    'hoy': t, 'today': t,
    'manana': tomorrowStr, 'mañana': tomorrowStr, 'tomorrow': tomorrowStr,
  }
  for (const [key, val] of Object.entries(dateKeywords)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi')
    if (regex.test(title)) {
      dueDate = val
      title = title.replace(regex, '')
    }
  }

  return { title: title.replace(/\s+/g, ' ').trim(), dueDate, tags: tags.length ? JSON.stringify(tags) : undefined }
}
