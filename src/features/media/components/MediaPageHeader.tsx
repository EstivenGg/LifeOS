import { BarChart2, Film, Plus } from 'lucide-react'
import type { MediaView } from '../types'

interface Props {
  hasItems: boolean
  view: MediaView
  onToggleView: () => void
  onCreate: () => void
}

export function MediaPageHeader({ hasItems, view, onToggleView, onCreate }: Props) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)] shrink-0">
            <Film size={20} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Media</h1>
            <p className="text-xs text-white/30 mt-0.5">
              {view === 'list' ? 'Películas · series · valoraciones' : 'Tendencias y estadísticas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasItems && (
            <button
              type="button"
              onClick={onToggleView}
              className={`btn-secondary text-xs flex items-center gap-1.5 ${
                view === 'stats' ? 'bg-accent/15 text-accent border-accent/30' : ''
              }`}
            >
              <BarChart2 size={13} />
              <span className="hidden sm:inline">{view === 'stats' ? 'Lista' : 'Insights'}</span>
            </button>
          )}

          {view === 'list' && (
            <button type="button" onClick={onCreate} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Nuevo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
