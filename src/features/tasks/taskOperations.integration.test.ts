import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import type { Task } from '@/data/types'
import {
  addDays,
  addMonths,
  advanceRecurringDate,
  deleteFutureRecurringInstances,
  deleteTaskSeries,
  ensureRecurringTasks,
  loadTaskCollections,
  rewindRecurringDate,
  syncListCompletionStates,
  toggleTaskStatus,
} from './taskOperations'

describe('integracion de tareas con IndexedDB', () => {
  beforeAll(async () => {
    await db.open()
  })

  beforeEach(async () => {
    await Promise.all([
      db.tasks.clear(),
      db.taskLists.clear(),
    ])
  })

  it('genera ocurrencias recurrentes y actualiza la serie', async () => {
    const sourceId = await db.tasks.add({
      title: 'Leer',
      status: 'pending',
      dueDate: '2026-06-01',
      sortOrder: 0,
      isRecurring: true,
      recurrenceRule: 'daily',
      recurrenceEndDate: '2026-06-04',
      lastGeneratedDate: '2026-06-01',
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    const tasks = await db.tasks.toArray()

    await ensureRecurringTasks(tasks, '2026-06-10')

    const stored = await db.tasks.orderBy('dueDate').toArray()
    expect(stored.map(task => task.dueDate)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
    ])
    expect(stored.slice(1).every(task => task.recurrenceSourceId === sourceId)).toBe(true)
    expect((await db.tasks.get(sourceId))?.lastGeneratedDate).toBe('2026-06-04')
  })

  it('reutiliza ocurrencias existentes y migra las ocurrencias antiguas', async () => {
    const sourceId = await db.tasks.add({
      title: 'Meditar',
      status: 'pending',
      dueDate: '2026-06-01',
      sortOrder: 0,
      isRecurring: true,
      recurrenceRule: 'daily',
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    await db.tasks.bulkAdd([
      {
        title: 'Meditar',
        status: 'pending',
        dueDate: '2026-06-02',
        sortOrder: 1,
        createdAt: '2026-06-02T12:00:00.000Z',
      },
      {
        title: 'Meditar',
        status: 'pending',
        dueDate: '2026-06-03',
        sortOrder: 2,
        isRecurring: true,
        recurrenceRule: 'daily',
        recurrenceSourceId: sourceId,
        createdAt: '2026-06-03T12:00:00.000Z',
      },
    ])

    const tasks = await db.tasks.toArray()
    await ensureRecurringTasks(tasks, '2026-06-03')

    const stored = await db.tasks.orderBy('dueDate').toArray()
    expect(stored).toHaveLength(3)
    expect(stored[1]).toMatchObject({
      recurrenceSourceId: sourceId,
      isRecurring: true,
      recurrenceRule: 'daily',
    })
  })

  it('completa una tarea, sus subtareas y la lista relacionada', async () => {
    const listId = await db.taskLists.add({
      name: 'Entrega',
      color: '#7c5bf5',
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    const parentId = await db.tasks.add({
      title: 'Documento final',
      status: 'pending',
      listId,
      sortOrder: 0,
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    await db.tasks.add({
      title: 'Conclusiones',
      status: 'pending',
      listId,
      parentId,
      sortOrder: 0,
      createdAt: '2026-06-01T12:00:00.000Z',
    })

    const allTasks = await db.tasks.toArray()
    const parent = allTasks.find(task => task.id === parentId)!
    await toggleTaskStatus(parent, allTasks)

    const completed = await db.tasks.toArray()
    expect(completed.every(task => task.status === 'completed')).toBe(true)
    expect((await db.taskLists.get(listId))?.completedAt).toBeTruthy()

    const completedParent = completed.find(task => task.id === parentId)!
    await toggleTaskStatus(completedParent, completed)
    expect((await db.tasks.get(parentId))?.status).toBe('pending')
    expect((await db.taskLists.get(listId))?.completedAt).toBeUndefined()
  })

  it('carga colecciones y normaliza datos antiguos o archivados', async () => {
    const listId = await db.taskLists.add({
      name: 'Lista antigua',
      color: '#22c55e',
      archived: true,
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    await db.tasks.add({
      title: 'Tarea antigua',
      status: 'in_progress',
      archived: true,
      listId,
      sortOrder: 0,
      createdAt: '2026-06-01T12:00:00.000Z',
    })

    const result = await loadTaskCollections('2026-06-10')

    expect(result.tasks[0]).toMatchObject({ status: 'pending', archived: false })
    expect(result.lists[0].archived).toBe(false)
  })

  it('elimina una serie junto con subtareas y ocurrencias', async () => {
    const sourceId = await db.tasks.add({
      title: 'Serie',
      status: 'pending',
      sortOrder: 0,
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    await db.tasks.bulkAdd([
      {
        title: 'Subtarea',
        status: 'pending',
        parentId: sourceId,
        sortOrder: 0,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
      {
        title: 'Ocurrencia',
        status: 'pending',
        recurrenceSourceId: sourceId,
        sortOrder: 1,
        createdAt: '2026-06-02T12:00:00.000Z',
      },
      {
        title: 'Independiente',
        status: 'pending',
        sortOrder: 2,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
    ])

    const tasks = await db.tasks.toArray()
    await deleteTaskSeries(sourceId, tasks)

    expect((await db.tasks.toArray()).map(task => task.title)).toEqual(['Independiente'])
  })

  it('elimina solo ocurrencias futuras pendientes', async () => {
    const sourceId = 99
    const ids = await db.tasks.bulkAdd([
      recurringTask('Pasada', sourceId, '2026-06-01'),
      recurringTask('Futura', sourceId, '2026-06-10'),
      { ...recurringTask('Completada', sourceId, '2026-06-11'), status: 'completed' },
      recurringTask('Excluida', sourceId, '2026-06-12'),
    ], { allKeys: true }) as number[]

    await deleteFutureRecurringInstances(sourceId, '2026-06-10', ids[3])

    expect((await db.tasks.toArray()).map(task => task.title).sort()).toEqual([
      'Completada',
      'Excluida',
      'Pasada',
    ])
  })

  it('calcula fechas recurrentes y sincroniza listas vacias o incompletas', async () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15')
    expect(advanceRecurringDate('2026-06-01', 'weekly')).toBe('2026-06-08')
    expect(advanceRecurringDate('2026-06-01', 'monthly')).toBe('2026-07-01')
    expect(advanceRecurringDate('2026-06-01', 'unknown')).toBeNull()
    expect(rewindRecurringDate('2026-06-08', 'daily')).toBe('2026-06-07')
    expect(rewindRecurringDate('2026-06-08', 'weekly')).toBe('2026-06-01')
    expect(rewindRecurringDate('2026-07-01', 'monthly')).toBe('2026-06-01')
    expect(rewindRecurringDate('2026-06-01', 'unknown')).toBeNull()

    const listId = await db.taskLists.add({
      name: 'Sin completar',
      color: '#fff',
      completedAt: '2026-06-01T12:00:00.000Z',
      createdAt: '2026-06-01T12:00:00.000Z',
    })
    const lists = await db.taskLists.toArray()
    await syncListCompletionStates([], lists)
    expect((await db.taskLists.get(listId))?.completedAt).toBeUndefined()
  })
})

function recurringTask(title: string, sourceId: number, dueDate: string): Task {
  return {
    title,
    status: 'pending',
    recurrenceSourceId: sourceId,
    dueDate,
    sortOrder: 0,
    createdAt: `${dueDate}T12:00:00.000Z`,
  }
}
