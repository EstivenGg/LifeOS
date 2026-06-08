import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { type ReactNode } from 'react'

interface P {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sz = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: P) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop — solid dark, no blur (saves GPU composite on mobile) */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Panel — slides up on mobile, fades on desktop */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`relative ${sz[size]} w-full bg-surface-100 border border-white/[0.06] md:rounded-3xl rounded-t-3xl p-5 md:p-6 max-h-[90vh] md:max-h-[85vh] overflow-y-auto shadow-2xl md:m-4`}
            onClick={e => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
