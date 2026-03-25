import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  GraduationCap, Plus, Trash2, Clock, Maximize2,
  BarChart2, TrendingUp, Layers, BookOpen, X, Timer, Zap,
} from 'lucide-react'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { showSaved } from '@/utils/toast'
import { daysAgo, shortDate, fmtMin, displayDate, parseDate, formatDate } from '@/utils/date'
import { useTheme } from '@/context/ThemeContext'
import type { EntryStudy, StudyPlatform } from '@/data/types'

type ChartTab = 'days' | 'weeks' | 'platforms' | 'topics'

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

export function StudyPage() {
  const [allStudy, setAllStudy] = useState<EntryStudy[]>([])
  const [platforms, setPlatforms] = useState<StudyPlatform[]>([])

  const [range, setRange] = useState('30d')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterMinDuration, setFilterMinDuration] = useState('')

  const [chartTab, setChartTab] = useState<ChartTab>('days')
  const [noteModal, setNoteModal] = useState<EntryStudy | null>(null)
  const [platOpen, setPlatOpen] = useState(false)
  const [platForm, setPlatForm] = useState({ name: '', icon: '' })
  const [view, setView] = useState<'sessions' | 'insights'>('sessions')
  const { accentHex } = useTheme()

  useEffect(() => { load() }, [])

  async function load() {
    const [p, all] = await Promise.all([
      db.studyPlatforms.toArray(),
      db.entryStudy.toArray(),
    ])
    setPlatforms(p)
    setAllStudy(all)
  }

  async function savePlat() {
    await db.studyPlatforms.add(platForm)
    setPlatForm({ name: '', icon: '' })
    showSaved(); load()
  }

  async function delPlat(id: number) {
    await db.studyPlatforms.delete(id)
    showSaved(); load()
  }

  const rangedStudy = useMemo(() => {
    if (range === 'all') return allStudy
    const cutoff = daysAgo(rangeToDays(range) - 1)
    return allStudy.filter(s => s.entryDate >= cutoff)
  }, [allStudy, range])

  const filteredStudy = useMemo(() => {
    let result = rangedStudy
    if (filterPlatform) result = result.filter(s => String(s.platformId ?? '') === filterPlatform)
    if (filterTopic) result = result.filter(s => s.topic.toLowerCase().includes(filterTopic.toLowerCase()))
    if (filterCourse) result = result.filter(s => (s.course ?? '').toLowerCase().includes(filterCourse.toLowerCase()))
    if (filterMinDuration) result = result.filter(s => s.minutes >= parseInt(filterMinDuration))
    return result
  }, [rangedStudy, filterPlatform, filterTopic, filterCourse, filterMinDuration])

  const hasFilters = !!filterPlatform || !!filterTopic || !!filterCourse || !!filterMinDuration

  function clearFilters() { setFilterPlatform(''); setFilterTopic(''); setFilterCourse(''); setFilterMinDuration('') }

  const uniqueTopics = useMemo(() => {
    const set = new Set<string>()
    allStudy.forEach(s => { if (s.topic) set.add(s.topic) })
    return Array.from(set).sort()
  }, [allStudy])

  const uniqueCourses = useMemo(() => {
    const set = new Set<string>()
    allStudy.forEach(s => { if (s.course) set.add(s.course) })
    return Array.from(set).sort()
  }, [allStudy])

  const stats = useMemo(() => {
    const totalMin = filteredStudy.reduce((s, x) => s + x.minutes, 0)
    const uniqueDays = new Set(filteredStudy.map(s => s.entryDate)).size
    const avgDay = uniqueDays > 0 ? Math.round(totalMin / uniqueDays) : 0
    const rangeDays = range === 'all' ? Math.max(uniqueDays, 1) : rangeToDays(range)
    const weeks = Math.max(1, Math.ceil(rangeDays / 7))
    const avgWeek = Math.round(totalMin / weeks)
    const maxSession = filteredStudy.reduce((m, s) => Math.max(m, s.minutes), 0)
    return { totalMin, uniqueDays, avgDay, avgWeek, maxSession, sessions: filteredStudy.length }
  }, [filteredStudy, range])

  const dailyData = useMemo(() => {
    const days = Math.min(rangeToDays(range), 90)
    const result: { label: string; minutes: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = daysAgo(i)
      const mins = filteredStudy.filter(s => s.entryDate === d).reduce((sum, s) => sum + s.minutes, 0)
      result.push({ label: shortDate(d), minutes: mins })
    }
    return result
  }, [filteredStudy, range])

  const weeklyData = useMemo(() => {
    const numWeeks = Math.min(Math.ceil(rangeToDays(range) / 7), 26)
    const weeks: Record<string, number> = {}
    filteredStudy.forEach(s => {
      const wk = weekStart(s.entryDate)
      weeks[wk] = (weeks[wk] || 0) + s.minutes
    })
    const result: { label: string; minutes: number }[] = []
    for (let i = numWeeks - 1; i >= 0; i--) {
      const d = new Date()
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff - i * 7)
      const wk = formatDate(d)
      result.push({ label: shortDate(wk), minutes: weeks[wk] || 0 })
    }
    return result
  }, [filteredStudy, range])

  const platformData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredStudy.forEach(s => {
      const key = String(s.platformId ?? 'none')
      map[key] = (map[key] || 0) + s.minutes
    })
    return Object.entries(map).map(([id, minutes]) => {
      if (id === 'none') return { name: 'Sin plataforma', minutes }
      const plat = platforms.find(p => String(p.id) === id)
      const raw = plat ? `${plat.icon ?? ''} ${plat.name}`.trim() : 'Desconocida'
      return { name: raw.length > 18 ? raw.substring(0, 18) + '…' : raw, minutes }
    }).sort((a, b) => b.minutes - a.minutes)
  }, [filteredStudy, platforms])

  const topicData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredStudy.forEach(s => { if (s.topic) map[s.topic] = (map[s.topic] || 0) + s.minutes })
    return Object.entries(map).map(([topic, minutes]) => ({
      name: topic.length > 22 ? topic.substring(0, 22) + '…' : topic,
      minutes,
    })).sort((a, b) => b.minutes - a.minutes).slice(0, 10)
  }, [filteredStudy])

  const sessionList = useMemo(() => (
    [...filteredStudy]
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .slice(0, 30)
      .map(s => ({ ...s, platName: platforms.find(p => p.id === s.platformId)?.name }))
  ), [filteredStudy, platforms])

  const chartTabs = [
    { id: 'days'      as const, label: 'Días',        icon: <BarChart2 size={11} /> },
    { id: 'weeks'     as const, label: 'Semanas',     icon: <TrendingUp size={11} /> },
    { id: 'platforms' as const, label: 'Plataformas', icon: <Layers size={11} /> },
    { id: 'topics'    as const, label: 'Temas',       icon: <BookOpen size={11} /> },
  ]

  return (
    <div className="max-w-3xl mx-auto pb-8">

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)]">
              <GraduationCap size={20} className="text-accent" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Estudio</h1>
              <p className="text-xs text-white/30 mt-0.5">Sesiones · plataformas · progreso</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {allStudy.length > 0 && (
              <button
                onClick={() => setView(v => v === 'sessions' ? 'insights' : 'sessions')}
                className={`btn-secondary text-xs flex items-center gap-1.5 ${view === 'insights' ? 'bg-accent/15 text-accent border-accent/30' : ''}`}
              >
                <BarChart2 size={13} />
                <span className="hidden sm:inline">{view === 'insights' ? 'Sesiones' : 'Insights'}</span>
              </button>
            )}
            <button onClick={() => setPlatOpen(true)} className="btn-secondary text-xs flex items-center gap-1.5">
              <Layers size={13} /> <span className="hidden sm:inline">Plataformas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Range selector */}
      <div className="mb-5 overflow-x-auto pb-0.5 flex justify-center">
        <RangeSelector value={range} onChange={v => setRange(v)} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* ═══════════ SESSIONS VIEW ═══════════ */}
          {view === 'sessions' && (
            <>
              {/* Hero card */}
              {allStudy.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="glass-card !bg-gradient-to-br from-accent/8 via-transparent to-transparent border-accent/10 p-4 mb-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">Tiempo total</p>
                      <p className="text-3xl md:text-4xl font-black tabular-nums">{fmtMin(stats.totalMin)}</p>
                      <p className="text-[11px] text-white/25 mt-1">
                        {stats.uniqueDays} días · {stats.sessions} sesiones
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                        <TrendingUp size={11} />
                        {fmtMin(stats.avgDay)}/día
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full font-medium">
                        <Zap size={11} />
                        {fmtMin(stats.avgWeek)}/sem
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick stats row */}
              {allStudy.length > 0 && (
                <div className="flex items-center justify-center gap-5 mb-5 py-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-accent">{fmtMin(stats.totalMin)}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Total</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold">{stats.sessions}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Sesiones</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold">{stats.uniqueDays}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Días</p>
                  </div>
                </div>
              )}

              {/* Filters */}
              {allStudy.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {platforms.length > 0 && (
                    <SheetSelect
                      value={filterPlatform}
                      onChange={setFilterPlatform}
                      placeholder="Todas las plataformas"
                      className="w-full"
                      buttonClassName="text-[11px] py-1.5 px-2.5"
                      options={platforms.map(p => ({ value: String(p.id!), label: `${p.icon} ${p.name}` }))}
                      allowClear
                      clearLabel="Todas las plataformas"
                    />
                  )}

                  {uniqueTopics.length > 0 && (
                    <SheetSelect
                      value={filterTopic}
                      onChange={setFilterTopic}
                      placeholder="Todos los temas"
                      className="w-full"
                      buttonClassName="text-[11px] py-1.5 px-2.5"
                      options={uniqueTopics.map(t => ({
                        value: t,
                        label: t.length > 28 ? `${t.substring(0, 28)}...` : t,
                      }))}
                      allowClear
                      clearLabel="Todos los temas"
                    />
                  )}

                  {uniqueCourses.length > 0 && (
                    <SheetSelect
                      value={filterCourse}
                      onChange={setFilterCourse}
                      placeholder="Todos los cursos"
                      className="w-full"
                      buttonClassName="text-[11px] py-1.5 px-2.5"
                      options={uniqueCourses.map(c => ({
                        value: c,
                        label: c.length > 28 ? `${c.substring(0, 28)}...` : c,
                      }))}
                      allowClear
                      clearLabel="Todos los cursos"
                    />
                  )}

                  <SheetSelect
                    value={filterMinDuration}
                    onChange={setFilterMinDuration}
                    placeholder="Cualquier duración"
                    className="w-full"
                    buttonClassName="text-[11px] py-1.5 px-2.5"
                    options={[
                      { value: '15', label: '>= 15 min' },
                      { value: '30', label: '>= 30 min' },
                      { value: '60', label: '>= 1 hora' },
                      { value: '120', label: '>= 2 horas' },
                    ]}
                    allowClear
                    clearLabel="Cualquier duración"
                  />

                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="col-span-2 text-[11px] px-2.5 py-1.5 rounded-full border border-red-400/30 text-red-400/50 hover:text-red-400 hover:border-red-400/50 flex items-center justify-center gap-1 transition-colors"
                    >
                      <X size={10} /> Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              {/* Sessions list */}
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">
                  Sesiones recientes
                </p>

                {sessionList.length === 0 && allStudy.length === 0 ? (
                  <EmptyState
                    icon={<GraduationCap size={48} />}
                    title="Sin sesiones"
                    desc="Registra estudio desde el Diario."
                  />
                ) : sessionList.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <GraduationCap size={32} className="text-white/15 mx-auto mb-3" />
                    <p className="text-sm text-white/40">No hay sesiones con esos filtros.</p>
                    <button
                      onClick={() => { clearFilters(); setRange('all') }}
                      className="btn-ghost text-xs mt-2 text-accent/70"
                    >
                      Ampliar filtros
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessionList.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="glass-card-hover p-3 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <GraduationCap size={15} className="text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.topic || 'Sin título'}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-white/25 mt-0.5">
                            <span>{displayDate(s.entryDate)}</span>
                            {s.platName && <span>· {s.platName}</span>}
                            {s.course && <span>· {s.course}</span>}
                          </div>
                          {s.note && <p className="text-[11px] text-white/20 mt-0.5 truncate">{s.note}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {s.note && (
                            <button
                              onClick={() => setNoteModal(s)}
                              className="btn-ghost p-1"
                              title="Ver nota completa"
                            >
                              <Maximize2 size={13} />
                            </button>
                          )}
                          <div className="flex items-center gap-1 bg-surface-200/50 px-2 py-1 rounded-lg">
                            <Clock size={12} className="text-white/20" />
                            <span className="text-xs font-mono text-white/40">{fmtMin(s.minutes)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {filteredStudy.length > 30 && (
                      <p className="text-[10px] text-white/25 text-center pt-2">
                        Mostrando 30 de {filteredStudy.length} sesiones.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══════════ INSIGHTS VIEW ═══════════ */}
          {view === 'insights' && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: <Timer size={17} className="text-blue-400" />,          bg: 'bg-blue-500/10',    label: 'Total tiempo',            value: fmtMin(stats.totalMin) },
                  { icon: <GraduationCap size={17} className="text-accent" />,    bg: 'bg-accent/10',      label: 'Sesiones',                value: stats.sessions },
                  { icon: <TrendingUp size={17} className="text-emerald-400" />,  bg: 'bg-emerald-500/10', label: 'Prom. / día',          value: fmtMin(stats.avgDay) },
                  { icon: <Zap size={17} className="text-amber-400" />,           bg: 'bg-amber-500/10',   label: 'Prom. semanal',           value: fmtMin(stats.avgWeek) },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-card p-3 flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                      {s.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{s.label}</p>
                      <p className="text-lg font-bold tabular-nums leading-tight">{s.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chart tabs */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                <span className="text-[10px] text-white/25 mr-1 uppercase tracking-wider">Gráficas</span>
                {chartTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setChartTab(tab.id)}
                    className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      chartTab === tab.id
                        ? 'bg-accent/15 border-accent/40 text-accent'
                        : 'border-white/10 text-white/35 hover:border-white/20 hover:text-white/60'
                    }`}
                  >
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              <Card delay={0.1}>
                {/* Days */}
                {chartTab === 'days' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">
                      {`Minutos por día — últimos ${Math.min(rangeToDays(range), 90)} días`}
                    </p>
                    {dailyData.some(d => d.minutes > 0) ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={dailyData}>
                          <defs>
                            <linearGradient id="studyDayGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={accentHex} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={accentHex} stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <Tooltip {...tt} formatter={(v: number | string) => [`${v} min`, 'Minutos']} />
                          <Bar dataKey="minutes" fill="url(#studyDayGrad)" radius={[4, 4, 0, 0]} name="Minutos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-white/25 text-center py-10">Sin sesiones en este rango.</p>
                    )}
                  </>
                )}

                {/* Weeks */}
                {chartTab === 'weeks' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Minutos por semana</p>
                    {weeklyData.some(d => d.minutes > 0) ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weeklyData}>
                          <defs>
                            <linearGradient id="studyWeekGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                          <Tooltip {...tt} formatter={(v: number | string) => [`${v} min`, 'Minutos']} />
                          <Bar dataKey="minutes" fill="url(#studyWeekGrad)" radius={[4, 4, 0, 0]} name="Minutos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-white/25 text-center py-10">Sin datos semanales.</p>
                    )}
                  </>
                )}

                {/* Platforms */}
                {chartTab === 'platforms' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Minutos por plataforma</p>
                    {platformData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(160, platformData.length * 42)}>
                        <BarChart layout="vertical" data={platformData} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                            tickFormatter={(v: number) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`}
                          />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} width={105} />
                          <Tooltip {...tt} formatter={(v: number | string) => [fmtMin(Number(v)), 'Tiempo']} />
                          <Bar dataKey="minutes" fill={accentHex} radius={[0, 4, 4, 0]} name="Minutos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-white/25 text-center py-10">Sin datos de plataformas.</p>
                    )}
                  </>
                )}

                {/* Topics */}
                {chartTab === 'topics' && (
                  <>
                    <p className="text-xs text-white/40 mb-4 font-medium">Temas más estudiados</p>
                    {topicData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(160, topicData.length * 38)}>
                        <BarChart layout="vertical" data={topicData} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                            tickFormatter={(v: number) => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`}
                          />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} width={115} />
                          <Tooltip {...tt} formatter={(v: number | string) => [fmtMin(Number(v)), 'Tiempo']} />
                          <Bar dataKey="minutes" fill="#22c55e" radius={[0, 4, 4, 0]} name="Minutos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-white/25 text-center py-10">Sin datos de temas.</p>
                    )}
                  </>
                )}
              </Card>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Note modal */}
      <Modal
        open={!!noteModal}
        onClose={() => setNoteModal(null)}
        title={noteModal ? `${noteModal.topic || 'Sesión'} — Notas` : ''}
        size="md"
      >
        {noteModal && (
          <div>
            <div className="flex items-center gap-2 text-xs text-white/30 mb-3">
              <span>{displayDate(noteModal.entryDate)}</span>
              {noteModal.course && <span>· {noteModal.course}</span>}
              <span>· {fmtMin(noteModal.minutes)}</span>
            </div>
            <div className="bg-surface-200/40 rounded-xl p-4 min-h-[200px]">
              <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{noteModal.note}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Platform modal */}
      <Modal open={platOpen} onClose={() => setPlatOpen(false)} title="Plataformas de estudio" size="sm">
        <div className="flex gap-2 mb-4">
          <input
            value={platForm.icon}
            onChange={e => setPlatForm(f => ({ ...f, icon: e.target.value }))}
            className="input-field w-14 text-center"
            placeholder={'\ud83d\udcda'}
          />
          <input
            value={platForm.name}
            onChange={e => setPlatForm(f => ({ ...f, name: e.target.value }))}
            className="input-field flex-1"
            placeholder="Nombre"
          />
          <button onClick={savePlat} disabled={!platForm.name} className="btn-primary px-3 disabled:opacity-40">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-1">
          {platforms.map(p => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-surface-200/40 rounded-lg text-sm">
              <span>{p.icon} {p.name}</span>
              <button onClick={() => delPlat(p.id!)} className="btn-ghost p-1 text-red-400/40 hover:text-red-400">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
