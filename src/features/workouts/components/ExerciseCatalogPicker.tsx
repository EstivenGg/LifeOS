import { useState, useMemo } from 'react'
import { Search, Plus } from 'lucide-react'
import type { ExerciseCatalog } from '@/data/types'

interface P {
  catalog: ExerciseCatalog[]
  onSelect: (exercise: ExerciseCatalog) => void
  onCreateCustom?: (name: string) => void
}

export function ExerciseCatalogPicker({ catalog, onSelect, onCreateCustom }: P) {
  const [search, setSearch] = useState('')
  const [customName, setCustomName] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog
    const q = search.toLowerCase()
    return catalog.filter(ex =>
      ex.name.toLowerCase().includes(q) ||
      ex.muscleGroup.toLowerCase().includes(q)
    )
  }, [search, catalog])

  const handleCreateCustom = () => {
    if (!customName.trim()) return
    onCreateCustom?.(customName.trim())
    setCustomName('')
    setSearch('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <div className="relative mt-1">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setCustomName(e.target.value)
          }}
          className="input-field w-full h-12 pl-10 pr-4 bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none font-medium text-white/90 shadow-inner"
        />
      </div>

      {/* Catalog list */}
      <div className="-mx-1 px-1 max-h-[40vh] overflow-y-auto space-y-1.5 hide-scrollbar">
        {filtered.length > 0 ? (
          filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface-300/20 hover:bg-surface-300/40 active:bg-accent/15 border border-white/[0.03] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center shrink-0">
                <Plus size={16} className="text-white/30 group-hover:text-amber-500 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white/90 truncate">{ex.name}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold truncate">{ex.muscleGroup}</div>
              </div>
            </button>
          ))
        ) : (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-surface-300/30 flex items-center justify-center mb-3">
              <Search size={20} className="text-white/20" />
            </div>
            <p className="text-xs text-white/40 font-medium">No se encontraron resultados</p>
          </div>
        )}
      </div>

      {/* Custom exercise input */}
      {onCreateCustom && (
        <div className="pt-2 border-t border-white/5">
          <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-2 pl-1">
            Crear rápido
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: Elevaciones laterales"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCustom()}
              className="input-field flex-1 h-12 px-4 bg-surface-200/50 border border-white/5 focus:border-accent/50 focus:bg-surface-200/80 rounded-xl transition-all outline-none text-sm text-white/90 shadow-inner"
            />
            <button
              onClick={handleCreateCustom}
              disabled={!customName.trim()}
              className="w-12 h-12 flex flex-shrink-0 items-center justify-center rounded-xl bg-accent text-back-100 disabled:opacity-50 disabled:bg-surface-300 disabled:text-white/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,165,0,0.15)] disabled:shadow-none"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
