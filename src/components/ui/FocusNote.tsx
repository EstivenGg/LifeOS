import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, X, Type, Edit3 } from 'lucide-react'

interface FocusNoteProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
  rows?: number
  className?: string
  iconMode?: boolean
}

export function FocusNote({ value, onChange, placeholder = 'Escribe...', label, rows = 3, className = '', iconMode = false }: FocusNoteProps) {
  const [open, setOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.selectionStart = textareaRef.current.value.length
        }
      }, 100)
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setOpen(false)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card glow-accent"
            style={{ position: 'relative', width: '100%', maxWidth: '48rem', padding: '1.5rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Type size={16} className="text-accent" />
                <h2 className="text-base font-semibold text-white/80">{label || 'Nota'}</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/20 font-mono">{wordCount} palabras</span>
                <button onClick={() => setOpen(false)} className="btn-ghost p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="input-field resize-none text-base leading-relaxed focus:ring-accent/30"
              style={{ fontSize: '1rem', lineHeight: '1.85', flex: 1, minHeight: '50vh' }}
            />
            <div className="flex justify-end mt-3">
              <button onClick={() => setOpen(false)} className="btn-primary text-sm px-6">
                Listo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {iconMode ? (
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-200/40 hover:bg-surface-300 transition-all border border-white/5 text-white/60 hover:text-white ${className}`}
          title="Agregar nota del día"
          type="button"
        >
          <Edit3 size={16} />
          {wordCount > 0 && <span className="text-xs font-bold text-accent">{wordCount}</span>}
        </button>
      ) : (
        <div className={`relative group ${className}`}>
          {label && <label className="text-xs text-white/40 mb-1 block">{label}</label>}
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="input-field resize-none pr-10"
            style={{ height: `${rows * 1.75 + 1.25}rem` }}
          />
          <button
            onClick={() => setOpen(true)}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-white/20 hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100"
            title="Modo focus"
            type="button"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}
      {createPortal(overlay, document.body)}
    </>
  )
}
