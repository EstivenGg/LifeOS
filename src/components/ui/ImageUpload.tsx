import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface ImageUploadProps {
  value?: string
  onChange: (dataUrl: string | undefined) => void
  className?: string
  height?: string
  placeholder?: React.ReactNode
}

function compressImage(file: File, maxWidth = 600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = (h * maxWidth) / w
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ImageUpload({ value, onChange, className = '', height = 'h-40', placeholder }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      onChange(dataUrl)
    } catch {
      console.error('Error processing image')
    }
    e.target.value = ''
  }

  return (
    <div className={`relative group ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {value ? (
        <div className={`relative ${height} rounded-xl overflow-hidden`}>
          <img src={value} className="w-full h-full object-cover" alt="Cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
              type="button"
            >
              <ImagePlus size={16} />
            </button>
            <button
              onClick={() => onChange(undefined)}
              className="p-2 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white transition-all"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          type="button"
          className={`w-full ${height} rounded-xl border-2 border-dashed border-white/[0.08] hover:border-accent/30 bg-surface-200/30 hover:bg-surface-200/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer`}
        >
          {placeholder || (
            <>
              <ImagePlus size={24} className="text-white/20" />
              <span className="text-[11px] text-white/25">Subir portada</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
