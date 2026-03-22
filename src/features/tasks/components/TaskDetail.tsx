import { useState } from 'react'
import { CalendarDays, Repeat, Tag, Trash2, Pencil, X, Square, SquareCheckBig, Plus } from 'lucide-react'
import type { Task } from '@/data/types'
import { STATUS_CFG } from '../constants'
import { todayStr } from '../taskOperations'

interface Props {
  task: Task
  onCycleStatus: (t: Task) => Promise<void>
  onToggleStatus: (t: Task) => Promise<void>
  onAddSubtask: (parentId: number, title: string) => Promise<void>
  onDeleteTask: (t: Task) => void
  onEdit: (t: Task) => void
  subtasksOf: (parentId: number) => Task[]
  listName: (id?: number) => string
  listColor: (id?: number) => string
  parseTags: (tags?: string) => string[]
}

export function TaskDetail({ task, onCycleStatus, onToggleStatus, onAddSubtask, onDeleteTask, onEdit, subtasksOf, listName, listColor, parseTags }: Props) {
  const st = STATUS_CFG[task.status]
  const subs = subtasksOf(task.id!)
  const tags = parseTags(task.tags)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <button onClick={() => onCycleStatus(task)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${st.color} bg-surface-200/40`}>
          {task.status === 'completed' ? <SquareCheckBig size={14} /> : <Square size={14} />}
          {task.status === 'completed' ? 'Completada' : 'Marcar completada'}
        </button>
        {task.dueDate && task.status !== 'completed' && (
          <span className="flex items-center gap-1 text-xs text-accent/80">
            <CalendarDays size={13} /> Programada
          </span>
        )}
        {task.dueDate && (
          <span className={`flex items-center gap-1 text-xs ${
            task.dueDate < todayStr() && task.status !== 'completed' ? 'text-red-400' : 'text-white/40'
          }`}>
            <CalendarDays size={13} /> {task.dueDate}
          </span>
        )}
        {task.isRecurring && (
          <span className="flex items-center gap-1 text-xs text-white/30">
            <Repeat size={12} /> {task.recurrenceRule === 'daily' ? 'Diaria' : task.recurrenceRule === 'weekly' ? 'Semanal' : 'Mensual'}
          </span>
        )}
        {task.listId && (
          <span className="flex items-center gap-1 text-xs text-white/40">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: listColor(task.listId) }} />
            {listName(task.listId)}
          </span>
        )}
      </div>

      {task.price !== undefined && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 w-fit px-2.5 py-1 rounded-lg">
          ${task.price.toLocaleString('es-CO')}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map(tag => (
            <span key={tag} className="text-[10px] bg-accent/10 text-accent/70 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
      )}

      {task.description && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wide mb-1">Descripcion</p>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* Subtasks */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">
          Subtareas ({subs.filter(s => s.status === 'completed').length}/{subs.length})
        </p>
        <div className="space-y-1">
          {subs.map(s => (
            <div key={s.id} className="group/sub flex items-center gap-2 py-1.5 rounded-lg">
              <button onClick={() => onToggleStatus(s)} className={`shrink-0 ${STATUS_CFG[s.status].color}`}>
                {s.status === 'completed' ? <SquareCheckBig size={16} /> : <Square size={16} />}
              </button>
              <span className={`text-sm flex-1 ${s.status === 'completed' ? 'line-through text-white/30' : ''}`}>{s.title}</span>
              <button onClick={() => onDeleteTask(s)} className="btn-ghost p-1 rounded md:opacity-0 md:group-hover/sub:opacity-100 transition-opacity">
                <X size={12} className="text-white/30" />
              </button>
            </div>
          ))}
        </div>
        <SubtaskInput parentId={task.id!} onAdd={onAddSubtask} />
      </div>

      <div className="flex items-center gap-4 text-[10px] text-white/20 pt-2 border-t border-white/[0.05] flex-wrap">
        <span>Creada: {new Date(task.createdAt).toLocaleDateString()}</span>
        {task.completedAt && <span>Completada: {new Date(task.completedAt).toLocaleDateString()}</span>}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <button onClick={() => onDeleteTask(task)} className="btn-ghost px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 text-red-400 hover:bg-red-400/10">
          <Trash2 size={13} /> Eliminar
        </button>
        <button onClick={() => onEdit(task)} className="btn-secondary px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5">
          <Pencil size={13} /> Editar
        </button>
      </div>
    </div>
  )
}

function SubtaskInput({ parentId, onAdd }: { parentId: number; onAdd: (parentId: number, title: string) => Promise<void> }) {
  const [text, setText] = useState('')
  return (
    <div className="flex items-center gap-2 mt-2">
      <input className="input-field flex-1 text-sm py-1.5" placeholder="Agregar subtarea..." value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={async e => { if (e.key === 'Enter') { await onAdd(parentId, text); setText('') } }} />
      <button onClick={async () => { await onAdd(parentId, text); setText('') }} className="btn-ghost p-1.5 rounded-lg">
        <Plus size={14} className="text-white/40" />
      </button>
    </div>
  )
}
