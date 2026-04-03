import { Check, Clock, Eye, Film, Pause, Star } from 'lucide-react'
import type { MediaItem } from '@/data/types'

interface Props {
  items: MediaItem[]
  watching: MediaItem[]
  onSelect: (item: MediaItem) => void
}

export function MediaHeroCard({ items, watching, onSelect }: Props) {
  if (items.length === 0) return null

  const finished = items.filter(i => i.status === 'terminado').length
  const watchingCount = items.filter(i => i.status === 'viendo').length
  const pending = items.filter(i => i.status === 'quiero_ver').length
  const paused = items.filter(i => i.status === 'pausado').length
  const rated = items.filter(i => i.rating)
  const avgRating = rated.length > 0
    ? (rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length).toFixed(1)
    : '—'

  const finishedPct = items.length > 0 ? Math.round((finished / items.length) * 100) : 0

  return (
    <>
      {/* Hero card */}
      <div className="glass-card !bg-gradient-to-br from-accent/8 via-transparent to-transparent border-accent/10 p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">Colección</p>
            <p className="text-3xl md:text-4xl font-black tabular-nums font-mono">
              {items.length}
            </p>
            <p className="text-[11px] text-white/25 mt-1">
              {finished} terminados · {watchingCount} viendo · {pending} pendientes
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              finishedPct >= 60 ? 'text-emerald-400/70 bg-emerald-500/10'
                : finishedPct >= 30 ? 'text-amber-400/70 bg-amber-500/10'
                  : 'text-white/30 bg-surface-200/50'
            }`}>
              <Check size={11} />
              {finishedPct}% completado
            </div>
            {avgRating !== '—' && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
                <Star size={11} />
                {avgRating} promedio
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center justify-center gap-5 mb-5 py-2">
        <QuickStat icon={<Check size={13} className="text-accent" />} value={finished} label="Terminados" />
        <Divider />
        <QuickStat icon={<Clock size={13} className="text-emerald-400" />} value={watchingCount} label="Viendo" />
        <Divider />
        <QuickStat icon={<Eye size={13} className="text-sky-400" />} value={pending} label="Pendientes" />
        {paused > 0 && (
          <>
            <Divider />
            <QuickStat icon={<Pause size={13} className="text-white/30" />} value={paused} label="Pausados" />
          </>
        )}
      </div>

      {/* Currently watching strip */}
      {watching.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2 px-1">Viendo ahora</p>
          <div className="space-y-1.5">
            {watching.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="glass-card-hover flex items-center justify-between py-2.5 px-4 w-full text-left cursor-pointer active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.coverDataUrl ? (
                    <img src={item.coverDataUrl} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-surface-300 flex items-center justify-center shrink-0">
                      <Film size={14} className="text-white/15" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-[10px] text-white/25">{item.type === 'series' ? 'Serie' : 'Película'}</p>
                  </div>
                </div>
                <span className="text-[9px] text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                  ▶ Viendo
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function QuickStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
        <p className="text-xl font-bold font-mono">{value}</p>
      </div>
      <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">{label}</p>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-8 bg-white/[0.06]" />
}
