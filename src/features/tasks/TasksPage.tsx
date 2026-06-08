import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, FolderOpen,
  ChevronRight,
  CalendarDays, Trash2, Pencil,
  ListTodo,
  AlertTriangle,
  CheckCheck, SlidersHorizontal, ClipboardList,
} from 'lucide-react'
import { db } from '@/data/db'
import type { Task, TaskList, TaskStatus } from '@/data/types'
import { Modal, Card, EmptyState, SheetSelect, DatePicker } from '@/components/ui'
import { showSaved } from '@/utils/toast'
import {
  deleteFutureRecurringInstances,
  deleteTaskSeries,
  loadTaskCollections,
  now,
  todayStr,
  toggleTaskStatus,
} from './taskOperations'
import { ListsView } from './components/ListsView'

import { LIST_COLORS, RECURRENCE_OPTIONS, SORT_OPTIONS, TASK_FOCUS_FILTER_OPTIONS, RECURRENCE_EDIT_SCOPE_OPTIONS, ViewTab, SortMode, CompletionVisibility, TaskFocusFilter, RecurrenceEditScope, parseQuickCapture } from './constants'
import { TaskDetail } from './components/TaskDetail'
import { TaskRow } from './components/TaskRow'


/* ─── Recurring task generation ─────────────────────────────────────────── */

/* ─── Main Component ────────────────────────────────────────────────────── */

export function TasksPage() {
  const [tab, setTab] = useState<ViewTab>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [lists, setLists] = useState<TaskList[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [completionVisibility, setCompletionVisibility] = useState<CompletionVisibility>('active')
  const [taskFocusFilter, setTaskFocusFilter] = useState<TaskFocusFilter>('all')

  // Modals
  const [taskModal, setTaskModal] = useState(false)
  const [listModal, setListModal] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [editingList, setEditingList] = useState<TaskList | null>(null)
  const [selectedListId, setSelectedListId] = useState<number | null>(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'task' | 'list'; id: number; label: string; extra?: string } | null>(null)

  // Quick capture
  const [quickTitle, setQuickTitle] = useState('')

  // Task form
  const [form, setForm] = useState<{
    title: string; description: string; status: TaskStatus
    dueDate: string; tags: string; listId: number | undefined; parentId: number | undefined
    recurrenceRule: string; recurrenceEndDate: string; price: string
  }>({ title: '', description: '', status: 'pending', dueDate: '', tags: '', listId: undefined, parentId: undefined, recurrenceRule: '', recurrenceEndDate: '', price: '' })
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [recurrenceEditScope, setRecurrenceEditScope] = useState<RecurrenceEditScope>('single')

  // List form
  const [listForm, setListForm] = useState({ name: '', color: LIST_COLORS[0], dueDate: '' })

  /* ─── Data loading ──────────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const { tasks: freshTasks, lists: freshLists } = await loadTaskCollections()
    setTasks(freshTasks)
    setLists(freshLists)
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
      parentId: undefined, recurrenceRule: '', recurrenceEndDate: '', price: ''
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
      price: t.price ? t.price.toString() : ''
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
    const parsedPrice = form.price ? parseFloat(form.price) : undefined

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
      price: parsedPrice,
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
    await Promise.all([
      ...listTasks.map(task => db.tasks.update(task.id!, {
        status: 'completed',
        completedAt: task.completedAt ?? now(),
      })),
      db.taskLists.update(l.id!, { completedAt: now() }),
    ])

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
    await Promise.all(tasksInList.map(t => db.tasks.update(t.id!, { listId: undefined })))
    await db.taskLists.delete(id)
    if (selectedListId === id) setSelectedListId(null)
    setConfirmDelete(null)
    await load()
  }

  /* ─── Stats ─────────────────────────────────────────────────────────── */

  const _stats = useMemo(() => {
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
    await Promise.all(listTasks.map(task => db.tasks.update(task.id!, { dueDate })))
  }

  const parseTags = (tags?: string): string[] => {
    if (!tags) return []
    try { return JSON.parse(tags) } catch { return tags.split(',').map(t => t.trim()).filter(Boolean) }
  }

  const listTaskStats = (listId: number) => {
    const lt = tasks.filter(t => t.listId === listId && !t.parentId)
    const done = lt.filter(t => t.status === 'completed').length
    const totalCost = lt.filter(t => t.status !== 'completed').reduce((sum, t) => sum + (t.price || 0), 0)
    return { total: lt.length, done, totalCost }
  }

  /* ─── Render helpers ────────────────────────────────────────────────── */



  /* ─── Render ────────────────────────────────────────────────────────── */

  const renderTaskList = (items: Task[]) => (
    <div className="space-y-1">
      {items.map(t => <TaskRow key={t.id} t={t} subtasksOf={subtasksOf} parseTags={parseTags} toggleStatus={toggleStatus} setDetailTask={setDetailTask} openEditTask={openEditTask} requestDeleteTask={requestDeleteTask} />)}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)] shrink-0">
            <ClipboardList size={20} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">
              {tab === 'lists' && !selectedListId ? 'Proyectos y Listas' : 'Tareas'}
            </h1>
            <p className="text-xs text-white/30 mt-0.5">
              {tab === 'lists' && !selectedListId
                ? 'Organiza por contexto y categorías'
                : isListDetail
                  ? 'Gestiona la lista actual'
                  : 'Captura, foco y seguimiento'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={openNewList} className="btn-secondary h-10 px-3 sm:px-4 rounded-xl flex items-center gap-2 bg-surface-100/40 text-white/70 hover:bg-surface-100 text-sm font-semibold">
            <FolderOpen size={15} /> <span className="hidden sm:inline">Lista</span>
          </button>
          <button onClick={() => openNewTask()} className="btn-primary h-10 px-3 sm:px-4 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg shadow-accent/20">
            <Plus size={15} /> <span className="hidden sm:inline">Tarea</span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex justify-center">
        <div className="flex p-1 bg-surface-100/80 rounded-xl shrink-0 border border-white/[0.05]">
          {([
            { key: 'tasks' as ViewTab, label: 'Bandeja', icon: ListTodo },
            { key: 'lists' as ViewTab, label: 'Listas', icon: FolderOpen },
          ]).map(view => (
            <button
              key={view.key}
              onClick={() => {
                setTab(view.key)
                setSelectedListId(null)
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === view.key
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <view.icon size={15} />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {showTaskWorkspace && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-surface-100/40 rounded-lg shrink-0 border border-white/[0.02]">
              <div className="flex items-center gap-1">
                {([
                  { key: 'active' as CompletionVisibility, label: 'Activas' },
                  { key: 'completed' as CompletionVisibility, label: 'Hechas' },
                  { key: 'all' as CompletionVisibility, label: 'Todas' },
                ]).map(view => (
                  <button
                    key={view.key}
                    onClick={() => setCompletionVisibility(view.key)}
                    className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                      completionVisibility === view.key
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-white/10 mx-0.5" />

              <button
                onClick={() => setShowFilters(true)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white/90 transition-colors relative"
                title="Filtrar y Ordenar"
              >
                <SlidersHorizontal size={15} />
                {(taskFocusFilter !== 'all' || (sortMode !== 'manual' && sortMode !== 'date')) && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent ring-2 ring-surface-100" />
                )}
              </button>
            </div>

            {(taskFocusFilter !== 'all' || (sortMode !== 'manual' && sortMode !== 'date')) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1 animate-in slide-in-from-top-1 fade-in duration-300">
                {taskFocusFilter !== 'all' && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-accent/20 text-accent ring-1 ring-accent/30">
                    Foco: {focusFilterLabel}
                  </span>
                )}
                {sortMode !== 'manual' && sortMode !== 'date' && (
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/10 text-white/70 ring-1 ring-white/20">
                    Ord: {SORT_OPTIONS.find(o => o.value === sortMode)?.label}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              {isListDetail && selectedListId && (
                <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: listColor(selectedListId) }} />
              )}
              <h2 className="text-xl font-bold tracking-tight">
                {isListDetail && selectedListId ? listName(selectedListId) : 'Todas las tareas'}
              </h2>
              {selectedList?.completedAt && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-emerald-400/10 text-emerald-400">
                  Completada
                </span>
              )}
              {selectedList?.dueDate && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                  selectedList.dueDate < todayStr()
                    ? 'bg-red-400/10 text-red-500'
                    : 'bg-surface-200/60 text-white/50'
                }`}>
                  {selectedList.dueDate}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lists tab: overview ───────────────────────────────────────────── */}
      {tab === 'lists' && !selectedListId && (
        <ListsView
          activeLists={activeLists}
          completedLists={completedLists}
          listTaskStats={listTaskStats}
          openNewList={openNewList}
          openEditList={openEditList}
          completeList={completeList}
          requestDeleteList={requestDeleteList}
          setSelectedListId={setSelectedListId}
          setCompletionVisibility={setCompletionVisibility}
        />
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
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
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
                <button onClick={openNewList} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/50 hover:bg-surface-200/40 transition-colors">
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

          {/* Precio */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/35 mb-1.5 block">Costo / Precio (Opcional)</label>
            <input type="number" step="0.01" className="input-field w-full" placeholder="e.g. 50.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
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
                  className={`w-8 h-8 rounded-full transition-transform ${listForm.color === c ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-surface-100 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
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
                  Eliminar {confirmDelete.type === 'list' ? 'lista' : 'tarea'} "<span className="text-accent">{confirmDelete.label}</span>"?
                </p>
                {confirmDelete.extra && <p className="text-xs text-white/40 mt-1">{confirmDelete.extra}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost px-4 py-2 rounded-xl text-sm">Cancelar</button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'list') executeDeleteList(confirmDelete.id)
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

      {/* ── Filter / Sort Modal ───────────────────────────────────────────── */}
      <Modal open={showFilters} onClose={() => setShowFilters(false)} title="Ordenar y Filtrar" size="sm">
        <div className="space-y-6 pb-2">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-3 ml-1">Modalidad de Orden</h3>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortMode(opt.value as SortMode)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-center ${
                    sortMode === opt.value
                      ? 'bg-accent text-white shadow-md shadow-accent/20'
                      : 'bg-surface-100/50 text-white/50 hover:bg-surface-200 hover:text-white/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-white/[0.05]" />
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-3 ml-1">Foco por Atributos</h3>
            <div className="flex flex-wrap gap-2">
              {TASK_FOCUS_FILTER_OPTIONS
                .filter(option => !(isListDetail && option.value === 'unassigned'))
                .map(opt => {
                  const active = taskFocusFilter === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTaskFocusFilter(opt.value as TaskFocusFilter)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-accent/20 text-accent ring-1 ring-accent/30'
                          : 'bg-surface-100/50 text-white/50 hover:bg-surface-200/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}


