import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
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
  // â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [allStudy, setAllStudy] = useState<EntryStudy[]>([])
  const [platforms, setPlatforms] = useState<StudyPlatform[]>([])

  // â”€â”€ Range & filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [range, setRange] = useState('30d')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterMinDuration, setFilterMinDuration] = useState('')

  // â”€â”€ UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [chartTab, setChartTab] = useState<ChartTab>('days')
  const [noteModal, setNoteModal] = useState<EntryStudy | null>(null)
  const [platOpen, setPlatOpen] = useState(false)
  const [platForm, setPlatForm] = useState({ name: '', icon: '' })
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

  // â”€â”€ Derived: ranged by date â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rangedStudy = useMemo(() => {
    if (range === 'all') return allStudy
    const cutoff = daysAgo(rangeToDays(range) - 1)
    return allStudy.filter(s => s.entryDate >= cutoff)
  }, [allStudy, range])

  // â”€â”€ Derived: filtered (range + all filters) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Filter options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Chart data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      return { name: raw.length > 18 ? raw.substring(0, 18) + 'â€¦' : raw, minutes }
    }).sort((a, b) => b.minutes - a.minutes)
  }, [filteredStudy, platforms])

  const topicData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredStudy.forEach(s => { if (s.topic) map[s.topic] = (map[s.topic] || 0) + s.minutes })
    return Object.entries(map).map(([topic, minutes]) => ({
      name: topic.length > 22 ? topic.substring(0, 22) + 'â€¦' : topic,
      minutes,
    })).sort((a, b) => b.minutes - a.minutes).slice(0, 10)
  }, [filteredStudy])

  // â”€â”€ Session list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sessionList = useMemo(() => (
    [...filteredStudy]
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .slice(0, 30)
      .map(s => ({ ...s, platName: platforms.find(p => p.id === s.platformId)?.name }))
  ), [filteredStudy, platforms])

  // â”€â”€ Static config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const statItems = [
    { icon: <Timer size={17} className="text-blue-400" />,          bg: 'bg-blue-500/10',    label: 'Total tiempo',   value: fmtMin(stats.totalMin) },
    { icon: <GraduationCap size={17} className="text-accent" />,    bg: 'bg-accent/10',      label: 'Sesiones',       value: stats.sessions },
    { icon: <TrendingUp size={17} className="text-emerald-400" />,  bg: 'bg-emerald-500/10', label: 'Prom. / dÃ­a',    value: fmtMin(stats.avgDay) },
    { icon: <Zap size={17} className="text-amber-400" />,           bg: 'bg-amber-500/10',   label: 'Prom. semanal',  value: fmtMin(stats.avgWeek) },
  ]

  const chartTabs = [
    { id: 'days'      as const, label: 'DÃ­as',        icon: <BarChart2 size={11} /> },
    { id: 'weeks'     as const, label: 'Semanas',     icon: <TrendingUp size={11} /> },
    { id: 'platforms' as const, label: 'Plataformas', icon: <Layers size={11} /> },
    { id: 'topics'    as const, label: 'Temas',       icon: <BookOpen size={11} /> },
  ]

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Estudio</h1>
        <div className="mt-3">
          <button onClick={() => setPlatOpen(true)} className="btn-secondary text-xs">
            <Plus size={14} /> Plataformas
          </button>
        </div>
      </div>

      {/* Range selector */}
      <div className="mb-5 overflow-x-auto pb-0.5">
        <RangeSelector value={range} onChange={v => setRange(v)} />
      </div>

      {/* Stats row */}
      {allStudy.length > 0 && (
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
      )}

      {/* Filters */}
      {allStudy.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {platforms.length > 0 && (
            <SheetSelect
              value={filterPlatform}
              onChange={setFilterPlatform}
              placeholder="Todas las plataformas"
              className="min-w-[180px]"
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
              className="min-w-[170px]"
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
              className="min-w-[170px]"
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
            className="min-w-[155px]"
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
              className="text-[11px] px-2.5 py-1 rounded-full border border-red-400/30 text-red-400/50 hover:text-red-400 hover:border-red-400/50 flex items-center gap-1 transition-colors"
            >
              <X size={10} /> Limpiar
            </button>
          )}
        </div>
      )}

      {/* Charts */}
      {allStudy.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            <span className="text-[10px] text-white/25 mr-1 uppercase tracking-wider">GrÃ¡ficas</span>
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
            {/* DÃ­as */}
            {chartTab === 'days' && (
              <>
                <p className="text-xs text-white/40 mb-4 font-medium">
                  Minutos por dÃ­a â€” Ãºltimos {Math.min(rangeToDays(range), 90)} dÃ­as
                </p>
                {dailyData.some(d => d.minutes > 0) ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                      <Tooltip {...tt} formatter={(v: number | string) => [`${v} min`, 'Minutos']} />
                      <Bar dataKey="minutes" fill={accentHex} radius={[4, 4, 0, 0]} name="Minutos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-white/25 text-center py-10">Sin sesiones en este rango.</p>
                )}
              </>
            )}

            {/* Semanas */}
            {chartTab === 'weeks' && (
              <>
                <p className="text-xs text-white/40 mb-4 font-medium">Minutos por semana</p>
                {weeklyData.some(d => d.minutes > 0) ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                      <Tooltip {...tt} formatter={(v: number | string) => [`${v} min`, 'Minutos']} />
                      <Bar dataKey="minutes" fill="#22c55e" radius={[4, 4, 0, 0]} name="Minutos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-white/25 text-center py-10">Sin datos semanales.</p>
                )}
              </>
            )}

            {/* Plataformas */}
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

            {/* Temas */}
            {chartTab === 'topics' && (
              <>
                <p className="text-xs text-white/40 mb-4 font-medium">Temas mÃ¡s estudiados</p>
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
        </div>
      )}

      {/* Sessions list */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white/40">Sesiones</h3>
        {filteredStudy.length > 0 && (
          <span className="text-[10px] bg-surface-300 px-2 py-0.5 rounded-full text-white/25">
            {filteredStudy.length}
          </span>
        )}
      </div>

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
          {sessionList.map(s => (
            <div key={s.id} className="glass-card-hover p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={14} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.topic || 'Sin tÃ­tulo'}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-white/25 mt-0.5">
                  <span>{displayDate(s.entryDate)}</span>
                  {s.platName && <span>Â· {s.platName}</span>}
                  {s.course && <span>Â· {s.course}</span>}
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
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-white/20" />
                  <span className="text-xs font-mono text-white/40">{fmtMin(s.minutes)}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredStudy.length > 30 && (
            <p className="text-[10px] text-white/25 text-center pt-2">
              Mostrando 30 de {filteredStudy.length} sesiones.
            </p>
          )}
        </div>
      )}

      {/* Note modal */}
      <Modal
        open={!!noteModal}
        onClose={() => setNoteModal(null)}
        title={noteModal ? `${noteModal.topic || 'SesiÃ³n'} â€” Notas` : ''}
        size="md"
      >
        {noteModal && (
          <div>
            <div className="flex items-center gap-2 text-xs text-white/30 mb-3">
              <span>{displayDate(noteModal.entryDate)}</span>
              {noteModal.course && <span>Â· {noteModal.course}</span>}
              <span>Â· {fmtMin(noteModal.minutes)}</span>
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
            placeholder="ðŸ“š"
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

