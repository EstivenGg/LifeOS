import { useState } from 'react'
import { FolderOpen, Plus, Pencil, Trash2, CheckCheck, CalendarDays, RotateCcw } from 'lucide-react'
import type { TaskList } from '@/data/types'
import { Card, EmptyState } from '@/components/ui'
import { todayStr } from '../taskOperations'
import type { CompletionVisibility } from '../constants'

interface Props {
  activeLists: TaskList[]
  completedLists: TaskList[]
  listTaskStats: (id: number) => { total: number; done: number; totalCost: number }
  openNewList: () => void
  openEditList: (l: TaskList) => void
  completeList: (l: TaskList) => void
  requestDeleteList: (l: TaskList) => void
  setSelectedListId: (id: number) => void
  setCompletionVisibility: (val: CompletionVisibility) => void
}

export function ListsView({
  activeLists,
  completedLists,
  listTaskStats,
  openNewList,
  openEditList,
  completeList,
  requestDeleteList,
  setSelectedListId,
  setCompletionVisibility
}: Props) {
  const [filter, setFilter] = useState<'active' | 'completed'>('active')
  const displayedLists = filter === 'active' ? activeLists : completedLists

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Category Filter */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 p-1 bg-surface-100/40 rounded-lg shrink-0 border border-white/[0.02]">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
              filter === 'active'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
              filter === 'completed'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            Completadas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filter === 'active' && activeLists.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<FolderOpen size={40} />}
              title="Sin proyectos aún"
              desc="Crea listas para organizar tus tareas de forma efectiva."
              action={
                <button onClick={openNewList} className="btn-primary mt-4 px-6 py-2.5 rounded-xl shadow-lg shadow-accent/20 flex items-center gap-2">
                  <Plus size={16} /> Crear lista
                </button>
              }
            />
          </div>
        ) : filter === 'completed' && completedLists.length === 0 ? (
          <div className="col-span-full py-12 text-center text-white/30">
            <p className="text-sm">No tienes listas completadas actualmente.</p>
          </div>
        ) : (
          <>
            {displayedLists.map(l => {
              const { total, done, totalCost } = listTaskStats(l.id!)
              const pct = total > 0 ? Math.round((done / total) * 100) : (filter === 'completed' ? 100 : 0)
              const isCompleted = filter === 'completed'

              return (
                <Card 
                  key={l.id} 
                  hover 
                  className={`group relative overflow-hidden !p-0 cursor-pointer border border-white/[0.05] transition-colors hover:border-white/[0.15] ${isCompleted ? 'opacity-70 hover:opacity-100 grayscale-[0.3]' : ''}`}
                  onClick={() => { setSelectedListId(l.id!); setCompletionVisibility(isCompleted ? 'all' : 'active') }}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 ${isCompleted ? 'opacity-50' : ''}`} style={{ backgroundColor: l.color }} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 shrink-0" style={{ color: l.color }}>
                          {isCompleted ? <CheckCheck size={16} /> : <FolderOpen size={16} />}
                        </div>
                        <span className={`text-base font-bold truncate tracking-tight ${isCompleted ? 'line-through decoration-white/30 text-white/60' : ''}`}>{l.name}</span>
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -mr-2 bg-surface-100 pb-1 rounded-bl-xl pl-2 absolute top-4 right-4 z-10">
                        {!isCompleted && (
                          <>
                            <button onClick={e => { e.stopPropagation(); openEditList(l) }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                              <Pencil size={14} className="text-white/60" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); completeList(l) }} className="p-1.5 hover:bg-emerald-400/20 rounded-lg transition-colors" title="Completar lista">
                              <CheckCheck size={14} className="text-emerald-400" />
                            </button>
                          </>
                        )}
                        <button onClick={e => { e.stopPropagation(); requestDeleteList(l) }} className="p-1.5 hover:bg-red-400/20 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        {l.dueDate && (
                          <div className={`flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md ${!isCompleted && l.dueDate < todayStr() ? 'bg-red-400/10 text-red-400' : 'bg-surface-200/50 text-white/50'}`}>
                            <CalendarDays size={12} /> {l.dueDate}
                          </div>
                        )}
                        {totalCost > 0 && (
                          <div className={`font-bold px-2 py-0.5 rounded-md self-start ${isCompleted ? 'text-white/40 bg-white/5' : 'text-emerald-400 bg-emerald-400/10'}`}>
                            ${totalCost.toLocaleString('es-CO')}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                            {isCompleted ? 'Completado al' : 'Progreso'}
                          </span>
                          <span className="text-[11px] font-bold text-white/70">{pct}%</span>
                        </div>
                        <div className="h-2 bg-surface-200/60 rounded-full overflow-hidden shadow-inner">
                          <div className={`h-full rounded-full transition-all duration-700 ease-out ${isCompleted ? 'bg-emerald-500/50' : ''}`} style={{ width: `${pct}%`, backgroundColor: !isCompleted ? l.color : undefined }} />
                        </div>
                        <span className="text-[10px] text-white/30 text-right mt-0.5">{done} de {total} tareas completadas</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
            
            {/* Create new list card (only in 'active' tab) */}
            {filter === 'active' && (
              <Card className="!p-0 cursor-pointer border-dashed border-2 border-white/10 hover:border-white/20 transition-colors flex flex-col items-center justify-center min-h-[160px] bg-transparent hover:bg-white/[0.02]" onClick={openNewList}>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-white/40 group-hover:text-white/80 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="text-sm font-semibold text-white/50">Crear nueva lista</span>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
