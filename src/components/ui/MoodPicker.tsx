import { motion } from 'framer-motion'

const moods = [
  { value: 1, emoji: '😞', label: 'Muy mal', shadowColor: 'rgba(239, 68, 68, 0.4)', bgClass: 'bg-red-500', textClass: 'text-red-400' },
  { value: 2, emoji: '😕', label: 'Mal', shadowColor: 'rgba(249, 115, 22, 0.4)', bgClass: 'bg-orange-500', textClass: 'text-orange-400' },
  { value: 3, emoji: '😐', label: 'Normal', shadowColor: 'rgba(234, 179, 8, 0.4)', bgClass: 'bg-yellow-500', textClass: 'text-yellow-400' },
  { value: 4, emoji: '😊', label: 'Bien', shadowColor: 'rgba(34, 197, 94, 0.4)', bgClass: 'bg-green-500', textClass: 'text-green-400' },
  { value: 5, emoji: '🤩', label: 'Excelente', shadowColor: 'rgba(6, 182, 212, 0.4)', bgClass: 'bg-cyan-500', textClass: 'text-cyan-400' },
]

interface P { value?: number; onChange: (v: number) => void }

export function MoodPicker({ value, onChange }: P) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap w-full items-center justify-center gap-2 sm:gap-4">
      {moods.map(m => {
        const isSelected = value === m.value
        return (
          <motion.button 
            key={m.value} 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => onChange(m.value)}
            className={`relative flex flex-col items-center justify-center gap-2.5 p-3 w-16 h-[88px] sm:w-[76px] sm:h-[100px] rounded-2xl transition-all duration-300 ${isSelected ? 'bg-surface-200/80 border border-white/10 ring-1 ring-white/5' : 'hover:bg-surface-200/40 border border-transparent opacity-50 hover:opacity-100'}`}
            style={{ boxShadow: isSelected ? `inset 0 0 20px ${m.shadowColor}` : 'none' }}
          >
            <motion.span 
              animate={{ 
                scale: isSelected ? 1.4 : 1, 
                y: isSelected ? -6 : 0,
                opacity: isSelected ? 1 : 0.8
              }} 
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="text-4xl sm:text-5xl filter drop-shadow-md origin-bottom z-10"
            >
              {m.emoji}
            </motion.span>
            
            <motion.span 
              animate={{ 
                opacity: isSelected ? 1 : 0,
                y: isSelected ? 0 : 5
              }}
              className={`absolute bottom-3 text-[10px] sm:text-xs font-black tracking-wider uppercase ${isSelected ? m.textClass : 'text-white/40'}`}
            >
              {m.label}
            </motion.span>
            
            {isSelected && (
              <motion.div 
                layoutId="mood-ind" 
                className={`absolute -bottom-1.5 w-8 h-1.5 rounded-full ${m.bgClass}`}
                style={{ boxShadow: `0 0 12px ${m.shadowColor}` }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

export function getMoodEmoji(mood?: number): string { return moods.find(m => m.value === mood)?.emoji ?? '—' }
export function getMoodColor(mood?: number): string { const c: Record<number, string> = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#06b6d4' }; return mood ? c[mood] || '#555' : '#333' }
