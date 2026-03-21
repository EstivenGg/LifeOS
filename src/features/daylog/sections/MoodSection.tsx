import { motion, AnimatePresence } from 'framer-motion'
import { Smile, PenLine } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MoodPicker } from '@/components/ui/MoodPicker'
import { FocusNote } from '@/components/ui/FocusNote'
import type * as T from '@/data/types'

const MOODS = [
  { value: 1, emoji: '😞', label: 'Muy mal',   color: 'rgba(239,68,68,0.3)',   ring: 'ring-red-400/40',    glow: 'shadow-[0_0_40px_rgba(239,68,68,0.2)]'    },
  { value: 2, emoji: '😕', label: 'Mal',        color: 'rgba(249,115,22,0.3)',  ring: 'ring-orange-400/40', glow: 'shadow-[0_0_40px_rgba(249,115,22,0.2)]'   },
  { value: 3, emoji: '😐', label: 'Normal',     color: 'rgba(234,179,8,0.3)',   ring: 'ring-yellow-400/40', glow: 'shadow-[0_0_40px_rgba(234,179,8,0.2)]'    },
  { value: 4, emoji: '😊', label: 'Bien',       color: 'rgba(34,197,94,0.3)',   ring: 'ring-green-400/40',  glow: 'shadow-[0_0_40px_rgba(34,197,94,0.2)]'    },
  { value: 5, emoji: '🤩', label: 'Excelente',  color: 'rgba(6,182,212,0.3)',   ring: 'ring-cyan-400/40',   glow: 'shadow-[0_0_40px_rgba(6,182,212,0.2)]'    },
]

interface Props {
  entry: T.DailyEntry
  isHorizontal: boolean
  onUpdate: (patch: Partial<T.DailyEntry>) => void
}

export function MoodSection({ entry, isHorizontal, onUpdate }: Props) {
  const selected = MOODS.find(m => m.value === entry.mood)

  if (!isHorizontal) {
    /* ── Vertical: original layout ── */
    return (
      <Card className="flex flex-col py-6">
        <div className="flex items-center justify-between mb-8 px-2 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-400/15 flex items-center justify-center">
              <Smile size={16} className="text-yellow-300" />
            </div>
            <h3 className="text-sm font-bold text-white/70">¿Cómo te sientes?</h3>
          </div>
          <FocusNote iconMode value={entry.note || ''} onChange={v => onUpdate({ note: v })} placeholder="Pinceladas de tu día..." />
        </div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <MoodPicker value={entry.mood} onChange={v => onUpdate({ mood: v })} />
        </div>
      </Card>
    )
  }

  /* ── Horizontal: premium fullscreen layout ── */
  return (
    <Card className="h-full flex flex-col pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2 sm:px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-yellow-400/15 flex items-center justify-center">
            <Smile size={16} className="text-yellow-300" />
          </div>
          <h3 className="text-sm font-bold text-white/70">¿Cómo te sientes?</h3>
        </div>
      </div>

      {/* Big mood display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.value}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                className={`relative flex items-center justify-center w-28 h-28 rounded-full ${selected.glow}`}
                style={{ background: `radial-gradient(circle, ${selected.color} 0%, transparent 70%)` }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-7xl filter drop-shadow-xl select-none">{selected.emoji}</span>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-black text-white/90 tracking-tight"
              >
                {selected.label}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
              >
                <Smile size={36} className="text-white/20" />
              </motion.div>
              <p className="text-sm font-bold text-white/25">¿Cómo fue tu día?</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mood selector bubbles */}
        <div className="flex items-center gap-3 mt-2">
          {MOODS.map(m => {
            const isActive = entry.mood === m.value
            return (
              <motion.button
                key={m.value}
                whileTap={{ scale: 0.85 }}
                onClick={() => onUpdate({ mood: isActive ? undefined : m.value })}
                className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                  isActive
                    ? `bg-white/10 ring-2 ${m.ring} shadow-lg`
                    : 'bg-white/[0.04] hover:bg-white/8'
                }`}
              >
                <span className={`text-2xl transition-all duration-200 ${isActive ? 'scale-110' : 'opacity-50'}`}>
                  {m.emoji}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Inline note — extra bottom gap to clear the floating dock */}
      <div className="shrink-0 px-2 sm:px-6 mt-2 mb-14">
        <div className="flex items-start gap-2.5 bg-surface-200/30 rounded-2xl px-4 py-3 border border-white/[0.05]">
          <PenLine size={14} className="text-white/25 mt-0.5 shrink-0" />
          <textarea
            value={entry.note || ''}
            onChange={e => onUpdate({ note: e.target.value })}
            placeholder="Pinceladas de tu día..."
            rows={2}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white/70 placeholder:text-white/20 resize-none leading-relaxed focus:ring-0"
          />
        </div>
      </div>
    </Card>
  )
}
