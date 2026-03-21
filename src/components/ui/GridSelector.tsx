import type { GridCols } from '@/hooks/useGridColumns'

const COL_OPTIONS: GridCols[] = [1, 2, 3, 4]

/** Inline SVG that visually represents N vertical column strips */
function ColIcon({ n }: { n: GridCols }) {
  const gap = 1
  const totalGaps = (n - 1) * gap
  const totalPad = 2
  const w = (16 - totalPad * 2 - totalGaps) / n
  const rects = Array.from({ length: n }, (_, i) => (
    <rect
      key={i}
      x={totalPad + i * (w + gap)}
      y={2}
      width={w}
      height={12}
      rx={1}
      fill="currentColor"
    />
  ))
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
      {rects}
    </svg>
  )
}

interface GridSelectorProps {
  value: GridCols
  onChange: (n: GridCols) => void
  label?: string
  /** Columns above this value are hidden on screens narrower than `sm` (640 px). */
  mobileMax?: GridCols
}

export function GridSelector({ value, onChange, label = 'Columnas', mobileMax }: GridSelectorProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="text-[10px] text-white/30 hidden sm:inline select-none">{label}</span>
      <div className="flex bg-surface-200/40 rounded-lg p-0.5 gap-0.5">
        {COL_OPTIONS.map(n => {
          const hiddenOnMobile = mobileMax !== undefined && n > mobileMax
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={`${n} columna${n !== 1 ? 's' : ''} por fila`}
              aria-label={`${n} columna${n !== 1 ? 's' : ''} por fila`}
              aria-pressed={value === n}
              className={[
                'w-7 h-7 items-center justify-center rounded-md transition-all',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent/60',
                hiddenOnMobile ? 'hidden sm:flex' : 'flex',
                value === n
                  ? 'bg-accent/20 text-accent shadow-sm'
                  : 'text-white/25 hover:text-white/55 hover:bg-surface-300/50',
              ].join(' ')}
            >
              <ColIcon n={n} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
