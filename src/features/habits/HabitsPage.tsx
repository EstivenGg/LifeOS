import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Pencil, Trash2, GripVertical, RotateCcw, X, ListChecks,
  BarChart3, Flame, Target, CheckCircle2, TrendingUp,
} from 'lucide-react'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { showSaved } from '@/utils/toast'
import { daysAgo, shortDate, today } from '@/utils/date'
import { useTheme } from '@/context/ThemeContext'
import type { Habit, HabitCategory } from '@/data/types'

/* ── Sortable row ── */
function SortableItem({ habit, onEdit, onArchive }: {
  habit: Habit; onEdit: (h: Habit) => void; onArchive: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: habit.id! })
  const style = {
    transform: CSS.Transform.toString(transform), transition,
    zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.85 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}
      className={`glass-card-hover flex items-center justify-between py-2.5 px-4 mb-1.5 ${isDragging ? 'ring-2 ring-accent/40' : ''}`}>
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 touch-none">
          <GripVertical size={15} />
        </button>
        <span className="font-medium text-sm">{habit.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(habit)} className="btn-ghost p-1"><Pencil size={13} /></button>
        <button onClick={() => onArchive(habit.id!)}
          className="btn-ghost p-1 text-red-400/40 hover:text-red-400"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

export function HabitsPage() {
  const { accentHex } = useTheme()
  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<HabitCategory[]>([])
  const [editing, setEditing] = useState<Habit | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ name: '', categoryId: 0 })
  const [catForm, setCatForm] = useState({ open: false, name: '', editing: null as HabitCategory | null })

  const [view, setView] = useState<'manage' | 'insights'>('manage')
  const [range, setRange] = useState('30d')

  /* insights state */
  const [chartData, setChartData] = useState<{ label: string; pct: number }[]>([])
  const [habitRates, setHabitRates] = useState<{ name: string; pct: number; done: number; total: number }[]>([])
  const [streak, setStreak] = useState(0)
  const [avgPct, setAvgPct] = useState(0)
  const [totalDone, setTotalDone] = useState(0)
  const [bestDay, setBestDay] = useState(0)
  const [todayDone, setTodayDone] = useState(0)
  const [todayTotal, setTodayTotal] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  useEffect(() => { load() }, [])
  useEffect(() => { if (view === 'insights') loadInsights() }, [view, range])

  async function load() {
    setCategories(await db.habitCategories.orderBy('sortOrder').toArray())
    const all = await db.habits.toArray()
    setHabits(all.sort((a, b) => a.sortOrder - b.sortOrder))

    /* today's completion for hero card */
    const activeH = all.filter(h => h.active)
    const todayH = await db.entryHabits.where('entryDate').equals(today()).toArray()
    setTodayDone(todayH.filter(h => h.done).length)
    setTodayTotal(activeH.length)
  }

  async function loadInsights() {
    const [allH, allEntries] = await Promise.all([
      db.habits.toArray(),
      db.entryHabits.where('entryDate').between(daysAgo(364), today(), true, true).toArray(),
    ])
    const activeH = allH.filter(h => h.active)
    if (activeH.length === 0) return

    const days = Math.min(rangeToDays(range), 365)

    // Group entries by date in memory — evita N queries secuenciales
    const byDate = new Map<string, typeof allEntries>()
    for (const e of allEntries) {
      if (!byDate.has(e.entryDate)) byDate.set(e.entryDate, [])
      byDate.get(e.entryDate)!.push(e)
    }

    const chart: { label: string; pct: number }[] = []
    let sumPct = 0, daysCount = 0, tDone = 0, best = 0

    const perHabit: Record<number, { done: number; total: number }> = {}
    activeH.forEach(h => { perHabit[h.id!] = { done: 0, total: 0 } })

    for (let i = days - 1; i >= 0; i--) {
      const dt = daysAgo(i)
      const lbl = shortDate(dt)
      const dayH = byDate.get(dt) ?? []
      const done = dayH.filter(h => h.done).length
      const pct = activeH.length > 0 ? Math.round((done / activeH.length) * 100) : 0
      chart.push({ label: lbl, pct })

      if (done > 0 || dayH.length > 0) { sumPct += pct; daysCount++ }
      tDone += done
      if (pct > best) best = pct

      for (const h of activeH) {
        const rec = dayH.find(eh => eh.habitId === h.id!)
        if (rec) { perHabit[h.id!].total++; if (rec.done) perHabit[h.id!].done++ }
        else { perHabit[h.id!].total++ }
      }
    }

    setChartData(chart)
    setAvgPct(daysCount > 0 ? Math.round(sumPct / daysCount) : 0)
    setTotalDone(tDone)
    setBestDay(best)

    const rates = activeH.map(h => ({
      name: h.name,
      pct: perHabit[h.id!].total > 0
        ? Math.round((perHabit[h.id!].done / perHabit[h.id!].total) * 100)
        : 0,
      done: perHabit[h.id!].done,
      total: perHabit[h.id!].total,
    })).sort((a, b) => b.pct - a.pct)
    setHabitRates(rates)

    /* streak — usando los datos ya cargados */
    let s = 0
    for (let i = 0; i < 365; i++) {
      const dt = daysAgo(i)
      const dayH = byDate.get(dt) ?? []
      const done = dayH.filter(h => h.done).length
      if (done === activeH.length && s === i) s++
      else if (s !== i) break
    }
    setStreak(s)
  }

  function openNew() {
    setEditing(null)
    setForm({ name: '', categoryId: categories[0]?.id ?? 0 })
    setFormOpen(true)
  }
  function openEdit(h: Habit) {
    setEditing(h)
    setForm({ name: h.name, categoryId: h.categoryId })
    setFormOpen(true)
  }

  async function saveHabit() {
    const now = new Date().toISOString()
    if (editing) {
      await db.habits.update(editing.id!, { ...form, updatedAt: now })
    } else {
      const mx = habits.length > 0 ? Math.max(...habits.map(h => h.sortOrder)) + 1 : 0
      await db.habits.add({ ...form, active: true, sortOrder: mx, createdAt: now, updatedAt: now })
    }
    setFormOpen(false); showSaved(); load()
  }

  async function archive(id: number) { await db.habits.update(id, { active: false }); showSaved(); load() }
  async function restore(id: number) { await db.habits.update(id, { active: true }); showSaved(); load() }
  async function deleteForever(id: number) {
    await db.habits.delete(id)
    await db.entryHabits.where('habitId').equals(id).delete()
    showSaved(); load()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active: a, over } = event
    if (!over || a.id === over.id) return
    const activeH = habits.filter(h => h.active)
    const oi = activeH.findIndex(h => h.id === a.id)
    const ni = activeH.findIndex(h => h.id === over.id)
    if (oi === -1 || ni === -1) return
    const reordered = arrayMove(activeH, oi, ni).map((h, i) => ({ ...h, sortOrder: i }))
    setHabits([...reordered, ...habits.filter(h => !h.active)])
    await Promise.all(reordered.map(h => db.habits.update(h.id!, { sortOrder: h.sortOrder })))
    showSaved()
  }

  async function saveCat() {
    if (catForm.editing) {
      await db.habitCategories.update(catForm.editing.id!, { name: catForm.name })
    } else {
      const mx = categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) + 1 : 0
      await db.habitCategories.add({ name: catForm.name, sortOrder: mx })
    }
    setCatForm({ open: false, name: '', editing: null }); showSaved(); load()
  }

  async function deleteCat(id: number) {
    await db.habitCategories.delete(id); showSaved(); load()
  }

  const active = habits.filter(h => h.active)
  const archived = habits.filter(h => !h.active)
  const catGroups = categories
    .map(c => ({ cat: c, items: active.filter(h => h.categoryId === c.id) }))
    .filter(g => g.items.length > 0)

  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  const tt = {
    contentStyle: {
      background: 'rgb(var(--surface-100))',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', fontSize: '12px', color: '#fff',
    },
  }

  const COLORS = ['#f43f5e', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6']

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)] shrink-0">
              <ListChecks size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold">Hábitos</h1>
              <p className="text-xs text-white/30 mt-0.5">
                {view === 'manage' ? 'Gestiona y reordena' : 'Tendencias y progreso'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {active.length > 0 && (
              <button
                onClick={() => setView(v => v === 'manage' ? 'insights' : 'manage')}
                className={`btn-secondary text-xs flex items-center gap-1.5 ${view === 'insights' ? 'bg-accent/15 text-accent border-accent/30' : ''}`}
              >
                <BarChart3 size={13} />
                <span className="hidden sm:inline">{view === 'insights' ? 'Gestionar' : 'Insights'}</span>
              </button>
            )}
            {view === 'manage' && (
              <>
                <button onClick={() => setCatForm({ open: true, name: '', editing: null })}
                  className="btn-secondary text-xs">Categorías</button>
                <button onClick={openNew} className="btn-primary text-xs flex items-center gap-1">
                  <Plus size={14} /> Nuevo
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Range selector — insights only */}
      {view === 'insights' && (
        <div className="mb-5 flex justify-center">
          <RangeSelector value={range} onChange={setRange} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* ════════ MANAGE VIEW ════════ */}
          {view === 'manage' && (
            <>
              {/* Hero card */}
              {active.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="glass-card !bg-gradient-to-br from-accent/8 via-transparent to-transparent border-accent/10 p-4 mb-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">Hoy</p>
                      <p className="text-3xl md:text-4xl font-black tabular-nums font-mono">
                        {todayDone}<span className="text-base text-white/20 font-normal">/{todayTotal}</span>
                      </p>
                      <p className="text-[11px] text-white/25 mt-1">
                        {categories.length} categorías · {active.length} activos
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        todayPct >= 80 ? 'text-emerald-400/70 bg-emerald-500/10'
                          : todayPct >= 50 ? 'text-amber-400/70 bg-amber-500/10'
                            : 'text-white/30 bg-surface-200/50'
                      }`}>
                        <Target size={11} />
                        {todayPct}%
                      </div>
                      {streak > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-orange-400/70 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium">
                          <Flame size={11} />
                          {streak} días
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick stats */}
              {active.length > 0 && (
                <div className="flex items-center justify-center gap-5 mb-5 py-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-accent font-mono">{todayDone}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Hechos</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold font-mono">{active.length}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Activos</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold font-mono">{categories.length}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Categorías</p>
                  </div>
                  {archived.length > 0 && (
                    <>
                      <div className="w-px h-8 bg-white/[0.06]" />
                      <div className="text-center">
                        <p className="text-xl font-bold font-mono text-white/30">{archived.length}</p>
                        <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Archivados</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Category groups */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {catGroups.map(({ cat, items }, gi) => (
                  <div key={cat.id} className="mb-5">
                    <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2 px-1">{cat.name}</p>
                    <SortableContext items={items.map(h => h.id!)} strategy={verticalListSortingStrategy}>
                      {items.map((h) => (
                        <SortableItem key={h.id} habit={h} onEdit={openEdit} onArchive={archive} />
                      ))}
                    </SortableContext>
                  </div>
                ))}
              </DndContext>

              {/* Empty state */}
              {active.length === 0 && (
                <div className="glass-card p-10 text-center">
                  <ListChecks size={34} className="text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30 mb-1">Sin hábitos activos</p>
                  <p className="text-xs text-white/15">Crea una categoría y añade tu primer hábito</p>
                </div>
              )}

              {/* Archived */}
              {archived.length > 0 && (
                <div className="mt-8">
                  <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2 px-1">Archivados</p>
                  <div className="space-y-1.5">
                    {archived.map((h) => (
                      <div
                        key={h.id}
                        className="glass-card flex items-center justify-between px-4 py-2.5 opacity-60"
                      >
                        <span className="line-through text-sm text-white/40">{h.name}</span>
                        <div className="flex gap-2">
                          <button onClick={() => restore(h.id!)}
                            className="btn-ghost text-xs text-accent/50 hover:text-accent flex items-center gap-1">
                            <RotateCcw size={12} /> Restaurar
                          </button>
                          <button onClick={() => deleteForever(h.id!)}
                            className="btn-ghost text-xs text-red-400/40 hover:text-red-400 flex items-center gap-1">
                            <X size={12} /> Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════ INSIGHTS VIEW ════════ */}
          {view === 'insights' && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: <Target size={17} className="text-emerald-400" />, bg: 'bg-emerald-500/10', label: 'Promedio', value: `${avgPct}%` },
                  { icon: <Flame size={17} className="text-orange-400" />, bg: 'bg-orange-500/10', label: 'Racha', value: `${streak}d` },
                  { icon: <CheckCircle2 size={17} className="text-accent" />, bg: 'bg-accent/10', label: 'Completados', value: String(totalDone) },
                  { icon: <TrendingUp size={17} className="text-violet-400" />, bg: 'bg-violet-500/10', label: 'Mejor día', value: `${bestDay}%` },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="glass-card p-3 flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      {s.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{s.label}</p>
                      <p className="text-lg font-bold tabular-nums leading-tight font-mono">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Completion chart */}
              {chartData.length > 0 && (
                <Card delay={0.1} className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/50">Cumplimiento diario</h3>
                    {avgPct > 0 && (
                      <span className="text-[10px] text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full font-medium">
                        Prom: {avgPct}%
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <defs>
                        <linearGradient id="hbG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accentHex} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={accentHex} stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                        interval={chartData.length > 14 ? Math.floor(chartData.length / 6) : 'preserveStartEnd'}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                      />
                      <Tooltip {...tt} formatter={(v: number) => [`${v}%`, 'Cumplimiento']} />
                      <Bar dataKey="pct" fill="url(#hbG)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Per-habit rates */}
              {habitRates.length > 0 && (
                <Card delay={0.2}>
                  <h3 className="text-sm font-semibold text-white/50 mb-4">Por hábito</h3>
                  <div className="space-y-3">
                    {habitRates.map((h, i) => (
                      <div key={h.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate mr-2">{h.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-white/25">{h.done}/{h.total}</span>
                            <span className="text-xs font-bold font-mono" style={{ color: COLORS[i % COLORS.length] }}>
                              {h.pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-surface-300/50 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${h.pct}%` }}
                            transition={{ duration: 0.6, delay: 0.3 + i * 0.04 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Empty insights */}
              {chartData.length === 0 && (
                <div className="glass-card p-10 text-center">
                  <BarChart3 size={34} className="text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Sin datos suficientes</p>
                  <p className="text-xs text-white/15 mt-1">Registra tus hábitos en el diario para ver insights</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Habit form modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={editing ? 'Editar hábito' : 'Nuevo hábito'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Nombre</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field" placeholder="Ej: Meditar 10 min" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Categoría</label>
            <SheetSelect
              value={form.categoryId}
              onChange={v => setForm(f => ({ ...f, categoryId: Number(v) }))}
              options={categories.map(c => ({ value: c.id!, label: c.name }))}
              buttonClassName="text-sm"
            />
          </div>
          <button onClick={saveHabit} disabled={!form.name || !form.categoryId}
            className="btn-primary w-full disabled:opacity-40">
            {editing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </Modal>

      {/* Categories modal */}
      <Modal open={catForm.open} onClose={() => setCatForm(f => ({ ...f, open: false }))}
        title="Categorías" size="sm">
        <div className="flex gap-2 mb-4">
          <input value={catForm.name}
            onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
            className="input-field flex-1"
            placeholder="Nueva categoría" />
          <button onClick={saveCat} disabled={!catForm.name}
            className="btn-primary px-4 disabled:opacity-40">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-1">
          {categories.map(c => (
            <div key={c.id}
              className="flex items-center justify-between px-3 py-2 bg-surface-200/40 border border-white/[0.04] rounded-xl text-sm">
              <span>{c.name}</span>
              <div className="flex gap-1">
                <button onClick={() => setCatForm({ open: true, name: c.name, editing: c })}
                  className="btn-ghost p-1"><Pencil size={12} /></button>
                <button onClick={() => deleteCat(c.id!)}
                  className="btn-ghost p-1 text-red-400/50 hover:text-red-400"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
