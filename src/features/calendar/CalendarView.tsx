import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { getMoodColor } from '@/components/ui/MoodPicker'
import { displayDate, fmtMin } from '@/utils/date'
import {
  BookOpen, ListChecks, Moon, PenLine, Droplets,
  Smartphone, GraduationCap, Brain, Maximize2, CheckCircle2,
  Scale, Timer, Activity, ClipboardList, Repeat,
} from 'lucide-react'
import { useSectionPrefs, SectionId } from '@/context/SectionPrefsContext'
import type { DailyEntry, EntryWorkout, Task, TaskList } from '@/data/types'
import { addDays, loadTaskCollections, todayStr, toggleTaskStatus } from '@/features/tasks/taskOperations'

// ─── Constants ───────────────────────────────────────────────────────────────
const SLEEP_LABELS: Record<number, string> = { 1: 'Mal', 2: 'Regular', 3: 'Bien', 4: 'Súper' }

const TYPE_LABEL: Record<string, string> = {
  running: 'Correr', swimming: 'Nadar', cycling: 'Bici',
  hiking: 'Montaña', walking: 'Caminar', sports: 'Deporte',
  other: 'Otro', gym: 'Gym',
}

interface DaySummary {
  entry?: DailyEntry
  habitsDone: number; habitsTotal: number
  pagesRead: number; booksRead: string[]; readOk: boolean
  trained: boolean; workoutCount: number; activityNames: string[]
  studyMin: number; studyOk: boolean
  pomodoroCount: number
  meditationDone: boolean
  topApps: { name: string; min: number }[]
  tasksDue: number; tasksDone: number; taskTitles: string[]
}

export function CalendarView() {
  const navigate = useNavigate()
  const { enabled, advanced } = useSectionPrefs()
  const [events, setEvents] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [summary, setSummary] = useState<DaySummary | null>(null)
  const [noteModal, setNoteModal] = useState(false)
  const [allTasksData, setAllTasksData] = useState<Task[]>([])
  const [listsData, setListsData] = useState<TaskList[]>([])
  const [dayTasksList, setDayTasksList] = useState<Task[]>([])
  const [taskListOpen, setTaskListOpen] = useState(false)
  const [taskHorizon, setTaskHorizon] = useState(() => addDays(todayStr(), 90))

  // ── Responsive header ──
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const headerToolbar = useMemo(() =>
    isMobile
      ? { left: 'prev,next', center: 'title', right: '' }
      : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
    [isMobile]
  )

  const todayISO = useMemo(() => todayStr(), [])

  const tasksWithDates = useMemo(() =>
    allTasksData
      .filter(t => !t.archived && !t.parentId && t.dueDate)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)),
    [allTasksData],
  )

  const overdueTasks = useMemo(() =>
    tasksWithDates.filter(t => t.dueDate! < todayISO && t.status !== 'completed'),
    [tasksWithDates, todayISO],
  )

  const todayTasks = useMemo(() =>
    tasksWithDates.filter(t => t.dueDate === todayISO),
    [tasksWithDates, todayISO],
  )

  const upcomingTasks = useMemo(() =>
    tasksWithDates.filter(t => t.dueDate! > todayISO && t.status !== 'completed'),
    [tasksWithDates, todayISO],
  )

  const pendingCount = useMemo(() =>
    tasksWithDates.filter(t => t.status !== 'completed').length,
    [tasksWithDates],
  )

  const dayTaskCounts = useMemo(() => {
    const map = new Map<string, { overdue: number; pending: number; completed: number }>()
    for (const t of tasksWithDates) {
      const key = t.dueDate!
      if (!map.has(key)) map.set(key, { overdue: 0, pending: 0, completed: 0 })
      const entry = map.get(key)!
      if (t.status === 'completed') entry.completed++
      else if (key < todayISO) entry.overdue++
      else entry.pending++
    }
    return map
  }, [tasksWithDates, todayISO])

  const loadCalendarData = useCallback(async (requestedHorizon?: string) => {
    const nextHorizon = requestedHorizon && requestedHorizon > taskHorizon ? requestedHorizon : taskHorizon
    if (nextHorizon !== taskHorizon) setTaskHorizon(nextHorizon)

    const [entries, taskData] = await Promise.all([
      db.dailyEntries.toArray(),
      loadTaskCollections(nextHorizon),
    ])
    const { tasks: fetchedTasks, lists: fetchedLists } = taskData
    setAllTasksData(fetchedTasks)
    setListsData(fetchedLists)

    const moodEvents = entries.map(e => ({
      id: e.date, start: e.date, allDay: true,
      backgroundColor: getMoodColor(e.mood), borderColor: 'transparent', display: 'background',
    }))
    setEvents(moodEvents)
  }, [taskHorizon])

  useEffect(() => { void loadCalendarData() }, [loadCalendarData])

  // ── Stable per-day isAdv (computed from snapshot, not recalculated during render) ──
  const dayOverrides = summary?.entry?.advancedOverrides ?? {}
  const isAdv = (id: SectionId): boolean => (dayOverrides[id] ?? advanced[id])

  const toggleTask = useCallback(async (task: Task) => {
    await toggleTaskStatus(task, allTasksData)
    await loadCalendarData()
    if (selectedDate) {
      await handleDateClick({ dateStr: selectedDate })
    }
  }, [allTasksData, loadCalendarData, selectedDate])

  async function handleDateClick(info: { dateStr: string }) {
    const date = info.dateStr
    setSelectedDate(date)
    if (date > taskHorizon) {
      await loadCalendarData(date)
    }

    const [entry, allH, eh, readings, books, workouts, routines, studies, poms, appUsages, apps, dayTasks] = await Promise.all([
      db.dailyEntries.get(date),
      db.habits.toArray(),
      db.entryHabits.where('entryDate').equals(date).toArray(),
      db.entryReadings.where('entryDate').equals(date).toArray(),
      db.books.toArray(),
      db.entryWorkouts.where('entryDate').equals(date).toArray(),
      db.routines.toArray(),
      db.entryStudy.where('entryDate').equals(date).toArray(),
      db.pomodoroSessions.where('entryDate').equals(date).toArray(),
      db.entryAppUsage.where('entryDate').equals(date).toArray(),
      db.appCatalog.toArray(),
      db.tasks.where('dueDate').equals(date).toArray(),
    ])

    const habits = allH.filter(h => h.active)

    // No mutation: copy before sorting
    const topApps = [...appUsages].sort((a, b) => b.minutes - a.minutes).slice(0, 3).map(u => {
      const app = apps.find(a => a.id === u.appId)
      return { name: app?.name || '?', min: u.minutes }
    })

    const meditationDone = entry?.meditationDone === true || (entry?.meditationMinutes ?? 0) > 0

    // Multi-sport trained
    const trained = entry?.workoutDone === true || (workouts.length > 0 && workouts.some((w: EntryWorkout) =>
      (w.type && w.type !== 'gym') ||
      (w.exercises?.some(e => (e.sets?.length ?? 0) > 0))
    ))

    const readOk = readings.length > 0

    // Activity names in Spanish
    const activityNames = workouts.slice(0, 3).map((w: EntryWorkout) => {
      if (!w.type || w.type === 'gym') return routines.find(r => r.id === w.routineId)?.name || 'Gym'
      return w.title || TYPE_LABEL[w.type] || w.type
    })

    const studyOk = studies.length > 0

    const rootTasks = dayTasks.filter((t: Task) => !t.parentId && !t.archived)
    setDayTasksList(rootTasks)

    setSummary({
      entry,
      habitsDone: eh.filter(h => h.done).length,
      habitsTotal: habits.length,
      pagesRead: readings.reduce((s, r) => s + r.pagesRead, 0),
      booksRead: readings.map(r => books.find(b => b.id === r.bookId)?.title || '?'),
      readOk, trained,
      workoutCount: workouts.length,
      activityNames,
      studyMin: studies.reduce((s, st) => s + st.minutes, 0),
      studyOk,
      pomodoroCount: poms.filter(p => p.completed).length,
      meditationDone,
      topApps,
      tasksDue: rootTasks.length,
      tasksDone: rootTasks.filter((t: Task) => t.status === 'completed').length,
      taskTitles: rootTasks.slice(0, 3).map((t: Task) => t.title),
    })
  }

  const handleDatesSet = useCallback((info: DatesSetArg) => {
    const visibleEnd = info.endStr.split('T')[0]
    const requestedHorizon = addDays(visibleEnd, 31)
    void loadCalendarData(requestedHorizon)
  }, [loadCalendarData])

  /* ── StatRow — premium tile with tactile feedback ── */
  function StatRow({ icon: Icon, color, label, children }: {
    icon: any; color: string; label: string; children: React.ReactNode
  }) {
    return (
      <div className="flex items-center gap-2.5 p-2.5 bg-surface-200/40 rounded-xl hover:bg-surface-200/60 active:scale-[0.98] transition-all cursor-default">
        <div className={`w-8 h-8 rounded-lg bg-surface-300/50 flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">{label}</p>
          <div className="text-sm font-bold leading-tight truncate">{children}</div>
        </div>
      </div>
    )
  }

  function handleEventClick(info: EventClickArg) {
    const dateStr = info.event.startStr.split('T')[0]
    void handleDateClick({ dateStr })
  }

  function renderDayCellContent(arg: any) {
    const counts = dayTaskCounts.get(arg.dateStr) ?? { overdue: 0, pending: 0, completed: 0 }
    const hasDots = counts.overdue > 0 || counts.pending > 0 || counts.completed > 0
    return (
      <div className="fc-daycell-inner">
        <a className="fc-daygrid-day-number">{arg.dayNumberText}</a>
        {hasDots && (
          <div className="fc-task-day-dots">
            {counts.overdue > 0 && <span className="fc-task-dot dot-overdue" />}
            {counts.pending > 0 && <span className="fc-task-dot dot-pending" />}
            {counts.completed > 0 && <span className="fc-task-dot dot-done" />}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Calendario</h1>
        <button
          onClick={() => setTaskListOpen(true)}
          className="relative btn-ghost"
          aria-label="Ver tareas programadas"
        >
          <ClipboardList size={18} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center px-1 leading-none">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <Card className="p-2 md:p-6 fc-premium">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          headerToolbar={headerToolbar}
          locale="es"
          height="auto"
          firstDay={1}
          dayMaxEvents={false}
          eventClick={handleEventClick}
          dayCellContent={renderDayCellContent}
        />
      </Card>

      {/* ── Day summary modal ── */}
      <Modal open={!!selectedDate} onClose={() => setSelectedDate(null)} title={selectedDate ? displayDate(selectedDate) : ''} size="md">
        {summary && (
          <div className="space-y-3">
            {/* ── Hero: Mood ── */}
            {enabled.mood && (
              <div className="bg-surface-200/30 rounded-2xl p-4 border border-white/[0.04] flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl shrink-0 shadow-lg"
                  style={{ backgroundColor: getMoodColor(summary.entry?.mood) }}
                />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Mood</p>
                  <p className="font-extrabold text-2xl leading-none mt-0.5">{summary.entry?.mood ? `${summary.entry.mood}/5` : '--'}</p>
                </div>
              </div>
            )}

            {/* ── Note preview (editorial card) ── */}
            {summary.entry?.note && (
              <div className="bg-gradient-to-b from-surface-200/40 to-transparent rounded-2xl p-4 border border-white/[0.04] relative">
                <p className="text-sm text-white/50 pr-8 line-clamp-2 leading-relaxed">{summary.entry.note}</p>
                <button onClick={() => setNoteModal(true)} className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-surface-300/50 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors">
                  <Maximize2 size={12} />
                </button>
              </div>
            )}

            {/* ── Stats panel ── */}
            <div className="bg-surface-100/20 rounded-2xl p-1.5 border border-white/[0.04]">
              <div className="grid grid-cols-2 gap-1.5">
                {enabled.habits && (
                  <StatRow icon={ListChecks} color="text-accent" label="Hábitos">
                    {summary.habitsDone}/{summary.habitsTotal}
                  </StatRow>
                )}

                {enabled.sleep && (
                  <StatRow icon={Moon} color="text-indigo-400" label="Sueño">
                    {isAdv('sleep')
                      ? <>
                        {summary.entry?.sleepHours ? `${summary.entry.sleepHours}h` : '--'}
                        {summary.entry?.sleepBedtime && (
                          <p className="text-[9px] text-white/20 font-normal">{summary.entry.sleepBedtime} – {summary.entry.sleepWakeTime}</p>
                        )}
                      </>
                      : summary.entry?.sleepQuality
                        ? <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-indigo-400" /> {SLEEP_LABELS[summary.entry.sleepQuality] ?? '--'}</span>
                        : '--'
                    }
                  </StatRow>
                )}

                {enabled.water && (
                  <StatRow icon={Droplets} color="text-sky-400" label="Agua">
                    {summary.entry?.waterMl ? `${(summary.entry.waterMl / 1000).toFixed(1)}L` : '--'}
                  </StatRow>
                )}

                {enabled.meditation && (
                  <StatRow icon={Brain} color="text-violet-400" label="Meditación">
                    {isAdv('meditation')
                      ? (summary.entry?.meditationMinutes ? `${summary.entry.meditationMinutes}m` : '--')
                      : summary.meditationDone
                        ? <CheckCircle2 size={14} className="text-violet-400" />
                        : '--'
                    }
                  </StatRow>
                )}

                {enabled.reading && (
                  <StatRow icon={BookOpen} color="text-emerald-400" label="Lectura">
                    {isAdv('reading')
                      ? <>
                        {summary.pagesRead > 0 ? `${summary.pagesRead}pp` : (summary.readOk ? '✓' : '--')}
                        {summary.booksRead.length > 0 && <p className="text-[9px] text-white/20 font-normal truncate">{summary.booksRead.join(', ')}</p>}
                      </>
                      : summary.readOk
                        ? <CheckCircle2 size={14} className="text-emerald-400" />
                        : '--'
                    }
                  </StatRow>
                )}

                {enabled.workout && (
                  <StatRow icon={Activity} color="text-orange-400" label="Actividad Física">
                    {isAdv('workout')
                      ? <>
                        {summary.trained
                          ? (summary.workoutCount > 1 ? `${summary.workoutCount} actividades` : 'Realizada')
                          : '--'}
                        {summary.activityNames.length > 0 && <p className="text-[9px] text-white/20 font-normal truncate">{summary.activityNames.join(', ')}</p>}
                      </>
                      : summary.trained
                        ? <CheckCircle2 size={14} className="text-orange-400" />
                        : '--'
                    }
                  </StatRow>
                )}

                {enabled.study && (
                  <StatRow icon={GraduationCap} color="text-blue-400" label="Estudio">
                    {isAdv('study')
                      ? (summary.studyMin ? fmtMin(summary.studyMin) : (summary.studyOk ? '✓' : '--'))
                      : summary.studyOk
                        ? <CheckCircle2 size={14} className="text-blue-400" />
                        : '--'
                    }
                  </StatRow>
                )}

                {enabled.screentime && (
                  <StatRow icon={Smartphone} color="text-pink-400" label="Pantalla">
                    {summary.entry?.screenTimeMinutes ? fmtMin(summary.entry.screenTimeMinutes) : '--'}
                    {summary.topApps.length > 0 && (
                      <p className="text-[9px] text-white/20 font-normal truncate">
                        {summary.topApps.map(a => `${a.name} ${fmtMin(a.min)}`).join(', ')}
                      </p>
                    )}
                  </StatRow>
                )}

                {enabled.pomodoro && summary.pomodoroCount > 0 && (
                  <StatRow icon={Timer} color="text-rose-400" label="Pomodoro">
                    {summary.pomodoroCount}
                  </StatRow>
                )}

                {enabled.weight && summary.entry?.weightKg && (
                  <StatRow icon={Scale} color="text-amber-400" label="Peso">
                    {summary.entry.weightKg}kg
                  </StatRow>
                )}
              </div>
            </div>

            {/* ── Tasks list with toggle ── */}
            {dayTasksList.length > 0 && (
              <div className="rounded-2xl border border-white/[0.04] bg-surface-100/20 overflow-hidden">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35 px-3 pt-3 pb-1.5">
                  Tareas · {dayTasksList.filter(t => t.status === 'completed').length}/{dayTasksList.length}
                </p>
                <div className="px-2 pb-2 space-y-0.5">
                  {dayTasksList.map(t => (
                    <CalTaskRow key={t.id} t={t} lists={listsData} todayISO={todayISO} onToggle={toggleTask} />
                  ))}
                </div>
              </div>
            )}

            {/* ── CTA separator + button ── */}
            <div className="border-t border-white/[0.04] pt-3 mt-2">
              <button
                onClick={() => {
                  const d = selectedDate
                  setSelectedDate(null)
                  navigate(`/daylog/${d}`)
                }}
                className="btn-primary w-full py-3"
              >
                <PenLine size={15} /> Editar día
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Full task list modal ── */}
      <Modal open={taskListOpen} onClose={() => setTaskListOpen(false)} title="Tareas programadas" size="md">
        <div className="space-y-4">
          {overdueTasks.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-red-400 px-1 mb-1.5">
                Vencidas · {overdueTasks.length}
              </p>
              <div className="space-y-0.5">
                {overdueTasks.map(t => (
                  <CalTaskRow key={t.id} t={t} lists={listsData} todayISO={todayISO} onToggle={toggleTask} />
                ))}
              </div>
            </section>
          )}

          {todayTasks.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-400 px-1 mb-1.5">
                Hoy · {todayTasks.length}
              </p>
              <div className="space-y-0.5">
                {todayTasks.map(t => (
                  <CalTaskRow key={t.id} t={t} lists={listsData} todayISO={todayISO} onToggle={toggleTask} />
                ))}
              </div>
            </section>
          )}

          {upcomingTasks.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35 px-1 mb-1.5">
                Próximas · {upcomingTasks.length}
              </p>
              <div className="space-y-0.5">
                {upcomingTasks.map(t => (
                  <CalTaskRow key={t.id} t={t} lists={listsData} todayISO={todayISO} onToggle={toggleTask} />
                ))}
              </div>
            </section>
          )}

          {tasksWithDates.filter(t => t.status === 'completed').length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-400/70 px-1 mb-1.5">
                Completadas
              </p>
              <div className="space-y-0.5">
                {tasksWithDates.filter(t => t.status === 'completed').map(t => (
                  <CalTaskRow key={t.id} t={t} lists={listsData} todayISO={todayISO} onToggle={toggleTask} />
                ))}
              </div>
            </section>
          )}

          {tasksWithDates.length === 0 && (
            <p className="text-sm text-white/30 text-center py-8">No hay tareas programadas</p>
          )}
        </div>
      </Modal>

      {/* Note focus modal */}
      <Modal open={noteModal} onClose={() => setNoteModal(false)} title="Nota del día" size="md">
        <div className="p-2">
          <p className="text-base text-white/60 leading-relaxed whitespace-pre-wrap">{summary?.entry?.note}</p>
        </div>
      </Modal>
    </div>
  )
}

/* ── Task row — used in calendar list modals ──────────────────────────────── */

function CalTaskRow({
  t,
  lists,
  todayISO,
  onToggle,
}: {
  t: Task
  lists: TaskList[]
  todayISO: string
  onToggle?: (t: Task) => void
}) {
  const list = lists.find(l => l.id === t.listId)
  const isOverdue = t.dueDate! < todayISO && t.status !== 'completed'
  const isToday = t.dueDate === todayISO
  const isCompleted = t.status === 'completed'

  const dateLabel = isToday
    ? 'Hoy'
    : new Date(t.dueDate! + 'T12:00:00').toLocaleDateString('es-CO', {
        weekday: 'short', day: 'numeric', month: 'short',
      })

  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-surface-200/40 transition-colors">
      <button
        type="button"
        onClick={() => onToggle?.(t)}
        className={`shrink-0 flex items-center justify-center w-[22px] h-[22px] rounded-full transition-colors ${
          onToggle ? 'cursor-pointer active:scale-90' : 'cursor-default'
        }`}
        aria-label={isCompleted ? 'Marcar pendiente' : 'Marcar completada'}
      >
        {isCompleted
          ? <CheckCircle2 size={18} className="text-emerald-400" />
          : (
            <div className={`w-[14px] h-[14px] rounded border-2 ${
              isOverdue ? 'border-red-400/70' : 'border-white/25'
            }`} />
          )
        }
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-snug truncate block ${
          isCompleted ? 'line-through text-white/25' : 'text-white/85'
        }`}>
          {t.title}
        </span>
        {list && (
          <span className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
            <span className="text-[10px] text-white/30 truncate">{list.name}</span>
          </span>
        )}
        {t.isRecurring && (
          <span className="flex items-center gap-1 mt-0.5 text-[10px] text-white/25">
            <Repeat size={10} />
            {t.recurrenceRule === 'daily' ? 'Diaria' : t.recurrenceRule === 'weekly' ? 'Semanal' : 'Mensual'}
          </span>
        )}
      </div>

      <span className={`text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded-lg ${
        isCompleted
          ? 'text-white/20'
          : isOverdue
            ? 'bg-red-400/10 text-red-400'
            : isToday
              ? 'bg-amber-400/10 text-amber-400'
              : 'text-white/25'
      }`}>
        {dateLabel}
      </span>
    </div>
  )
}
