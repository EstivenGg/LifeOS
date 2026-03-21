import Dexie, { type Table } from 'dexie'
import type * as T from '../types'

function addDays(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + amount)
  return next.toISOString().slice(0, 10)
}

function addMonths(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setMonth(next.getMonth() + amount)
  return next.toISOString().slice(0, 10)
}

function advanceRecurringDate(date: string, rule?: string) {
  if (rule === 'daily') return addDays(date, 1)
  if (rule === 'weekly') return addDays(date, 7)
  if (rule === 'monthly') return addMonths(date, 1)
  return null
}

export class LifeOSDB extends Dexie {
  habitCategories!: Table<T.HabitCategory, number>
  habits!: Table<T.Habit, number>
  authors!: Table<T.Author, number>
  books!: Table<T.Book, number>
  exerciseCatalog!: Table<T.ExerciseCatalog, number>
  routines!: Table<T.Routine, number>
  routineExercises!: Table<T.RoutineExercise, number>
  mediaItems!: Table<T.MediaItem, number>
  appCatalog!: Table<T.AppCatalog, number>
  studyPlatforms!: Table<T.StudyPlatform, number>
  dailyEntries!: Table<T.DailyEntry, string>
  entryHabits!: Table<T.EntryHabit, number>
  entryReadings!: Table<T.EntryReading, number>
  entryWorkouts!: Table<T.EntryWorkout, number>
  entryAppUsage!: Table<T.EntryAppUsage, number>
  entryStudy!: Table<T.EntryStudy, number>
  pomodoroSessions!: Table<T.PomodoroSession, number>
  taskLists!: Table<T.TaskList, number>
  tasks!: Table<T.Task, number>
  listTemplates!: Table<T.ListTemplate, number>

  constructor() {
    super('LifeOSv4')
    this.version(1).stores({
      habitCategories: '++id, name, sortOrder',
      habits: '++id, name, categoryId, active, sortOrder',
      authors: '++id, name',
      books: '++id, title, authorId, status',
      exerciseCatalog: '++id, name, muscleGroup',
      routines: '++id, name',
      routineExercises: '++id, routineId, exerciseCatalogId, sortOrder',
      mediaItems: '++id, type, title, status',
      appCatalog: '++id, name, category',
      studyPlatforms: '++id, name',
      dailyEntries: 'date',
      entryHabits: '++id, entryDate, habitId, [entryDate+habitId]',
      entryReadings: '++id, entryDate, bookId',
      entryWorkouts: '++id, entryDate, routineId',
      entryAppUsage: '++id, entryDate, appId',
      entryStudy: '++id, entryDate',
      journalEntries: '++id, entryDate',
      pomodoroSessions: '++id, entryDate',
    })
    this.version(2).stores({
      appCatalog: '++id, name, category, packageName',
    })
    this.version(3).stores({
      taskLists: '++id, name, createdAt',
      tasks: '++id, listId, status, priority, dueDate, parentId, sortOrder, createdAt',
      checklistItems: '++id, taskId, sortOrder',
    })
    this.version(4).stores({
      tasks: '++id, listId, status, priority, dueDate, parentId, sortOrder, createdAt, archived',
      listTemplates: '++id, name',
    })
    this.version(5).stores({
      taskLists: '++id, name, createdAt',
      tasks: '++id, listId, status, priority, dueDate, parentId, sortOrder, createdAt, archived',
      checklistItems: null,
      listTemplates: '++id, name',
    }).upgrade(async tx => {
      const tasksTable = tx.table('tasks')
      const checklistTable = tx.table('checklistItems')

      const allTasks = await tasksTable.toArray() as T.Task[]
      const checklistItems = await checklistTable.toArray() as Array<{
        id?: number
        taskId: number
        text: string
        done: boolean
        sortOrder: number
      }>

      const maxSortOrderByParent = new Map<number, number>()

      for (const task of allTasks) {
        if (!task.parentId) continue
        const current = maxSortOrderByParent.get(task.parentId) ?? -1
        maxSortOrderByParent.set(task.parentId, Math.max(current, task.sortOrder))
      }

      const parentTaskById = new Map<number, T.Task>()
      for (const task of allTasks) {
        if (task.id) parentTaskById.set(task.id, task)
      }

      for (const item of checklistItems) {
        const parentTask = parentTaskById.get(item.taskId)
        if (!parentTask) continue

        const nextSortOrder = (maxSortOrderByParent.get(item.taskId) ?? -1) + 1
        maxSortOrderByParent.set(item.taskId, nextSortOrder)

        await tasksTable.add({
          title: item.text,
          listId: parentTask.listId,
          description: undefined,
          status: item.done ? 'completed' : 'pending',
          dueDate: undefined,
          tags: undefined,
          parentId: item.taskId,
          sortOrder: nextSortOrder,
          isRecurring: false,
          recurrenceRule: undefined,
          lastGeneratedDate: undefined,
          archived: !!parentTask.archived,
          createdAt: parentTask.createdAt,
          completedAt: item.done ? (parentTask.completedAt ?? parentTask.createdAt) : undefined,
        } satisfies T.Task)
      }
    })
    this.version(6).stores({
      taskLists: '++id, name, createdAt',
      tasks: '++id, listId, status, dueDate, parentId, sortOrder, createdAt, archived',
      listTemplates: '++id, name',
    }).upgrade(async tx => {
      const tasksTable = tx.table('tasks')
      await tasksTable.toCollection().modify(task => {
        delete (task as { priority?: unknown }).priority
      })
    })
    this.version(7).stores({
      taskLists: '++id, name, createdAt',
      tasks: '++id, listId, status, dueDate, parentId, recurrenceSourceId, sortOrder, createdAt, archived',
      listTemplates: '++id, name',
    }).upgrade(async tx => {
      const tasksTable = tx.table('tasks')
      const allTasks = await tasksTable.toArray() as T.Task[]
      const claimedIds = new Set<number>()

      const recurringSources = allTasks
        .filter(task => task.id && task.isRecurring && task.recurrenceRule && task.dueDate && !task.parentId && !task.recurrenceSourceId)
        .sort((left, right) => left.dueDate!.localeCompare(right.dueDate!))

      for (const source of recurringSources) {
        const sourceId = source.id!
        const lastGeneratedDate = source.lastGeneratedDate

        if (!lastGeneratedDate || lastGeneratedDate <= source.dueDate!) continue

        let cursor = source.dueDate!
        while (true) {
          const nextDate = advanceRecurringDate(cursor, source.recurrenceRule)
          if (!nextDate || nextDate > lastGeneratedDate) break

          const match = allTasks.find(task =>
            task.id &&
            task.id !== sourceId &&
            !claimedIds.has(task.id) &&
            !task.parentId &&
            !task.recurrenceSourceId &&
            task.title === source.title &&
            task.listId === source.listId &&
            task.dueDate === nextDate
          )

          if (match?.id) {
            await tasksTable.update(match.id, {
              isRecurring: true,
              recurrenceRule: source.recurrenceRule,
              recurrenceSourceId: sourceId,
            })
            claimedIds.add(match.id)
          }

          cursor = nextDate
        }
      }
    })
    this.version(8).stores({
      tasks: '++id, listId, status, dueDate, parentId, recurrenceSourceId, sortOrder, createdAt, archived, recurrenceEndDate',
    })
  }
}

export const db = new LifeOSDB()
