import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { RoutineExercise } from '@/data/types'

interface P {
  open: boolean
  onClose: () => void
  exercise: RoutineExercise | null
  onSave: (exercise: RoutineExercise) => void
}

export function RoutineExerciseModal({ open, onClose, exercise, onSave }: P) {
  const [form, setForm] = useState<Partial<RoutineExercise>>({})

  useEffect(() => {
    if (exercise) {
      setForm({
        ...exercise,
      })
    }
  }, [exercise, open])

  const handleSave = () => {
    if (!form.name?.trim() || !form.setsPlanned || !form.repsTarget?.trim()) {
      return
    }
    onSave({
      ...exercise!,
      ...form,
      setsPlanned: Math.max(1, form.setsPlanned || 1),
    } as RoutineExercise)
    onClose()
  }

  if (!exercise) return null

  return (
    <Modal open={open} onClose={onClose} title="Editar Ejercicio" size="sm">
      <div className="flex flex-col gap-5 pt-1">
        {/* Exercise name (read-only) */}
        <div>
          <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5 block pl-1">
            Ejercicio
          </label>
          <div className="px-4 py-3.5 bg-surface-300/20 rounded-xl text-sm font-bold text-white/90 border border-white/[0.03] shadow-inner line-clamp-2">
            {form.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Sets planned */}
          <div>
            <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5 block pl-1">
              Series
            </label>
            <input
              type="number"
              min="1" max="20"
              value={form.setsPlanned || ''}
              onChange={e => setForm(p => ({ ...p, setsPlanned: parseInt(e.target.value, 10) || 1 }))}
              className="input-field w-full h-12 px-4 text-center bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-bold text-white/90 tabular-nums shadow-inner"
            />
          </div>

          {/* Reps target */}
          <div>
            <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5 block pl-1 truncate">
              Reps <span className="text-white/20 capitalize font-medium">(8-12)</span>
            </label>
            <input
              type="text"
              placeholder="8-12"
              value={form.repsTarget || ''}
              onChange={e => setForm(p => ({ ...p, repsTarget: e.target.value }))}
              className="input-field w-full h-12 px-4 text-center bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-bold text-white/90 shadow-inner"
            />
          </div>

          {/* Rest between sets */}
          <div>
            <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5 block pl-1 truncate">
              Pausa <span className="text-white/20 capitalize font-medium">(segs)</span>
            </label>
            <input
              type="number"
              min="0" step="15" placeholder="90"
              value={form.restBetweenSets ?? ''}
              onChange={e => setForm(p => ({ ...p, restBetweenSets: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
              className="input-field w-full h-12 px-4 text-center bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-bold text-white/90 tabular-nums shadow-inner"
            />
          </div>

          {/* Rest after exercise */}
          <div>
            <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5 block pl-1 truncate">
              Final <span className="text-white/20 capitalize font-medium">(segs)</span>
            </label>
            <input
              type="number"
              min="0" step="15" placeholder="120"
              value={form.restAfterExercise ?? ''}
              onChange={e => setForm(p => ({ ...p, restAfterExercise: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
              className="input-field w-full h-12 px-4 text-center bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-bold text-white/90 tabular-nums shadow-inner"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="mt-2 border-t border-white/5 pt-4">
          <button
            onClick={handleSave}
            disabled={!form.name?.trim() || !form.setsPlanned || !form.repsTarget?.trim()}
            className="w-full py-3.5 rounded-xl bg-accent text-back-100 font-bold text-sm shadow-[0_0_15px_rgba(255,165,0,0.15)] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none hover:bg-accent/90"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </Modal>
  )
}
