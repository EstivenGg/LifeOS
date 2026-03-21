import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export interface PremiumSelectOption {
  value: string
  label: string
  icon?: ReactNode
  hint?: string
}

interface PremiumSelectProps {
  value: string | number | '' | undefined
  onChange: (value: string | undefined) => void
  options: PremiumSelectOption[]
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  clearLabel?: string
  title?: string
  className?: string
  buttonClassName?: string
}

function valueToString(value: string | number | '' | undefined) {
  if (value === undefined || value === '') return ''
  return String(value)
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [locked])
}

export function PremiumSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  disabled = false,
  allowClear = false,
  clearLabel = 'Limpiar',
  title,
  className = '',
  buttonClassName = '',
}: PremiumSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(open)

  const valueStr = valueToString(value)
  const sheetTitle = title || placeholder
  const showSearch = options.length > 8

  const selected = useMemo(
    () => options.find(option => option.value === valueStr),
    [options, valueStr],
  )

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter(option => {
      const inLabel = option.label.toLowerCase().includes(normalized)
      const inHint = option.hint?.toLowerCase().includes(normalized) ?? false
      return inLabel || inHint
    })
  }, [options, query])

  const closeSheet = useCallback(() => {
    setOpen(false)
  }, [])

  const selectOption = useCallback((option: PremiumSelectOption) => {
    onChange(option.value)
    setOpen(false)
  }, [onChange])

  const clearValue = useCallback(() => {
    onChange(undefined)
    setOpen(false)
  }, [onChange])

  useEffect(() => {
    if (!open) return
    setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const selectedIndex = filteredOptions.findIndex(option => option.value === valueStr)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [filteredOptions, open, valueStr])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const container = listRef.current
    if (!container) return
    const target = container.querySelector<HTMLButtonElement>(`[data-option-index="${activeIndex}"]`)
    target?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSheet()
        return
      }

      if (filteredOptions.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex(current => Math.min(current + 1, filteredOptions.length - 1))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex(current => Math.max(current - 1, 0))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const option = filteredOptions[activeIndex]
        if (option) selectOption(option)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, closeSheet, filteredOptions, open, selectOption])

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`input-field min-h-[52px] flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent/30 ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? 'text-white' : 'text-white/35'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className="text-white/35 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSheet}
          >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={sheetTitle}
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={event => event.stopPropagation()}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/[0.06] bg-surface-100/95 backdrop-blur-xl shadow-2xl pb-[calc(env(safe-area-inset-bottom)+14px)]"
            >
              <div className="mx-auto mt-2 mb-3 h-1.5 w-12 rounded-full bg-white/15" />

              <div className="px-4 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white/85">{sheetTitle}</h3>
                  <button
                    type="button"
                    onClick={closeSheet}
                    aria-label="Cerrar"
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    <X size={18} />
                  </button>
                </div>

                {showSearch && (
                  <div className="mt-2 mb-3">
                    <label className="relative block">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        autoFocus
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder="Buscar..."
                        className="input-field h-11 pl-9 pr-3 text-sm focus-visible:ring-2 focus-visible:ring-accent/30"
                      />
                    </label>
                  </div>
                )}

                <div
                  ref={listRef}
                  role="listbox"
                  aria-label={sheetTitle}
                  className="premium-sheet-scroll max-h-[50vh] overflow-y-auto space-y-1.5 pr-1"
                >
                  {filteredOptions.length === 0 && (
                    <p className="py-8 text-center text-sm text-white/40">Sin resultados</p>
                  )}

                  {filteredOptions.map((option, index) => {
                    const isSelected = option.value === valueStr
                    const isActive = index === activeIndex

                    return (
                      <motion.button
                        whileTap={{ scale: 0.985 }}
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-option-index={index}
                        onClick={() => selectOption(option)}
                        className={`w-full min-h-[52px] rounded-2xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                          isSelected
                            ? 'border-accent/40 bg-accent/15 text-white'
                            : isActive
                              ? 'border-white/[0.14] bg-surface-200/70 text-white'
                              : 'border-transparent bg-surface-200/40 text-white/75 hover:text-white hover:border-white/[0.12]'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            {option.icon && <span className="shrink-0 text-base">{option.icon}</span>}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{option.label}</span>
                              {option.hint && (
                                <span className="block truncate text-[11px] text-white/45">{option.hint}</span>
                              )}
                            </span>
                          </span>
                          {isSelected && <Check size={16} className="shrink-0 text-accent" />}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>

                {allowClear && (
                  <button
                    type="button"
                    onClick={clearValue}
                    className="mt-3 w-full min-h-[46px] rounded-2xl border border-white/[0.08] bg-surface-200/50 text-sm text-white/65 hover:text-white hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    {clearLabel}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
