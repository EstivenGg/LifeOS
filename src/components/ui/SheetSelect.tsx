import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Modal } from './Modal'

export interface SheetSelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface SheetSelectProps {
  value: string | number | null | undefined
  options: SheetSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  className?: string
  buttonClassName?: string
  disabled?: boolean
  allowClear?: boolean
  clearLabel?: string
}

export function SheetSelect({
  value,
  options,
  onChange,
  placeholder = 'Seleccionar',
  title,
  className = '',
  buttonClassName = '',
  disabled = false,
  allowClear = false,
  clearLabel = 'Limpiar selección',
}: SheetSelectProps) {
  const [open, setOpen] = useState(false)

  const valueStr = value === null || value === undefined ? '' : String(value)
  const selected = useMemo(
    () => options.find(opt => String(opt.value) === valueStr),
    [options, valueStr],
  )

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`input-field min-h-[44px] flex items-center justify-between gap-2 text-left disabled:opacity-50 ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? 'text-white' : 'text-white/35'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={14} className="text-white/35 shrink-0" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title || placeholder} size="sm">
        <div className="space-y-1">
          {allowClear && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-surface-200/60 transition-colors"
            >
              {clearLabel}
            </button>
          )}

          {options.map(opt => {
            const isSelected = String(opt.value) === valueStr
            return (
              <button
                type="button"
                key={String(opt.value)}
                disabled={opt.disabled}
                onClick={() => {
                  onChange(String(opt.value))
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  opt.disabled
                    ? 'text-white/20 cursor-not-allowed'
                    : isSelected
                      ? 'bg-accent/15 text-accent'
                      : 'text-white/70 hover:text-white hover:bg-surface-200/60'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </span>
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
