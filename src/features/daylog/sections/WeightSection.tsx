import { useState, useEffect } from 'react'

import { Scale, Minus, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useWeightUnit } from '@/context/SectionPrefsContext'
import type * as T from '@/data/types'

interface Props {
  entry: T.DailyEntry
  isHorizontal: boolean
  onUpdate: (patch: Partial<T.DailyEntry>) => void
  lastWeight?: number
}

export function WeightSection({ entry, isHorizontal, onUpdate, lastWeight }: Props) {
  const { unit, kgToDisplay, displayToKg, inputStepBody } = useWeightUnit()
  const [inputValue, setInputValue] = useState(entry.weightKg != null ? kgToDisplay(entry.weightKg).toString() : '')
  const [editing, setEditing] = useState(false)

  // Sync from parent when not actively editing
  useEffect(() => {
    if (!editing) {
      setInputValue(entry.weightKg != null ? kgToDisplay(entry.weightKg).toString() : '')
    }
  }, [entry.weightKg, editing, unit])

  const hasValue = entry.weightKg !== undefined || editing
  const placeholderValue = !entry.weightKg && !editing && lastWeight ? `${kgToDisplay(lastWeight)}` : '—'

  function handleChange(raw: string) {
    setInputValue(raw)
    if (raw === '') return // allow clearing without losing the input
    const v = parseFloat(raw)
    if (!isNaN(v)) {
      const kg = displayToKg(v)
      if (kg >= 20 && kg <= 300) {
        onUpdate({ weightKg: kg })
      }
    }
  }

  function handleBlur() {
    setEditing(false)
    if (inputValue === '') {
      onUpdate({ weightKg: undefined })
    }
  }

  function handleTapPlaceholder() {
    if (lastWeight) {
      onUpdate({ weightKg: lastWeight })
      setInputValue(kgToDisplay(lastWeight).toString())
    } else {
      setEditing(true)
      setInputValue('')
    }
  }

  const unitLabel = unit === 'lbs' ? 'libras' : 'kilogramos'

  const subtitle = entry.weightKg !== undefined
    ? `${kgToDisplay(entry.weightKg)} ${unit} registrado`
    : lastWeight
      ? 'Toca para usar el anterior'
      : 'Control corporal'

  const inputClass = "bg-transparent border-none outline-none text-center font-black text-white tabular-nums tracking-tighter placeholder:text-white/20 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      <div className={`flex items-center justify-between px-2 sm:px-4 shrink-0 ${isHorizontal ? 'mb-8' : 'mb-5'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/15 flex items-center justify-center border border-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
            <Scale size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Peso</h3>
            <p className="text-[10px] font-bold text-amber-400/60 tracking-widest uppercase">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center px-2 sm:px-4 ${isHorizontal ? 'pb-4' : ''}`}>
        {isHorizontal ? (
          <div className="flex flex-col items-center">
            <div className="relative w-44 h-44 flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/10" />
              <div className="absolute inset-2 rounded-full border border-amber-400/5" />
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)' }}
              />
              {hasValue ? (
                <input
                  type="number"
                  step={inputStepBody}
                  min="20"
                  max="300"
                  inputMode="decimal"
                  value={inputValue}
                  onFocus={() => setEditing(true)}
                  onBlur={handleBlur}
                  onChange={e => handleChange(e.target.value)}
                  placeholder="—"
                  autoFocus={editing && !entry.weightKg}
                  className={`relative z-10 w-28 text-6xl ${inputClass}`}
                />
              ) : (
                <button
                  type="button"
                  onClick={handleTapPlaceholder}
                  className="relative z-10 w-28 text-center text-6xl font-black tabular-nums tracking-tighter bg-transparent border-none outline-none cursor-pointer text-white/25 hover:text-white/40 transition-colors"
                >
                  {placeholderValue}
                </button>
              )}
            </div>
            <span className="text-sm font-black text-amber-400/40 uppercase tracking-[0.3em]">{unitLabel}</span>
            {!entry.weightKg && !editing && lastWeight && (
              <span className="text-[10px] text-white/25 mt-2">Anterior: {kgToDisplay(lastWeight)} {unit}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  const step = unit === 'lbs' ? 0.5 : 0.1
                  const cur = entry.weightKg ?? lastWeight ?? 70
                  const newKg = Math.max(20, Math.round((cur - step) * 100) / 100)
                  onUpdate({ weightKg: newKg })
                }}
                className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400/60 hover:bg-amber-400/20 hover:text-amber-400 active:scale-95 transition-colors shrink-0"
              >
                <Minus size={18} />
              </button>
              <div className="relative flex flex-col items-center">
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-70"
                  style={{ background: 'radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, transparent 70%)' }}
                />
                <div className="flex items-baseline gap-1 relative z-10">
                  {hasValue ? (
                    <input
                      type="number"
                      step={inputStepBody}
                      min="20"
                      max="300"
                      inputMode="decimal"
                      value={inputValue}
                      onFocus={() => setEditing(true)}
                      onBlur={handleBlur}
                      onChange={e => handleChange(e.target.value)}
                      placeholder="72.5"
                      autoFocus={editing && !entry.weightKg}
                      className={`w-32 text-5xl ${inputClass}`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={handleTapPlaceholder}
                      className="w-32 text-center text-5xl font-black tabular-nums tracking-tighter bg-transparent border-none outline-none cursor-pointer text-white/25 hover:text-white/40 transition-colors"
                    >
                      {placeholderValue}
                    </button>
                  )}
                  <span className="text-xl font-black text-amber-400/50 pb-1">{unit}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const step = unit === 'lbs' ? 0.5 : 0.1
                  const cur = entry.weightKg ?? lastWeight ?? 70
                  const newKg = Math.min(300, Math.round((cur + step) * 100) / 100)
                  onUpdate({ weightKg: newKg })
                }}
                className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400/60 hover:bg-amber-400/20 hover:text-amber-400 active:scale-95 transition-colors shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>
            <span className="text-[10px] font-black text-amber-400/30 uppercase tracking-[0.3em]">{unitLabel}</span>
            {!entry.weightKg && !editing && lastWeight && (
              <span className="text-[10px] text-white/25 mt-1">Anterior: {kgToDisplay(lastWeight)} {unit}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
