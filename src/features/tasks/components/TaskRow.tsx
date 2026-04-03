import { useState } from 'react'
import { CalendarDays, Repeat, Trash2, Pencil, ChevronDown, ChevronRight, Square, SquareCheckBig } from 'lucide-react'
import type { Task } from '@/data/types'
import { todayStr } from '../taskOperations'

interface Props {
  t: Task
  depth?: number
  subtasksOf: (parentId: number) => Task[]
  parseTags: (tags?: string) => string[]
  toggleStatus: (t: Task) => Promise<void>
  setDetailTask: (t: Task) => void
  openEditTask: (t: Task) => void
  requestDeleteTask: (t: Task) => void
}

export function TaskRow({ t, depth = 0, subtasksOf, parseTags, toggleStatus, setDetailTask, openEditTask, requestDeleteTask }: Props) {
  const subs = subtasksOf(t.id!)
  const tags = parseTags(t.tags)
  const [showSubs, setShowSubs] = useState(true)

  return (
    <>
      <div
        className={`group/row flex items-start gap-2 py-2.5 px-3 rounded-xl active:bg-surface-200/50 md:hover:bg-surface-200/40 transition-colors ${
          t.status === 'completed' ? 'opacity-50' : ''
        }`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <button
          onClick={() => toggleStatus(t)}
          className="mt-0.5 shrink-0 text-white/40 transition-colors hover:text-emerald-400 active:scale-90"
          title={t.status === 'completed' ? 'Reabrir' : 'Completar'}
        >
          {t.status === 'completed'
            ? <SquareCheckBig size={18} className="text-emerald-400" />
            : <Square size={18} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailTask(t)}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${t.status === 'completed' ? 'line-through text-white/30' : ''}`}>
              {t.title}
            </span>
            {t.isRecurring && <Repeat size={12} className="shrink-0 text-white/20" />}
          </div>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {t.dueDate && (
              <span className={`text-[10px] flex items-center gap-0.5 ${
                t.dueDate < todayStr() && t.status !== 'completed' ? 'text-red-400' : 'text-white/30'
              }`}>
                <CalendarDays size={10} /> {t.dueDate}
              </span>
            )}
            {subs.length > 0 && (
              <span className="text-[10px] text-white/30">
                {subs.filter(s => s.status === 'completed').length}/{subs.length} subtareas
              </span>
            )}
            {t.price !== undefined && (
              <span className="text-[9px] bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 rounded-md font-medium">
                ${t.price.toLocaleString('es-CO')}
              </span>
            )}
            {tags.map(tag => (
              <span key={tag} className="text-[9px] bg-accent/10 text-accent/70 px-1.5 py-0.5 rounded-md">{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity shrink-0">
          <button onClick={() => openEditTask(t)} className="btn-ghost p-1.5 rounded-lg">
            <Pencil size={13} className="text-white/40" />
          </button>
          <button onClick={() => requestDeleteTask(t)} className="btn-ghost p-1.5 rounded-lg">
            <Trash2 size={13} className="text-white/40" />
          </button>
        </div>

        {subs.length > 0 && (
          <button onClick={() => setShowSubs(!showSubs)} className="mt-0.5 shrink-0 btn-ghost p-1 rounded">
            {showSubs ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
          </button>
        )}
      </div>

      {showSubs && subs.map(s => (
        <TaskRow
          key={s.id} t={s} depth={depth + 1}
          subtasksOf={subtasksOf} parseTags={parseTags} toggleStatus={toggleStatus}
          setDetailTask={setDetailTask} openEditTask={openEditTask} requestDeleteTask={requestDeleteTask}
        />
      ))}
    </>
  )
}
