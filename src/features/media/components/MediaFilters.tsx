import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { GridSelector } from '@/components/ui/GridSelector'
import { Modal } from '@/components/ui/Modal'
import { SheetSelect } from '@/components/ui/SheetSelect'
import type { GridCols } from '@/hooks/useGridColumns'
import {
  MEDIA_SORT_OPTIONS,
  MEDIA_STATUS_OPTIONS,
  MEDIA_TYPE_TABS,
  isMediaStatusFilter,
} from '../constants'
import type { MediaFilterState, MediaStatusFilter, MediaTab, SortBy } from '../types'

interface Props {
  isMobile: boolean
  hasItems: boolean
  hasFilters: boolean
  allTags: string[]
  cols: GridCols
  onColsChange: (cols: GridCols) => void
  state: MediaFilterState
  onTabChange: (tab: MediaTab) => void
  onFilterChange: (filter: MediaStatusFilter) => void
  onSearchChange: (value: string) => void
  onTagChange: (tag: string) => void
  onSortChange: (sortBy: SortBy) => void
  onClearFilters: () => void
}

export function MediaFilters({
  isMobile,
  hasItems,
  hasFilters,
  allTags,
  cols,
  onColsChange,
  state,
  onTabChange,
  onFilterChange,
  onSearchChange,
  onTagChange,
  onSortChange,
  onClearFilters,
}: Props) {
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  if (!hasItems) {
    return null
  }

  const activeFilterCount = [
    state.tab !== 'all',
    state.filter !== 'all',
    !!state.filterTag,
    !!state.search.trim(),
  ].filter(Boolean).length

  const controls = (
    <FilterControls
      isMobile={isMobile}
      hasFilters={hasFilters}
      allTags={allTags}
      state={state}
      onTabChange={onTabChange}
      onFilterChange={onFilterChange}
      onSearchChange={onSearchChange}
      onTagChange={onTagChange}
      onSortChange={onSortChange}
      onClearFilters={onClearFilters}
    />
  )

  if (isMobile) {
    return (
      <>
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className={`btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center py-2.5 ${
              hasFilters ? 'bg-accent/10 text-accent border-accent/30' : ''
            }`}
          >
            <Filter size={13} />
            Filtros{hasFilters ? ` (${activeFilterCount})` : ''}
          </button>

          <GridSelector value={cols} onChange={onColsChange} mobileMax={2} />
        </div>

        <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)} title="Filtros" size="md">
          <div className="py-1">
            {controls}
            <button type="button" onClick={() => setFilterModalOpen(false)} className="btn-primary w-full mt-4">
              Aplicar
            </button>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <div className="flex items-center gap-2 mb-5">
      {controls}
      <div className="ml-auto">
        <GridSelector value={cols} onChange={onColsChange} mobileMax={2} />
      </div>
    </div>
  )
}

interface FilterControlsProps {
  isMobile: boolean
  hasFilters: boolean
  allTags: string[]
  state: MediaFilterState
  onTabChange: (tab: MediaTab) => void
  onFilterChange: (filter: MediaStatusFilter) => void
  onSearchChange: (value: string) => void
  onTagChange: (tag: string) => void
  onSortChange: (sortBy: SortBy) => void
  onClearFilters: () => void
}

function FilterControls({
  isMobile,
  hasFilters,
  allTags,
  state,
  onTabChange,
  onFilterChange,
  onSearchChange,
  onTagChange,
  onSortChange,
  onClearFilters,
}: FilterControlsProps) {
  return (
    <div className={isMobile ? 'space-y-3' : 'flex items-center gap-2 flex-wrap'}>
      <div className="flex bg-surface-200/40 rounded-lg p-0.5">
        {MEDIA_TYPE_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              state.tab === tab.value
                ? 'bg-accent/15 text-accent'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SheetSelect
        value={state.filter}
        onChange={value => {
          if (isMediaStatusFilter(value)) {
            onFilterChange(value)
          }
        }}
        className={isMobile ? 'w-full' : 'w-36'}
        buttonClassName="text-xs py-1.5"
        placeholder="Estado"
        options={MEDIA_STATUS_OPTIONS}
      />

      {allTags.length > 0 && (
        <SheetSelect
          value={state.filterTag}
          onChange={onTagChange}
          className={isMobile ? 'w-full' : 'w-28'}
          buttonClassName="text-xs py-1.5"
          placeholder="Tag"
          options={allTags.map(tag => ({ value: tag, label: tag }))}
          allowClear
          clearLabel="Todos los tags"
        />
      )}

      <input
        value={state.search}
        onChange={event => onSearchChange(event.target.value)}
        className={`input-field text-xs py-1.5 ${isMobile ? 'w-full' : 'flex-1 min-w-[120px]'}`}
        placeholder="Buscar..."
      />

      <SheetSelect
        value={state.sortBy}
        onChange={value => onSortChange(value as SortBy)}
        className={isMobile ? 'w-full' : 'w-28'}
        buttonClassName="text-xs py-1.5"
        placeholder="Ordenar"
        options={MEDIA_SORT_OPTIONS}
      />

      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className={`p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-surface-300 transition-colors ${
            isMobile ? 'w-full flex items-center justify-center gap-1.5 py-2 mt-1 text-xs' : ''
          }`}
          title="Limpiar filtros"
        >
          <X size={14} /> {isMobile && 'Limpiar filtros'}
        </button>
      )}
    </div>
  )
}
