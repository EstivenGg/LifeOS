import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, FolderOpen,
  ChevronDown, ChevronRight, Circle, Clock, CheckCircle2,
  CalendarDays, Tag, Trash2, Pencil,
  X, Square, SquareCheckBig, ListTodo,
  AlertTriangle, Repeat, Copy,
  CheckCheck, SlidersHorizontal,
} from 'lucide-react'
import { db } from '@/data/db'
import type { Task, TaskList, TaskStatus, ListTemplate } from '@/data/types'
import { Modal, Card, EmptyState, SheetSelect, DatePicker } from '@/components/ui'
import { showSaved } from '@/utils/toast'
import {
  addDays,
  addMonths,
  deleteFutureRecurringInstances,
  deleteTaskSeries,
  loadTaskCollections,
  now,
  todayStr,
  toggleTaskStatus,
} from './taskOperations'

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_CFG: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  pending:     { label: 'Pendiente',   icon: Circle,       color: 'text-white/40' },
  in_progress: { label: 'En progreso', icon: Clock,        color: 'text-amber-400' },
  completed:   { label: 'Completada',  icon: CheckCircle2, color: 'text-emerald-400' },
}

const LIST_COLORS = ['#7c5bf5', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']
const RECURRENCE_OPTIONS = [
  { value: '', label: 'No repetir' },
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
]
const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'date', label: 'Fecha' },
  { value: 'recent', label: 'Recientes' },
]
const TASK_FOCUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Sin filtro' },
  { value: 'today', label: 'Vence hoy' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'unassigned', label: 'Sin lista' },
]

const RECURRENCE_EDIT_SCOPE_OPTIONS = [
  { value: 'single', label: 'Solo esta ocurrencia' },
  { value: 'series', label: 'Serie desde aqui' },
]

type ViewTab = 'tasks' | 'lists'
type SortMode = 'manual' | 'date' | 'recent'
type CompletionVisibility = 'active' | 'completed' | 'all'
type TaskFocusFilter = 'all' | 'today' | 'overdue' | 'scheduled' | 'unassigned'
type RecurrenceEditScope = 'single' | 'series'

/* ─── Smart capture parser ──────────────────────────────────────────────── */

function parseQuickCapture(raw: string) {
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

/* ─── Recurring task generation ─────────────────────────────────────────── */

/* ─── Main Component ────────────────────────────────────────────────────── */

export function TasksPage() {
  const [tab, setTab] = useState<ViewTab>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [templates, setTemplates] = useState<ListTemplate[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [completionVisibility, setCompletionVisibility] = useState<CompletionVisibility>('active')
  const [taskFocusFilter, setTaskFocusFilter] = useState<TaskFocusFilter>('all')

  // Modals
  const [taskModal, setTaskModal] = useState(false)
  const [listModal, setListModal] = useState(false)
  const [templateModal, setTemplateModal] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [editingList, setEditingList] = useState<TaskList | null>(null)
  const [selectedListId, setSelectedListId] = useState<number | null>(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'task' | 'list' | 'template'; id: number; label: string; extra?: string } | null>(null)

  // Quick capture
  const [quickTitle, setQuickTitle] = useState('')

  // Task form
  const [form, setForm] = useState<{
    title: string; description: string; status: TaskStatus
    dueDate: string; tags: string; listId: number | undefined; parentId: number | undefined
    recurrenceRule: string; recurrenceEndDate: string
  }>({ title: '', description: '', status: 'pending', dueDate: '', tags: '', listId: undefined, parentId: undefined, recurrenceRule: '', recurrenceEndDate: '' })
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [recurrenceEditScope, setRecurrenceEditScope] = useState<RecurrenceEditScope>('single')

  // List form
  const [listForm, setListForm] = useState({ name: '', color: LIST_COLORS[0], dueDate: '' })

  // Template form
  const [tplForm, setTplForm] = useState({ name: '', color: LIST_COLORS[0], items: '' })
  const [editingTpl, setEditingTpl] = useState<ListTemplate | null>(null)

  /* ─── Data loading ──────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const [{ tasks: freshTasks, lists: freshLists }, allTpls] = await Promise.all([
      loadTaskCollections(),
      db.listTemplates.toArray(),
    ])
    setTasks(freshTasks)
    setLists(freshLists)
    setTemplates(allTpls)
  }, [])

  useEffect(() => { load() }, [load])

  /* ─── Filtered & sorted tasks ───────────────────────────────────────── */

  const activeLists = useMemo(() => lists.filter(l => !l.completedAt), [lists])
  const completedLists = useMemo(() => lists.filter(l => !!l.completedAt), [lists])
  const isListDetail = tab === 'lists' && !!selectedListId
  const showTaskWorkspace = tab === 'tasks' || isListDetail

  useEffect(() => {
    if (selectedListId && taskFocusFilter === 'unassigned') {
      setTaskFocusFilter('all')
    }
  }, [selectedListId, taskFocusFilter])

  useEffect(() => {
    setShowFilters(false)
  }, [tab, selectedListId])

  const filteredTasks = useMemo(() => {
    let list = tasks.filter(t => !t.parentId)

    if (tab === 'lists' && selectedListId) {
      list = list.filter(t => t.listId === selectedListId)
    }

    list = list.filter(t => {
      switch (taskFocusFilter) {
        case 'today':
          return t.dueDate === todayStr()
        case 'overdue':
          return !!t.dueDate && t.dueDate < todayStr() && t.status !== 'completed'
        case 'scheduled':
          return !!t.dueDate
        case 'unassigned':
          return !t.listId
        default:
          return true
      }
    })

    const sorted = [...list]
    switch (sortMode) {
      case 'date':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.localeCompare(b.dueDate)
        })
        break
      case 'recent':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        break
    }
    return sorted
  }, [tasks, tab, selectedListId, taskFocusFilter, sortMode])

  const activeFilteredTasks = useMemo(
    () => filteredTasks.filter(t => t.status !== 'completed'),
    [filteredTasks],
  )

  const completedFilteredTasks = useMemo(
    () => filteredTasks.filter(t => t.status === 'completed'),
    [filteredTasks],
  )

  const visibleTasks = useMemo(() => {
    if (completionVisibility === 'completed') return completedFilteredTasks
    if (completionVisibility === 'all') return filteredTasks
    return activeFilteredTasks
  }, [completionVisibility, filteredTasks, completedFilteredTasks, activeFilteredTasks])

  const subtasksOf = useCallback((parentId: number) =>
    tasks
      .filter(t => t.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  , [tasks])

  const getRecurringSourceTask = useCallback((task: Task) => {
    if (task.recurrenceSourceId) return tasks.find(candidate => candidate.id === task.recurrenceSourceId)
    if (task.isRecurring && !task.recurrenceSourceId) return task
    return undefined
  }, [tasks])

  /* ─── Quick capture ─────────────────────────────────────────────────── */

  const quickAdd = async () => {
    if (!quickTitle.trim()) return
    const parsed = parseQuickCapture(quickTitle)
    if (!parsed.title) return
    const nextListId = tab === 'lists' && selectedListId ? selectedListId : undefined
    const nextDueDate = inheritListDueDate(nextListId, parsed.dueDate)
    await db.tasks.add({
      title: parsed.title,
      status: 'pending',
      dueDate: nextDueDate,
      tags: parsed.tags,
      sortOrder: tasks.length,
      listId: nextListId,
      createdAt: now(),
    })
    await reopenListIfNeeded(nextListId)
    setQuickTitle('')
    await load()
    showSaved()
  }

  /* ─── Task CRUD ─────────────────────────────────────────────────────── */

  const openNewTask = (listId?: number) => {
    setEditingTask(null)
    setRecurrenceEditScope('single')
    setForm({
      title: '', description: '', status: 'pending',
      dueDate: '', tags: '', listId: listId ?? (tab === 'lists' && selectedListId ? selectedListId : undefined),
      parentId: undefined, recurrenceRule: '', recurrenceEndDate: '',
    })
    setTaskModal(true)
  }

  const openEditTask = (t: Task) => {
    setEditingTask(t)
    setRecurrenceEditScope(t.recurrenceSourceId ? 'single' : 'series')
    setForm({
      title: t.title, description: t.description || '', status: t.status === 'completed' ? 'completed' : 'pending',
      dueDate: t.dueDate || '', tags: t.tags || '',
      listId: t.listId, parentId: t.parentId,
      recurrenceRule: t.recurrenceSourceId ? '' : (t.recurrenceRule || ''),
      recurrenceEndDate: t.recurrenceSourceId ? '' : (t.recurrenceEndDate || ''),
    })
    setTaskModal(true)
  }

  const applyOccurrenceEditToSeries = async (occurrence: Task, data: Omit<Task, 'id'>) => {
    const sourceTask = getRecurringSourceTask(occurrence)
    if (!sourceTask?.id || !occurrence.id) {
      await db.tasks.update(occurrence.id!, data)
      return
    }

    const oldOccurrenceDate = occurrence.dueDate || data.dueDate
    const newAnchorDate = data.dueDate || oldOccurrenceDate
    const startDate = oldOccurrenceDate && newAnchorDate
      ? (oldOccurrenceDate < newAnchorDate ? oldOccurrenceDate : newAnchorDate)
      : (newAnchorDate || oldOccurrenceDate)

    if (startDate) {
      await deleteFutureRecurringInstances(sourceTask.id, startDate, occurrence.id)
    }

    const seriesContinues = !!data.recurrenceRule
    const sourcePatch: Partial<Task> = {
      title: data.title,
      description: data.description,
      tags: data.tags,
      listId: data.listId,
      isRecurring: seriesContinues,
      recurrenceRule: data.recurrenceRule,
      lastGeneratedDate: seriesContinues && newAnchorDate
        ? newAnchorDate
        : sourceTask.lastGeneratedDate,
    }

    if (!seriesContinues) {
      sourcePatch.lastGeneratedDate = undefined
    }

    await db.tasks.update(sourceTask.id, sourcePatch)
    await db.tasks.update(occurrence.id, {
      ...data,
      isRecurring: seriesContinues,
      recurrenceRule: data.recurrenceRule,
      recurrenceSourceId: seriesContinues ? sourceTask.id : undefined,
    })
  }

  const saveTask = async () => {
    if (!form.title.trim()) return
    const trimmedTitle = form.title.trim()
    const description = form.description.trim() || undefined
    const tagsValue = form.tags.trim()
      ? JSON.stringify(form.tags.split(',').map(t => t.trim()).filter(Boolean))
      : undefined
    const dueDate = inheritListDueDate(form.listId, form.dueDate || undefined)
    const applySeriesEdit = !!editingTask?.recurrenceSourceId && recurrenceEditScope === 'series'
    const sourceTask = editingTask ? getRecurringSourceTask(editingTask) : undefined
    const canEditRecurrence = !editingTask?.recurrenceSourceId || applySeriesEdit
    const recurrenceRule = canEditRecurrence ? (form.recurrenceRule || undefined) : editingTask?.recurrenceRule
    const isRecurring = canEditRecurrence ? !!recurrenceRule : !!editingTask?.isRecurring
    if (isRecurring) {
      if (!dueDate) {
        toast.error('Selecciona la fecha de inicio de la recurrencia')
        return
      }
      if (!form.recurrenceEndDate) {
        toast.error('Selecciona la fecha de fin de la recurrencia')
        return
      }
      if (form.recurrenceEndDate < dueDate) {
        toast.error('La fecha de fin debe ser posterior a la fecha de inicio')
        return
      }
    }
    const recurrenceEndDate = canEditRecurrence
      ? (isRecurring ? (form.recurrenceEndDate || undefined) : undefined)
      : editingTask?.recurrenceEndDate
    const data: Omit<Task, 'id'> = {
      title: trimmedTitle,
      description,
      status: form.status,
      dueDate,
      tags: tagsValue,
      listId: form.listId,
      parentId: form.parentId,
      sortOrder: editingTask?.sortOrder ?? tasks.length,
      isRecurring,
      recurrenceRule,
      recurrenceEndDate,
      recurrenceSourceId: editingTask?.recurrenceSourceId,
      createdAt: editingTask?.createdAt ?? now(),
      completedAt: form.status === 'completed' ? (editingTask?.completedAt ?? now()) : undefined,
      lastGeneratedDate: editingTask?.recurrenceSourceId
        ? editingTask.lastGeneratedDate
        : isRecurring
          ? (editingTask?.lastGeneratedDate ?? dueDate)
          : undefined,
    }
    if (editingTask?.id) {
      if (applySeriesEdit) {
        const seriesData: Omit<Task, 'id'> = {
          ...data,
          recurrenceRule,
          isRecurring: !!recurrenceRule,
          recurrenceSourceId: editingTask.recurrenceSourceId,
          lastGeneratedDate: dueDate,
        }
        await applyOccurrenceEditToSeries(editingTask, seriesData)
      } else {
      const isSingleOccurrenceEdit = !!editingTask.recurrenceSourceId && recurrenceEditScope === 'single'
      const occurrenceData = isSingleOccurrenceEdit
        ? {
            ...data,
            isRecurring: false,
            recurrenceRule: undefined,
            recurrenceSourceId: undefined,
            lastGeneratedDate: undefined,
          }
        : data
      const shouldRefreshFutureOccurrences =
        !editingTask.recurrenceSourceId &&
        !!editingTask.isRecurring &&
        (
          editingTask.recurrenceRule !== recurrenceRule ||
          editingTask.dueDate !== dueDate ||
          editingTask.title !== trimmedTitle ||
          editingTask.description !== description ||
          editingTask.tags !== tagsValue ||
          editingTask.listId !== form.listId ||
          editingTask.recurrenceEndDate !== recurrenceEndDate
        )

      if (shouldRefreshFutureOccurrences) {
        await deleteFutureRecurringInstances(editingTask.id, todayStr())
        data.lastGeneratedDate = dueDate
      }

      await db.tasks.update(editingTask.id, occurrenceData)
      }
    } else {
      await db.tasks.add(data)
    }
    if (data.status !== 'completed') {
      await reopenListIfNeeded(data.listId)
      if (applySeriesEdit && sourceTask?.listId !== data.listId) {
        await reopenListIfNeeded(sourceTask?.listId)
      }
    }
    setTaskModal(false)
    await load()
    showSaved()
  }

  const requestDeleteTask = (t: Task) => {
    const subs = tasks.filter(s => s.parentId === t.id)
    const recurringInstances = tasks.filter(instance => instance.recurrenceSourceId === t.id)
    if (subs.length > 0 || recurringInstances.length > 0) {
      const parts: string[] = []
      if (subs.length) parts.push(`${subs.length} subtarea${subs.length > 1 ? 's' : ''}`)
      if (recurringInstances.length) parts.push(`${recurringInstances.length} ocurrencia${recurringInstances.length > 1 ? 's' : ''}`)
      setConfirmDelete({ type: 'task', id: t.id!, label: t.title, extra: `Tiene ${parts.join(' y ')}` })
    } else {
      executeDeleteTask(t.id!)
    }
  }

  const executeDeleteTask = async (id: number) => {
    await deleteTaskSeries(id, tasks)
    if (detailTask?.id === id) setDetailTask(null)
    setConfirmDelete(null)
    await load()
  }

  const toggleStatus = async (t: Task) => {
    const next: TaskStatus = t.status === 'completed' ? 'pending' : 'completed'
    const nextCompletedAt = next === 'completed' ? now() : undefined
    await toggleTaskStatus(t, tasks)
    if (detailTask?.id === t.id) setDetailTask({ ...t, status: next, completedAt: nextCompletedAt })
    await load()
  }

  /* ─── Archive ───────────────────────────────────────────────────────── */

  const completeList = async (l: TaskList) => {
    const listTasks = tasks.filter(task => task.listId === l.id)
    for (const task of listTasks) {
      await db.tasks.update(task.id!, {
        status: 'completed',
        completedAt: task.completedAt ?? now(),
      })
    }

    await db.taskLists.update(l.id!, {
      completedAt: now(),
    })

    setCompletionVisibility('all')
    await load()
  }

  /* ─── Subtask helpers ───────────────────────────────────────────────── */

  const addSubtask = async (parentId: number, title: string) => {
    if (!title.trim()) return
    const siblings = tasks.filter(t => t.parentId === parentId)
    const parentTask = tasks.find(t => t.id === parentId)
    await db.tasks.add({
      title: title.trim(),
      parentId,
      listId: parentTask?.listId,
      status: 'pending',
      dueDate: parentTask?.dueDate || inheritListDueDate(parentTask?.listId),
      sortOrder: siblings.length,
      createdAt: now(),
    })
    // If parent was completed, reopen it since there's a new pending subtask
    const parent = parentTask
    if (parent?.status === 'completed') {
      await db.tasks.update(parentId, { status: 'pending', completedAt: undefined })
    }
    await reopenListIfNeeded(parent?.listId)
    await load()
  }

  /* ─── Checklist CRUD ────────────────────────────────────────────────── */

  /* ─── List CRUD ─────────────────────────────────────────────────────── */

  const openNewList = () => {
    setEditingList(null)
    setListForm({ name: '', color: LIST_COLORS[0], dueDate: '' })
    setListModal(true)
  }

  const openEditList = (l: TaskList) => {
    setEditingList(l)
    setListForm({ name: l.name, color: l.color, dueDate: l.dueDate || '' })
    setListModal(true)
  }

  const saveList = async () => {
    if (!listForm.name.trim()) return
    if (editingList?.id) {
      await db.taskLists.update(editingList.id, {
        name: listForm.name.trim(),
        color: listForm.color,
        dueDate: listForm.dueDate || undefined,
      })
      await applyListDueDateToTasks(editingList.id, listForm.dueDate || undefined)
    } else {
      await db.taskLists.add({
        name: listForm.name.trim(),
        color: listForm.color,
        dueDate: listForm.dueDate || undefined,
        createdAt: now(),
      })
    }
    setListModal(false)
    await load()
    showSaved()
  }

  const requestDeleteList = (l: TaskList) => {
    const count = tasks.filter(t => t.listId === l.id).length
    setConfirmDelete({
      type: 'list', id: l.id!, label: l.name,
      extra: count > 0 ? `Sus ${count} tarea${count > 1 ? 's' : ''} quedaran sin lista` : undefined,
    })
  }

  const executeDeleteList = async (id: number) => {
    const tasksInList = tasks.filter(t => t.listId === id)
    for (const t of tasksInList) await db.tasks.update(t.id!, { listId: undefined })
    await db.taskLists.delete(id)
    if (selectedListId === id) setSelectedListId(null)
    setConfirmDelete(null)
    await load()
  }

  /* ─── Template CRUD ─────────────────────────────────────────────────── */

  const openNewTemplate = () => {
    setEditingTpl(null)
    setTplForm({ name: '', color: LIST_COLORS[0], items: '' })
    setTemplateModal(true)
  }

  const openEditTemplate = (tpl: ListTemplate) => {
    setEditingTpl(tpl)
    let items = ''
    try { items = JSON.parse(tpl.items).join('\n') } catch { items = tpl.items }
    setTplForm({ name: tpl.name, color: tpl.color, items })
    setTemplateModal(true)
  }

  const saveTemplate = async () => {
    if (!tplForm.name.trim()) return
    const items = JSON.stringify(tplForm.items.split('\n').map(s => s.trim()).filter(Boolean))
    if (editingTpl?.id) {
      await db.listTemplates.update(editingTpl.id, { name: tplForm.name.trim(), color: tplForm.color, items })
    } else {
      await db.listTemplates.add({ name: tplForm.name.trim(), color: tplForm.color, items, createdAt: now() })
    }
    setTemplateModal(false)
    await load()
    showSaved()
  }

  const deleteTemplate = async (id: number) => {
    await db.listTemplates.delete(id)
    setConfirmDelete(null)
    await load()
  }

  const createFromTemplate = async (tpl: ListTemplate) => {
    const listId = await db.taskLists.add({ name: tpl.name, color: tpl.color, createdAt: now() })
    let items: string[] = []
    try { items = JSON.parse(tpl.items) } catch { /* empty */ }
    for (let i = 0; i < items.length; i++) {
      await db.tasks.add({
        title: items[i], listId, status: 'pending',
        sortOrder: i, createdAt: now(),
      })
    }
    await load()
    setTab('lists')
    setSelectedListId(listId as number)
    setCompletionVisibility('active')
    showSaved()
  }

  /* ─── Stats ─────────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const active = tasks.filter(t => !t.parentId)
    const td = todayStr()
    return {
      total: active.length,
      scheduled: active.filter(t => t.dueDate && t.status !== 'completed').length,
      completed: active.filter(t => t.status === 'completed').length,
      overdue: active.filter(t => t.dueDate && t.dueDate < td && t.status !== 'completed').length,
      dueToday: active.filter(t => t.dueDate === td && t.status !== 'completed').length,
    }
  }, [tasks])

  const listName = (id?: number) => lists.find(l => l.id === id)?.name || 'Sin lista'
  const listColor = (id?: number) => lists.find(l => l.id === id)?.color || '#7c5bf5'
  const listById = (id?: number) => lists.find(l => l.id === id)
  const selectedList = listById(selectedListId ?? undefined)
  const focusFilterLabel = TASK_FOCUS_FILTER_OPTIONS.find(option => option.value === taskFocusFilter)?.label || 'Sin filtro'
  const visibleLists = [...activeLists, ...completedLists]

  const inheritListDueDate = (listId?: number, dueDate?: string) => {
    if (dueDate) return dueDate
    return listById(listId)?.dueDate
  }

  const reopenListIfNeeded = async (listId?: number) => {
    const list = listById(listId)
    if (list?.id && list.completedAt) {
      await db.taskLists.update(list.id, { completedAt: undefined })
    }
  }

  const applyListDueDateToTasks = async (listId: number, dueDate?: string) => {
    if (!dueDate) return
    const listTasks = tasks.filter(task => task.listId === listId && !task.dueDate)
    for (const task of listTasks) {
      await db.tasks.update(task.id!, { dueDate })
    }
  }

  const parseTags = (tags?: string): string[] => {
    if (!tags) return []
    try { return JSON.parse(tags) } catch { return tags.split(',').map(t => t.trim()).filter(Boolean) }
  }

  const listTaskCount = (listId: number) => {
    const lt = tasks.filter(t => t.listId === listId && !t.parentId)
    const done = lt.filter(t => t.status === 'completed').length
    return { total: lt.length, done }
  }

  /* ─── Render helpers ────────────────────────────────────────────────── */

  const TaskRow = ({ t, depth = 0 }: { t: Task; depth?: number }) => {
    const subs = subtasksOf(t.id!)
    const tags = parseTags(t.tags)
    const [showSubs, setShowSubs] = useState(true)

    return (
      <>
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className={`group/row flex items-start gap-2 py-2.5 px-3 rounded-xl active:bg-surface-200/50 md:hover:bg-surface-200/40 transition-colors ${
            t.status === 'completed' ? 'opacity-50' : ''
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <button
            onClick={() => toggleStatus(t)}
            className="mt-0.5 shrink-0 text-white/40 transition-colors hover:text-emerald-400 active:scale-90"
            title={t.status === 'completed' ? 'Reabrir' : 'Completar'}
          >
            {t.status === 'completed'
              ? <SquareCheckBig size={18} className="text-emerald-400" />
              : <Square size={18} />}
          </button>

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTask(t)}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium truncate ${t.status === 'completed' ? 'line-through text-white/30' : ''}`}>
                {t.title}
              </span>
              {t.isRecurring && <Repeat size={12} className="shrink-0 text-white/20" />}
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {t.dueDate && (
                <span className={`text-[10px] flex items-center gap-0.5 ${
                  t.dueDate < todayStr() && t.status !== 'completed' ? 'text-red-400' : 'text-white/30'
                }`}>
                  <CalendarDays size={10} /> {t.dueDate}
                </span>
              )}
              {subs.length > 0 && (
                <span className="text-[10px] text-white/30">
                  {subs.filter(s => s.status === 'completed').length}/{subs.length} subtareas
                </span>
              )}
              {tags.map(tag => (
                <span key={tag} className="text-[9px] bg-accent/10 text-accent/70 px-1.5 py-0.5 rounded-md">{tag}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity shrink-0">
            <button onClick={() => openEditTask(t)} className="btn-ghost p-1.5 rounded-lg">
              <Pencil size={13} className="text-white/40" />
            </button>
            <button onClick={() => requestDeleteTask(t)} className="btn-ghost p-1.5 rounded-lg">
              <Trash2 size={13} className="text-white/40" />
            </button>
          </div>

          {subs.length > 0 && (
            <button onClick={() => setShowSubs(!showSubs)} className="mt-0.5 shrink-0 btn-ghost p-1 rounded">
              {showSubs ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
            </button>
          )}
        </motion.div>

        <AnimatePresence>
          {showSubs && subs.map(s => <TaskRow key={s.id} t={s} depth={depth + 1} />)}
        </AnimatePresence>
      </>
    )
  }

  /* ─── Render ────────────────────────────────────────────────────────── */

  const renderTaskList = (items: Task[]) => (
    <div className="divide-y divide-white/[0.03]">
      {items.map(t => <TaskRow key={t.id} t={t} />)}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-6">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">Tareas</h1>
            <p className="text-xs text-white/30 mt-0.5">
              {tab === 'lists' && !selectedListId
                ? 'Listas, plantillas y seguimiento'
                : isListDetail
                  ? 'Vista enfocada por lista'
                  : 'Captura, foco y seguimiento'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={openNewList} className="btn-secondary text-xs">
              <FolderOpen size={14} /> <span className="hidden sm:inline">Nueva lista</span><span className="sm:hidden">Lista</span>
            </button>
            <button onClick={() => openNewTask()} className="btn-primary text-xs">
              <Plus size={14} /> <span className="hidden sm:inline">Nueva tarea</span><span className="sm:hidden">Tarea</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="mb-4 flex justify-center">
        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-surface-100/55 p-1">
          {([
            { key: 'tasks' as ViewTab, label: 'Tareas', icon: ListTodo },
            { key: 'lists' as ViewTab, label: 'Listas', icon: FolderOpen },
          ]).map(view => (
            <button
              key={view.key}
              onClick={() => {
                setTab(view.key)
                setSelectedListId(null)
              }}
              className={`flex items-center gap-1.5 shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                tab === view.key
                  ? 'bg-accent/15 text-accent'
                  : 'text-white/45 hover:bg-surface-200/45 hover:text-white/75'
              }`}
            >
              <view.icon size={13} />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {showTaskWorkspace && (
        <div className="mb-4 flex justify-center">
          <div className="flex bg-surface-200/40 rounded-lg p-0.5">
            {([
              { key: 'active' as CompletionVisibility, label: 'Activas' },
              { key: 'completed' as CompletionVisibility, label: 'Completadas' },
              { key: 'all' as CompletionVisibility, label: 'Todas' },
            ]).map(view => (
              <button
                key={view.key}
                onClick={() => setCompletionVisibility(view.key)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  completionVisibility === view.key
                    ? 'bg-accent/15 text-accent'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showTaskWorkspace ? (
        <Card className="mb-4 !p-3 sm:!p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isListDetail && selectedListId && (
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: listColor(selectedListId) }} />
            )}
            <h2 className="text-sm sm:text-base font-semibold">
              {isListDetail && selectedListId ? listName(selectedListId) : 'Todas las tareas'}
            </h2>
            {selectedList?.completedAt && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-300">
                Lista completada
              </span>
            )}
            {selectedList?.dueDate && (
              <span className={`text-[10px] px-2 py-1 rounded-full border ${
                selectedList.dueDate < todayStr()
                  ? 'border-red-400/20 bg-red-400/10 text-red-300'
                  : 'border-white/[0.08] bg-surface-100/60 text-white/45'
              }`}>
                {selectedList.dueDate}
              </span>
            )}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center">
            <SheetSelect
              value={sortMode}
              onChange={value => setSortMode(value as SortMode)}
              options={SORT_OPTIONS}
              placeholder="Ordenar"
              title="Ordenar tareas"
              className="min-w-0 sm:w-36 sm:shrink-0"
              buttonClassName="h-11 min-h-[44px] text-xs"
            />

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`input-field h-11 min-h-[44px] px-3 text-xs inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                showFilters || taskFocusFilter !== 'all'
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'text-white/65'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filtrar</span>
              {taskFocusFilter !== 'all' && (
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-md bg-accent/20">
                  {focusFilterLabel}
                </span>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-1">
                  {TASK_FOCUS_FILTER_OPTIONS
                    .filter(option => !(isListDetail && option.value === 'unassigned'))
                    .map(option => {
                      const active = taskFocusFilter === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setTaskFocusFilter(option.value as TaskFocusFilter)
                            setShowFilters(false)
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                            active
                              ? 'bg-accent/15 text-accent border border-accent/20'
                              : 'bg-surface-100/60 text-white/45 hover:text-white/70'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </Card>
      ) : (
        <Card className="mb-4 !p-3 sm:!p-4">
          <h2 className="text-sm sm:text-base font-semibold">Listas</h2>
          <p className="text-sm text-white/35 mt-1">
            Organiza tus tareas por proyecto, contexto o rutina sin mezclarlo con los filtros de estado.
          </p>
        </Card>
      )}

      {/* ── Lists tab: overview ───────────────────────────────────────────── */}
      {tab === 'lists' && !selectedListId && (
        <div className="space-y-4">
          {/* Templates bar */}
          {templates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wide">Plantillas</p>
                <button onClick={openNewTemplate} className="btn-ghost text-[10px] text-white/30 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Plus size={12} /> Nueva
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {templates.map(tpl => (
                  <div key={tpl.id} className="shrink-0 bg-surface-100/60 rounded-xl p-3 border border-white/[0.05] min-w-[140px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tpl.color }} />
                      <span className="text-xs font-medium truncate flex-1">{tpl.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => createFromTemplate(tpl)} className="btn-primary text-[9px] px-2 py-1 rounded-lg flex items-center gap-1 flex-1">
                        <Copy size={10} /> Usar
                      </button>
                      <button onClick={() => openEditTemplate(tpl)} className="btn-ghost p-1 rounded-lg">
                        <Pencil size={11} className="text-white/30" />
                      </button>
                      <button onClick={() => setConfirmDelete({ type: 'template', id: tpl.id!, label: tpl.name })} className="btn-ghost p-1 rounded-lg">
                        <Trash2 size={11} className="text-white/30" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeLists.length === 0 && completedLists.length === 0 && templates.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<FolderOpen size={40} />}
                  title="Sin listas aun"
                  desc="Crea listas para organizar tus tareas por contexto"
                  action={
                    <div className="flex gap-2 justify-center mt-2">
                      <button onClick={openNewList} className="btn-primary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5">
                        <Plus size={14} /> Crear lista
                      </button>
                      <button onClick={openNewTemplate} className="btn-secondary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5">
                        <Copy size={14} /> Plantilla
                      </button>
                    </div>
                  }
                />
              </div>
            ) : (
              <>
                {activeLists.map(l => {
                  const { total, done } = listTaskCount(l.id!)
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <Card key={l.id} hover className="!p-4 cursor-pointer" onClick={() => { setSelectedListId(l.id!); setCompletionVisibility('active') }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                          <span className="text-sm font-semibold truncate">{l.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); openEditList(l) }} className="btn-ghost p-1 rounded-lg">
                            <Pencil size={12} className="text-white/30" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); completeList(l) }} className="btn-ghost p-1 rounded-lg" title="Completar lista">
                            <CheckCheck size={12} className="text-emerald-400" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); requestDeleteList(l) }} className="btn-ghost p-1 rounded-lg" title="Eliminar">
                            <Trash2 size={12} className="text-white/30" />
                          </button>
                        </div>
                      </div>
                      {l.dueDate && (
                        <div className={`text-[10px] mb-2 flex items-center gap-1 ${l.dueDate < todayStr() ? 'text-red-400' : 'text-white/30'}`}>
                          <CalendarDays size={10} /> {l.dueDate}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-200/60 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: l.color }} />
                        </div>
                        <span className="text-[10px] text-white/30 shrink-0">{done}/{total}</span>
                      </div>
                    </Card>
                  )
                })}
                <Card className="!p-4 cursor-pointer !border-dashed flex items-center justify-center min-h-[80px]" hover onClick={openNewList}>
                  <div className="flex items-center gap-2 text-white/30">
                    <Plus size={18} /> <span className="text-xs font-medium">Nueva lista</span>
                  </div>
                </Card>
              </>
            )}
          </div>

          {completedLists.length > 0 && (
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Listas completadas</p>
              <div className="space-y-1">
                {completedLists.map(l => {
                  const { total, done } = listTaskCount(l.id!)
                  return (
                    <div key={l.id} className="flex items-center gap-2 px-3 py-2 bg-surface-100/40 rounded-xl cursor-pointer" onClick={() => { setSelectedListId(l.id!); setCompletionVisibility('all') }}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/70 truncate">{l.name}</div>
                        <div className="text-[10px] text-white/30">{done}/{total} completadas</div>
                      </div>
                      <span className="text-[10px] text-emerald-400">Lista terminada</span>
                      <button onClick={e => { e.stopPropagation(); requestDeleteList(l) }} className="btn-ghost p-1 rounded-lg" title="Eliminar">
                        <Trash2 size={13} className="text-white/30" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main content: task list ──────────────────────────────────────── */}
      {showTaskWorkspace && (
        <div className="flex flex-col md:flex-row gap-4">

          {isListDetail && selectedListId && (
            <>
              <div className="flex items-center gap-2 md:hidden">
                <button onClick={() => setSelectedListId(null)} className="btn-ghost p-1.5 rounded-lg">
                  <ChevronRight size={16} className="text-white/40 rotate-180" />
                </button>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: listColor(selectedListId) }} />
                <span className="text-sm font-semibold flex-1">{listName(selectedListId)}</span>
                {selectedList?.completedAt && (
                  <span className="text-[10px] text-emerald-400">Completada</span>
                )}
                {selectedList?.dueDate && (
                  <span className={`text-[10px] ${selectedList.dueDate < todayStr() ? 'text-red-400' : 'text-white/30'}`}>
                    {selectedList.dueDate}
                  </span>
                )}
                <button onClick={() => openEditList(lists.find(l => l.id === selectedListId)!)} className="btn-ghost p-1.5 rounded-lg">
                  <Pencil size={13} className="text-white/40" />
                </button>
                {!selectedList?.completedAt && (
                  <button onClick={() => completeList(lists.find(l => l.id === selectedListId)!)} className="btn-ghost p-1.5 rounded-lg">
                    <CheckCheck size={13} className="text-emerald-400" />
                  </button>
                )}
                <button onClick={() => requestDeleteList(lists.find(l => l.id === selectedListId)!)} className="btn-ghost p-1.5 rounded-lg">
                  <Trash2 size={13} className="text-white/40" />
                </button>
              </div>

              <Card className="hidden md:block w-52 shrink-0 !p-3 space-y-1 self-start">
                <p className="text-[10px] text-white/30 uppercase tracking-wide px-2 mb-1">Mis listas</p>
                {visibleLists.map(l => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setSelectedListId(l.id!)
                      setCompletionVisibility(l.completedAt ? 'all' : 'active')
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      selectedListId === l.id ? 'bg-accent/10 text-accent' : 'text-white/50 hover:bg-surface-200/40'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="truncate flex-1">{l.name}</span>
                    {l.completedAt && <CheckCheck size={11} className="shrink-0 text-emerald-400" />}
                    <span className="text-[10px] text-white/20">
                      {tasks.filter(t => t.listId === l.id && !t.parentId).length}
                    </span>
                  </button>
                ))}
                <button onClick={openNewList} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/50 hover:bg-surface-200/40 transition-all">
                  <Plus size={14} /> Crear lista
                </button>
              </Card>
            </>
          )}

          <Card className="flex-1 !p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-white/[0.05]">
              <Plus size={16} className="text-white/30 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm placeholder:text-white/20 focus:outline-none"
                placeholder={isListDetail && selectedListId ? `Agregar a ${listName(selectedListId)}...` : 'Captura rapida... (#tag manana)'}
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && quickAdd()}
              />
              {quickTitle && (
                <button onClick={quickAdd} className="btn-primary text-[10px] px-2.5 py-1 rounded-lg shrink-0">Agregar</button>
              )}
            </div>

            {isListDetail && selectedListId && (
              <div className="hidden md:flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: listColor(selectedListId) }} />
                  <span className="text-sm font-semibold">{listName(selectedListId)}</span>
                  <span className="text-[10px] text-white/30">{visibleTasks.length} tareas</span>
                  {selectedList?.completedAt && (
                    <span className="text-[10px] text-emerald-400">Lista completada</span>
                  )}
                  {selectedList?.dueDate && (
                    <span className={`text-[10px] flex items-center gap-1 ${selectedList.dueDate < todayStr() ? 'text-red-400' : 'text-white/30'}`}>
                      <CalendarDays size={10} /> {selectedList.dueDate}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditList(lists.find(l => l.id === selectedListId)!)} className="btn-ghost p-1.5 rounded-lg">
                    <Pencil size={13} className="text-white/40" />
                  </button>
                  {!selectedList?.completedAt && (
                    <button onClick={() => completeList(lists.find(l => l.id === selectedListId)!)} className="btn-ghost p-1.5 rounded-lg" title="Completar lista">
                      <CheckCheck size={13} className="text-emerald-400" />
                    </button>
                  )}
                  <button onClick={() => requestDeleteList(lists.find(l => l.id === selectedListId)!)} className="btn-ghost p-1.5 rounded-lg">
                    <Trash2 size={13} className="text-white/40" />
                  </button>
                </div>
              </div>
            )}

            {completionVisibility === 'all' ? (
              visibleTasks.length === 0 ? (
                <EmptyState
                  icon={<ListTodo size={40} />}
                  title="Sin tareas"
                  desc={isListDetail ? 'Agrega tareas a esta lista con la captura rapida.' : 'Agrega tareas con el campo de arriba.'}
                />
              ) : (
                <div>
                  {activeFilteredTasks.length > 0 && (
                    <div>
                      <div className="px-3 sm:px-4 py-2 text-[10px] uppercase tracking-wide text-white/30 border-b border-white/[0.05]">
                        Tareas activas ({activeFilteredTasks.length})
                      </div>
                      {renderTaskList(activeFilteredTasks)}
                    </div>
                  )}
                  {completedFilteredTasks.length > 0 && (
                    <div className="border-t border-white/[0.05]">
                      <div className="px-3 sm:px-4 py-2 text-[10px] uppercase tracking-wide text-white/30">
                        Tareas completadas ({completedFilteredTasks.length})
                      </div>
                      {renderTaskList(completedFilteredTasks)}
                    </div>
                  )}
                </div>
              )
            ) : visibleTasks.length === 0 ? (
              <EmptyState
                icon={completionVisibility === 'completed' ? <CheckCheck size={40} /> : <ListTodo size={40} />}
                title={completionVisibility === 'completed' ? 'Sin completadas' : 'Sin tareas activas'}
                desc={completionVisibility === 'completed'
                  ? 'Las tareas que completes apareceran aqui'
                  : isListDetail
                    ? 'Agrega tareas a esta lista con la captura rapida.'
                    : 'Agrega tareas con el campo de arriba.'}
              />
            ) : renderTaskList(visibleTasks)}
          </Card>
        </div>
      )}

      {/* ── Task Form Modal ───────────────────────────────────────────────── */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title={editingTask ? 'Editar tarea' : 'Nueva tarea'}>
        <div className="space-y-4">
          {/* Titulo */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Título *</label>
            <input className="input-field w-full" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>

          {/* Descripcion */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Descripción</label>
            <textarea className="input-field w-full min-h-[72px] resize-y" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="h-px bg-white/[0.05]" />

          {editingTask?.recurrenceSourceId && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Aplicar cambios</label>
              <SheetSelect
                value={recurrenceEditScope}
                onChange={value => setRecurrenceEditScope(value as RecurrenceEditScope)}
                options={RECURRENCE_EDIT_SCOPE_OPTIONS}
                placeholder="Solo esta ocurrencia"
                title="Alcance de la edicion"
              />
              <p className="text-[11px] text-white/30 mt-2">
                {recurrenceEditScope === 'single'
                  ? 'El estado y los cambios quedan solo en esta fecha.'
                  : 'La serie se actualiza desde esta fecha; las fechas futuras se regeneran con los nuevos datos.'}
              </p>
            </div>
          )}

          {/* Repetir (full width) */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Repetir</label>
            {editingTask?.recurrenceSourceId && recurrenceEditScope === 'single' ? (
              <div className="input-field w-full flex items-center min-h-[42px] text-sm text-white/35">
                No cambia la serie
              </div>
            ) : (
              <SheetSelect
                value={form.recurrenceRule}
                onChange={value => setForm(f => ({ ...f, recurrenceRule: value, recurrenceEndDate: value ? f.recurrenceEndDate : '' }))}
                options={RECURRENCE_OPTIONS}
                placeholder="No repetir"
                title="Repetir tarea"
              />
            )}
          </div>

          {/* Fechas: inicio+fin en 2 col si hay recurrencia, solo fecha límite full-width si no */}
          {form.recurrenceRule ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Fecha de inicio</label>
                <DatePicker
                  value={form.dueDate}
                  onChange={value => setForm({ ...form, dueDate: value || '' })}
                  placeholder="Inicio"
                  allowClear={false}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Fecha de fin *</label>
                <DatePicker
                  value={form.recurrenceEndDate}
                  onChange={value => setForm(f => ({ ...f, recurrenceEndDate: value || '' }))}
                  placeholder="Fin"
                  allowClear={false}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Fecha límite</label>
              <DatePicker
                value={form.dueDate}
                onChange={value => setForm({ ...form, dueDate: value || '' })}
                placeholder="Sin fecha"
                allowClear
              />
            </div>
          )}

          {/* Lista */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Lista</label>
            <SheetSelect
              value={form.listId ?? ''}
              onChange={value => setForm({ ...form, listId: value ? Number(value) : undefined })}
              options={[{ value: '', label: 'Sin lista' }, ...activeLists.map(l => ({ value: l.id!, label: l.name }))]}
              placeholder="Sin lista"
              title="Mover a lista"
            />
          </div>

          {/* Etiquetas */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Etiquetas</label>
            <input className="input-field w-full" placeholder="trabajo, personal" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
          </div>

          {editingTask?.isRecurring && !editingTask.recurrenceSourceId && (
            <p className="text-[11px] text-white/30">
              Estas editando la tarea base. Los cambios de recurrencia afectan a toda la serie.
            </p>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setTaskModal(false)} className="btn-ghost px-4 py-2.5 rounded-xl text-sm">Cancelar</button>
            <button onClick={saveTask} className="btn-primary px-5 py-2.5 rounded-xl text-sm">{editingTask ? 'Guardar cambios' : 'Crear tarea'}</button>
          </div>
        </div>
      </Modal>

      {/* ── List Form Modal ───────────────────────────────────────────────── */}
      <Modal open={listModal} onClose={() => setListModal(false)} title={editingList ? 'Editar lista' : 'Nueva lista'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Nombre *</label>
            <input className="input-field w-full" value={listForm.name} onChange={e => setListForm({ ...listForm, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Color</label>
            <div className="flex gap-2.5 mt-1 flex-wrap">
              {LIST_COLORS.map(c => (
                <button key={c} onClick={() => setListForm({ ...listForm, color: c })}
                  className={`w-8 h-8 rounded-full transition-all ${listForm.color === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-surface-100 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="h-px bg-white/[0.05]" />
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Fecha objetivo</label>
            <DatePicker
              value={listForm.dueDate}
              onChange={value => setListForm({ ...listForm, dueDate: value || '' })}
              placeholder="Sin fecha"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setListModal(false)} className="btn-ghost px-4 py-2.5 rounded-xl text-sm">Cancelar</button>
            <button onClick={saveList} className="btn-primary px-5 py-2.5 rounded-xl text-sm">{editingList ? 'Guardar cambios' : 'Crear lista'}</button>
          </div>
        </div>
      </Modal>

      {/* ── Template Form Modal ───────────────────────────────────────────── */}
      <Modal open={templateModal} onClose={() => setTemplateModal(false)} title={editingTpl ? 'Editar plantilla' : 'Nueva plantilla'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Nombre *</label>
            <input className="input-field w-full" value={tplForm.name} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Color</label>
            <div className="flex gap-2.5 mt-1 flex-wrap">
              {LIST_COLORS.map(c => (
                <button key={c} onClick={() => setTplForm({ ...tplForm, color: c })}
                  className={`w-8 h-8 rounded-full transition-all ${tplForm.color === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-surface-100 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="h-px bg-white/[0.05]" />
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Items (uno por línea)</label>
            <textarea className="input-field w-full min-h-[120px] resize-y text-sm" placeholder={"Leche\nHuevos\nPan\nFrutas"} value={tplForm.items} onChange={e => setTplForm({ ...tplForm, items: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setTemplateModal(false)} className="btn-ghost px-4 py-2.5 rounded-xl text-sm">Cancelar</button>
            <button onClick={saveTemplate} className="btn-primary px-5 py-2.5 rounded-xl text-sm">{editingTpl ? 'Guardar cambios' : 'Crear plantilla'}</button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Delete Modal ──────────────────────────────────────────── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar eliminacion" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Eliminar {confirmDelete.type === 'list' ? 'lista' : confirmDelete.type === 'template' ? 'plantilla' : 'tarea'} "<span className="text-accent">{confirmDelete.label}</span>"?
                </p>
                {confirmDelete.extra && <p className="text-xs text-white/40 mt-1">{confirmDelete.extra}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost px-4 py-2 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'list') executeDeleteList(confirmDelete.id)
                  else if (confirmDelete.type === 'template') deleteTemplate(confirmDelete.id)
                  else executeDeleteTask(confirmDelete.id)
                }}
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Task Detail Modal ─────────────────────────────────────────────── */}
      <Modal open={!!detailTask} onClose={() => setDetailTask(null)} title={detailTask?.title} size="md">
        {detailTask && <TaskDetail
          task={detailTask}
          onCycleStatus={toggleStatus}
          onToggleStatus={toggleStatus}
          onAddSubtask={addSubtask}
          onDeleteTask={requestDeleteTask}
          onEdit={(t) => { setDetailTask(null); openEditTask(t) }}
          subtasksOf={subtasksOf}
          listName={listName}
          listColor={listColor}
          parseTags={parseTags}
        />}
      </Modal>
    </div>
  )
}

/* ─── Mini stat card for summary ──────────────────────────────────────── */

/* ─── Task Detail (extracted for clean state) ─────────────────────────── */

function TaskDetail({ task, onCycleStatus, onToggleStatus, onAddSubtask, onDeleteTask, onEdit, subtasksOf, listName, listColor, parseTags }: {
  task: Task
  onCycleStatus: (t: Task) => Promise<void>
  onToggleStatus: (t: Task) => Promise<void>
  onAddSubtask: (parentId: number, title: string) => Promise<void>
  onDeleteTask: (t: Task) => void
  onEdit: (t: Task) => void
  subtasksOf: (parentId: number) => Task[]
  listName: (id?: number) => string
  listColor: (id?: number) => string
  parseTags: (tags?: string) => string[]
}) {
  const st = STATUS_CFG[task.status]
  const subs = subtasksOf(task.id!)
  const tags = parseTags(task.tags)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <button onClick={() => onCycleStatus(task)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${st.color} bg-surface-200/40`}>
          {task.status === 'completed' ? <SquareCheckBig size={14} /> : <Square size={14} />}
          {task.status === 'completed' ? 'Completada' : 'Marcar completada'}
        </button>
        {task.dueDate && task.status !== 'completed' && (
          <span className="flex items-center gap-1 text-xs text-accent/80">
            <CalendarDays size={13} /> Programada
          </span>
        )}
        {task.dueDate && (
          <span className={`flex items-center gap-1 text-xs ${
            task.dueDate < todayStr() && task.status !== 'completed' ? 'text-red-400' : 'text-white/40'
          }`}>
            <CalendarDays size={13} /> {task.dueDate}
          </span>
        )}
        {task.isRecurring && (
          <span className="flex items-center gap-1 text-xs text-white/30">
            <Repeat size={12} /> {task.recurrenceRule === 'daily' ? 'Diaria' : task.recurrenceRule === 'weekly' ? 'Semanal' : 'Mensual'}
          </span>
        )}
        {task.listId && (
          <span className="flex items-center gap-1 text-xs text-white/40">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: listColor(task.listId) }} />
            {listName(task.listId)}
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-[10px] bg-accent/10 text-accent/70 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
      )}

      {task.description && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Descripcion</p>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* Subtasks */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">
          Subtareas ({subs.filter(s => s.status === 'completed').length}/{subs.length})
        </p>
        <div className="space-y-1">
          {subs.map(s => (
            <div key={s.id} className="group/sub flex items-center gap-2 py-1.5 rounded-lg">
              <button onClick={() => onToggleStatus(s)} className={`shrink-0 ${STATUS_CFG[s.status].color}`}>
                {s.status === 'completed' ? <SquareCheckBig size={16} /> : <Square size={16} />}
              </button>
              <span className={`text-sm flex-1 ${s.status === 'completed' ? 'line-through text-white/30' : ''}`}>{s.title}</span>
              <button onClick={() => onDeleteTask(s)} className="btn-ghost p-1 rounded md:opacity-0 md:group-hover/sub:opacity-100 transition-opacity">
                <X size={12} className="text-white/30" />
              </button>
            </div>
          ))}
        </div>
        <SubtaskInput parentId={task.id!} onAdd={onAddSubtask} />
      </div>

      <div className="flex items-center gap-4 text-[10px] text-white/20 pt-2 border-t border-white/[0.05] flex-wrap">
        <span>Creada: {new Date(task.createdAt).toLocaleDateString()}</span>
        {task.completedAt && <span>Completada: {new Date(task.completedAt).toLocaleDateString()}</span>}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <button onClick={() => onDeleteTask(task)} className="btn-ghost px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 text-red-400 hover:bg-red-400/10">
          <Trash2 size={13} /> Eliminar
        </button>
        <button onClick={() => onEdit(task)} className="btn-secondary px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5">
          <Pencil size={13} /> Editar
        </button>
      </div>
    </div>
  )
}

/* ─── Local-state input components ────────────────────────────────────── */

function SubtaskInput({ parentId, onAdd }: { parentId: number; onAdd: (parentId: number, title: string) => Promise<void> }) {
  const [text, setText] = useState('')
  return (
    <div className="flex items-center gap-2 mt-2">
      <input className="input-field flex-1 text-sm py-1.5" placeholder="Agregar subtarea..." value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={async e => { if (e.key === 'Enter') { await onAdd(parentId, text); setText('') } }} />
      <button onClick={async () => { await onAdd(parentId, text); setText('') }} className="btn-ghost p-1.5 rounded-lg">
        <Plus size={14} className="text-white/40" />
      </button>
    </div>
  )
}
