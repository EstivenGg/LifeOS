import { motion } from 'framer-motion'

export function ModeToggle({ isAdv, onToggle }: { isAdv: boolean; onToggle: () => void }) {
  return (
    <div className="flex rounded-xl bg-surface-300/40 p-1 gap-1 shrink-0 border border-white/[0.03] relative">
      <motion.div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface-100 rounded-lg shadow-sm border border-white/[0.05]"
        layout
        initial={false}
        animate={{ x: isAdv ? '100%' : '0%' }}
        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
      />
      <button
        onClick={() => isAdv && onToggle()}
        className={`relative z-10 px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors w-full ${!isAdv ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
      >
        Básico
      </button>
      <button
        onClick={() => !isAdv && onToggle()}
        className={`relative z-10 px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors w-full ${isAdv ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
      >
        Avanzado
      </button>
    </div>
  )
}
