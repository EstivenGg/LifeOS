import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Star, BookOpen, Search, X, Filter,
  BarChart2, TrendingUp, BookMarked, Users,
  CheckCircle2, FileText, Calendar, PieChart as PieIcon,
} from 'lucide-react'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { FocusNote } from '@/components/ui/FocusNote'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { GridSelector } from '@/components/ui/GridSelector'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { useGridColumns } from '@/hooks/useGridColumns'
import { useTheme } from '@/context/ThemeContext'
import { showSaved } from '@/utils/toast'
import type { Book, Author, EntryReading } from '@/data/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { daysAgo, shortDate, formatDate, parseDate } from '@/utils/date'

type SortBy = 'recent' | 'progress' | 'title' | 'rating'
type StatusFilter = 'all' | Book['status']
type ChartTab = 'days' | 'weeks' | 'progress' | 'status' | 'authors'

const BOOKS_PAGE = 12

function weekStart(dateStr: string): string {
  const d = parseDate(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return formatDate(d)
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

export function BooksPage() {
  // ── Data ───────────────────────────────────────────────────────────────────
  const [books, setBooks] = useState<Book[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [readings, setReadings] = useState<EntryReading[]>([])
  const [pagesPerBook, setPagesPerBook] = useState<Record<number, number>>({})

  // ── View ───────────────────────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'stats'>('list')

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [detailBook, setDetailBook] = useState<Book | null>(null)
  const [editing, setEditing] = useState<Book | null>(null)
  const [form, setForm] = useState({
    title: '', authorName: '', totalPages: 320,
    status: 'reading' as Book['status'], rating: 0,
    description: '', opinion: '', tags: '',
    coverDataUrl: undefined as string | undefined,
  })

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('recent')
  const [filterModalOpen, setFilterModalOpen] = useState(false)

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [showCount, setShowCount] = useState(BOOKS_PAGE)

  // ── Stats charts ───────────────────────────────────────────────────────────
  const [chartTab, setChartTab] = useState<ChartTab>('days')

  // ── Responsive ─────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const { cols, setAndSave, gridClass } = useGridColumns('books', 3)
  const { accentHex } = useTheme()

  useEffect(() => { load() }, [])
  useEffect(() => { setShowCount(BOOKS_PAGE) }, [search, filterStatus, filterAuthor, filterTag, sortBy])

  async function load() {
    const [allBooks, allAuthors, allR] = await Promise.all([
      db.books.toArray(),
      db.authors.toArray(),
      db.entryReadings.toArray(),
    ])
    setBooks(allBooks)
    setAuthors(allAuthors)
    setReadings(allR)
    const ppb: Record<number, number> = {}
    allR.forEach(r => { ppb[r.bookId] = (ppb[r.bookId] || 0) + r.pagesRead })
    setPagesPerBook(ppb)
  }

  // ── Lookup maps (avoid O(n²)) ──────────────────────────────────────────────
  const authorsById = useMemo(() => {
    const m = new Map<number, Author>()
    authors.forEach(a => { if (a.id !== undefined) m.set(a.id, a) })
    return m
  }, [authors])

  // ── Pre-aggregate readings by date for charts ──────────────────────────────
  const pagesByDate = useMemo(() => {
    const m = new Map<string, number>()
    readings.forEach(r => m.set(r.entryDate, (m.get(r.entryDate) || 0) + r.pagesRead))
    return m
  }, [readings])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setForm({ title: '', authorName: '', totalPages: 320, status: 'reading', rating: 0, description: '', opinion: '', tags: '', coverDataUrl: undefined })
    setFormOpen(true)
  }

  function openEdit(b: Book) {
    const author = authorsById.get(b.authorId)
    setEditing(b)
    setForm({ title: b.title, authorName: author?.name || '', totalPages: b.totalPages, status: b.status, rating: b.rating || 0, description: b.description || '', opinion: b.opinion || '', tags: b.tags || '', coverDataUrl: b.coverDataUrl })
    setFormOpen(true)
  }

  async function saveBook() {
    let authorId: number
    const existing = authors.find(a => a.name.toLowerCase() === form.authorName.trim().toLowerCase())
    if (existing) authorId = existing.id!
    else authorId = await db.authors.add({ name: form.authorName.trim() }) as number
    const data = {
      title: form.title, authorId, totalPages: form.totalPages, status: form.status,
      rating: form.rating || undefined, description: form.description || undefined,
      opinion: form.opinion || undefined, tags: form.tags || undefined,
      coverDataUrl: form.coverDataUrl || undefined,
    }
    if (editing) await db.books.update(editing.id!, data)
    else await db.books.add(data)
    setFormOpen(false); showSaved(); load()
  }

  async function deleteBook(id: number) {
    await db.books.delete(id)
    await db.entryReadings.where('bookId').equals(id).delete()
    showSaved(); load()
  }

  // ── Quick strip ────────────────────────────────────────────────────────────
  const readingNow = useMemo(() => books.filter(b => b.status === 'reading').slice(0, 3), [books])
  const lastFinished = useMemo(() => books.filter(b => b.status === 'finished').slice(-1)[0], [books])

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const set = new Set<string>()
    books.forEach(b => { if (b.tags) b.tags.split(',').forEach(t => { const v = t.trim(); if (v) set.add(v) }) })
    return Array.from(set).sort()
  }, [books])

  const authorsWithBooks = useMemo(() => {
    const ids = new Set(books.map(b => b.authorId))
    return authors.filter(a => ids.has(a.id!))
  }, [authors, books])

  const filteredBooks = useMemo(() => {
    let result = [...books]
    if (filterStatus !== 'all') result = result.filter(b => b.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(b => {
        const a = authorsById.get(b.authorId)
        return b.title.toLowerCase().includes(q) || (a?.name.toLowerCase().includes(q) ?? false)
      })
    }
    if (filterAuthor) result = result.filter(b => b.authorId === parseInt(filterAuthor))
    if (filterTag) {
      result = result.filter(b => {
        const tags = b.tags?.split(',').map(t => t.trim().toLowerCase()) ?? []
        return tags.includes(filterTag.toLowerCase())
      })
    }
    // Sort on a copy (result is already a copy from [...books])
    switch (sortBy) {
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break
      case 'progress': result.sort((a, b) => {
        const pa = a.totalPages > 0 ? (pagesPerBook[a.id!] || 0) / a.totalPages : 0
        const pb = b.totalPages > 0 ? (pagesPerBook[b.id!] || 0) / b.totalPages : 0
        return pb - pa
      }); break
      case 'rating': result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break
    }
    return result
  }, [books, authorsById, pagesPerBook, search, filterStatus, filterAuthor, filterTag, sortBy])

  const visibleBooks = filteredBooks.slice(0, showCount)
  const hasMore = filteredBooks.length > showCount
  const hasFilters = filterStatus !== 'all' || !!filterAuthor || !!filterTag || !!search.trim()

  function clearFilters() {
    setFilterStatus('all'); setFilterAuthor(''); setFilterTag(''); setSearch('')
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const reading = books.filter(b => b.status === 'reading').length
    const finished = books.filter(b => b.status === 'finished').length
    const totalPages = Object.values(pagesPerBook).reduce((s, n) => s + n, 0)
    const now = new Date(); const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
    const weekPages = readings
      .filter(r => { const d = parseDate(r.entryDate); return d >= weekAgo && d <= now })
      .reduce((s, r) => s + r.pagesRead, 0)
    return { reading, finished, totalPages, weekPages }
  }, [books, pagesPerBook, readings])

  // ── Chart data (uses pagesByDate map) ──────────────────────────────────────
  const dailyData = useMemo(() => {
    const result: { label: string; pages: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = daysAgo(i)
      result.push({ label: shortDate(d), pages: pagesByDate.get(d) || 0 })
    }
    return result
  }, [pagesByDate])

  const weeklyData = useMemo(() => {
    const wks: Record<string, number> = {}
    readings.forEach(r => { const w = weekStart(r.entryDate); wks[w] = (wks[w] || 0) + r.pagesRead })
    const result: { label: string; pages: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const d = new Date(); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff - i * 7)
      result.push({ label: shortDate(formatDate(d)), pages: wks[formatDate(d)] || 0 })
    }
    return result
  }, [readings])

  const progressData = useMemo(() => (
    [...books].map(b => {
      const read = pagesPerBook[b.id!] || 0
      const pct = b.totalPages > 0 ? Math.min(Math.round((read / b.totalPages) * 100), 100) : 0
      return { name: b.title.length > 20 ? b.title.substring(0, 20) + '…' : b.title, pct }
    }).filter(d => d.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 10)
  ), [books, pagesPerBook])

  const statusData = useMemo(() => [
    { name: 'Leyendo', value: books.filter(b => b.status === 'reading').length, color: '#22c55e' },
    { name: 'Terminado', value: books.filter(b => b.status === 'finished').length, color: accentHex },
    { name: 'Pausado', value: books.filter(b => b.status === 'paused').length, color: 'rgba(255,255,255,0.18)' },
  ].filter(d => d.value > 0), [books, accentHex])

  const authorData = useMemo(() => (
    [...authors].map(a => ({
      name: a.name.length > 16 ? a.name.substring(0, 16) + '…' : a.name,
      pages: books.filter(b => b.authorId === a.id).reduce((s, b) => s + (pagesPerBook[b.id!] || 0), 0),
    })).filter(d => d.pages > 0).sort((a, b) => b.pages - a.pages).slice(0, 8)
  ), [authors, books, pagesPerBook])

  // ── Static config ──────────────────────────────────────────────────────────
  const statItems = [
    { icon: <BookOpen size={17} className="text-emerald-400" />, bg: 'bg-emerald-500/10', label: 'Leyendo', value: stats.reading },
    { icon: <CheckCircle2 size={17} className="text-accent" />, bg: 'bg-accent/10', label: 'Terminados', value: stats.finished },
    { icon: <FileText size={17} className="text-white/40" />, bg: 'bg-white/5', label: 'Páginas leídas', value: stats.totalPages.toLocaleString() },
    { icon: <Calendar size={17} className="text-amber-400" />, bg: 'bg-amber-500/10', label: 'Esta semana', value: `${stats.weekPages} p.` },
  ]

  const chartTabs = [
    { id: 'days' as const, label: '14 días', icon: <BarChart2 size={11} /> },
    { id: 'weeks' as const, label: 'Semanas', icon: <TrendingUp size={11} /> },
    { id: 'progress' as const, label: 'Progreso', icon: <BookMarked size={11} /> },
    { id: 'status' as const, label: 'Estado', icon: <PieIcon size={11} /> },
    { id: 'authors' as const, label: 'Autores', icon: <Users size={11} /> },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  /* Shared filter controls (rendered inline on desktop, inside modal on mobile) */
  const filterControls = (
    <div className={isMobile ? 'space-y-3' : 'flex items-center gap-2 flex-wrap'}>
      {/* Status tabs */}
      <div className="flex bg-surface-200/40 rounded-lg p-0.5">
        {(['all', 'reading', 'paused', 'finished'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === s ? 'bg-accent/15 text-accent' : 'text-white/30 hover:text-white/50'
              }`}
          >
            {s === 'all' ? 'Todos' : s === 'reading' ? 'Leyendo' : s === 'paused' ? 'Pausado' : 'Terminado'}
          </button>
        ))}
      </div>

      {authorsWithBooks.length > 1 && (
        <SheetSelect
          value={filterAuthor}
          onChange={setFilterAuthor}
          className={isMobile ? 'w-full' : 'w-36'}
          buttonClassName="text-xs py-1.5"
          placeholder="Autor"
          options={authorsWithBooks.map(a => ({ value: String(a.id!), label: a.name }))}
          allowClear
          clearLabel="Todos los autores"
        />
      )}

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
          { value: 'progress', label: 'Progreso' },
          { value: 'title', label: 'A-Z' },
          { value: 'rating', label: 'Rating' },
        ]}
      />

      {hasFilters && (
        <button
          onClick={clearFilters}
          className={`p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-surface-300 transition-colors ${isMobile ? 'w-full flex items-center justify-center gap-1.5 py-2 mt-1 text-xs' : ''}`}
          title="Limpiar filtros"
        >
          <X size={14} /> {isMobile && 'Limpiar filtros'}
        </button>
      )}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto pb-6">

      {/* Header — compact on mobile */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold truncate">Biblioteca</h1>
          <div className="flex items-center gap-2 shrink-0">
            {books.length > 0 && (
              <button
                onClick={() => setView(v => v === 'list' ? 'stats' : 'list')}
                className={`btn-secondary text-xs flex items-center gap-1.5 ${view === 'stats' ? 'bg-accent/15 text-accent' : ''}`}
              >
                <BarChart2 size={13} />
                <span className="hidden sm:inline">{view === 'stats' ? 'Lista' : 'Stats'}</span>
              </button>
            )}
            <button onClick={openNew} className="btn-primary text-xs">
              <Plus size={14} /> <span className="hidden sm:inline">Nuevo libro</span><span className="sm:hidden">Nuevo</span>
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
              {(readingNow.length > 0 || lastFinished) && (
                <div className="flex gap-3 mb-5 overflow-x-auto pb-1 snap-x snap-mandatory scroll-pl-1">
                  {readingNow.map(b => {
                    const author = authorsById.get(b.authorId)
                    const read = pagesPerBook[b.id!] || 0
                    const pct = b.totalPages > 0 ? Math.min(Math.round((read / b.totalPages) * 100), 100) : 0
                    return (
                      <div
                        key={b.id}
                        onClick={() => setDetailBook(b)}
                        className="glass-card-hover p-3 min-w-[175px] cursor-pointer flex-shrink-0 snap-start active:scale-[0.97] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        <p className="text-[9px] text-emerald-400 mb-1">📖 Leyendo</p>
                        <p className="text-sm font-medium truncate">{b.title}</p>
                        {author && <p className="text-[10px] text-white/30 truncate">{author.name}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <ProgressBar value={read} max={b.totalPages} color="bg-emerald-400" height="h-1" />
                          <span className="text-[9px] text-white/25 font-mono flex-shrink-0">{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                  {lastFinished && (
                    <div
                      onClick={() => setDetailBook(lastFinished)}
                      className="glass-card-hover p-3 min-w-[175px] cursor-pointer flex-shrink-0 snap-start active:scale-[0.97] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <p className="text-[9px] text-accent mb-1">✓ Último terminado</p>
                      <p className="text-sm font-medium truncate">{lastFinished.title}</p>
                      <p className="text-[10px] text-white/30 truncate">
                        {authorsById.get(lastFinished.authorId)?.name}
                      </p>
                      {lastFinished.rating && (
                        <div className="flex mt-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} size={8} className={i < lastFinished.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Filter bar — mobile: button that opens modal, desktop: inline */}
              {books.length > 0 && (
                <>
                  {isMobile ? (
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => setFilterModalOpen(true)}
                        className={`btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center py-2.5 ${hasFilters ? 'bg-accent/10 text-accent border-accent/30' : ''}`}
                      >
                        <Filter size={13} />
                        Filtros{hasFilters ? ` (${[filterStatus !== 'all', !!filterAuthor, !!filterTag, !!search.trim()].filter(Boolean).length})` : ''}
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
              {filteredBooks.length === 0 && books.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={48} />}
                  title="Sin libros todavía"
                  desc="Agrega tu primer libro."
                  action={<button onClick={openNew} className="btn-primary text-sm"><Plus size={14} /> Agregar</button>}
                />
              ) : filteredBooks.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Search size={32} className="text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/40">No hay libros con esos filtros.</p>
                  <button onClick={clearFilters} className="btn-ghost text-xs mt-2 text-accent/70">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className={`grid ${gridClass} gap-3 md:gap-4`}>
                    {visibleBooks.map((b, i) => {
                      const author = authorsById.get(b.authorId)
                      const read = pagesPerBook[b.id!] || 0
                      const pct = b.totalPages > 0 ? Math.min(Math.round((read / b.totalPages) * 100), 100) : 0
                      return (
                        <motion.div
                          key={b.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => setDetailBook(b)}
                          className="glass-card-hover overflow-hidden cursor-pointer group active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-accent/40"
                        >
                          {b.coverDataUrl ? (
                            <img src={b.coverDataUrl} className="w-full h-44 object-cover" />
                          ) : (
                            <div className="w-full h-44 bg-gradient-to-br from-accent/10 to-surface-300 flex items-center justify-center">
                              <BookOpen size={40} className="text-accent/20" />
                            </div>
                          )}
                          <div className="p-3">
                            <h3 className="font-semibold text-sm mb-0.5 truncate group-hover:text-accent transition-colors">{b.title}</h3>
                            <p className="text-xs text-white/30 mb-2 truncate">{author?.name}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${b.status === 'reading' ? 'bg-emerald-500/15 text-emerald-400' : b.status === 'finished' ? 'bg-accent/15 text-accent' : 'bg-surface-300 text-white/30'}`}>
                                {b.status === 'reading' ? 'Leyendo' : b.status === 'finished' ? 'Terminado' : 'Pausado'}
                              </span>
                              {b.rating && (
                                <div className="flex">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star key={i} size={9} className={i < b.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/8'} />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <ProgressBar value={read} max={b.totalPages} color="bg-emerald-400" height="h-1" />
                              <span className="text-[9px] text-white/25 font-mono flex-shrink-0">{pct}%</span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Ver más */}
                  {hasMore && (
                    <div className="flex justify-center pt-5 pb-2">
                      <button
                        onClick={() => setShowCount(c => c + BOOKS_PAGE)}
                        className="btn-secondary text-xs"
                      >
                        Ver más · {filteredBooks.length - showCount} restantes
                      </button>
                    </div>
                  )}
                  {!hasMore && filteredBooks.length > BOOKS_PAGE && (
                    <p className="text-[10px] text-white/20 text-center pt-4 pb-2">{filteredBooks.length} libros</p>
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

              {/* Charts */}
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
                {chartTab === 'days' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Páginas por día — 14 días</p>
                    {dailyData.some(d => d.pages > 0) ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <Tooltip {...tt} />
                          <Bar dataKey="pages" fill="#22c55e" radius={[4, 4, 0, 0]} name="Páginas" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin registros recientes.</p>}
                  </>
                )}

                {chartTab === 'weeks' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Páginas por semana — 8 semanas</p>
                    {weeklyData.some(d => d.pages > 0) ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <Tooltip {...tt} />
                          <Bar dataKey="pages" fill={accentHex} radius={[4, 4, 0, 0]} name="Páginas" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin registros semanales.</p>}
                  </>
                )}

                {chartTab === 'progress' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Progreso por libro (%)</p>
                    {progressData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(160, progressData.length * 34)}>
                        <BarChart layout="vertical" data={progressData} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} tickFormatter={(v: number) => `${v}%`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} width={96} />
                          <Tooltip {...tt} formatter={(v: number | string) => [`${v}%`, 'Progreso']} />
                          <Bar dataKey="pct" fill={accentHex} radius={[0, 4, 4, 0]} name="Progreso" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin progreso registrado.</p>}
                  </>
                )}

                {chartTab === 'status' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Estado de lectura</p>
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
                          <p className="text-[10px] text-white/25 pt-1">{books.length} libro{books.length !== 1 ? 's' : ''} en total</p>
                        </div>
                      </div>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin datos.</p>}
                  </>
                )}

                {chartTab === 'authors' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Autores más leídos (páginas)</p>
                    {authorData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(160, authorData.length * 38)}>
                        <BarChart layout="vertical" data={authorData} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} width={96} />
                          <Tooltip {...tt} />
                          <Bar dataKey="pages" fill="#22c55e" radius={[0, 4, 4, 0]} name="Páginas" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-xs text-white/25 text-center py-10">Sin páginas registradas.</p>}
                  </>
                )}
              </Card>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Mobile filter modal */}
      <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)} title="Filtros" size="md">
        <div className="py-1">
          {filterControls}
          <button
            onClick={() => setFilterModalOpen(false)}
            className="btn-primary w-full mt-4"
          >
            Aplicar
          </button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailBook} onClose={() => setDetailBook(null)} title={detailBook?.title} size="md">
        {detailBook && (() => {
          const a = authorsById.get(detailBook.authorId)
          const read = pagesPerBook[detailBook.id!] || 0
          return (
            <div className="space-y-4">
              {detailBook.coverDataUrl && <img src={detailBook.coverDataUrl} className="w-full h-48 object-cover rounded-xl" />}
              <div className="flex items-center gap-3">
                <p className="text-sm text-white/50">{a?.name}</p>
                {detailBook.rating && (
                  <div className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} className={i < detailBook.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/10'} />)}</div>
                )}
              </div>
              {detailBook.description && <p className="text-sm text-white/40">{detailBook.description}</p>}
              <ProgressBar value={read} max={detailBook.totalPages} color="bg-emerald-400" />
              <p className="text-xs text-white/30">{read} / {detailBook.totalPages} páginas</p>
              {detailBook.opinion && (
                <div className="bg-surface-200/40 rounded-xl p-3">
                  <p className="text-xs text-white/30 mb-1">Mi opinión</p>
                  <p className="text-sm text-white/60 whitespace-pre-wrap">{detailBook.opinion}</p>
                </div>
              )}
              {detailBook.tags && (
                <div className="flex flex-wrap gap-1">
                  {detailBook.tags.split(',').map(t => <span key={t} className="text-[10px] bg-surface-300 px-2 py-0.5 rounded-full text-white/30">{t.trim()}</span>)}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setDetailBook(null); openEdit(detailBook) }} className="btn-secondary flex-1"><Pencil size={14} /> Editar</button>
                <button onClick={() => { deleteBook(detailBook.id!); setDetailBook(null) }} className="btn-ghost text-red-400/50 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Form modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar libro' : 'Nuevo libro'} size="md">
        <div className="space-y-3">
          <ImageUpload
            value={form.coverDataUrl}
            onChange={v => setForm(f => ({ ...f, coverDataUrl: v }))}
            height="h-44"
            placeholder={<><BookOpen size={28} className="text-white/15" /><span className="text-[11px] text-white/25">Subir portada del libro</span></>}
          />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/40 mb-1 block">Título</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" /></div>
            <div><label className="text-xs text-white/40 mb-1 block">Autor</label><input value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-white/40 mb-1 block">Páginas total</label><input type="number" value={form.totalPages} onChange={e => setForm(f => ({ ...f, totalPages: parseInt(e.target.value) || 0 }))} className="input-field" /></div>
            <div><label className="text-xs text-white/40 mb-1 block">Estado</label>
              <SheetSelect
                value={form.status}
                onChange={v => setForm(f => ({ ...f, status: v as Book['status'] }))}
                placeholder="Estado"
                options={[
                  { value: 'reading', label: 'Leyendo' },
                  { value: 'paused', label: 'Pausado' },
                  { value: 'finished', label: 'Terminado' },
                ]}
              />
            </div>
            <div><label className="text-xs text-white/40 mb-1 block">Rating</label>
              <div className="flex gap-0.5 pt-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <button key={i} type="button" onClick={() => setForm(f => ({ ...f, rating: i + 1 }))}>
                    <Star size={16} className={i < form.rating ? 'text-amber-400 fill-amber-400' : 'text-white/15'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <FocusNote value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} label="Descripción" placeholder="Sinopsis o descripción del libro..." rows={2} />
          <FocusNote value={form.opinion} onChange={v => setForm(f => ({ ...f, opinion: v }))} label="Mi opinión" placeholder="¿Qué opinas del libro?" rows={2} />
          <div><label className="text-xs text-white/40 mb-1 block">Tags (separados por coma)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="input-field" placeholder="No-ficción, Productividad" />
          </div>
          <button onClick={saveBook} disabled={!form.title || !form.authorName} className="btn-primary w-full disabled:opacity-40">
            {editing ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
