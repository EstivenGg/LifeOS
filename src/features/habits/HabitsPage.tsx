import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Pencil, Trash2, GripVertical, RotateCcw, X } from 'lucide-react'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { showSaved } from '@/utils/toast'
import type { Habit, HabitCategory } from '@/data/types'

function SortableItem({ habit, onEdit, onArchive }: { habit: Habit; onEdit: (h: Habit) => void; onArchive: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id! })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? .85 : 1 }
  return (
    <div ref={setNodeRef} style={style} className={`glass-card-hover flex items-center justify-between py-2.5 px-4 mb-1.5 ${isDragging ? 'ring-2 ring-accent/40' : ''}`}>
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 touch-none"><GripVertical size={15} /></button>
        <span className="font-medium text-sm">{habit.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(habit)} className="btn-ghost p-1"><Pencil size={13} /></button>
        <button onClick={() => onArchive(habit.id!)} className="btn-ghost p-1 text-red-400/40 hover:text-red-400"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

export function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<HabitCategory[]>([])
  const [editing, setEditing] = useState<Habit | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ name: '', categoryId: 0 })
  const [catForm, setCatForm] = useState({ open: false, name: '', editing: null as HabitCategory | null })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor))

  useEffect(() => { load() }, [])

  async function load() {
    setCategories(await db.habitCategories.orderBy('sortOrder').toArray())
    const all = await db.habits.toArray()
    setHabits(all.sort((a, b) => a.sortOrder - b.sortOrder))
  }

  function openNew() { setEditing(null); setForm({ name: '', categoryId: categories[0]?.id ?? 0 }); setFormOpen(true) }
  function openEdit(h: Habit) { setEditing(h); setForm({ name: h.name, categoryId: h.categoryId }); setFormOpen(true) }

  async function saveHabit() {
    const now = new Date().toISOString()
    if (editing) { await db.habits.update(editing.id!, { ...form, updatedAt: now }) }
    else { const mx = habits.length > 0 ? Math.max(...habits.map(h => h.sortOrder)) + 1 : 0; await db.habits.add({ ...form, active: true, sortOrder: mx, createdAt: now, updatedAt: now }) }
    setFormOpen(false); showSaved(); load()
  }

  async function archive(id: number) { await db.habits.update(id, { active: false }); showSaved(); load() }
  async function restore(id: number) { await db.habits.update(id, { active: true }); showSaved(); load() }
  async function deleteForever(id: number) { await db.habits.delete(id); await db.entryHabits.where('habitId').equals(id).delete(); showSaved(); load() }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event; if (!over || active.id === over.id) return
    const activeH = habits.filter(h => h.active)
    const oi = activeH.findIndex(h => h.id === active.id), ni = activeH.findIndex(h => h.id === over.id)
    if (oi === -1 || ni === -1) return
    const reordered = arrayMove(activeH, oi, ni).map((h, i) => ({ ...h, sortOrder: i }))
    setHabits([...reordered, ...habits.filter(h => !h.active)])
    await Promise.all(reordered.map(h => db.habits.update(h.id!, { sortOrder: h.sortOrder }))); showSaved()
  }

  async function saveCat() {
    if (catForm.editing) { await db.habitCategories.update(catForm.editing.id!, { name: catForm.name }) }
    else { const mx = categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) + 1 : 0; await db.habitCategories.add({ name: catForm.name, sortOrder: mx }) }
    setCatForm({ open: false, name: '', editing: null }); showSaved(); load()
  }

  async function deleteCat(id: number) { await db.habitCategories.delete(id); showSaved(); load() }

  const active = habits.filter(h => h.active), archived = habits.filter(h => !h.active)
  const catGroups = categories.map(c => ({ cat: c, items: active.filter(h => h.categoryId === c.id) })).filter(g => g.items.length > 0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">HÃ¡bitos</h1>
        <p className="text-sm text-white/40 mt-1">Arrastra para reordenar</p>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setCatForm({ open: true, name: '', editing: null })} className="btn-secondary text-xs">CategorÃ­as</button>
          <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo</button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {catGroups.map(({ cat, items }) => (
          <div key={cat.id} className="mb-5">
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2 px-1">{cat.name}</p>
            <SortableContext items={items.map(h => h.id!)} strategy={verticalListSortingStrategy}>
              {items.map(h => <SortableItem key={h.id} habit={h} onEdit={openEdit} onArchive={archive} />)}
            </SortableContext>
          </div>
        ))}
      </DndContext>

      {archived.length > 0 && (
        <div className="mt-8"><p className="text-xs text-white/25 mb-2">Archivados</p>
          <div className="space-y-1">{archived.map(h => (
            <div key={h.id} className="flex items-center justify-between px-4 py-2 text-white/30 text-sm">
              <span className="line-through">{h.name}</span>
              <div className="flex gap-2">
                <button onClick={() => restore(h.id!)} className="btn-ghost text-xs text-accent/50 hover:text-accent"><RotateCcw size={12} /> Restaurar</button>
                <button onClick={() => deleteForever(h.id!)} className="btn-ghost text-xs text-red-400/40 hover:text-red-400"><X size={12} /> Eliminar</button>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar hÃ¡bito' : 'Nuevo hÃ¡bito'} size="sm">
        <div className="space-y-4">
          <div><label className="text-xs text-white/40 mb-1.5 block">Nombre</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Ej: Meditar 10 min" /></div>
          <div><label className="text-xs text-white/40 mb-1.5 block">CategorÃ­a</label>
            <SheetSelect
              value={form.categoryId}
              onChange={v => setForm(f => ({ ...f, categoryId: Number(v) }))}
              options={categories.map(c => ({ value: c.id!, label: c.name }))}
              buttonClassName="text-sm"
            /></div>
          <button onClick={saveHabit} disabled={!form.name || !form.categoryId} className="btn-primary w-full disabled:opacity-40">{editing ? 'Guardar' : 'Crear'}</button>
        </div>
      </Modal>

      <Modal open={catForm.open} onClose={() => setCatForm(f => ({ ...f, open: false }))} title="CategorÃ­as" size="sm">
        <div className="flex gap-2 mb-4">
          <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} className="input-field flex-1" placeholder="Nueva categorÃ­a" />
          <button onClick={saveCat} disabled={!catForm.name} className="btn-primary px-4 disabled:opacity-40"><Plus size={14} /></button>
        </div>
        <div className="space-y-1">{categories.map(c => (
          <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-surface-200/40 rounded-lg text-sm">
            <span>{c.name}</span>
            <div className="flex gap-1">
              <button onClick={() => setCatForm({ open: true, name: c.name, editing: c })} className="btn-ghost p-1"><Pencil size={12} /></button>
              <button onClick={() => deleteCat(c.id!)} className="btn-ghost p-1 text-red-400/50 hover:text-red-400"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}</div>
      </Modal>
    </div>
  )
}

