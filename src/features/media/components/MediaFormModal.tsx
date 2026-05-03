import { Film, Star, Tv } from 'lucide-react'
import { FocusNote } from '@/components/ui/FocusNote'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Modal } from '@/components/ui/Modal'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { TagPicker } from '@/components/ui/TagPicker'
import type { MediaItem } from '@/data/types'
import { MEDIA_FORM_STATUS_OPTIONS, MEDIA_SUGGESTED_TAGS } from '../constants'

interface Props {
  open: boolean
  editing: MediaItem | null
  form: Partial<MediaItem>
  onClose: () => void
  onChange: (patch: Partial<MediaItem>) => void
  onSave: () => void | Promise<void>
}

export function MediaFormModal({ open, editing, form, onClose, onChange, onSave }: Props) {
  const title = editing ? 'Editar' : 'Nuevo'

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-3">
        {/* Type selector — only for new items */}
        {!editing && (
          <div className="flex bg-surface-200/40 rounded-lg p-0.5 mb-1">
            <button
              type="button"
              onClick={() => onChange({ type: 'movie' })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                form.type === 'movie'
                  ? 'bg-accent/15 text-accent'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              <Film size={13} /> Película
            </button>
            <button
              type="button"
              onClick={() => onChange({ type: 'series' })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                form.type === 'series'
                  ? 'bg-accent/15 text-accent'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              <Tv size={13} /> Serie
            </button>
          </div>
        )}

        <ImageUpload
          value={form.coverDataUrl}
          onChange={value => onChange({ coverDataUrl: value })}
          height="h-44"
          placeholder={
            <>
              {form.type === 'series'
                ? <Tv size={28} className="text-white/15" />
                : <Film size={28} className="text-white/15" />
              }
              <span className="text-[11px] text-white/25">Subir portada</span>
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Título</label>
            <input
              value={form.title || ''}
              onChange={event => onChange({ title: event.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">Año</label>
            <input
              type="number"
              value={form.releaseYear || ''}
              onChange={event => onChange({ releaseYear: parseInt(event.target.value, 10) || undefined })}
              className="input-field"
              placeholder="2024"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Estado</label>
            <SheetSelect
              value={form.status}
              onChange={value => onChange({ status: value as MediaItem['status'] })}
              placeholder="Estado"
              options={MEDIA_FORM_STATUS_OPTIONS}
            />
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1 block">Rating</label>
            <div className="flex gap-0.5 pt-1">
              {Array.from({ length: 5 }, (_, index) => (
                <button key={index} type="button" onClick={() => onChange({ rating: index + 1 })}>
                  <Star
                    size={16}
                    className={index < (form.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/15'}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <FocusNote
          value={form.description || ''}
          onChange={value => onChange({ description: value })}
          label="Descripción"
          placeholder="Sinopsis..."
          rows={2}
        />

        <FocusNote
          value={form.notes || ''}
          onChange={value => onChange({ notes: value })}
          label="Notas / Opinión"
          placeholder="¿Qué opinas?"
          rows={2}
        />

        <TagPicker
          label="Tags"
          value={form.tags || ''}
          onChange={value => onChange({ tags: value })}
          suggestions={MEDIA_SUGGESTED_TAGS}
        />

        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!form.title?.trim()}
          className="btn-primary w-full disabled:opacity-40"
        >
          {editing ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </Modal>
  )
}
