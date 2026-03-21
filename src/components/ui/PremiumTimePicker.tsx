import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Clock3, X } from 'lucide-react'

type MinuteStep = 1 | 5 | 10 | 15

interface PremiumTimePickerProps {
  value?: string
  onChange: (value: string | undefined) => void
  minuteStep?: MinuteStep
  title?: string
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
  className?: string
  buttonClassName?: string
}

const ROW_HEIGHT = 52
const VISIBLE_ROWS = 5
const PADDING_ROWS = Math.floor(VISIBLE_ROWS / 2)

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function formatTime(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`
}

function parseTime(value?: string): { hour: number; minute: number } | undefined {
  if (!value) return undefined
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (Number.isNaN(hour) || Number.isNaN(minute)) return undefined
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined
  return { hour, minute }
}

function roundToStep(hour: number, minute: number, step: MinuteStep) {
  const total = hour * 60 + minute
  const rounded = Math.round(total / step) * step
  const wrapped = ((rounded % 1440) + 1440) % 1440
  const roundedHour = Math.floor(wrapped / 60)
  const roundedMinute = wrapped % 60
  return { hour: roundedHour, minute: roundedMinute }
}

function minutesByStep(step: MinuteStep) {
  const values: number[] = []
  for (let minute = 0; minute < 60; minute += step) values.push(minute)
  return values
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

interface WheelColumnProps {
  values: number[]
  selectedValue: number
  label: string
  onSelect: (value: number) => void
  syncKey: number
}

function WheelColumn({ values, selectedValue, label, onSelect, syncKey }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const settleRef = useRef<number | undefined>(undefined)

  const selectedIndex = useMemo(() => {
    const index = values.indexOf(selectedValue)
    return index >= 0 ? index : 0
  }, [selectedValue, values])

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior) => {
    const element = ref.current
    if (!element) return
    element.scrollTo({ top: index * ROW_HEIGHT, behavior })
  }, [])

  useEffect(() => {
    scrollToIndex(selectedIndex, 'auto')
  }, [scrollToIndex, selectedIndex, syncKey])

  useEffect(() => {
    return () => {
      if (settleRef.current !== undefined) {
        window.clearTimeout(settleRef.current)
      }
    }
  }, [])

  const settleToNearest = useCallback(() => {
    const element = ref.current
    if (!element) return
    const index = clamp(Math.round(element.scrollTop / ROW_HEIGHT), 0, values.length - 1)
    onSelect(values[index])
    element.scrollTo({ top: index * ROW_HEIGHT, behavior: 'smooth' })
  }, [onSelect, values])

  return (
    <div className="relative h-[260px]">
      <div className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 h-[52px] rounded-xl border border-accent/30 bg-accent/10" />
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        className="premium-wheel-scroll h-full overflow-y-auto overscroll-contain snap-y snap-mandatory"
        onScroll={() => {
          const element = ref.current
          if (!element) return
          const index = clamp(Math.round(element.scrollTop / ROW_HEIGHT), 0, values.length - 1)
          onSelect(values[index])

          if (settleRef.current !== undefined) {
            window.clearTimeout(settleRef.current)
          }
          settleRef.current = window.setTimeout(settleToNearest, 90)
        }}
      >
        <div style={{ height: ROW_HEIGHT * PADDING_ROWS }} />
        {values.map(value => {
          const active = value === selectedValue
          return (
            <button
              key={value}
              type="button"
              role="option"
              aria-selected={active}
              aria-label={`${label} ${pad2(value)}`}
              onClick={() => {
                onSelect(value)
                scrollToIndex(values.indexOf(value), 'smooth')
              }}
              className={`snap-center h-[52px] w-full rounded-lg text-center text-xl font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                active ? 'text-white' : 'text-white/35'
              }`}
            >
              {pad2(value)}
            </button>
          )
        })}
        <div style={{ height: ROW_HEIGHT * PADDING_ROWS }} />
      </div>
    </div>
  )
}

export function PremiumTimePicker({
  value,
  onChange,
  minuteStep = 5,
  title = 'Seleccionar hora',
  placeholder = 'Seleccionar hora',
  disabled = false,
  allowClear = false,
  className = '',
  buttonClassName = '',
}: PremiumTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [draftHour, setDraftHour] = useState(22)
  const [draftMinute, setDraftMinute] = useState(0)
  const [syncKey, setSyncKey] = useState(0)

  useBodyScrollLock(open)

  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), [])
  const minuteValues = useMemo(() => minutesByStep(minuteStep), [minuteStep])

  const syncFromExternal = useCallback(() => {
    const parsed = parseTime(value)
    const fallback = parsed ?? { hour: 22, minute: 0 }
    const rounded = roundToStep(fallback.hour, fallback.minute, minuteStep)
    setDraftHour(rounded.hour)
    setDraftMinute(rounded.minute)
  }, [minuteStep, value])

  useEffect(() => {
    if (open) return
    syncFromExternal()
  }, [open, syncFromExternal])

  useEffect(() => {
    if (!open) return
    syncFromExternal()
    setSyncKey(key => key + 1)
  }, [open, syncFromExternal])

  const closeSheet = useCallback(() => {
    setOpen(false)
  }, [])

  const applySelection = useCallback(() => {
    onChange(formatTime(draftHour, draftMinute))
    setOpen(false)
  }, [draftHour, draftMinute, onChange])

  const setNowRounded = useCallback(() => {
    const now = new Date()
    const rounded = roundToStep(now.getHours(), now.getMinutes(), minuteStep)
    setDraftHour(rounded.hour)
    setDraftMinute(rounded.minute)
    setSyncKey(key => key + 1)
  }, [minuteStep])

  const clearSelection = useCallback(() => {
    onChange(undefined)
    setOpen(false)
  }, [onChange])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSheet()
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        applySelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [applySelection, closeSheet, open])

  const preview = formatTime(draftHour, draftMinute)
  const hasValue = Boolean(value)

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title}
        className={`input-field min-h-[52px] flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent/30 ${buttonClassName}`}
      >
        <span className={`truncate tabular-nums ${hasValue ? 'text-white' : 'text-white/35'}`}>
          {hasValue ? value : placeholder}
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
              aria-label={title}
              initial={{ y: 34, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={event => event.stopPropagation()}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/[0.06] bg-surface-100/95 backdrop-blur-xl shadow-2xl pb-[calc(env(safe-area-inset-bottom)+14px)]"
            >
              <div className="mx-auto mt-2 mb-3 h-1.5 w-12 rounded-full bg-white/15" />

              <div className="px-4 pb-4">
                <div className="mb-3 flex items-center justify-between gap-2">
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

                <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-surface-200/50 px-3 py-2 text-white/80">
                  <Clock3 size={16} className="text-accent/90" />
                  <span className="font-mono text-lg font-semibold tabular-nums">{preview}</span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <WheelColumn
                    values={hours}
                    selectedValue={draftHour}
                    onSelect={setDraftHour}
                    syncKey={syncKey}
                    label="Horas"
                  />
                  <span className="text-3xl text-white/45">:</span>
                  <WheelColumn
                    values={minuteValues}
                    selectedValue={draftMinute}
                    onSelect={setDraftMinute}
                    syncKey={syncKey}
                    label="Minutos"
                  />
                </div>

                <div className={`mt-4 grid gap-2 ${allowClear ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {allowClear && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={clearSelection}
                      aria-label="Limpiar hora"
                      className="min-h-[44px] rounded-xl border border-white/[0.08] bg-surface-200/50 px-2 text-xs font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                    >
                      Limpiar
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={setNowRounded}
                    aria-label="Seleccionar hora actual"
                    className="min-h-[44px] rounded-xl border border-white/[0.08] bg-surface-200/50 px-2 text-xs font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    Ahora
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={closeSheet}
                    aria-label="Cancelar selección de hora"
                    className="min-h-[44px] rounded-xl border border-white/[0.08] bg-surface-200/50 px-2 text-xs font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    Cancelar
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={applySelection}
                    aria-label="Confirmar selección de hora"
                    className="min-h-[44px] rounded-xl border border-accent/40 bg-accent/20 px-2 text-xs font-semibold text-white hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    Listo
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
