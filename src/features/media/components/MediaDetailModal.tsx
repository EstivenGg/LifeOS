import { Pencil, Star, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { MediaItem } from '@/data/types'
import { MEDIA_QUICK_STATUS, MEDIA_STATUS_MAP } from '../constants'
import { getMediaTypeLabel, splitMediaTags } from '../utils'

interface Props {
  item: MediaItem | null
  onClose: () => void
  onEdit: (item: MediaItem) => void
  onDelete: (id: number) => void | Promise<void>
  onQuickStatus: (item: MediaItem, status: MediaItem['status']) => void | Promise<void>
}

export function MediaDetailModal({ item, onClose, onEdit, onDelete, onQuickStatus }: Props) {
  return (
    <Modal open={!!item} onClose={onClose} title={item?.title} size="md">
      {item ? (
        <MediaDetailContent
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onQuickStatus={onQuickStatus}
        />
      ) : null}
    </Modal>
  )
}

interface DetailContentProps {
  item: MediaItem
  onEdit: (item: MediaItem) => void
  onDelete: (id: number) => void | Promise<void>
  onQuickStatus: (item: MediaItem, status: MediaItem['status']) => void | Promise<void>
}

function MediaDetailContent({ item, onEdit, onDelete, onQuickStatus }: DetailContentProps) {
  const status = MEDIA_STATUS_MAP[item.status]

  return (
    <div className="space-y-4">
      {item.coverDataUrl && <img src={item.coverDataUrl} className="w-full h-48 object-cover rounded-xl" />}

      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
        <span className="text-xs text-white/20">
          {getMediaTypeLabel(item.type)}{item.releaseYear ? ` · ${item.releaseYear}` : ''}
        </span>
      </div>

      {item.rating ? (
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={14}
              className={index < item.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/10'}
            />
          ))}
        </div>
      ) : null}

      {item.description && <p className="text-sm text-white/50">{item.description}</p>}

      {item.notes && (
        <div className="bg-surface-200/40 rounded-xl p-3">
          <p className="text-xs text-white/30 mb-1">Notas</p>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}

      {item.tags && (
        <div className="flex flex-wrap gap-1">
          {splitMediaTags(item.tags).map(tag => (
            <span key={tag} className="text-[10px] bg-surface-300 px-2 py-0.5 rounded-full text-white/30">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {MEDIA_QUICK_STATUS.map(statusKey => (
          <button
            key={statusKey}
            type="button"
            onClick={() => onQuickStatus(item, statusKey)}
            className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${
              item.status === statusKey
                ? `${MEDIA_STATUS_MAP[statusKey].className} ring-1 ring-white/10`
                : 'bg-surface-200/40 text-white/30 hover:text-white/50'
            }`}
          >
            {MEDIA_STATUS_MAP[statusKey].label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => onEdit(item)} className="btn-secondary flex-1">
          <Pencil size={14} /> Editar
        </button>

        <button
          type="button"
          onClick={() => onDelete(item.id!)}
          className="btn-ghost text-red-400/50 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
