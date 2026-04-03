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
                  <button
                    key={q.v}
                    onClick={() => onUpdate({ sleepQuality: active ? undefined : q.v })}
                    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 transition-colors duration-300 active:scale-95 ${
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
                  </button>
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
                  <button
                    key={q.v}
                    onClick={() => onUpdate({ sleepQuality: active ? undefined : q.v })}
                    className={`flex flex-col items-center justify-center gap-1.5 w-full py-4 rounded-2xl border-2 transition-colors duration-300 active:scale-95 ${
                      active
                        ? `${borderC} ${bgC}/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-white ring-1 ${borderC.replace('border-', 'ring-')}/50`
                        : 'border-white/5 bg-surface-300/20 text-white/40 hover:border-white/10 hover:bg-surface-300/40'
                    }`}
                  >
                    <q.icon size={26} className={active ? textC : 'text-white/40'} />
                    <span className="text-[10px] font-bold tracking-wide">{q.label}</span>
                  </button>
                )
              })}
            </div>
          )
        ) : isHorizontal ? (
          /* ── Advanced horizontal: premium stacked layout ── */
          <div className="flex-1 flex flex-col justify-center gap-8 min-h-0 overflow-y-auto pb-4 custom-scrollbar mt-1">
            
            {/* Top: Hours circle */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-indigo-400/20 shadow-[inset_0_0_20px_rgba(129,140,248,0.1)]" />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 68%)' }}
                />
                <div className="relative z-10 flex flex-col items-center mt-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    inputMode="decimal"
                    value={entry.sleepHours ?? ''}
                    onChange={e => onUpdate({ sleepHours: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="—"
                    className="w-24 bg-transparent border-none outline-none text-center text-5xl sm:text-6xl leading-none font-black text-white tabular-nums placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest mt-1.5">horas</span>
                </div>
              </div>
              {entry.sleepBedtime && entry.sleepWakeTime && (
                <span className="text-[9px] text-indigo-400/50 font-bold uppercase tracking-widest bg-surface-200/60 px-2.5 py-1 rounded-full border border-white/[0.08] mt-4 shadow-sm">auto-calculado</span>
              )}
            </div>

            {/* Bottom: Bedtime & Wake time */}
            <div className="grid grid-cols-2 gap-4 shrink-0 px-2">
              {/* Bedtime */}
              <div className="flex flex-col items-center gap-2.5 relative group cursor-pointer hover:bg-white/[0.04] p-4 sm:p-5 rounded-[24px] transition-colors border border-white/5 bg-surface-200/30 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-indigo-400/15 border border-indigo-400/20 flex items-center justify-center shadow-[0_0_15px_rgba(129,140,248,0.15)] group-active:scale-95 transition-transform">
                  <Moon size={22} className="text-indigo-400" />
                </div>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Dormí</span>
                <div className="w-full text-center flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-50 tabular-nums tracking-tight">
                    {entry.sleepBedtime || '—'}
                  </span>
                  {!entry.sleepBedtime && <span className="text-[10px] text-white/20 mt-1 uppercase tracking-widest font-bold">Tocar</span>}
                </div>
                {/* Invisible picker overlay */}
                <div className="absolute inset-0 z-10 opacity-0">
                  <PremiumTimePicker
                    value={entry.sleepBedtime}
                    onChange={value => onUpdateSleepTime('sleepBedtime', value)}
                    title="Me dormí"
                    minuteStep={5}
                    buttonClassName="w-full h-full absolute inset-0 !min-h-0"
                  />
                </div>
              </div>

              {/* Wake time */}
              <div className="flex flex-col items-center gap-2.5 relative group cursor-pointer hover:bg-white/[0.04] p-4 sm:p-5 rounded-[24px] transition-colors border border-white/5 bg-surface-200/30 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.15)] group-active:scale-95 transition-transform">
                  <Sun size={22} className="text-amber-400" />
                </div>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Desperté</span>
                <div className="w-full text-center flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-amber-50 tabular-nums tracking-tight">
                    {entry.sleepWakeTime || '—'}
                  </span>
                  {!entry.sleepWakeTime && <span className="text-[10px] text-white/20 mt-1 uppercase tracking-widest font-bold">Tocar</span>}
                </div>
                {/* Invisible picker overlay */}
                <div className="absolute inset-0 z-10 opacity-0">
                  <PremiumTimePicker
                    value={entry.sleepWakeTime}
                    onChange={value => onUpdateSleepTime('sleepWakeTime', value)}
                    title="Me desperté"
                    minuteStep={5}
                    buttonClassName="w-full h-full absolute inset-0 !min-h-0"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Advanced vertical: premium cards ── */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Bedtime */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-surface-200/30 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-400/15 flex items-center justify-center shadow-inner">
                    <Moon size={15} className="text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Dormí</span>
                </div>
                <PremiumTimePicker
                  value={entry.sleepBedtime}
                  onChange={value => onUpdateSleepTime('sleepBedtime', value)}
                  title="Me dormí"
                  placeholder="00:00"
                  minuteStep={5}
                />
              </div>

              {/* Wake time */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-surface-200/30 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center shadow-inner">
                    <Sun size={15} className="text-amber-400" />
                  </div>
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Desperté</span>
                </div>
                <PremiumTimePicker
                  value={entry.sleepWakeTime}
                  onChange={value => onUpdateSleepTime('sleepWakeTime', value)}
                  title="Me desperté"
                  placeholder="00:00"
                  minuteStep={5}
                />
              </div>
            </div>

            {/* Total hours */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-200/40 border border-white/[0.04]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-white/80">Total de horas</span>
                {entry.sleepBedtime && entry.sleepWakeTime ? (
                  <span className="text-[9px] font-bold text-accent/70 uppercase tracking-widest">Cálculo automático</span>
                ) : (
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Opcional</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  inputMode="decimal"
                  value={entry.sleepHours ?? ''}
                  onChange={e => onUpdate({ sleepHours: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="—"
                  className="w-[72px] bg-surface-100/60 border border-white/[0.08] rounded-xl outline-none text-center text-xl font-black text-white tabular-nums placeholder:text-white/20 focus:ring-2 focus:ring-accent/50 focus:border-accent py-1.5 transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
