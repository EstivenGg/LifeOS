import { Film, Star, Tv } from 'lucide-react'
import type { MediaItem } from '@/data/types'
import { MEDIA_PAGE, MEDIA_STATUS_MAP } from '../constants'

interface Props {
  items: MediaItem[]
  filteredCount: number
  hasMore: boolean
  gridClass: string
  onSelect: (item: MediaItem) => void
  onLoadMore: () => void
}

export function MediaCardGrid({
  items,
  filteredCount,
  hasMore,
  gridClass,
  onSelect,
  onLoadMore,
}: Props) {
  return (
    <>
      <div className={`grid ${gridClass} gap-3 md:gap-4`}>
        {items.map((item) => {
          const status = MEDIA_STATUS_MAP[item.status]

          return (
            <button
              key={item.id}
              type="button"
              className="glass-card-hover overflow-hidden cursor-pointer group active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40 text-left"
              onClick={() => onSelect(item)}
            >
              {item.coverDataUrl ? (
                <img src={item.coverDataUrl} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-gradient-to-br from-purple-500/10 to-surface-300 flex items-center justify-center">
                  {item.type === 'series'
                    ? <Tv size={40} className="text-purple-400/20" />
                    : <Film size={40} className="text-purple-400/20" />
                  }
                </div>
              )}

              <div className="p-3">
                <h3 className="font-semibold text-sm mb-0.5 truncate group-hover:text-accent transition-colors">
                  {item.title}
                </h3>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${status.className}`}>
                    {status.label}
                  </span>
                  <span className="text-[9px] text-white/20">
                    {item.type === 'series' ? 'Serie' : 'Película'}
                  </span>
                  {!!item.releaseYear && <span className="text-[9px] text-white/15">· {item.releaseYear}</span>}
                </div>

                {item.rating ? (
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, starIndex) => (
                      <Star
                        key={starIndex}
                        size={9}
                        className={starIndex < item.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/8'}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-5 pb-2">
          <button type="button" onClick={onLoadMore} className="btn-secondary text-xs">
            Ver más · {filteredCount - items.length} restantes
          </button>
        </div>
      )}

      {!hasMore && filteredCount > MEDIA_PAGE && (
        <p className="text-[10px] text-white/20 text-center pt-4 pb-2">{filteredCount} elementos</p>
      )}
    </>
  )
}
