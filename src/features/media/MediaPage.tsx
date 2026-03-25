import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pencil, Trash2, Star, Film, Tv, Eye, Clock, Check, Pause, X,
  BarChart2, Tag, PieChart as PieIcon, Filter,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { FocusNote } from '@/components/ui/FocusNote'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { GridSelector } from '@/components/ui/GridSelector'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { useGridColumns } from '@/hooks/useGridColumns'
import { useTheme } from '@/context/ThemeContext'
import { showSaved } from '@/utils/toast'
import type { MediaItem } from '@/data/types'

type SortBy = 'recent' | 'title' | 'rating'
type MediaChartTab = 'status' | 'type' | 'tags' | 'ratings'

const MEDIA_PAGE = 16

const STATUS_MAP: Record<MediaItem['status'], { l: string; c: string; icon: any }> = {
  quiero_ver: { l: 'Quiero ver', c: 'bg-sky-500/15 text-sky-400', icon: Eye },
  viendo: { l: 'Viendo', c: 'bg-emerald-500/15 text-emerald-400', icon: Clock },
  terminado: { l: 'Terminado', c: 'bg-accent/15 text-accent', icon: Check },
  pausado: { l: 'Pausado', c: 'bg-surface-300 text-white/30', icon: Pause },
}

const tt = {
  contentStyle: {
    background: '#1c1c26',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
  },
}

export function MediaPage() {
  // ── Data ───────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<MediaItem[]>([])

  // ── View ───────────────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'stats'>('list')

  // ── Filters ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'all' | 'series' | 'movie'>('all')
  const [filter, setFilter] = useState<'all' | MediaItem['status']>('all')
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<MediaItem | null>(null)
  const [editing, setEditing] = useState<MediaItem | null>(null)
  const [form, setForm] = useState<Partial<MediaItem>>({
    type: 'movie',
    status: 'quiero_ver',
    rating: 0,
  })

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [showCount, setShowCount] = useState(MEDIA_PAGE)

  // ── Stats charts ───────────────────────────────────────────────────────────
  const [chartTab, setChartTab] = useState<MediaChartTab>('status')

  // ── Responsive ─────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const { cols, setAndSave, gridClass } = useGridColumns('media', 4)
  const { accentHex } = useTheme()

  useEffect(() => { load() }, [])
  useEffect(() => { setShowCount(MEDIA_PAGE) }, [tab, filter, search, filterTag, sortBy])

  async function load() { setItems(await db.mediaItems.toArray()) }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  function openNew(type: 'series' | 'movie') {
    setEditing(null)
    setForm({ type, title: '', status: 'quiero_ver', rating: 0, tags: '', notes: '', description: '', coverDataUrl: undefined, releaseYear: undefined })
    setFormOpen(true)
  }

  function openEdit(m: MediaItem) {
    setEditing(m)
    setForm({ ...m })
    setFormOpen(true)
  }

  async function save() {
    if (editing) await db.mediaItems.update(editing.id!, form)
    else await db.mediaItems.add({ ...form, createdAt: new Date().toISOString() } as MediaItem)
    setFormOpen(false); showSaved(); load()
  }

  async function del(id: number) { await db.mediaItems.delete(id); showSaved(); load() }

  async function quickStatus(id: number, status: MediaItem['status']) {
    await db.mediaItems.update(id, { status })
    showSaved()
    load()
  }

  // ── Derived: tags ──────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const set = new Set<string>()
    items.forEach(m => {
      if (m.tags) m.tags.split(',').forEach(t => { const v = t.trim(); if (v) set.add(v) })
    })
    return Array.from(set).sort()
  }, [items])

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...items]
      .filter(m => tab === 'all' || m.type === tab)
      .filter(m => filter === 'all' || m.status === filter)
      .filter(m => !search.trim() || m.title.toLowerCase().includes(search.toLowerCase().trim()))

    if (filterTag) {
      result = result.filter(m => {
        const tags = m.tags?.split(',').map(t => t.trim().toLowerCase()) ?? []
        return tags.includes(filterTag.toLowerCase())
      })
    }

    switch (sortBy) {
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break
      case 'rating': result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
      default: result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
    }
    return result
  }, [items, tab, filter, search, filterTag, sortBy])

  const visibleItems = filtered.slice(0, showCount)
  const hasMore = filtered.length > showCount
  const hasFilters = tab !== 'all' || filter !== 'all' || !!filterTag || !!search.trim()

  function clearFilters() {
    setTab('all'); setFilter('all'); setSearch(''); setFilterTag(''); setSortBy('recent')
  }

  // ── Quick strip ────────────────────────────────────────────────────────────
  const watching = useMemo(() => items.filter(m => m.status === 'viendo').slice(0, 3), [items])
  const lastDone = useMemo(() => items.filter(m => m.status === 'terminado').slice(-1)[0], [items])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const finished = items.filter(m => m.status === 'terminado').length
    const watchingCount = items.filter(m => m.status === 'viendo').length
    const wantToWatch = items.filter(m => m.status === 'quiero_ver').length
    const rated = items.filter(m => m.rating)
    const avgRating = rated.length > 0
      ? (rated.reduce((s, m) => s + (m.rating ?? 0), 0) / rated.length).toFixed(1)
      : '—'
    return { finished, watching: watchingCount, wantToWatch, avgRating, total: items.length }
  }, [items])

  const statusData = useMemo(() => [
    { name: 'Quiero ver', value: items.filter(m => m.status === 'quiero_ver').length, color: '#38bdf8' },
    { name: 'Viendo', value: items.filter(m => m.status === 'viendo').length, color: '#22c55e' },
    { name: 'Terminado', value: items.filter(m => m.status === 'terminado').length, color: accentHex },
    { name: 'Pausado', value: items.filter(m => m.status === 'pausado').length, color: 'rgba(255,255,255,0.18)' },
  ].filter(d => d.value > 0), [items, accentHex])

  const typeData = useMemo(() => [
    { name: 'Películas', value: items.filter(m => m.type === 'movie').length, color: accentHex },
    { name: 'Series', value: items.filter(m => m.type === 'series').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0), [items, accentHex])

  const tagData = useMemo(() => {
    const map: Record<string, number> = {}
    items.forEach(m => {
      if (m.tags) m.tags.split(',').forEach(t => {
        const v = t.trim()
        if (v) map[v] = (map[v] || 0) + 1
      })
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.length > 20 ? name.substring(0, 20) + '…' : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [items])

  const ratingData = useMemo(() => (
    [1, 2, 3, 4, 5].map(r => ({ label: '★'.repeat(r), count: items.filter(m => m.rating === r).length }))
  ), [items])

  // ── Static config ──────────────────────────────────────────────────────────
  const statItems = [
    { icon: <Check size={17} className="text-accent" />, bg: 'bg-accent/10', label: 'Terminados', value: stats.finished },
    { icon: <Clock size={17} className="text-emerald-400" />, bg: 'bg-emerald-500/10', label: 'Viendo', value: stats.watching },
    { icon: <Eye size={17} className="text-sky-400" />, bg: 'bg-sky-500/10', label: 'Quiero ver', value: stats.wantToWatch },
    { icon: <Star size={17} className="text-amber-400" />, bg: 'bg-amber-500/10', label: 'Val. media', value: stats.avgRating },
  ]

  const chartTabs = [
    { id: 'status' as const, label: 'Estado', icon: <PieIcon size={11} /> },
    { id: 'type' as const, label: 'Tipo', icon: <Film size={11} /> },
    { id: 'tags' as const, label: 'Tags', icon: <Tag size={11} /> },
    { id: 'ratings' as const, label: 'Valoraciones', icon: <Star size={11} /> },
  ]

  // ── Shared filter controls (inline desktop, modal mobile) ──────────────────
  const filterControls = (
    <div className={isMobile ? 'space-y-3' : 'flex items-center gap-2 flex-wrap'}>
      {/* Type tabs */}
      <div className="flex bg-surface-200/40 rounded-lg p-0.5">
        {(['all', 'series', 'movie'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t ? 'bg-accent/15 text-accent' : 'text-white/30 hover:text-white/50'
              }`}
          >
            {t === 'all' ? 'Todos' : t === 'series' ? 'Series' : 'Películas'}
          </button>
        ))}
      </div>

      <SheetSelect
        value={filter}
        onChange={v => setFilter(v as any)}
        className={isMobile ? 'w-full' : 'w-36'}
        buttonClassName="text-xs py-1.5"
        placeholder="Estado"
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'quiero_ver', label: 'Quiero ver' },
          { value: 'viendo', label: 'Viendo' },
          { value: 'terminado', label: 'Terminado' },
          { value: 'pausado', label: 'Pausado' },
        ]}
      />

      {allTags.length > 0 && (
        <SheetSelect
          value={filterTag}
          onChange={setFilterTag}
          className={isMobile ? 'w-full' : 'w-28'}
          buttonClassName="text-xs py-1.5"
          placeholder="Tag"
          options={allTags.map(t => ({ value: t, label: t }))}
          allowClear
          clearLabel="Todos los tags"
        />
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={`input-field text-xs py-1.5 ${isMobile ? 'w-full' : 'flex-1 min-w-[120px]'}`}
        placeholder="Buscar..."
      />

      <SheetSelect
        value={sortBy}
        onChange={v => setSortBy(v as SortBy)}
        className={isMobile ? 'w-full' : 'w-28'}
        buttonClassName="text-xs py-1.5"
        placeholder="Ordenar"
        options={[
          { value: 'recent', label: 'Reciente' },
          { value: 'title', label: 'A-Z' },
          { value: 'rating', label: 'Rating' },
        ]}
      />

      {hasFilters && (
        <button
          onClick={clearFilters}
          className={`p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-surface-300 transition-colors ${isMobile ? 'w-full flex items-center justify-center gap-1.5 py-2 mt-1 text-xs' : ''
            }`}
          title="Limpiar filtros"
        >
          <X size={14} /> {isMobile && 'Limpiar filtros'}
        </button>
      )}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto pb-6">

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)]">
              <Film size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Media</h1>
              <p className="text-xs text-white/30 mt-0.5">Películas · series · valoraciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {items.length > 0 && (
              <button
                onClick={() => setView(v => v === 'list' ? 'stats' : 'list')}
                className={`btn-secondary text-xs flex items-center gap-1.5 ${view === 'stats' ? 'bg-accent/15 text-accent border-accent/30' : ''}`}
              >
                <BarChart2 size={13} />
                <span className="hidden sm:inline">{view === 'stats' ? 'Lista' : 'Stats'}</span>
              </button>
            )}
            <button onClick={() => openNew('movie')} className="btn-secondary text-xs">
              <Film size={14} /> <span className="hidden sm:inline">Nueva película</span><span className="sm:hidden">Película</span>
            </button>
            <button onClick={() => openNew('series')} className="btn-primary text-xs">
              <Tv size={14} /> <span className="hidden sm:inline">Nueva serie</span><span className="sm:hidden">Serie</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── LIST VIEW ─────────────────────────────────────────── */}
          {view === 'list' && (
            <>
              {/* Quick strip with scroll snapping */}
              {(watching.length > 0 || lastDone) && (
                <div className="flex gap-3 mb-5 overflow-x-auto pb-1 snap-x snap-mandatory scroll-pl-1">
                  {watching.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setDetail(m)}
                      className="glass-card-hover p-3 min-w-[175px] cursor-pointer flex-shrink-0 snap-start active:scale-[0.97] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <p className="text-[9px] text-emerald-400 mb-1">▶ Viendo</p>
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-[10px] text-white/30">{m.type === 'series' ? 'Serie' : 'Película'}</p>
                    </div>
                  ))}
                  {lastDone && (
                    <div
                      onClick={() => setDetail(lastDone)}
                      className="glass-card-hover p-3 min-w-[175px] cursor-pointer flex-shrink-0 snap-start active:scale-[0.97] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <p className="text-[9px] text-accent mb-1">✓ Último terminado</p>
                      <p className="text-sm font-medium truncate">{lastDone.title}</p>
                      <p className="text-[10px] text-white/30">{lastDone.type === 'series' ? 'Serie' : 'Película'}</p>
                      {lastDone.rating ? (
                        <div className="flex mt-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} size={8} className={i < lastDone.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Filter bar — mobile uses modal, desktop inline (like Books) */}
              {items.length > 0 && (
                <>
                  {isMobile ? (
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => setFilterModalOpen(true)}
                        className={`btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center py-2.5 ${hasFilters ? 'bg-accent/10 text-accent border-accent/30' : ''
                          }`}
                      >
                        <Filter size={13} />
                        Filtros{hasFilters ? ` (${[tab !== 'all', filter !== 'all', !!filterTag, !!search.trim()].filter(Boolean).length})` : ''}
                      </button>
                      <GridSelector value={cols} onChange={setAndSave} mobileMax={2} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-5">
                      {filterControls}
                      <div className="ml-auto">
                        <GridSelector value={cols} onChange={setAndSave} mobileMax={2} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Grid */}
              {filtered.length === 0 && items.length === 0 ? (
                <EmptyState icon={<Film size={48} />} title="Nada aquí" desc="Agrega películas y series." />
              ) : filtered.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Film size={32} className="text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/40">No hay elementos con esos filtros.</p>
                  <button onClick={clearFilters} className="btn-ghost text-xs mt-2 text-accent/70">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className={`grid ${gridClass} gap-3 md:gap-4`}>
                    {visibleItems.map((m, i) => {
                      const st = STATUS_MAP[m.status]
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="glass-card-hover overflow-hidden cursor-pointer group active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40"
                          onClick={() => setDetail(m)}
                        >
                          {m.coverDataUrl ? (
                            <img src={m.coverDataUrl} className="w-full h-44 object-cover" />
                          ) : (
                            <div className="w-full h-44 bg-gradient-to-br from-purple-500/10 to-surface-300 flex items-center justify-center">
                              {m.type === 'series'
                                ? <Tv size={40} className="text-purple-400/20" />
                                : <Film size={40} className="text-purple-400/20" />
                              }
                            </div>
                          )}
                          <div className="p-3">
                            <h3 className="font-semibold text-sm mb-0.5 truncate group-hover:text-accent transition-colors">{m.title}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${st.c}`}>{st.l}</span>
                              <span className="text-[9px] text-white/20">{m.type === 'series' ? 'Serie' : 'Película'}</span>
                              {!!m.releaseYear && <span className="text-[9px] text-white/15">· {m.releaseYear}</span>}
                            </div>
                            {m.rating ? (
                              <div className="flex">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star key={i} size={9} className={i < m.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/8'} />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Ver más */}
                  {hasMore && (
                    <div className="flex justify-center pt-5 pb-2">
                      <button onClick={() => setShowCount(c => c + MEDIA_PAGE)} className="btn-secondary text-xs">
                        Ver más · {filtered.length - showCount} restantes
                      </button>
                    </div>
                  )}
                  {!hasMore && filtered.length > MEDIA_PAGE && (
                    <p className="text-[10px] text-white/20 text-center pt-4 pb-2">{filtered.length} elementos</p>
                  )}
                </>
              )}
            </>
          )}

          {/* ── STATS VIEW ──────────────────────────────────────── */}
          {view === 'stats' && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {statItems.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="glass-card p-3.5 flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      {s.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/35 truncate">{s.label}</p>
                      <p className="text-base font-bold leading-tight">{s.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chart tabs */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {chartTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setChartTab(tab.id)}
                    className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all ${chartTab === tab.id
                        ? 'bg-accent/15 border-accent/40 text-accent'
                        : 'border-white/10 text-white/35 hover:border-white/20 hover:text-white/60'
                      }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              <Card delay={0.1}>
                {/* Estado */}
                {chartTab === 'status' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Estado de la colección</p>
                    {statusData.length > 0 ? (
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <PieChart width={190} height={190}>
                          <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={54} paddingAngle={3}>
                            {statusData.map((e, i) => <Cell key={`c-${i}`} fill={e.color} stroke="transparent" />)}
                          </Pie>
                          <Tooltip {...tt} />
                        </PieChart>
                        <div className="space-y-3">
                          {statusData.map(d => (
                            <div key={d.name} className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                              <span className="text-xs text-white/50">{d.name}</span>
                              <span className="text-sm font-bold text-white/80 ml-auto pl-4">{d.value}</span>
                            </div>
                          ))}
                          <p className="text-[10px] text-white/25 pt-1">{items.length} elemento{items.length !== 1 ? 's' : ''} en total</p>
                        </div>
                      </div>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin datos.</p>}
                  </>
                )}

                {/* Tipo */}
                {chartTab === 'type' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Series vs Películas</p>
                    {typeData.length > 0 ? (
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <PieChart width={190} height={190}>
                          <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={54} paddingAngle={4}>
                            {typeData.map((e, i) => <Cell key={`c-${i}`} fill={e.color} stroke="transparent" />)}
                          </Pie>
                          <Tooltip {...tt} />
                        </PieChart>
                        <div className="space-y-3">
                          {typeData.map(d => (
                            <div key={d.name} className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                              <span className="text-xs text-white/50">{d.name}</span>
                              <span className="text-sm font-bold text-white/80 ml-auto pl-4">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin datos.</p>}
                  </>
                )}

                {/* Tags */}
                {chartTab === 'tags' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Tags más frecuentes</p>
                    {tagData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(160, tagData.length * 38)}>
                        <BarChart layout="vertical" data={tagData} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} width={100} />
                          <Tooltip {...tt} formatter={(v: number | string) => [`${v}`, 'Entradas']} />
                          <Bar dataKey="count" fill={accentHex} radius={[0, 4, 4, 0]} name="Entradas" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin tags registrados.</p>}
                  </>
                )}

                {/* Valoraciones */}
                {chartTab === 'ratings' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Distribución de valoraciones</p>
                    {ratingData.some(d => d.count > 0) ? (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={ratingData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.40)' }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <Tooltip {...tt} formatter={(v: number | string) => [`${v}`, 'Elementos']} />
                          <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Elementos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin valoraciones.</p>}
                  </>
                )}
              </Card>

              <p className="text-[10px] text-white/20 text-center mt-4">{items.length} elementos en la colección</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Mobile filter modal */}
      <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)} title="Filtros" size="md">
        <div className="py-1">
          {filterControls}
          <button onClick={() => setFilterModalOpen(false)} className="btn-primary w-full mt-4">
            Aplicar
          </button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title} size="md">
        {detail && (() => {
          const st = STATUS_MAP[detail.status]
          return (
            <div className="space-y-4">
              {detail.coverDataUrl && <img src={detail.coverDataUrl} className="w-full h-48 object-cover rounded-xl" />}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${st.c}`}>{st.l}</span>
                <span className="text-xs text-white/20">
                  {detail.type === 'series' ? 'Serie' : 'Película'}{detail.releaseYear ? ` · ${detail.releaseYear}` : ''}
                </span>
              </div>

              {detail.rating ? (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={14} className={i < detail.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />
                  ))}
                </div>
              ) : null}

              {detail.description && <p className="text-sm text-white/50">{detail.description}</p>}

              {detail.notes && (
                <div className="bg-surface-200/40 rounded-xl p-3">
                  <p className="text-xs text-white/30 mb-1">Notas</p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}

              {detail.tags && (
                <div className="flex flex-wrap gap-1">
                  {detail.tags.split(',').map(t => (
                    <span key={t} className="text-[10px] bg-surface-300 px-2 py-0.5 rounded-full text-white/30">{t.trim()}</span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {(['quiero_ver', 'viendo', 'terminado', 'pausado'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { quickStatus(detail.id!, s); setDetail({ ...detail, status: s }) }}
                    className={`text-[10px] px-2 py-1 rounded-lg transition-all ${detail.status === s
                        ? STATUS_MAP[s].c + ' ring-1 ring-white/10'
                        : 'bg-surface-200/40 text-white/30 hover:text-white/50'
                      }`}
                  >
                    {STATUS_MAP[s].l}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setDetail(null); openEdit(detail) }} className="btn-secondary flex-1">
                  <Pencil size={14} /> Editar
                </button>
                <button onClick={() => { del(detail.id!); setDetail(null) }} className="btn-ghost text-red-400/50 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Form modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar' : form.type === 'series' ? 'Nueva serie' : 'Nueva película'}
        size="md"
      >
        <div className="space-y-3">
          <ImageUpload
            value={form.coverDataUrl}
            onChange={v => setForm(f => ({ ...f, coverDataUrl: v }))}
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
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Año</label>
              <input
                type="number"
                value={form.releaseYear || ''}
                onChange={e => setForm(f => ({ ...f, releaseYear: parseInt(e.target.value) || undefined }))}
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
                onChange={v => setForm(f => ({ ...f, status: v as MediaItem['status'] }))}
                placeholder="Estado"
                options={[
                  { value: 'quiero_ver', label: 'Quiero ver' },
                  { value: 'viendo', label: 'Viendo' },
                  { value: 'terminado', label: 'Terminado' },
                  { value: 'pausado', label: 'Pausado' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Rating</label>
              <div className="flex gap-0.5 pt-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <button key={i} type="button" onClick={() => setForm(f => ({ ...f, rating: i + 1 }))}>
                    <Star size={16} className={i < (form.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/15'} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FocusNote
            value={form.description || ''}
            onChange={v => setForm(f => ({ ...f, description: v }))}
            label="Descripción"
            placeholder="Sinopsis..."
            rows={2}
          />

          <FocusNote
            value={form.notes || ''}
            onChange={v => setForm(f => ({ ...f, notes: v }))}
            label="Notas / Opinión"
            placeholder="¿Qué opinas?"
            rows={2}
          />

          <div>
            <label className="text-xs text-white/40 mb-1 block">Tags (coma)</label>
            <input
              value={form.tags || ''}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="input-field"
              placeholder="Drama, Thriller"
            />
          </div>

          <button onClick={save} disabled={!form.title} className="btn-primary w-full disabled:opacity-40">
            {editing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
