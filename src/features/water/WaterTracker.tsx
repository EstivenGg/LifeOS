import { useState } from 'react'
import { motion } from 'framer-motion'
import { Droplet, Minus, Plus } from 'lucide-react'

const ML_PER_GLASS = 250
const TARGET = 8

const L_PRESETS = [0.25, 0.5, 0.75, 1]

interface P { waterMl: number; onChange: (ml: number) => void; isHorizontal?: boolean }

export function WaterTracker({ waterMl, onChange, isHorizontal }: P) {
  const [mode, setMode] = useState<'vasos' | 'litros'>('vasos')
  const glasses = Math.round(waterMl / ML_PER_GLASS)
  const liters = Math.round(waterMl / 100) / 10
  const pct = Math.min((glasses / TARGET) * 100, 100)

  const ModeToggle = (
    <div className="flex bg-surface-200/60 p-1 rounded-xl border border-white/5 shadow-inner">
      <button
        onClick={() => setMode('vasos')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${mode === 'vasos' ? 'bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]' : 'text-white/40 hover:text-white/70'}`}
      >Vasos</button>
      <button
        onClick={() => setMode('litros')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${mode === 'litros' ? 'bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]' : 'text-white/40 hover:text-white/70'}`}
      >Litros</button>
    </div>
  )

  const ProgressBar = (
    <div className={`w-full ${isHorizontal ? 'mb-14' : 'mb-4'}`}>
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Progreso</span>
        <span className="text-[10px] font-black text-sky-400">{Math.round(pct)}%</span>
      </div>
      <div className="w-full h-2 bg-surface-300/50 rounded-full overflow-hidden shadow-inner border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 rounded-full"
        />
      </div>
    </div>
  )

  /* ── Horizontal ── */
  if (isHorizontal) {
    return (
      <div className="flex flex-col w-full h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 px-2 sm:px-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center border border-sky-500/20">
              <Droplet size={16} className="text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white/70">Hidratación</h3>
              <p className="text-[9px] font-black text-sky-400/50 tracking-widest uppercase">{liters}L / {TARGET * ML_PER_GLASS / 1000}L</p>
            </div>
          </div>
          {ModeToggle}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col px-2 sm:px-6 min-h-0 justify-center">
          {mode === 'vasos' ? (
            <div className="grid grid-cols-4 gap-3 w-full">
              {Array.from({ length: TARGET }, (_, i) => {
                const filled = i < glasses
                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.91 }}
                    onClick={() => onChange(filled ? i * ML_PER_GLASS : (i + 1) * ML_PER_GLASS)}
                    className={`relative overflow-hidden aspect-[3/4] rounded-[20px] flex items-center justify-center transition-all duration-500 border-2 ${
                      filled
                        ? 'border-sky-400/40 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.1)] ring-1 ring-sky-400/30'
                        : 'border-white/[0.03] bg-surface-200/40 hover:border-white/10 hover:bg-surface-300/40'
                    }`}
                  >
                    <motion.div
                      initial={false}
                      animate={{ y: filled ? '0%' : '100%' }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                      className="absolute inset-0 bg-gradient-to-t from-sky-500/40 to-sky-400/5 origin-bottom"
                    />
                    <Droplet
                      size={32}
                      className={`relative z-10 transition-all duration-700 ${filled ? 'text-sky-300 fill-sky-400/20 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'text-white/15'}`}
                    />
                  </motion.button>
                )
              })}
            </div>
          ) : (
            /* Litros: big circle */
            <div className="flex flex-col items-center justify-center gap-5">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-sky-400/15" />
                <div className="absolute inset-2 rounded-full border border-sky-400/5" />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative z-10 flex flex-col items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    inputMode="decimal"
                    value={liters || ''}
                    onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.round(v * 1000)) }}
                    placeholder="—"
                    className="w-24 bg-transparent border-none outline-none text-center text-5xl font-black text-white tabular-nums placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-black text-sky-400/40 uppercase tracking-[0.3em] mt-1">litros</span>
                </div>
              </div>

              {/* Stepper row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange(Math.max(0, waterMl - 100))}
                  className="w-10 h-10 rounded-2xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400/60 hover:bg-sky-400/20 hover:text-sky-400 active:scale-95 transition-all"
                >
                  <Minus size={15} />
                </button>

                {L_PRESETS.map(l => (
                  <motion.button
                    key={l}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onChange(Math.round((liters + l) * 1000))}
                    className="px-3 h-10 rounded-xl text-[11px] font-black text-sky-400/60 hover:text-sky-300 bg-sky-400/5 hover:bg-sky-400/15 border border-sky-400/10 hover:border-sky-400/25 transition-all"
                  >
                    +{l}L
                  </motion.button>
                ))}

                <button
                  onClick={() => onChange(waterMl + 100)}
                  className="w-10 h-10 rounded-2xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400/60 hover:bg-sky-400/20 hover:text-sky-400 active:scale-95 transition-all"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="px-2 sm:px-6 mt-4 mb-14">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Progreso</span>
            <span className="text-[10px] font-black text-sky-400">{Math.round(pct)}%</span>
          </div>
          <div className="w-full h-2 bg-surface-300/50 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 rounded-full"
            />
          </div>
        </div>
      </div>
    )
  }

  /* ── Vertical ── */
  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 px-1 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 flex items-center justify-center border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.15)]">
            <Droplet size={20} className="text-sky-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Hidratación</h3>
            <p className="text-[10px] font-black text-sky-400/60 tracking-widest uppercase">{liters} L de {TARGET * ML_PER_GLASS / 1000} L</p>
          </div>
        </div>
        {ModeToggle}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-center mb-6">
        {mode === 'vasos' ? (
          <div className="grid grid-cols-4 gap-3 sm:gap-5 max-w-sm mx-auto w-full px-2">
            {Array.from({ length: TARGET }, (_, i) => {
              const filled = i < glasses
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onChange(filled ? i * ML_PER_GLASS : (i + 1) * ML_PER_GLASS)}
                  className={`relative overflow-hidden aspect-[3/4] rounded-[20px] flex items-center justify-center transition-all duration-500 border-2 shadow-sm ${
                    filled
                      ? 'border-sky-400/40 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.1)] ring-1 ring-sky-400/30'
                      : 'border-white/[0.03] bg-surface-200/40 hover:border-white/10 hover:bg-surface-300/40'
                  }`}
                >
                  <motion.div
                    initial={false}
                    animate={{ y: filled ? '0%' : '100%' }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="absolute inset-0 bg-gradient-to-t from-sky-500/40 to-sky-400/5 origin-bottom"
                  />
                  <Droplet
                    size={28}
                    className={`relative z-10 transition-all duration-700 ${filled ? 'text-sky-300 fill-sky-400/20 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'text-white/15'}`}
                  />
                </motion.button>
              )
            })}
          </div>
        ) : (
          /* Litros: big centered display */
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-sky-400/15" />
              <div className="absolute inset-2 rounded-full border border-sky-400/5" />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative z-10 flex flex-col items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  inputMode="decimal"
                  value={liters || ''}
                  onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.round(v * 1000)) }}
                  placeholder="—"
                  className="w-20 bg-transparent border-none outline-none text-center text-4xl font-black text-white tabular-nums placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-xs font-black text-sky-400/40 uppercase tracking-[0.3em] mt-1">litros</span>
              </div>
            </div>

            {/* Quick-add chips */}
            <div className="flex items-center gap-2">
              {L_PRESETS.map(l => (
                <motion.button
                  key={l}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onChange(Math.round((liters + l) * 1000))}
                  className="px-3 h-9 rounded-xl text-[11px] font-black text-sky-400/60 hover:text-sky-300 bg-sky-400/5 hover:bg-sky-400/15 border border-sky-400/10 hover:border-sky-400/25 transition-all"
                >
                  +{l}L
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {ProgressBar}
    </div>
  )
}
