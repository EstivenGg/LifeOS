import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Film } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTheme } from '@/context/ThemeContext'
import { db } from '@/data/db'
import type { MediaItem } from '@/data/types'
import { useGridColumns } from '@/hooks/useGridColumns'
import { showSaved } from '@/utils/toast'
import { MEDIA_PAGE } from './constants'
import { MediaCardGrid } from './components/MediaCardGrid'
import { MediaDetailModal } from './components/MediaDetailModal'
import { MediaFilters } from './components/MediaFilters'
import { MediaFormModal } from './components/MediaFormModal'
import { MediaPageHeader } from './components/MediaPageHeader'
import { MediaHeroCard } from './components/MediaQuickStrip'
import { MediaStatsView } from './components/MediaStatsView'
import type { MediaChartTab, MediaFilterState, MediaView } from './types'
import {
  buildMediaStats,
  buildRatingChartData,
  buildStatusChartData,
  buildTagChartData,
  buildTypeChartData,
  collectMediaTags,
  createMediaForm,
  filterMediaItems,
} from './utils'

const INITIAL_FILTERS: MediaFilterState = {
  tab: 'all',
  filter: 'all',
  search: '',
  filterTag: '',
  sortBy: 'recent',
}

export function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [view, setView] = useState<MediaView>('list')
  const [filters, setFilters] = useState<MediaFilterState>(INITIAL_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<MediaItem | null>(null)
  const [editing, setEditing] = useState<MediaItem | null>(null)
  const [form, setForm] = useState<Partial<MediaItem>>(createMediaForm())
  const [showCount, setShowCount] = useState(MEDIA_PAGE)
  const [chartTab, setChartTab] = useState<MediaChartTab>('status')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const { cols, setAndSave, gridClass } = useGridColumns('media', 4)
  const { accentHex } = useTheme()

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setShowCount(MEDIA_PAGE)
  }, [filters.tab, filters.filter, filters.search, filters.filterTag, filters.sortBy])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function load() {
    const nextItems = await db.mediaItems.toArray()
    setItems(nextItems)
  }

  function openNew() {
    setEditing(null)
    setForm(createMediaForm())
    setFormOpen(true)
  }

  function openEdit(item: MediaItem) {
    setEditing(item)
    setForm({ ...item })
    setFormOpen(true)
  }

  function updateForm(patch: Partial<MediaItem>) {
    setForm(current => ({ ...current, ...patch }))
  }

  async function save() {
    const title = form.title?.trim()

    if (!title) {
      return
    }

    const payload = { ...form, title }

    if (editing) {
      await db.mediaItems.update(editing.id!, payload)
    } else {
      await db.mediaItems.add({
        ...createMediaForm(payload.type ?? 'movie'),
        ...payload,
        createdAt: new Date().toISOString(),
      } as MediaItem)
    }

    setFormOpen(false)
    showSaved()
    await load()
  }

  async function deleteItem(id: number) {
    await db.mediaItems.delete(id)
    showSaved()
    await load()
  }

  async function quickStatus(id: number, status: MediaItem['status']) {
    await db.mediaItems.update(id, { status })
    showSaved()
    await load()
  }

  async function handleQuickStatus(item: MediaItem, status: MediaItem['status']) {
    await quickStatus(item.id!, status)
    setDetail(current => current && current.id === item.id ? { ...current, status } : current)
  }

  async function handleDeleteFromDetail(id: number) {
    await deleteItem(id)
    setDetail(current => current?.id === id ? null : current)
  }

  function handleEditFromDetail(item: MediaItem) {
    setDetail(null)
    openEdit(item)
  }

  const allTags = useMemo(() => collectMediaTags(items), [items])
  const filtered = useMemo(() => filterMediaItems(items, filters), [items, filters])
  const visibleItems = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount
  const hasFilters = filters.tab !== 'all' || filters.filter !== 'all' || !!filters.filterTag || !!filters.search.trim()

  const watching = useMemo(
    () => items.filter(item => item.status === 'viendo').slice(0, 5),
    [items],
  )

  const stats = useMemo(() => buildMediaStats(items), [items])
  const statusData = useMemo(() => buildStatusChartData(items, accentHex), [items, accentHex])
  const typeData = useMemo(() => buildTypeChartData(items, accentHex), [items, accentHex])
  const tagData = useMemo(() => buildTagChartData(items), [items])
  const ratingData = useMemo(() => buildRatingChartData(items), [items])

  function clearFilters() {
    setFilters({ ...INITIAL_FILTERS })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <MediaPageHeader
        hasItems={items.length > 0}
        view={view}
        onToggleView={() => setView(current => current === 'list' ? 'stats' : 'list')}
        onCreate={openNew}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {view === 'list' && (
            <>
              <MediaHeroCard items={items} watching={watching} onSelect={setDetail} />

              <MediaFilters
                isMobile={isMobile}
                hasItems={items.length > 0}
                hasFilters={hasFilters}
                allTags={allTags}
                cols={cols}
                onColsChange={setAndSave}
                state={filters}
                onTabChange={tab => setFilters(current => ({ ...current, tab }))}
                onFilterChange={filter => setFilters(current => ({ ...current, filter }))}
                onSearchChange={search => setFilters(current => ({ ...current, search }))}
                onTagChange={filterTag => setFilters(current => ({ ...current, filterTag }))}
                onSortChange={sortBy => setFilters(current => ({ ...current, sortBy }))}
                onClearFilters={clearFilters}
              />

              {filtered.length === 0 && items.length === 0 ? (
                <EmptyState icon={<Film size={48} />} title="Nada aquí" desc="Agrega películas y series." />
              ) : filtered.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Film size={32} className="text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/40">No hay elementos con esos filtros.</p>
                  <button type="button" onClick={clearFilters} className="btn-ghost text-xs mt-2 text-accent/70">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <MediaCardGrid
                  items={visibleItems}
                  filteredCount={filtered.length}
                  hasMore={hasMore}
                  gridClass={gridClass}
                  onSelect={setDetail}
                  onLoadMore={() => setShowCount(current => current + MEDIA_PAGE)}
                />
              )}
            </>
          )}

          {view === 'stats' && (
            <MediaStatsView
              totalItems={items.length}
              chartTab={chartTab}
              stats={stats}
              statusData={statusData}
              typeData={typeData}
              tagData={tagData}
              ratingData={ratingData}
              accentHex={accentHex}
              onChartTabChange={setChartTab}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <MediaDetailModal
        item={detail}
        onClose={() => setDetail(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        onQuickStatus={handleQuickStatus}
      />

      <MediaFormModal
        open={formOpen}
        editing={editing}
        form={form}
        onClose={() => setFormOpen(false)}
        onChange={updateForm}
        onSave={save}
      />
    </div>
  )
}
