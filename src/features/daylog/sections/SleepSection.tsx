import { motion } from 'framer-motion'
import { Moon, Sun, Frown, Meh, Smile, Laugh } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ModeToggle } from '@/components/ui/ModeToggle'
import { PremiumTimePicker } from '@/components/ui/PremiumTimePicker'
import type * as T from '@/data/types'

export const SLEEP_QUALITY = [
  { v: 1, icon: Frown, label: 'Mal',     color: 'text-red-400 border-red-400 bg-red-400',         glow: 'shadow-[0_0_20px_rgba(248,113,113,0.25)]'  },
  { v: 2, icon: Meh,   label: 'Regular', color: 'text-amber-400 border-amber-400 bg-amber-400',   glow: 'shadow-[0_0_20px_rgba(251,191,36,0.25)]'   },
  { v: 3, icon: Smile, label: 'Bien',    color: 'text-emerald-400 border-emerald-400 bg-emerald-400', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.25)]' },
  { v: 4, icon: Laugh, label: 'Super',   color: 'text-indigo-400 border-indigo-400 bg-indigo-400', glow: 'shadow-[0_0_20px_rgba(129,140,248,0.25)]' },
] as const

interface Props {
  entry: T.DailyEntry
  isAdv: boolean
  isHorizontal: boolean
  onToggleAdv: () => void
  onUpdate: (patch: Partial<T.DailyEntry>) => void
  onUpdateSleepTime: (field: 'sleepBedtime' | 'sleepWakeTime', val: string | undefined) => void
}

export function SleepSection({ entry, isAdv, isHorizontal, onToggleAdv, onUpdate, onUpdateSleepTime }: Props) {
  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2 sm:px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-400/15 flex items-center justify-center border border-indigo-400/20 shadow-[0_0_15px_rgba(129,140,248,0.15)]">
            <Moon size={20} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Sueño</h3>
            <p className="text-[10px] font-bold text-indigo-400/60 tracking-widest uppercase">
              {entry.sleepHours ? `${entry.sleepHours}h de descanso` : 'Calidad de descanso'}
            </p>
          </div>
        </div>
        <ModeToggle isAdv={isAdv} onToggle={onToggleAdv} />
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col px-2 sm:px-4 ${isHorizontal ? 'pb-4 min-h-0' : 'justify-center'}`}>
        {!isAdv ? (
          isHorizontal ? (
            /* ── Basic horizontal: 2×2 quality grid ── */
            <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
              {SLEEP_QUALITY.map(q => {
                const active = entry.sleepQuality === q.v
                const [textC, borderC, bgC] = q.color.split(' ')
                return (
                  <motion.button
                    key={q.v}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onUpdate({ sleepQuality: active ? undefined : q.v })}
                    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 transition-all duration-300 ${
                      active
                        ? `${borderC} ${bgC}/15 text-white ${q.glow} ring-1 ${borderC.replace('border-', 'ring-')}/40`
                        : 'border-white/5 bg-surface-300/20 text-white/35 hover:border-white/10 hover:bg-surface-300/40'
                    }`}
                  >
                    <q.icon size={34} className={active ? textC : 'text-white/30'} />
                    <span className={`text-sm font-black tracking-wide ${active ? 'text-white' : 'text-white/40'}`}>
                      {q.label}
                    </span>
                    {active && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-[9px] font-black uppercase tracking-widest ${textC} opacity-70`}
                      >
                        seleccionado
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          ) : (
            /* ── Basic vertical: row ── */
            <div className="flex justify-between items-center gap-2">
              {SLEEP_QUALITY.map(q => {
                const active = entry.sleepQuality === q.v
                const [textC, borderC, bgC] = q.color.split(' ')
                return (
                  <motion.button
                    key={q.v}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onUpdate({ sleepQuality: active ? undefined : q.v })}
                    className={`flex flex-col items-center justify-center gap-1.5 w-full py-4 rounded-2xl border-2 transition-all duration-300 ${
                      active
                        ? `${borderC} ${bgC}/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white ring-1 ${borderC.replace('border-', 'ring-')}/50`
                        : 'border-white/5 bg-surface-300/20 text-white/40 hover:border-white/10 hover:bg-surface-300/40'
                    }`}
                  >
                    <q.icon size={26} className={active ? textC : 'text-white/40'} />
                    <span className="text-[10px] font-bold tracking-wide">{q.label}</span>
                  </motion.button>
                )
              })}
            </div>
          )
        ) : isHorizontal ? (
          /* ── Advanced horizontal: moon | hours | sun timeline ── */
          <div className="flex-1 flex flex-col justify-center gap-5 min-h-0">
            {/* Three-column timeline */}
            <div className="flex items-center gap-3">
              {/* Bedtime */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-400/15 border border-indigo-400/20 flex items-center justify-center shadow-[0_0_12px_rgba(129,140,248,0.15)]">
                  <Moon size={18} className="text-indigo-400" />
                </div>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Dormí</span>
                <div className="w-full text-center">
                  <span className="text-2xl font-black text-white/80 tabular-nums">
                    {entry.sleepBedtime || '—'}
                  </span>
                </div>
              </div>

              {/* Divider line left */}
              <div className="flex-1 h-px bg-gradient-to-r from-indigo-400/20 to-indigo-400/5" />

              {/* Hours circle */}
              <div className="relative flex flex-col items-center shrink-0">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-400/15" />
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)' }}
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative z-10 flex flex-col items-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      inputMode="decimal"
                      value={entry.sleepHours ?? ''}
                      onChange={e => onUpdate({ sleepHours: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="—"
                      className="w-16 bg-transparent border-none outline-none text-center text-3xl font-black text-white tabular-nums placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-[8px] font-black text-indigo-400/50 uppercase tracking-widest">horas</span>
                  </div>
                </div>
                {entry.sleepBedtime && entry.sleepWakeTime && (
                  <span className="text-[8px] text-indigo-400/40 font-bold mt-1">auto</span>
                )}
              </div>

              {/* Divider line right */}
              <div className="flex-1 h-px bg-gradient-to-l from-amber-400/20 to-amber-400/5" />

              {/* Wake time */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                  <Sun size={18} className="text-amber-400" />
                </div>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Desperté</span>
                <div className="w-full text-center">
                  <span className="text-2xl font-black text-white/80 tabular-nums">
                    {entry.sleepWakeTime || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Time pickers row */}
            <div className="grid grid-cols-2 gap-3">
              <PremiumTimePicker
                value={entry.sleepBedtime}
                onChange={value => onUpdateSleepTime('sleepBedtime', value)}
                title="Me dormí"
                placeholder="Hora de dormir"
                minuteStep={5}
              />
              <PremiumTimePicker
                value={entry.sleepWakeTime}
                onChange={value => onUpdateSleepTime('sleepWakeTime', value)}
                title="Me desperté"
                placeholder="Hora de despertar"
                minuteStep={5}
              />
            </div>
          </div>
        ) : (
          /* ── Advanced vertical: compact ── */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Moon size={12} className="text-indigo-400" />
                  <label className="text-[10px] text-white/30">Me dormí</label>
                </div>
                <PremiumTimePicker
                  value={entry.sleepBedtime}
                  onChange={value => onUpdateSleepTime('sleepBedtime', value)}
                  title="Me dormí"
                  placeholder="Hora"
                  minuteStep={5}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Sun size={12} className="text-amber-400" />
                  <label className="text-[10px] text-white/30">Me desperté</label>
                </div>
                <PremiumTimePicker
                  value={entry.sleepWakeTime}
                  onChange={value => onUpdateSleepTime('sleepWakeTime', value)}
                  title="Me desperté"
                  placeholder="Hora"
                  minuteStep={5}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={entry.sleepHours ?? ''}
                onChange={e => onUpdate({ sleepHours: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="7.5"
                className="input-field w-24"
              />
              <span className="text-xs text-white/30">horas</span>
              {entry.sleepBedtime && entry.sleepWakeTime && (
                <span className="text-[10px] text-accent/60">← auto-calculado</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
