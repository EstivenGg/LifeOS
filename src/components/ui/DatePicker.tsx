import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatDate, parseDate, today } from '@/utils/date'

interface DatePickerProps {
  value?: string | Date | null
  onChange: (value: string | undefined) => void
  placeholder?: string
  title?: string
  disabled?: boolean
  allowClear?: boolean
  className?: string
  buttonClassName?: string
}

interface CalendarCell {
  key: string
  value: string
  label: number
  isCurrentMonth: boolean
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function normalizeValue(value?: string | Date | null): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : formatDate(value)
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function buildCalendar(monthDate: Date): CalendarCell[] {
  const monthStart = startOfMonth(monthDate)
  const startWeekday = (monthStart.getDay() + 6) % 7
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - startWeekday)

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + index)
    return {
      key: `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}`,
      value: formatDate(cellDate),
      label: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === monthDate.getMonth(),
    }
  })
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

function formatTriggerLabel(value?: string) {
  if (!value) return ''
  return parseDate(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatPreviewLabel(value?: string) {
  if (!value) return 'Sin fecha seleccionada'
  return parseDate(value).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  title = 'Seleccionar fecha',
  disabled = false,
  allowClear = true,
  className = '',
  buttonClassName = '',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const normalizedValue = useMemo(() => normalizeValue(value), [value])
  const [visibleMonth, setVisibleMonth] = useState(() => normalizedValue ? startOfMonth(parseDate(normalizedValue)) : startOfMonth(new Date()))

  useBodyScrollLock(open)

  const todayValue = today()
  const currentMonthDays = useMemo(() => buildCalendar(visibleMonth), [visibleMonth])
  const monthLabel = useMemo(
    () => visibleMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
    [visibleMonth],
  )
  const triggerLabel = useMemo(() => formatTriggerLabel(normalizedValue), [normalizedValue])
  const previewLabel = useMemo(() => formatPreviewLabel(normalizedValue), [normalizedValue])

  useEffect(() => {
    if (!open) return
    setVisibleMonth(normalizedValue ? startOfMonth(parseDate(normalizedValue)) : startOfMonth(new Date()))
  }, [normalizedValue, open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const closeSheet = useCallback(() => {
    setOpen(false)
  }, [])

  const selectDate = useCallback((nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }, [onChange])

  const clearValue = useCallback(() => {
    onChange(undefined)
    setOpen(false)
  }, [onChange])

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title}
        className={`input-field min-h-[44px] flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent/30 ${buttonClassName}`}
      >
        <span className={`min-w-0 truncate text-sm ${normalizedValue ? 'text-white tabular-nums' : 'text-white/35'}`}>
          {triggerLabel || placeholder}
        </span>
        <span className="flex items-center gap-2 shrink-0 text-white/35">
          <CalendarDays size={15} />
          <ChevronDown size={16} />
        </span>
      </button>

      {createPortal(<AnimatePresence>
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
              aria-label={title}
              initial={{ y: 34, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={event => event.stopPropagation()}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/[0.06] bg-surface-100/95 backdrop-blur-xl shadow-2xl pb-[calc(env(safe-area-inset-bottom)+14px)] md:left-1/2 md:right-auto md:w-[min(calc(100%-1.5rem),32rem)] md:-translate-x-1/2"
            >
              <div className="mx-auto mt-2 mb-3 h-1.5 w-12 rounded-full bg-white/15" />

              <div className="px-4 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white/85">{title}</h3>
                  <button
                    type="button"
                    onClick={closeSheet}
                    aria-label="Cerrar"
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-3 rounded-2xl border border-white/[0.06] bg-surface-200/50 px-3 py-3">
                  <div className="flex items-center gap-2 text-white/80">
                    <CalendarDays size={16} className="text-accent shrink-0" />
                    <span className={`text-sm capitalize ${normalizedValue ? 'text-white' : 'text-white/40'}`}>
                      {previewLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleMonth(prev => addMonths(prev, -1))}
                    aria-label="Mes anterior"
                    className="h-11 w-11 rounded-2xl border border-white/[0.08] bg-surface-200/50 text-white/65 hover:text-white hover:bg-surface-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex-1 text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Mes activo</p>
                    <p className="text-base font-semibold capitalize">{monthLabel}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVisibleMonth(prev => addMonths(prev, 1))}
                    aria-label="Mes siguiente"
                    className="h-11 w-11 rounded-2xl border border-white/[0.08] bg-surface-200/50 text-white/65 hover:text-white hover:bg-surface-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 flex items-center justify-center transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="mt-4 rounded-3xl border border-white/[0.06] bg-surface-200/35 p-2.5">
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map(label => (
                      <div
                        key={label}
                        className="flex h-8 items-center justify-center text-[11px] font-medium uppercase tracking-wide text-white/30"
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {currentMonthDays.map(day => {
                      const isSelected = day.value === normalizedValue
                      const isToday = day.value === todayValue
                      return (
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          type="button"
                          key={day.key}
                          onClick={() => selectDate(day.value)}
                          aria-pressed={isSelected}
                          aria-label={day.value}
                          className={`relative h-11 rounded-2xl border text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                            isSelected
                              ? 'border-accent/40 bg-accent/15 text-white'
                              : isToday
                                ? 'border-white/[0.14] bg-surface-200/70 text-white'
                                : day.isCurrentMonth
                                  ? 'border-transparent bg-transparent text-white/78 hover:bg-surface-300/55 hover:text-white'
                                  : 'border-transparent bg-transparent text-white/22 hover:bg-surface-200/45 hover:text-white/55'
                          }`}
                        >
                          <span>{day.label}</span>
                          {isToday && (
                            <span className={`absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-accent'
                            }`} />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div className={`mt-4 grid gap-2 ${allowClear ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => selectDate(todayValue)}
                    className="min-h-[44px] rounded-xl border border-white/[0.08] bg-surface-200/50 px-3 text-xs font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    Hoy
                  </motion.button>

                  {allowClear && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={clearValue}
                      className="min-h-[44px] rounded-xl border border-white/[0.08] bg-surface-200/50 px-3 text-xs font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                    >
                      Limpiar
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={closeSheet}
                    className="min-h-[44px] rounded-xl bg-accent px-3 text-xs font-medium text-white hover:bg-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    Cerrar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  )
}
