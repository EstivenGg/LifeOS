import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const COLOR_MAP: Record<string, string> = {
  accent: 'border-accent/40 bg-accent/15 text-white shadow-[inset_0_0_20px_rgba(var(--accent),0.15)] ring-1 ring-accent/20',
  violet: 'border-violet-400/40 bg-violet-400/15 text-white shadow-[inset_0_0_20px_rgba(167,139,250,0.15)] ring-1 ring-violet-400/20',
  orange: 'border-orange-400/40 bg-orange-400/15 text-white shadow-[inset_0_0_20px_rgba(251,146,60,0.15)] ring-1 ring-orange-400/20',
  emerald: 'border-emerald-400/40 bg-emerald-400/15 text-white shadow-[inset_0_0_20px_rgba(52,211,153,0.15)] ring-1 ring-emerald-400/20',
  blue: 'border-blue-400/40 bg-blue-400/15 text-white shadow-[inset_0_0_20px_rgba(96,165,250,0.15)] ring-1 ring-blue-400/20',
  indigo: 'border-indigo-400/40 bg-indigo-400/15 text-white shadow-[inset_0_0_20px_rgba(129,140,248,0.15)] ring-1 ring-indigo-400/20',
}
const COLOR_MAP_OFF = 'border-white/5 bg-surface-200/30 text-white/45 hover:border-white/10 hover:text-white/70 hover:bg-surface-200/50'

export function DoneToggle({
  done, onToggle, icon, label, color = 'accent', fullCard = false,
}: {
  done: boolean
  onToggle: () => void
  icon: React.ReactNode
  label: string
  color?: string
  fullCard?: boolean
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onToggle}
      className={`relative overflow-hidden w-full flex flex-col items-center justify-center gap-3 rounded-3xl transition-all border border-transparent ${fullCard ? 'flex-1 py-8 rounded-[28px]' : 'py-6 min-h-[72px]'} ${done ? (COLOR_MAP[color] ?? COLOR_MAP.accent) : COLOR_MAP_OFF}`}
    >
      <motion.div
        animate={{ scale: done ? [1, 1.25, 1] : 1 }}
        transition={{ duration: 0.4 }}
        className={done ? 'text-white' : 'text-white/30'}
      >
        {fullCard ? <div className="scale-[2.5] mb-4">{icon}</div> : icon}
      </motion.div>
      <span className={`font-bold tracking-wide ${fullCard ? 'text-xl' : 'text-base'}`}>{label}</span>
      {fullCard && (
        <span className={`text-xs mt-1 ${done ? 'text-white/50' : 'text-white/25'}`}>
          {done ? 'Toca para desmarcar' : 'Toca para marcar'}
        </span>
      )}
      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`absolute ${fullCard ? 'top-5 right-5' : 'right-4'} rounded-full bg-white/20 p-1 backdrop-blur-sm`}
        >
          <CheckCircle2 size={fullCard ? 22 : 16} className="text-white" />
        </motion.div>
      )}
    </motion.button>
  )
}
