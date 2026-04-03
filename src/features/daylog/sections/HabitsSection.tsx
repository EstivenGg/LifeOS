import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type * as T from '@/data/types'

interface Props {
  habits: T.Habit[]
  categories: T.HabitCategory[]
  entryHabits: T.EntryHabit[]
  doneCount: number
  isHorizontal: boolean
  onToggle: (habitId: number) => void
  onNavigateToHabits: () => void
}

function ProgressRing({ done, total, size = 48 }: { done: number; total: number; size?: number }) {
  const r = size * 0.4
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? done / total : 0
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={size * 0.083} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={size * 0.083}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - pct * circ }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
          className="text-accent"
        />
      </svg>
      <span className="absolute text-[11px] font-black text-white/80">
        {Math.round(pct * 100)}%
      </span>
    </div>
  )
}

function HabitChip({ habit, done, onToggle }: { habit: T.Habit; done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl transition-colors duration-300 border text-left active:scale-90 ${
        done
          ? 'bg-accent/10 border-accent/25 shadow-[inset_0_0_10px_rgb(var(--accent)/0.08)]'
          : 'bg-surface-200/40 border-white/5 hover:border-white/10 hover:bg-surface-300/40'
      }`}
    >
      <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
        done ? 'bg-accent border-accent shadow-[0_0_10px_rgb(var(--accent)/0.5)]' : 'border-white/20 bg-surface-100/50'
      }`}>
        <AnimatePresence>
          {done && (
            <motion.b
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="text-white text-[9px] leading-none"
            >✓</motion.b>
          )}
        </AnimatePresence>
      </div>
      <span className={`text-xs font-bold truncate leading-tight transition-colors duration-300 ${done ? 'text-white' : 'text-white/55'}`}>
        {habit.name}
      </span>
    </button>
  )
}

export function HabitsSection({ habits, categories, entryHabits, doneCount, isHorizontal, onToggle, onNavigateToHabits }: Props) {
  const groupedHabits = habits.reduce<Record<number, T.Habit[]>>((acc, h) => {
    (acc[h.categoryId] = acc[h.categoryId] || []).push(h)
    return acc
  }, {})

  const EmptyState = (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center">
      <div className="w-12 h-12 rounded-full bg-surface-200/50 flex items-center justify-center mx-auto mb-3 opacity-30">
        <CheckCircle2 size={24} className="text-white/20" />
      </div>
      <p className="text-sm text-white/40 mb-3">Sin hábitos activos.</p>
      <button onClick={onNavigateToHabits} className="btn-ghost scale-95 border border-white/5 bg-surface-200/40 text-xs px-4 py-2">
        Configurar Hábitos
      </button>
    </div>
  )

  if (!isHorizontal) {
    /* ── Vertical ── */
    return (
      <Card className="flex flex-col py-6">
        <div className="flex items-center justify-between mb-6 px-2 sm:px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center border border-accent/20">
              <CheckCircle2 size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white/90">Hábitos Diarios</h3>
              <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
                {doneCount} de {habits.length} completados
              </p>
            </div>
          </div>
          <ProgressRing done={doneCount} total={habits.length} size={48} />
        </div>

        <div className="flex-1 overflow-y-auto disable-scrollbars px-2 sm:px-4">
          {habits.length === 0 ? EmptyState : (
            <div className="space-y-5">
              {Object.entries(groupedHabits).map(([catId, catHabits]) => {
                const cat = categories.find(c => c.id === Number(catId))
                return (
                  <div key={catId}>
                    {/* Category separator */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-1 h-3.5 rounded-full bg-accent/50" />
                      <p className="text-[10px] font-black capitalize tracking-widest text-white/35">
                        {cat?.name || 'Varios'}
                      </p>
                      <div className="flex-1 h-px bg-white/[0.04]" />
                    </div>

                    <div className="space-y-2">
                      {catHabits.map(h => {
                        const done = entryHabits.find(eh => eh.habitId === h.id!)?.done || false
                        return (
                          <button
                            key={h.id}
                            onClick={() => onToggle(h.id!)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[18px] transition-colors duration-300 border active:scale-95 ${
                              done
                                ? 'bg-accent/10 border-accent/20 shadow-[inset_0_0_12px_rgb(var(--accent)/0.08)]'
                                : 'bg-surface-200/40 border-white/5 hover:border-white/10 hover:bg-surface-300/40'
                            }`}
                          >
                            <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
                              done ? 'bg-accent border-accent shadow-[0_0_12px_rgb(var(--accent)/0.5)]' : 'border-white/20 bg-surface-100/50'
                            }`}>
                              <motion.div
                                initial={false}
                                animate={done ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              >
                                <b className="text-white text-xs drop-shadow leading-none">✓</b>
                              </motion.div>
                            </div>
                            <span className={`text-[15px] sm:text-base font-medium truncate transition-colors duration-300 ${done ? 'text-white' : 'text-white/60'}`}>
                              {h.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    )
  }

  /* ── Horizontal ── */
  return (
    <Card className="h-full flex flex-col pt-8 pb-4">
      {/* Header with inline ring */}
      <div className="flex items-center justify-between mb-5 px-2 sm:px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center border border-accent/20">
            <CheckCircle2 size={16} className="text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/70">Hábitos</h3>
            <p className="text-[9px] font-black text-white/25 tracking-widest uppercase">{doneCount}/{habits.length}</p>
          </div>
        </div>
        <ProgressRing done={doneCount} total={habits.length} size={52} />
      </div>

      {/* Two-column chip grid */}
      <div className="flex-1 overflow-y-auto disable-scrollbars px-2 sm:px-6 pb-12 fade-bottom-mask">
        {habits.length === 0 ? EmptyState : (
          <div className="space-y-4">
            {Object.entries(groupedHabits).map(([catId, catHabits]) => {
              const cat = categories.find(c => c.id === Number(catId))
              return (
                <div key={catId}>
                  {/* Category label */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-3 rounded-full bg-accent/50" />
                    <p className="text-[9px] font-black capitalize tracking-widest text-white/30">
                      {cat?.name || 'Varios'}
                    </p>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>

                  {/* 2-col grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {catHabits.map(h => {
                      const done = entryHabits.find(eh => eh.habitId === h.id!)?.done || false
                      return (
                        <HabitChip key={h.id} habit={h} done={done} onToggle={() => onToggle(h.id!)} />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
