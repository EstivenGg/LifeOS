import { db } from './index'

export async function seedDatabase() {
  if ((await db.habitCategories.count()) > 0) return
  const now = new Date().toISOString()

  // Categories
  const cats = await db.habitCategories.bulkAdd([
    { name: 'Salud', sortOrder: 0 },
    { name: 'Mente', sortOrder: 1 },
    { name: 'Ejercicio', sortOrder: 2 },
    { name: 'Productividad', sortOrder: 3 },
    { name: 'Bienestar', sortOrder: 4 },
    { name: 'Aprendizaje', sortOrder: 5 },
    { name: 'Digital', sortOrder: 6 },
  ], { allKeys: true })

  // Habits
  await db.habits.bulkAdd([
    { name: 'Comer sano', categoryId: cats[0], active: true, sortOrder: 0, createdAt: now, updatedAt: now },
    { name: 'Vitaminas', categoryId: cats[0], active: true, sortOrder: 1, createdAt: now, updatedAt: now },
    { name: 'Journaling', categoryId: cats[1], active: true, sortOrder: 2, createdAt: now, updatedAt: now },
    { name: 'Caminar 30 min', categoryId: cats[2], active: true, sortOrder: 3, createdAt: now, updatedAt: now },
    { name: 'Estiramientos', categoryId: cats[2], active: true, sortOrder: 4, createdAt: now, updatedAt: now },
    { name: 'Tiempo relax', categoryId: cats[4], active: true, sortOrder: 5, createdAt: now, updatedAt: now },
    { name: 'Reducir pantalla', categoryId: cats[6], active: true, sortOrder: 6, createdAt: now, updatedAt: now },
  ])

  // Authors & Books
  const a1 = await db.authors.add({ name: 'James Clear' })
  const a2 = await db.authors.add({ name: 'Cal Newport' })
  await db.books.bulkAdd([
    { title: 'Atomic Habits', authorId: a1 as number, totalPages: 320, status: 'reading', rating: 5, description: 'Cómo crear buenos hábitos y romper los malos.' },
    { title: 'Deep Work', authorId: a2 as number, totalPages: 296, status: 'paused', rating: 4, description: 'Reglas para enfocarse en un mundo distraído.' },
  ])

  // Exercise catalog
  await db.exerciseCatalog.bulkAdd([
    { name: 'Press banca', muscleGroup: 'Pecho' },
    { name: 'Press inclinado', muscleGroup: 'Pecho' },
    { name: 'Aperturas', muscleGroup: 'Pecho' },
    { name: 'Press militar', muscleGroup: 'Hombro' },
    { name: 'Elevaciones laterales', muscleGroup: 'Hombro' },
    { name: 'Extensiones tríceps', muscleGroup: 'Tríceps' },
    { name: 'Fondos', muscleGroup: 'Tríceps' },
    { name: 'Dominadas', muscleGroup: 'Espalda' },
    { name: 'Remo con barra', muscleGroup: 'Espalda' },
    { name: 'Jalón al pecho', muscleGroup: 'Espalda' },
    { name: 'Face pulls', muscleGroup: 'Espalda' },
    { name: 'Curl bíceps', muscleGroup: 'Bíceps' },
    { name: 'Curl martillo', muscleGroup: 'Bíceps' },
    { name: 'Sentadilla', muscleGroup: 'Pierna' },
    { name: 'Peso muerto rumano', muscleGroup: 'Pierna' },
    { name: 'Prensa', muscleGroup: 'Pierna' },
    { name: 'Extensión cuádriceps', muscleGroup: 'Pierna' },
    { name: 'Curl femoral', muscleGroup: 'Pierna' },
    { name: 'Hip thrust', muscleGroup: 'Glúteo' },
    { name: 'Plancha', muscleGroup: 'Core' },
  ])

  const allEx = await db.exerciseCatalog.toArray()
  const exId = (n: string) => allEx.find(e => e.name === n)?.id ?? 0

  const push = await db.routines.add({ name: 'Push (Pecho/Hombro/Tríceps)' }) as number
  const pull = await db.routines.add({ name: 'Pull (Espalda/Bíceps)' }) as number
  const leg = await db.routines.add({ name: 'Pierna' }) as number

  const re = (rid: number, name: string, so: number) => ({ routineId: rid, exerciseCatalogId: exId(name), name, sortOrder: so })
  await db.routineExercises.bulkAdd([
    re(push, 'Press banca', 0), re(push, 'Press inclinado', 1), re(push, 'Aperturas', 2), re(push, 'Press militar', 3), re(push, 'Extensiones tríceps', 4),
    re(pull, 'Dominadas', 0), re(pull, 'Remo con barra', 1), re(pull, 'Jalón al pecho', 2), re(pull, 'Curl bíceps', 3), re(pull, 'Face pulls', 4),
    re(leg, 'Sentadilla', 0), re(leg, 'Peso muerto rumano', 1), re(leg, 'Prensa', 2), re(leg, 'Extensión cuádriceps', 3), re(leg, 'Curl femoral', 4),
  ])

  // Apps
  await db.appCatalog.bulkAdd([
    { name: 'TikTok', icon: '🎵', category: 'Social' },
    { name: 'Instagram', icon: '📸', category: 'Social' },
    { name: 'WhatsApp', icon: '💬', category: 'Comunicación' },
    { name: 'YouTube', icon: '▶️', category: 'Entretenimiento' },
    { name: 'Twitter / X', icon: '🐦', category: 'Social' },
    { name: 'Facebook', icon: '👤', category: 'Social' },
    { name: 'Telegram', icon: '✈️', category: 'Comunicación' },
    { name: 'Netflix', icon: '🎬', category: 'Entretenimiento' },
    { name: 'Spotify', icon: '🎧', category: 'Entretenimiento' },
    { name: 'Reddit', icon: '🤖', category: 'Social' },
    { name: 'Chrome', icon: '🌐', category: 'Otros' },
    { name: 'Juegos', icon: '🎮', category: 'Entretenimiento' },
  ])

  // Study platforms
  await db.studyPlatforms.bulkAdd([
    { name: 'Udemy', icon: '🎓' },
    { name: 'Platzi', icon: '🚀' },
    { name: 'YouTube', icon: '▶️' },
    { name: 'Libro', icon: '📖' },
    { name: 'Universidad', icon: '🏫' },
    { name: 'Coursera', icon: '📚' },
    { name: 'Otro', icon: '💡' },
  ])

  // Sample media
  await db.mediaItems.bulkAdd([
    { type: 'series', title: 'Breaking Bad', status: 'terminado', rating: 5, tags: 'Drama,Thriller', notes: 'Obra maestra.', createdAt: now },
    { type: 'movie', title: 'Interstellar', status: 'terminado', rating: 5, tags: 'Sci-Fi,Drama', notes: 'Increíble.', createdAt: now },
    { type: 'series', title: 'The Bear', status: 'viendo', rating: 4, tags: 'Drama,Comedia', createdAt: now },
  ])

  console.log('🌱 LifeOS v4 seed complete')
}
