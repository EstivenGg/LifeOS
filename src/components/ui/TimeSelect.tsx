import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Clock3 } from 'lucide-react'
import { Modal } from './Modal'

interface TimeSelectProps {
  value?: string
  onChange: (value: string | undefined) => void
  minuteStep?: number
  placeholder?: string
  className?: string
  title?: string
}

const ITEM_HEIGHT = 40
const VISIBLE_ROWS = 5
const PADDING_ROWS = Math.floor(VISIBLE_ROWS / 2)

function pad2(v: number) {
  return String(v).padStart(2, '0')
}

function parseTime(value?: string): { hour: number; minute: number } {
  if (!value) return { hour: 22, minute: 0 }
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return { hour: 22, minute: 0 }
  const h = Math.max(0, Math.min(23, Number(match[1])))
  const m = Math.max(0, Math.min(59, Number(match[2])))
  return { hour: h, minute: m }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

interface WheelColumnProps {
  values: string[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  syncKey: number
}

function WheelColumn({ values, selectedIndex, onSelectIndex, syncKey }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const settleRef = useRef<number | null>(null)

  function scrollToIndex(index: number, behavior: ScrollBehavior) {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: index * ITEM_HEIGHT, behavior })
  }

  useEffect(() => {
    scrollToIndex(selectedIndex, 'auto')
  }, [syncKey])

  useEffect(() => {
    return () => {
      if (settleRef.current) {
        window.clearTimeout(settleRef.current)
      }
    }
  }, [])

  function settleToNearest() {
    const el = ref.current
    if (!el) return
    const index = clamp(Math.round(el.scrollTop / ITEM_HEIGHT), 0, values.length - 1)
    onSelectIndex(index)
    el.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'smooth' })
  }

  return (
    <div className="relative h-[200px]">
      <div className="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 h-10 rounded-xl border border-accent/25 bg-accent/10" />
      <div
        ref={ref}
        className="h-full overflow-y-auto overscroll-contain snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
        onScroll={() => {
          const el = ref.current
          if (!el) return
          const index = clamp(Math.round(el.scrollTop / ITEM_HEIGHT), 0, values.length - 1)
          onSelectIndex(index)
          if (settleRef.current) window.clearTimeout(settleRef.current)
          settleRef.current = window.setTimeout(settleToNearest, 90)
        }}
      >
        <div style={{ height: ITEM_HEIGHT * PADDING_ROWS }} />
        {values.map((v, i) => {
          const active = i === selectedIndex
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                onSelectIndex(i)
                scrollToIndex(i, 'smooth')
              }}
              className={`snap-center h-10 w-full text-center text-lg font-semibold transition-colors ${
                active ? 'text-white' : 'text-white/35'
              }`}
            >
              {v}
            </button>
          )
        })}
        <div style={{ height: ITEM_HEIGHT * PADDING_ROWS }} />
      </div>
    </div>
  )
}

export function TimeSelect({
  value,
  onChange,
  minuteStep = 1,
  placeholder = 'Seleccionar hora',
  className = '',
  title = 'Seleccionar hora',
}: TimeSelectProps) {
  const [open, setOpen] = useState(false)

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad2(i)), [])
  const minutes = useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < 60; i += minuteStep) out.push(pad2(i))
    return out
  }, [minuteStep])

  const parsed = parseTime(value)
  const initialMinuteIndex = useMemo(() => {
    const exact = minutes.indexOf(pad2(parsed.minute))
    if (exact >= 0) return exact
    const fallback = Math.round(parsed.minute / minuteStep)
    return clamp(fallback, 0, minutes.length - 1)
  }, [minutes, minuteStep, parsed.minute])

  const [hourIndex, setHourIndex] = useState(parsed.hour)
  const [minuteIndex, setMinuteIndex] = useState(initialMinuteIndex)
  const [syncKey, setSyncKey] = useState(0)

  useEffect(() => {
    if (open) return
    setHourIndex(parsed.hour)
    setMinuteIndex(initialMinuteIndex)
  }, [open, parsed.hour, initialMinuteIndex])

  useEffect(() => {
    if (!open) return
    setSyncKey(k => k + 1)
  }, [open])

  const currentLabel = value || ''
  const preview = `${hours[hourIndex]}:${minutes[minuteIndex]}`

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="input-field flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${currentLabel ? 'text-white' : 'text-white/35'}`}>
          {currentLabel || placeholder}
        </span>
        <ChevronDown size={14} className="text-white/35 shrink-0" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="sm">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-white/70">
            <Clock3 size={16} />
            <span className="text-lg font-mono font-semibold">{preview}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <WheelColumn values={hours} selectedIndex={hourIndex} onSelectIndex={setHourIndex} syncKey={syncKey} />
            <span className="text-2xl text-white/50 -mt-3">:</span>
            <WheelColumn values={minutes} selectedIndex={minuteIndex} onSelectIndex={setMinuteIndex} syncKey={syncKey} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(undefined)
                setOpen(false)
              }}
              className="btn-ghost text-xs justify-center"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                setHourIndex(now.getHours())
                const minuteRounded = clamp(Math.round(now.getMinutes() / minuteStep), 0, minutes.length - 1)
                setMinuteIndex(minuteRounded)
                setSyncKey(k => k + 1)
              }}
              className="btn-secondary text-xs justify-center"
            >
              Ahora
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(`${hours[hourIndex]}:${minutes[minuteIndex]}`)
                setOpen(false)
              }}
              className="btn-primary text-xs justify-center"
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
