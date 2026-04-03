
import { Brain, Minus, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ModeToggle } from '@/components/ui/ModeToggle'
import { DoneToggle } from '@/components/ui/DoneToggle'
import type * as T from '@/data/types'

const PRESETS = [5, 10, 15, 20, 30]

interface Props {
  entry: T.DailyEntry
  isAdv: boolean
  isHorizontal: boolean
  meditationDone: boolean
  onToggleAdv: () => void
  onUpdate: (patch: Partial<T.DailyEntry>) => void
}

export function MeditationSection({ entry, isAdv, isHorizontal, meditationDone, onToggleAdv, onUpdate }: Props) {
  const mins = entry.meditationMinutes ?? 0

  function setMins(v: number) {
    onUpdate({ meditationMinutes: v > 0 ? v : undefined, meditationDone: undefined })
  }

  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      <div className="flex items-center justify-between mb-8 px-2 sm:px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-400/15 flex items-center justify-center border border-violet-400/20 shadow-[0_0_15px_rgba(167,139,250,0.15)]">
            <Brain size={20} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Meditación</h3>
            <p className="text-[10px] font-bold text-violet-400/60 tracking-widest uppercase">
              {meditationDone
                ? entry.meditationMinutes ? `${entry.meditationMinutes} min de calma` : 'Sesión completada'
                : 'Paz interior'}
            </p>
          </div>
        </div>
        <ModeToggle isAdv={isAdv} onToggle={onToggleAdv} />
      </div>

      <div className={`flex-1 flex flex-col px-2 sm:px-4 ${isHorizontal ? 'pb-4' : ''}`}>
        {!isAdv ? (
          <DoneToggle
            done={meditationDone}
            onToggle={() => onUpdate({ meditationDone: !entry.meditationDone, meditationMinutes: undefined })}
            icon={<Brain size={22} />}
            label="Medité hoy"
            color="violet"
            fullCard
          />
        ) : isHorizontal ? (
          /* ── Horizontal advanced: big circle display ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {/* Circle input */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-violet-400/10" />
              <div className="absolute inset-2 rounded-full border border-violet-400/5" />
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)' }}
              />
              <div className="relative z-10 flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={mins || ''}
                  onChange={e => setMins(parseInt(e.target.value) || 0)}
                  placeholder="—"
                  className="w-24 bg-transparent border-none outline-none text-center text-6xl font-black text-white tabular-nums tracking-tighter placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-sm font-black text-violet-400/40 uppercase tracking-[0.3em] mt-1">min</span>
              </div>
            </div>

            {/* ± stepper */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMins(Math.max(0, mins - 1))}
                className="w-11 h-11 rounded-2xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center text-violet-400/60 hover:bg-violet-400/20 hover:text-violet-400 active:scale-95 transition-colors"
              >
                <Minus size={16} />
              </button>

              {/* Preset chips */}
              <div className="flex gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => setMins(p)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-colors border active:scale-90 ${
                      mins === p
                        ? 'bg-violet-400/25 border-violet-400/40 text-violet-300'
                        : 'bg-surface-200/40 border-white/5 text-white/35 hover:border-violet-400/20 hover:text-violet-400/70'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setMins(mins + 1)}
                className="w-11 h-11 rounded-2xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center text-violet-400/60 hover:bg-violet-400/20 hover:text-violet-400 active:scale-95 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* ── Vertical advanced: compact row ── */
          <div className="flex items-center justify-between w-full bg-surface-200/50 p-2 pl-4 rounded-[18px] border border-white/5 shadow-inner">
            <span className="text-sm font-medium text-white/50">Duración</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={mins || ''}
                onChange={e => setMins(parseInt(e.target.value) || 0)}
                placeholder="10"
                className="input-field w-20 bg-surface-300 h-10 border border-white/5 text-center font-semibold rounded-xl text-white"
              />
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest pr-2">min</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
