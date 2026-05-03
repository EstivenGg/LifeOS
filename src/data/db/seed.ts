import type {
  DailyEntry,
  EntryAppUsage,
  EntryHabit,
  EntryReading,
  EntryStudy,
  EntryWorkout,
  ListTemplate,
  PomodoroSession,
  Task,
  TaskList,
} from '../types'
import { db } from './index'

function anchorDate() {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  return date
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function shiftDays(days: number) {
  const date = anchorDate()
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

function isoAt(date: string, time: string) {
  return `${date}T${time}:00.000Z`
}

export async function seedDatabase() {
  if ((await db.habitCategories.count()) > 0) return
  const now = new Date().toISOString()

  const cats = await db.habitCategories.bulkAdd([
    { name: 'Salud', sortOrder: 0 },
    { name: 'Mente', sortOrder: 1 },
    { name: 'Ejercicio', sortOrder: 2 },
    { name: 'Productividad', sortOrder: 3 },
    { name: 'Bienestar', sortOrder: 4 },
    { name: 'Aprendizaje', sortOrder: 5 },
    { name: 'Digital', sortOrder: 6 },
  ], { allKeys: true }) as number[]

  const habitIds = await db.habits.bulkAdd([
    { name: 'Comer sano', categoryId: cats[0], active: true, sortOrder: 0, createdAt: now, updatedAt: now },
    { name: 'Vitaminas', categoryId: cats[0], active: true, sortOrder: 1, createdAt: now, updatedAt: now },
    { name: 'Journaling', categoryId: cats[1], active: true, sortOrder: 2, createdAt: now, updatedAt: now },
    { name: 'Caminar 30 min', categoryId: cats[2], active: true, sortOrder: 3, createdAt: now, updatedAt: now },
    { name: 'Estiramientos', categoryId: cats[2], active: true, sortOrder: 4, createdAt: now, updatedAt: now },
    { name: 'Tiempo relax', categoryId: cats[4], active: true, sortOrder: 5, createdAt: now, updatedAt: now },
    { name: 'Reducir pantalla', categoryId: cats[6], active: true, sortOrder: 6, createdAt: now, updatedAt: now },
  ], { allKeys: true }) as number[]

  const a1 = await db.authors.add({ name: 'James Clear' })
  const a2 = await db.authors.add({ name: 'Cal Newport' })
  const bookIds = await db.books.bulkAdd([
    { title: 'Atomic Habits', authorId: a1 as number, totalPages: 320, status: 'reading', rating: 5, description: 'Como crear buenos habitos y romper los malos.' },
    { title: 'Deep Work', authorId: a2 as number, totalPages: 296, status: 'paused', rating: 4, description: 'Reglas para enfocarse en un mundo distraido.' },
  ], { allKeys: true }) as number[]

  await db.exerciseCatalog.bulkAdd([
    { name: 'Press banca', muscleGroup: 'Pecho' },
    { name: 'Press inclinado', muscleGroup: 'Pecho' },
    { name: 'Aperturas', muscleGroup: 'Pecho' },
    { name: 'Press militar', muscleGroup: 'Hombro' },
    { name: 'Elevaciones laterales', muscleGroup: 'Hombro' },
    { name: 'Extensiones triceps', muscleGroup: 'Triceps' },
    { name: 'Fondos', muscleGroup: 'Triceps' },
    { name: 'Dominadas', muscleGroup: 'Espalda' },
    { name: 'Remo con barra', muscleGroup: 'Espalda' },
    { name: 'Jalon al pecho', muscleGroup: 'Espalda' },
    { name: 'Face pulls', muscleGroup: 'Espalda' },
    { name: 'Curl biceps', muscleGroup: 'Biceps' },
    { name: 'Curl martillo', muscleGroup: 'Biceps' },
    { name: 'Sentadilla', muscleGroup: 'Pierna' },
    { name: 'Peso muerto rumano', muscleGroup: 'Pierna' },
    { name: 'Prensa', muscleGroup: 'Pierna' },
    { name: 'Extension cuadriceps', muscleGroup: 'Pierna' },
    { name: 'Curl femoral', muscleGroup: 'Pierna' },
    { name: 'Hip thrust', muscleGroup: 'Gluteo' },
    { name: 'Plancha', muscleGroup: 'Core' },
  ])

  const allEx = await db.exerciseCatalog.toArray()
  const exId = (name: string) => allEx.find(exercise => exercise.name === name)?.id ?? 0

  const push = await db.routines.add({
    name: 'Push (Pecho/Hombro/Triceps)',
    objective: 'Empuje + pecho superior',
    estimatedDuration: 62,
    timeOfDay: 'morning',
  }) as number
  const pull = await db.routines.add({
    name: 'Pull (Espalda/Biceps)',
    objective: 'Espalda ancha y agarre',
    estimatedDuration: 68,
    timeOfDay: 'morning',
  }) as number
  const leg = await db.routines.add({
    name: 'Pierna',
    objective: 'Fuerza y estabilidad',
    estimatedDuration: 72,
    timeOfDay: 'morning',
  }) as number

  const routineExercise = (routineId: number, name: string, sortOrder: number) => ({
    routineId,
    exerciseCatalogId: exId(name),
    name,
    sortOrder,
    setsPlanned: 3,
    repsTarget: '8-12',
    restBetweenSets: 90,
  })

  await db.routineExercises.bulkAdd([
    routineExercise(push, 'Press banca', 0),
    routineExercise(push, 'Press inclinado', 1),
    routineExercise(push, 'Aperturas', 2),
    routineExercise(push, 'Press militar', 3),
    routineExercise(push, 'Extensiones triceps', 4),
    routineExercise(pull, 'Dominadas', 0),
    routineExercise(pull, 'Remo con barra', 1),
    routineExercise(pull, 'Jalon al pecho', 2),
    routineExercise(pull, 'Curl biceps', 3),
    routineExercise(pull, 'Face pulls', 4),
    routineExercise(leg, 'Sentadilla', 0),
    routineExercise(leg, 'Peso muerto rumano', 1),
    routineExercise(leg, 'Prensa', 2),
    routineExercise(leg, 'Extension cuadriceps', 3),
    routineExercise(leg, 'Curl femoral', 4),
  ])

  const appIds = await db.appCatalog.bulkAdd([
    { name: 'TikTok', icon: 'TT', category: 'Social' },
    { name: 'Instagram', icon: 'IG', category: 'Social' },
    { name: 'WhatsApp', icon: 'WA', category: 'Comunicacion' },
    { name: 'YouTube', icon: 'YT', category: 'Entretenimiento' },
    { name: 'Twitter / X', icon: 'X', category: 'Social' },
    { name: 'Facebook', icon: 'FB', category: 'Social' },
    { name: 'Telegram', icon: 'TG', category: 'Comunicacion' },
    { name: 'Netflix', icon: 'NF', category: 'Entretenimiento' },
    { name: 'Spotify', icon: 'SP', category: 'Entretenimiento' },
    { name: 'Reddit', icon: 'RD', category: 'Social' },
    { name: 'Chrome', icon: 'CH', category: 'Otros' },
    { name: 'Juegos', icon: 'GM', category: 'Entretenimiento' },
  ], { allKeys: true }) as number[]

  const platformIds = await db.studyPlatforms.bulkAdd([
    { name: 'Udemy', icon: 'UD' },
    { name: 'Platzi', icon: 'PL' },
    { name: 'YouTube', icon: 'YT' },
    { name: 'Libro', icon: 'LB' },
    { name: 'Universidad', icon: 'UN' },
    { name: 'Coursera', icon: 'CO' },
    { name: 'Otro', icon: 'OT' },
  ], { allKeys: true }) as number[]

  await db.mediaItems.bulkAdd([
    { type: 'series', title: 'Breaking Bad', status: 'terminado', rating: 5, tags: 'Drama,Thriller', notes: 'Obra maestra.', createdAt: now },
    { type: 'movie', title: 'Interstellar', status: 'terminado', rating: 5, tags: 'Sci-Fi,Drama', notes: 'Increible.', createdAt: now },
    { type: 'series', title: 'The Bear', status: 'viendo', rating: 4, tags: 'Drama,Comedia', createdAt: now },
  ])

  const dailyEntries: DailyEntry[] = []
  const habitEntries: EntryHabit[] = []
  const readingEntries: EntryReading[] = []
  const studyEntries: EntryStudy[] = []
  const appUsageEntries: EntryAppUsage[] = []
  const pomodoroEntries: PomodoroSession[] = []
  const workoutEntries: EntryWorkout[] = []

  const moodCycle = [4, 5, 3, 4, 4, 5, 2]
  const sleepCycle = [7.6, 7.9, 6.8, 8.1, 7.3, 7.8, 6.9]
  const qualityCycle = [4, 4, 3, 4, 3, 4, 2]
  const bedtimeCycle = ['22:40', '23:05', '23:25', '22:55', '23:10', '22:50', '23:35']
  const wakeCycle = ['06:25', '06:40', '06:50', '06:15', '06:35', '07:05', '07:20']
  const waterCycle = [2400, 2200, 1800, 2600, 2100, 2500, 1700]
  const meditationCycle = [15, 20, 0, 10, 0, 25, 5]
  const screenCycle = [105, 95, 140, 110, 125, 100, 155]
  const habitTargetCycle = [6, 7, 5, 6, 5, 7, 4]
  const studyTopics = [
    { topic: 'React dashboard polish', course: 'LifeOS UI Sprint', platformId: platformIds[1], minutes: 65 },
    { topic: 'Product metrics review', course: 'Personal Analytics', platformId: platformIds[0], minutes: 50 },
    { topic: 'Writing habits summary', course: 'Atomic Habits notes', platformId: platformIds[3], minutes: 35 },
    { topic: 'TypeScript architecture', course: 'Advanced frontend systems', platformId: platformIds[5], minutes: 80 },
    { topic: 'English listening practice', course: 'Fluency routine', platformId: platformIds[2], minutes: 30 },
  ]
  const appMinutes = [
    { appId: appIds[3], minutes: 32 },
    { appId: appIds[2], minutes: 24 },
    { appId: appIds[8], minutes: 18 },
    { appId: appIds[10], minutes: 42 },
  ]

  for (let daysBack = 34; daysBack >= 0; daysBack--) {
    const date = shiftDays(-daysBack)
    const cycleIndex = (34 - daysBack) % 7
    const weightKg = Number((79.4 - (34 - daysBack) * 0.04 + (cycleIndex === 2 ? 0.18 : 0) - (cycleIndex === 5 ? 0.12 : 0)).toFixed(1))
    const mood = moodCycle[cycleIndex]
    const sleepHours = sleepCycle[cycleIndex]
    const sleepQuality = qualityCycle[cycleIndex]
    const meditationMinutes = meditationCycle[cycleIndex]
    const screenTimeMinutes = screenCycle[cycleIndex]
    const waterMl = waterCycle[cycleIndex]
    const note = daysBack % 9 === 0
      ? 'Dia con enfoque en tracking, exportacion y cierre de pendientes.'
      : undefined

    dailyEntries.push({
      date,
      mood,
      note,
      sleepQuality,
      sleepHours,
      sleepBedtime: bedtimeCycle[cycleIndex],
      sleepWakeTime: wakeCycle[cycleIndex],
      waterMl,
      weightKg,
      meditationDone: meditationMinutes > 0,
      meditationMinutes,
      screenTimeMinutes,
      workoutDone: cycleIndex === 1 || cycleIndex === 3 || cycleIndex === 5,
    })

    const doneTarget = habitTargetCycle[cycleIndex]
    habitIds.forEach((habitId, habitIndex) => {
      habitEntries.push({
        entryDate: date,
        habitId,
        done: ((habitIndex + cycleIndex + daysBack) % habitIds.length) < doneTarget,
      })
    })

    if (cycleIndex !== 2) {
      readingEntries.push({
        entryDate: date,
        bookId: bookIds[(34 - daysBack) % bookIds.length],
        pagesRead: 10 + (cycleIndex % 3) * 4,
        note: cycleIndex === 5 ? 'Capitulo clave resaltado.' : undefined,
      })
    }

    if (cycleIndex !== 6) {
      const session = studyTopics[(34 - daysBack) % studyTopics.length]
      studyEntries.push({
        entryDate: date,
        topic: session.topic,
        course: session.course,
        platformId: session.platformId,
        minutes: session.minutes + (cycleIndex === 4 ? 10 : 0),
        note: cycleIndex === 1 ? 'Sesion larga con notas y resumen final.' : undefined,
      })

      if (cycleIndex === 0 || cycleIndex === 3) {
        const secondary = studyTopics[(35 - daysBack) % studyTopics.length]
        studyEntries.push({
          entryDate: date,
          topic: secondary.topic,
          course: secondary.course,
          platformId: secondary.platformId,
          minutes: Math.max(25, secondary.minutes - 20),
        })
      }
    }

    appMinutes.forEach((usage, usageIndex) => {
      appUsageEntries.push({
        entryDate: date,
        appId: usage.appId,
        minutes: usage.minutes + cycleIndex * (usageIndex + 1),
      })
    })

    if (cycleIndex === 0 || cycleIndex === 1 || cycleIndex === 4) {
      pomodoroEntries.push({
        entryDate: date,
        startedAt: isoAt(date, cycleIndex === 4 ? '20:15' : '07:30'),
        durationMinutes: cycleIndex === 1 ? 50 : 25,
        completed: true,
        label: cycleIndex === 4 ? 'Deep work nocturno' : 'Bloque de enfoque',
        context: cycleIndex === 4 ? 'work' : 'study',
      })
    }

    if (cycleIndex === 1 || cycleIndex === 3 || cycleIndex === 5) {
      const routineId = cycleIndex === 1 ? push : cycleIndex === 3 ? pull : leg
      const routineName = cycleIndex === 1 ? 'Push (Pecho/Hombro/Triceps)' : cycleIndex === 3 ? 'Pull (Espalda/Biceps)' : 'Pierna'

      const exercises = cycleIndex === 1
        ? [
            { exerciseCatalogId: exId('Press banca'), exerciseName: 'Press banca', muscleGroup: 'Pecho', sets: [{ reps: 10, weight: 62.5, nextWeight: 65, rpe: 8 }, { reps: 9, weight: 62.5, nextWeight: 65, rpe: 8 }, { reps: 8, weight: 65, nextWeight: 65, rpe: 9 }], setsPlanned: 3, repsTarget: '8-10', restBetweenSets: 120 },
            { exerciseCatalogId: exId('Press inclinado'), exerciseName: 'Press inclinado', muscleGroup: 'Pecho', sets: [{ reps: 10, weight: 22.5, rpe: 8 }, { reps: 9, weight: 22.5, rpe: 8 }, { reps: 8, weight: 25, rpe: 9 }], setsPlanned: 3, repsTarget: '8-12', restBetweenSets: 90 },
          ]
        : cycleIndex === 3
          ? [
              { exerciseCatalogId: exId('Dominadas'), exerciseName: 'Dominadas', muscleGroup: 'Espalda', sets: [{ reps: 8, weight: 0, rpe: 8 }, { reps: 7, weight: 0, rpe: 8 }, { reps: 6, weight: 0, rpe: 9 }], setsPlanned: 3, repsTarget: '6-8', restBetweenSets: 120 },
              { exerciseCatalogId: exId('Remo con barra'), exerciseName: 'Remo con barra', muscleGroup: 'Espalda', sets: [{ reps: 10, weight: 50, rpe: 8 }, { reps: 9, weight: 52.5, rpe: 8 }, { reps: 8, weight: 52.5, rpe: 9 }], setsPlanned: 3, repsTarget: '8-10', restBetweenSets: 90 },
            ]
          : [
              { exerciseCatalogId: exId('Sentadilla'), exerciseName: 'Sentadilla', muscleGroup: 'Pierna', sets: [{ reps: 8, weight: 80, rpe: 8 }, { reps: 8, weight: 82.5, rpe: 8 }, { reps: 6, weight: 85, rpe: 9 }], setsPlanned: 3, repsTarget: '6-8', restBetweenSets: 150 },
              { exerciseCatalogId: exId('Prensa'), exerciseName: 'Prensa', muscleGroup: 'Pierna', sets: [{ reps: 12, weight: 150, rpe: 8 }, { reps: 10, weight: 160, rpe: 8 }, { reps: 10, weight: 160, rpe: 9 }], setsPlanned: 3, repsTarget: '10-12', restBetweenSets: 120 },
            ]

      workoutEntries.push({
        entryDate: date,
        routineId,
        routineName,
        exercises,
        startedAt: isoAt(date, '06:35'),
        finishedAt: isoAt(date, '07:42'),
      })
    }
  }

  await db.dailyEntries.bulkAdd(dailyEntries)
  await db.entryHabits.bulkAdd(habitEntries)
  await db.entryReadings.bulkAdd(readingEntries)
  await db.entryStudy.bulkAdd(studyEntries)
  await db.entryAppUsage.bulkAdd(appUsageEntries)
  await db.pomodoroSessions.bulkAdd(pomodoroEntries)
  await db.entryWorkouts.bulkAdd(workoutEntries)

  const taskLists: TaskList[] = [
    {
      name: 'Sprint de producto',
      color: '#7c5bf5',
      dueDate: shiftDays(7),
      archiveMode: 'auto_when_all_completed',
      createdAt: now,
    },
    {
      name: 'Salud semanal',
      color: '#22c55e',
      dueDate: shiftDays(5),
      archiveMode: 'manual',
      createdAt: now,
    },
    {
      name: 'Admin y dinero',
      color: '#f59e0b',
      dueDate: shiftDays(10),
      archiveMode: 'manual',
      createdAt: now,
    },
  ]
  const taskListIds = await db.taskLists.bulkAdd(taskLists, { allKeys: true }) as number[]

  const tasks: Task[] = [
    {
      title: 'Definir metricas base',
      description: 'Dejar claro el set minimo de KPIs para dashboard e insights.',
      status: 'in_progress',
      dueDate: shiftDays(0),
      tags: JSON.stringify(['analytics', 'prioridad']),
      listId: taskListIds[0],
      sortOrder: 0,
      createdAt: now,
    },
    {
      title: 'Disenar tarjetas de insights',
      description: 'Version mobile-first con score, resumen rapido y estados vacios claros.',
      status: 'pending',
      dueDate: shiftDays(1),
      tags: JSON.stringify(['design', 'ui']),
      listId: taskListIds[0],
      sortOrder: 1,
      createdAt: now,
    },
    {
      title: 'Probar exportacion XLSX',
      description: 'Validar columnas para DailySummary, StudyLog y ScreenTime.',
      status: 'pending',
      dueDate: shiftDays(2),
      tags: JSON.stringify(['qa', 'data']),
      listId: taskListIds[0],
      sortOrder: 2,
      createdAt: now,
    },
    {
      title: 'Registrar peso de la semana',
      description: 'Comparar promedio semanal vs mensual.',
      status: 'pending',
      dueDate: shiftDays(0),
      tags: JSON.stringify(['salud']),
      listId: taskListIds[1],
      sortOrder: 0,
      createdAt: now,
    },
    {
      title: 'Dormir antes de las 23:00',
      status: 'pending',
      dueDate: shiftDays(0),
      tags: JSON.stringify(['sueno']),
      listId: taskListIds[1],
      sortOrder: 1,
      isRecurring: true,
      recurrenceRule: 'daily',
      recurrenceEndDate: shiftDays(14),
      lastGeneratedDate: shiftDays(0),
      createdAt: now,
    },
    {
      title: 'Comprar frutas y proteina',
      status: 'pending',
      dueDate: shiftDays(1),
      tags: JSON.stringify(['mercado']),
      listId: taskListIds[1],
      sortOrder: 2,
      createdAt: now,
    },
    {
      title: 'Pagar suscripcion de Figma',
      status: 'pending',
      dueDate: shiftDays(4),
      tags: JSON.stringify(['admin', 'herramientas']),
      listId: taskListIds[2],
      sortOrder: 0,
      price: 15,
      createdAt: now,
    },
    {
      title: 'Organizar carpeta de exportes',
      status: 'pending',
      dueDate: shiftDays(3),
      tags: JSON.stringify(['archivos']),
      listId: taskListIds[2],
      sortOrder: 1,
      createdAt: now,
    },
    {
      title: 'Revisar backlog rapido',
      status: 'completed',
      dueDate: shiftDays(-1),
      tags: JSON.stringify(['ritual']),
      listId: taskListIds[2],
      sortOrder: 2,
      createdAt: now,
      completedAt: isoAt(shiftDays(-1), '18:45'),
    },
  ]

  const taskIds = await db.tasks.bulkAdd(tasks, { allKeys: true }) as number[]

  await db.tasks.bulkAdd([
    {
      title: 'Definir jerarquia visual',
      status: 'completed',
      parentId: taskIds[1],
      listId: taskListIds[0],
      sortOrder: 0,
      createdAt: now,
      completedAt: isoAt(shiftDays(-1), '20:00'),
    },
    {
      title: 'Validar contraste en mobile',
      status: 'pending',
      parentId: taskIds[1],
      listId: taskListIds[0],
      dueDate: shiftDays(1),
      sortOrder: 1,
      createdAt: now,
    },
    {
      title: 'Revisar copy del empty state',
      status: 'pending',
      parentId: taskIds[1],
      listId: taskListIds[0],
      dueDate: shiftDays(1),
      sortOrder: 2,
      createdAt: now,
    },
  ])

  const templates: ListTemplate[] = [
    {
      name: 'Cierre semanal',
      color: '#06b6d4',
      items: JSON.stringify(['Revisar metrics', 'Exportar resumen', 'Actualizar tareas']),
      createdAt: now,
    },
  ]
  await db.listTemplates.bulkAdd(templates)
}
