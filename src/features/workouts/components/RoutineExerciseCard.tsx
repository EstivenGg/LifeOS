import { Pencil, Trash2, GripVertical } from 'lucide-react'
import type { RoutineExercise } from '@/data/types'

interface P {
  exercise: RoutineExercise
  index: number
  onEdit: (exercise: RoutineExercise) => void
  onDelete: (id: number) => void
  isDragging?: boolean
  dragHandleProps?: Record<string, any>
}

export function RoutineExerciseCard({ exercise, index, onEdit, onDelete, isDragging, dragHandleProps }: P) {
  const restBetweenFormatted = exercise.restBetweenSets
    ? exercise.restBetweenSets < 60
      ? `${exercise.restBetweenSets}s`
      : `${Math.floor(exercise.restBetweenSets / 60)}:${String(exercise.restBetweenSets % 60).padStart(2, '0')}`
    : '—'

  const restAfterFormatted = exercise.restAfterExercise
    ? exercise.restAfterExercise < 60
      ? `${exercise.restAfterExercise}s`
      : `${Math.floor(exercise.restAfterExercise / 60)}:${String(exercise.restAfterExercise % 60).padStart(2, '0')}`
    : '—'

  return (
    <div
      className={`flex gap-3 p-3.5 rounded-lg border transition-all ${
        isDragging
          ? 'bg-accent/10 border-accent/40 shadow-lg'
          : 'bg-surface-200/40 border-white/10 hover:bg-surface-300/40 hover:border-white/20'
      }`}
    >
      {/* Drag handle */}
      <div 
        className="flex-shrink-0 flex items-center text-surface-400 cursor-grab active:cursor-grabbing touch-none p-1 -ml-1"
        {...dragHandleProps}
      >
        <GripVertical size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and index */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-surface-400 min-w-fit">E{index + 1}</span>
          <h3 className="font-medium text-sm truncate">{exercise.name}</h3>
        </div>

        {/* Parameters grid */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-surface-500 text-[11px] uppercase">Series</span>
            <span className="font-semibold">{exercise.setsPlanned}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-surface-500 text-[11px] uppercase">Reps</span>
            <span className="font-semibold">{exercise.repsTarget}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-surface-500 text-[11px] uppercase">Desc.</span>
            <span className="font-semibold">{restBetweenFormatted}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-surface-500 text-[11px] uppercase">Post</span>
            <span className="font-semibold">{restAfterFormatted}</span>
          </div>
        </div>

        {/* Notes */}
        {exercise.notes && (
          <p className="text-xs text-surface-400 mt-2 line-clamp-2">
            {exercise.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-1">
        <button
          onClick={() => onEdit(exercise)}
          className="p-2 rounded-lg bg-surface-200/50 hover:bg-surface-300/50 active:bg-accent/20 transition-colors"
          title="Editar"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(exercise.id!)}
          className="p-2 rounded-lg bg-surface-200/50 hover:bg-red-500/20 active:bg-red-500/30 transition-colors text-red-400"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
