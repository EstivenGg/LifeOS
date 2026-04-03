import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { db } from '@/data/db'
import { today, daysAgo, daysBetween } from '@/utils/date'
import { Card } from '@/components/ui/Card'
import { showSaved } from '@/utils/toast'
import { WORKOUT_SIDES } from '@/utils/workoutMetrics'

export function ExportPage() {
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(90)

  async function buildData() {
    const start = daysAgo(days)
    const dates = daysBetween(start, today())
    const allHabits = await db.habits.toArray()
    const activeHabits = allHabits.filter(h => h.active)
    const books = await db.books.toArray()
    const authors = await db.authors.toArray()
    const routines = await db.routines.toArray()
    const platforms = await db.studyPlatforms.toArray()
    const apps = await db.appCatalog.toArray()

    // ── DailySummary ──
    const daily: Record<string, any>[] = []
    for (const date of dates) {
      const e = await db.dailyEntries.get(date)
      const eh = await db.entryHabits.where('entryDate').equals(date).toArray()
      const readings = await db.entryReadings.where('entryDate').equals(date).toArray()
      const workouts = await db.entryWorkouts.where('entryDate').equals(date).toArray()
      const poms = await db.pomodoroSessions.where('entryDate').equals(date).toArray()
      const studies = await db.entryStudy.where('entryDate').equals(date).toArray()

      daily.push({
        date, mood: e?.mood ?? '', note: e?.note ?? '',
        sleepHours: e?.sleepHours ?? '',
        sleepBedtime: e?.sleepBedtime ?? '', sleepWakeTime: e?.sleepWakeTime ?? '',
        waterMl: e?.waterMl ?? '', weightKg: e?.weightKg ?? '',
        meditationMinutes: e?.meditationMinutes ?? '',
        screenTimeMinutes: e?.screenTimeMinutes ?? '',
        habitsDone: eh.filter(h => h.done).length, habitsTotal: activeHabits.length,
        pagesRead: readings.reduce((s, r) => s + r.pagesRead, 0),
        trained: workouts.length > 0 ? 1 : 0,
        pomodoroCompleted: poms.filter(p => p.completed).length,
        pomodoroMinutes: poms.filter(p => p.completed).reduce((s, p) => s + p.durationMinutes, 0),
        studyMinutes: studies.reduce((s, st) => s + st.minutes, 0),
      })
    }

    // ── HabitsChecklist ── (columns named by habit)
    const habitsRows: Record<string, any>[] = []
    for (const date of dates) {
      const eh = await db.entryHabits.where('entryDate').equals(date).toArray()
      const row: Record<string, any> = { date }
      for (const h of allHabits) {
        const slug = h.name.toLowerCase().replace(/[^a-záéíóúñ0-9]/g, '_')
        row[`habit_${slug}`] = eh.find(x => x.habitId === h.id)?.done ? 1 : 0
      }
      habitsRows.push(row)
    }

    // ── ReadingLog ──
    const readRows: Record<string, any>[] = []
    for (const date of dates) {
      const readings = await db.entryReadings.where('entryDate').equals(date).toArray()
      for (const r of readings) {
        const book = books.find(b => b.id === r.bookId)
        readRows.push({ date, book: book?.title ?? '', pages: r.pagesRead, note: r.note ?? '' })
      }
    }

    // ── WorkoutLog ──
    const wkRows: Record<string, any>[] = []
    for (const date of dates) {
      const workouts = await db.entryWorkouts.where('entryDate').equals(date).toArray()
      for (const w of workouts) {
        const routine = routines.find(r => r.id === w.routineId)
        for (const ex of w.exercises) {
          const exAny = ex as any
          if (Array.isArray(exAny.sets)) {
            // New format: individual sets
            exAny.sets.forEach((s: any, si: number) => {
              const baseRow = {
                date,
                routine: w.routineName ?? routine?.name ?? '',
                exercise: exAny.exerciseName,
                exerciseId: exAny.exerciseCatalogId ?? '',
                muscleGroup: exAny.muscleGroup ?? '',
                trackingMode: exAny.trackingMode ?? 'standard',
                loadMode: exAny.loadMode ?? 'total',
                set: si + 1,
                reps: s.reps ?? '',
                weight: s.weight ?? '',
                nextWeight: s.nextWeight ?? '',
                rpe: s.rpe ?? '',
              }

              if (exAny.trackingMode === 'unilateral' && s.sides) {
                wkRows.push({
                  ...baseRow,
                  reps: '',
                  weight: '',
                  nextWeight: '',
                  leftReps: s.sides.left?.reps ?? '',
                  leftWeight: s.sides.left?.weight ?? '',
                  leftNextWeight: s.sides.left?.nextWeight ?? '',
                  rightReps: s.sides.right?.reps ?? '',
                  rightWeight: s.sides.right?.weight ?? '',
                  rightNextWeight: s.sides.right?.nextWeight ?? '',
                  sidesLogged: WORKOUT_SIDES.filter(side => s.sides?.[side]?.reps != null || s.sides?.[side]?.weight != null).join(','),
                })
                return
              }

              wkRows.push(baseRow)
            })
          } else {
            // Old format: single row
            for (let si = 0; si < (exAny.sets || 1); si++) {
              wkRows.push({
                date,
                routine: w.routineName ?? routine?.name ?? '',
                exercise: exAny.exerciseName,
                exerciseId: exAny.exerciseCatalogId ?? '',
                muscleGroup: exAny.muscleGroup ?? '',
                trackingMode: exAny.trackingMode ?? 'standard',
                loadMode: exAny.loadMode ?? 'total',
                set: si + 1,
                reps: exAny.reps,
                weight: exAny.weight ?? '',
                nextWeight: exAny.nextWeight ?? '',
                rpe: exAny.rpe ?? '',
              })
            }
          }
        }
      }
    }

    // ── ScreenTime ──
    const stRows: Record<string, any>[] = []
    for (const date of dates) {
      const usages = await db.entryAppUsage.where('entryDate').equals(date).toArray()
      for (const u of usages) {
        const app = apps.find(a => a.id === u.appId)
        stRows.push({ date, app: app?.name ?? '', category: app?.category ?? '', minutes: u.minutes })
      }
    }

    // ── SleepLog ──
    const sleepRows = daily.filter(d => d.sleepHours).map(d => ({ date: d.date, hours: d.sleepHours, bedtime: d.sleepBedtime, wakeTime: d.sleepWakeTime }))

    // ── StudyLog ──
    const studyRows: Record<string, any>[] = []
    for (const date of dates) {
      const studies = await db.entryStudy.where('entryDate').equals(date).toArray()
      for (const s of studies) {
        const plat = platforms.find(p => p.id === s.platformId)
        studyRows.push({ date, topic: s.topic, platform: plat?.name ?? '', course: s.course ?? '', minutes: s.minutes, note: s.note ?? '' })
      }
    }

    // ── Media ──
    const media = await db.mediaItems.toArray()
    const mediaRows = media.map(m => ({
      type: m.type, title: m.title, status: m.status, rating: m.rating ?? '', tags: m.tags ?? '', notes: m.notes ?? '',
    }))

    return { daily, habitsRows, readRows, wkRows, stRows, sleepRows, studyRows, mediaRows }
  }

  async function exportXLSX() {
    setLoading(true)
    try {
      const { daily, habitsRows, readRows, wkRows, stRows, sleepRows, studyRows, mediaRows } = await buildData()
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(daily), 'DailySummary')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(habitsRows), 'HabitsChecklist')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(readRows), 'ReadingLog')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wkRows), 'WorkoutLog')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stRows), 'ScreenTime')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sleepRows), 'SleepLog')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studyRows), 'StudyLog')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mediaRows), 'Media')
      XLSX.writeFile(wb, `lifeos-export-${today()}.xlsx`)
      showSaved()
    } finally { setLoading(false) }
  }

  async function exportCSV() {
    setLoading(true)
    try {
      const { daily } = await buildData()
      const csv = Papa.unparse(daily)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `lifeos-summary-${today()}.csv`; a.click()
      URL.revokeObjectURL(url)
      showSaved()
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)]">
          <Download size={20} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Exportar datos</h1>
          <p className="text-xs text-white/30 mt-0.5">JSON, CSV y Excel</p>
        </div>
      </div>

      <Card className="mb-5">
        <h3 className="text-sm font-semibold text-white/50 mb-3">Rango de exportación</h3>
        <div className="flex gap-2 flex-wrap">
          {[30, 60, 90, 180, 365].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${days === d ? 'bg-accent/15 text-accent' : 'text-white/25 bg-surface-200/40 hover:text-white/40'}`}>
              {d}d
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card hover className="cursor-pointer" onClick={exportXLSX}>
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet size={28} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">Excel (.xlsx)</p>
              <p className="text-xs text-white/30">8 hojas: DailySummary, Habits, Reading, Workout, ScreenTime, Sleep, Study, Media</p>
              <p className="text-[10px] text-accent/50 mt-2">Power BI ready</p>
            </div>
          </div>
        </Card>

        <Card hover className="cursor-pointer" onClick={exportCSV}>
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <FileText size={28} className="text-blue-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">CSV</p>
              <p className="text-xs text-white/30">Resumen diario (DailySummary)</p>
            </div>
          </div>
        </Card>
      </div>

      {loading && (
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 text-sm text-white/40">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            Generando...
          </div>
        </div>
      )}
    </div>
  )
}
