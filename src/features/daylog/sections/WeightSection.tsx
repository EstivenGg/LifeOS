import { motion } from 'framer-motion'
import { Scale, Minus, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type * as T from '@/data/types'

interface Props {
  entry: T.DailyEntry
  isHorizontal: boolean
  onUpdate: (patch: Partial<T.DailyEntry>) => void
}

export function WeightSection({ entry, isHorizontal, onUpdate }: Props) {
  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      <div className={`flex items-center justify-between px-2 sm:px-4 shrink-0 ${isHorizontal ? 'mb-8' : 'mb-5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/15 flex items-center justify-center border border-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
            <Scale size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Peso</h3>
            <p className="text-[10px] font-bold text-amber-400/60 tracking-widest uppercase">
              {entry.weightKg !== undefined ? `${entry.weightKg} kg registrado` : 'Control corporal'}
            </p>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center px-2 sm:px-4 ${isHorizontal ? 'pb-4' : ''}`}>
        {isHorizontal ? (
          <div className="flex flex-col items-center">
            <div className="relative w-44 h-44 flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/10" />
              <div className="absolute inset-2 rounded-full border border-amber-400/5" />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                inputMode="decimal"
                value={entry.weightKg ?? ''}
                onChange={e => onUpdate({ weightKg: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="—"
                className="relative z-10 w-28 bg-transparent border-none outline-none text-center text-6xl font-black text-white tabular-nums tracking-tighter placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <span className="text-sm font-black text-amber-400/40 uppercase tracking-[0.3em]">kilogramos</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => onUpdate({ weightKg: Math.max(20, Math.round(((entry.weightKg ?? 70) - 0.1) * 10) / 10) })}
                className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400/60 hover:bg-amber-400/20 hover:text-amber-400 active:scale-95 transition-all shrink-0"
              >
                <Minus size={18} />
              </button>
              <div className="relative flex flex-col items-center">
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, transparent 70%)' }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="flex items-baseline gap-1 relative z-10">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    inputMode="decimal"
                    value={entry.weightKg ?? ''}
                    onChange={e => onUpdate({ weightKg: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="72.5"
                    className="w-32 bg-transparent border-none outline-none text-center text-5xl font-black text-white tabular-nums tracking-tighter placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-xl font-black text-amber-400/50 pb-1">kg</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUpdate({ weightKg: Math.min(300, Math.round(((entry.weightKg ?? 70) + 0.1) * 10) / 10) })}
                className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400/60 hover:bg-amber-400/20 hover:text-amber-400 active:scale-95 transition-all shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>
            <span className="text-[10px] font-black text-amber-400/30 uppercase tracking-[0.3em]">kilogramos</span>
          </div>
        )}
      </div>
    </Card>
  )
}
