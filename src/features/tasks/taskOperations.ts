import { db } from '@/data/db'
import type { Task, TaskList, TaskStatus } from '@/data/types'

export const RECURRENCE_LOOKAHEAD_DAYS = 90

export const now = () => new Date().toISOString()
export const todayStr = () => new Date().toISOString().slice(0, 10)

export function addDays(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + amount)
  return next.toISOString().slice(0, 10)
}

export function addMonths(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setMonth(next.getMonth() + amount)
  return next.toISOString().slice(0, 10)
}

export function advanceRecurringDate(date: string, rule: string) {
  if (rule === 'daily') return addDays(date, 1)
  if (rule === 'weekly') return addDays(date, 7)
  if (rule === 'monthly') return addMonths(date, 1)
  return null
}

export function rewindRecurringDate(date: string, rule: string) {
  if (rule === 'daily') return addDays(date, -1)
  if (rule === 'weekly') return addDays(date, -7)
  if (rule === 'monthly') return addMonths(date, -1)
  return null
}

function isRecurringSource(task: Task) {
  return !!task.id && !!task.isRecurring && !!task.recurrenceRule && !!task.dueDate && !task.parentId && !task.recurrenceSourceId
}

function isLegacyRecurringInstance(task: Task, source: Task, expectedDate: string) {
  return (
    !task.parentId &&
    !task.recurrenceSourceId &&
    task.id !== source.id &&
    task.dueDate === expectedDate &&
    task.title === source.title &&
    task.listId === source.listId
  )
}

function nextSortOrder(tasks: Task[]) {
  return tasks.reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1
}

export async function ensureRecurringTasks(allTasks: Task[], horizonDate = addDays(todayStr(), RECURRENCE_LOOKAHEAD_DAYS)) {
  const recurringSources = allTasks.filter(isRecurringSource)
  let sortOrder = nextSortOrder(allTasks)

  for (const source of recurringSources) {
    const sourceId = source.id!
    const startDate = source.lastGeneratedDate && source.lastGeneratedDate >= source.dueDate!
      ? source.lastGeneratedDate
      : source.dueDate!

    let cursor = startDate
    let furthestGenerated = source.lastGeneratedDate

    const effectiveHorizon = source.recurrenceEndDate && source.recurrenceEndDate < horizonDate
      ? source.recurrenceEndDate
      : horizonDate

    while (true) {
      const nextDate = advanceRecurringDate(cursor, source.recurrenceRule!)
      if (!nextDate || nextDate > effectiveHorizon) break

      const existing = allTasks.find(task =>
        !task.parentId &&
        task.dueDate === nextDate &&
        (
          task.recurrenceSourceId === sourceId ||
          isLegacyRecurringInstance(task, source, nextDate)
        )
      )

      if (!existing) {
        const occurrence: Task = {
          title: source.title,
          description: source.description,
          status: 'pending',
          dueDate: nextDate,
          tags: source.tags,
          listId: source.listId,
          parentId: undefined,
          sortOrder: sortOrder++,
          isRecurring: true,
          recurrenceRule: source.recurrenceRule,
          recurrenceSourceId: sourceId,
          createdAt: now(),
          completedAt: undefined,
          lastGeneratedDate: undefined,
        }

        const insertedId = await db.tasks.add(occurrence)
        allTasks.push({ ...occurrence, id: insertedId as number })
      } else if (
        existing.id &&
        (
          existing.recurrenceSourceId !== sourceId ||
          existing.isRecurring !== true ||
          existing.recurrenceRule !== source.recurrenceRule
        )
      ) {
        await db.tasks.update(existing.id, {
          recurrenceSourceId: sourceId,
          isRecurring: true,
          recurrenceRule: source.recurrenceRule,
        })
        existing.recurrenceSourceId = sourceId
        existing.isRecurring = true
        existing.recurrenceRule = source.recurrenceRule
      }

      cursor = nextDate
      furthestGenerated = nextDate
    }

    if (furthestGenerated && furthestGenerated !== source.lastGeneratedDate) {
      await db.tasks.update(sourceId, { lastGeneratedDate: furthestGenerated })
      source.lastGeneratedDate = furthestGenerated
    }
  }
}

export async function normalizeLegacyTaskStatuses(allTasks: Task[]) {
  const legacyTasks = allTasks.filter(task => task.status === 'in_progress' && task.id)
  for (const task of legacyTasks) {
    await db.tasks.update(task.id!, { status: 'pending' })
  }
}

async function normalizeArchivedEntities(allTasks: Task[], allLists: TaskList[]) {
  const archivedTasks = allTasks.filter(task => task.id && task.archived)
  for (const task of archivedTasks) {
    await db.tasks.update(task.id!, { archived: false })
    task.archived = false
  }

  const archivedLists = allLists.filter(list => list.id && list.archived)
  for (const list of archivedLists) {
    await db.taskLists.update(list.id!, { archived: false })
    list.archived = false
  }
}

export async function syncListCompletionStates(allTasks: Task[], allLists: TaskList[]) {
  for (const list of allLists) {
    if (!list.id) continue

    const rootTasks = allTasks.filter(task => task.listId === list.id && !task.parentId)
    const hasTasks = rootTasks.length > 0
    const allCompleted = hasTasks && rootTasks.every(task => task.status === 'completed')

    if (allCompleted) {
      const updates: Partial<TaskList> = {}
      if (!list.completedAt) updates.completedAt = now()
      if (Object.keys(updates).length > 0) await db.taskLists.update(list.id, updates)
      continue
    }

    if (list.completedAt) {
      await db.taskLists.update(list.id, { completedAt: undefined })
    }
  }
}

export async function loadTaskCollections(horizonDate = addDays(todayStr(), RECURRENCE_LOOKAHEAD_DAYS)) {
  const [allTasks, allLists] = await Promise.all([
    db.tasks.orderBy('sortOrder').toArray(),
    db.taskLists.toArray(),
  ])

  await ensureRecurringTasks(allTasks, horizonDate)
  const tasksAfterGeneration = await db.tasks.orderBy('sortOrder').toArray()
  await normalizeLegacyTaskStatuses(tasksAfterGeneration)
  await normalizeArchivedEntities(tasksAfterGeneration, allLists)
  await syncListCompletionStates(tasksAfterGeneration, allLists)

  const [freshTasks, freshLists] = await Promise.all([
    db.tasks.orderBy('sortOrder').toArray(),
    db.taskLists.toArray(),
  ])

  return { tasks: freshTasks, lists: freshLists }
}

export async function toggleTaskStatus(task: Task, allTasks: Task[]) {
  const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed'
  const completedAt = nextStatus === 'completed' ? now() : undefined

  await db.tasks.update(task.id!, {
    status: nextStatus,
    completedAt,
  })

  if (nextStatus === 'completed') {
    const subtasks = allTasks.filter(subtask => subtask.parentId === task.id && subtask.status !== 'completed')
    for (const subtask of subtasks) {
      await db.tasks.update(subtask.id!, { status: 'completed', completedAt: now() })
    }
  }

  const refreshedTasks = await db.tasks.orderBy('sortOrder').toArray()
  const refreshedLists = await db.taskLists.toArray()
  await syncListCompletionStates(refreshedTasks, refreshedLists)
}

export async function deleteTaskSeries(taskId: number, allTasks: Task[]) {
  const subtasks = allTasks.filter(task => task.parentId === taskId)
  for (const subtask of subtasks) {
    if (subtask.id) await db.tasks.delete(subtask.id)
  }

  const recurringInstances = allTasks.filter(task => task.recurrenceSourceId === taskId)
  for (const instance of recurringInstances) {
    if (instance.id) await db.tasks.delete(instance.id)
  }

  await db.tasks.delete(taskId)
}

export async function deleteFutureRecurringInstances(sourceId: number, fromDate: string, excludeTaskId?: number) {
  const futureInstances = await db.tasks
    .filter(task =>
      task.recurrenceSourceId === sourceId &&
      !!task.dueDate &&
      task.dueDate >= fromDate &&
      task.id !== excludeTaskId &&
      task.status !== 'completed'
    )
    .toArray()

  for (const instance of futureInstances) {
    if (instance.id) await db.tasks.delete(instance.id)
  }
}
