import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { RoutineExerciseModal } from './RoutineExerciseModal'
import { RoutineExerciseCard } from './RoutineExerciseCard'
import { ExerciseCatalogPicker } from './ExerciseCatalogPicker'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, X, Trash2 } from 'lucide-react'
import type { Routine, RoutineExercise, ExerciseCatalog } from '@/data/types'

interface P {
  open: boolean
  onClose: () => void
  routine: Routine | null
  exercises: RoutineExercise[]
  catalog: ExerciseCatalog[]
  onSave: (routine: Routine, exercises: RoutineExercise[]) => void
  onAddExercise: (routineId: number, catalogId: number, customName?: string) => void
  onDeleteExercise: (exerciseId: number) => void
  onUpdateExercise: (exercise: RoutineExercise) => void
  onDeleteRoutine?: (id: number) => void
}

// Draggable exercise card wrapper
function DraggableExerciseCard({
  id,
  exercise,
  index,
  onEdit,
  onDelete,
}: {
  id: string
  exercise: RoutineExercise
  index: number
  onEdit: (e: RoutineExercise) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <RoutineExerciseCard
        exercise={exercise}
        index={index}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function RoutineEditor({
  open,
  onClose,
  routine,
  exercises,
  catalog,
  onSave,
  onAddExercise,
  onDeleteExercise,
  onUpdateExercise,
  onDeleteRoutine,
}: P) {
  const [form, setForm] = useState<Partial<Routine>>({})
  const [localExercises, setLocalExercises] = useState<RoutineExercise[]>([])
  const [editingExercise, setEditingExercise] = useState<RoutineExercise | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    exercises: true,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (open) {
      if (routine) {
        setForm({
          name: routine.name,
          objective: routine.objective,
          estimatedDuration: routine.estimatedDuration,
        })
        setLocalExercises(exercises.filter(ex => ex.routineId === routine.id))
      } else {
        setForm({ name: '', objective: '', estimatedDuration: undefined })
        setLocalExercises([])
      }
    }
  }, [open, routine]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!form.name?.trim()) return
    const updatedRoutine: Routine = {
      ...(routine || {}),
      id: routine?.id,
      name: form.name.trim(),
      objective: form.objective || undefined,
      estimatedDuration: form.estimatedDuration || undefined,
    }
    onSave(updatedRoutine, localExercises)
    onClose()
  }

  const handleAddExercise = (catalogEx: ExerciseCatalog) => {
    // If editing existing routine, call parent to persist
    if (routine?.id) {
      onAddExercise(routine.id, catalogEx.id!)
      setShowPicker(false)
    } else {
      // If creating new routine, add to local state (will be persisted on save)
      const newExercise: RoutineExercise = {
        id: -Date.now() - Math.floor(Math.random() * 1000), // temp ID para DND
        routineId: -1, // placeholder, will be set on save
        exerciseCatalogId: catalogEx.id!,
        name: catalogEx.name,
        sortOrder: localExercises.length,
        setsPlanned: 3,
        repsTarget: '8-12',
        restBetweenSets: 90,
      }
      setLocalExercises([...localExercises, newExercise])
      setShowPicker(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = localExercises.findIndex(e => `ex-${e.id}` === active.id)
      const newIndex = localExercises.findIndex(e => `ex-${e.id}` === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(localExercises, oldIndex, newIndex)
        // Update sortOrder
        const updated = reordered.map((ex, idx) => ({
          ...ex,
          sortOrder: idx,
        }))
        setLocalExercises(updated)
        // TODO: save sort order to DB
      }
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={routine ? 'Editar Rutina' : 'Nueva Rutina'} size="md">
        <div className="flex flex-col gap-5 max-h-[calc(90vh-120px)] overflow-y-auto overflow-x-hidden hide-scrollbar pb-6 px-1">
          
          {/* General Form */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1.5 block pl-1">
                Nombre de la rutina <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Upper Body, Push, Pierna..."
                value={form.name || ''}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="input-field w-full h-12 px-4 bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-semibold text-white/90 shadow-inner"
              />
            </div>

          {/* Removed Enfoque and Tiempo input group */}
          </div>

          {/* Exercises Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3 pl-1">
              <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                Ejercicios
                <span className="bg-surface-300/40 text-white/70 px-2 py-0.5 rounded-md text-[10px]">
                  {localExercises.length}
                </span>
              </h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {localExercises.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localExercises.map(e => `ex-${e.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {localExercises.map((ex, idx) => (
                        <DraggableExerciseCard
                          key={ex.id}
                          id={`ex-${ex.id}`}
                          exercise={ex}
                          index={idx}
                          onEdit={setEditingExercise}
                          onDelete={onDeleteExercise}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="py-8 rounded-2xl border border-dashed border-white/10 bg-surface-200/20 text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-xl">🏋️‍♂️</span>
                  <p className="text-xs text-white/40 font-medium max-w-[200px]">
                    No hay ejercicios. Añade uno para construir tu rutina.
                  </p>
                </div>
              )}

              {/* Add Exercise Button */}
              <button
                onClick={() => setShowPicker(true)}
                className="mt-2 w-full py-3.5 rounded-xl border-2 border-dashed border-white/10 text-white/50 hover:text-white hover:bg-white/5 hover:border-white/20 text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                + Agregar Ejercicio
              </button>
            </div>
          </div>
        </div>

        {/* Save/Action Footer */}
        <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
          {routine && onDeleteRoutine && (
            <button
              onClick={() => {
                const ok = window.confirm('¿Seguro que deseas eliminar esta rutina por completo?')
                if (ok) onDeleteRoutine(routine.id!)
              }}
              className="px-5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30 transition-all flex items-center justify-center"
              title="Eliminar Rutina"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!form.name?.trim()}
            className="flex-1 py-3.5 rounded-xl bg-accent text-back-100 font-bold text-sm shadow-[0_0_15px_rgba(255,165,0,0.15)] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none hover:bg-accent/90"
          >
            {routine ? 'Guardar Cambios' : 'Crear Rutina'}
          </button>
        </div>
      </Modal>

      {/* Exercise picker modal */}
      <Modal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        title="Agregar ejercicio"
        size="sm"
      >
        <ExerciseCatalogPicker
          catalog={catalog}
          onSelect={handleAddExercise}
          onCreateCustom={name => {
            if (routine) {
              // TODO: create custom exercise first
              // For now, create as generic "Otros"
              handleAddExercise({
                id: 0, // placeholder
                name,
                muscleGroup: 'Otros',
              })
            }
          }}
        />
      </Modal>

      {/* Exercise editor modal */}
      <RoutineExerciseModal
        open={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        exercise={editingExercise}
        onSave={ex => {
          // Only persist to DB if editing an existing (saved) routine — not temp exercises
          if (routine?.id && ex.id && ex.id > 0) onUpdateExercise(ex)
          setEditingExercise(null)
          setLocalExercises(prev => prev.map(e => (e.id === ex.id ? ex : e)))
        }}
      />
    </>
  )
}
