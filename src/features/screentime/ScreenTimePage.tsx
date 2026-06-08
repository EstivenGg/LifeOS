import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine,
} from 'recharts'
import {
  Smartphone, Plus, Pencil, Trash2, Clock, TrendingDown, Download, Loader2,
  ChevronLeft, ChevronRight, BarChart3, Zap, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { SheetSelect } from '@/components/ui/SheetSelect'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { showSaved } from '@/utils/toast'
import { addDays, daysAgo, displayDate, shortDate, today } from '@/utils/date'
import type { AppCatalog, EntryAppUsage, DailyEntry } from '@/data/types'
import { isAndroid, checkUsageAccess, openUsageAccessSettings, getUsageByApps, getInstalledApps } from '@/services/screentime'

function fmtMin(m: number) {
  if (!m) return '0m'
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }
function round0(n: number) { return Math.round(n) }

const COLORS = ['#f43f5e', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6']

const tt = {
  contentStyle: {
    background: '#1c1c26',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
  },
}

type DayPt = { label: string; minutes: number }
type UsageRow = { name: string; icon: string; minutes: number; packageName?: string }

export function ScreenTimePage() {
  const [apps, setApps] = useState<AppCatalog[]>([])
  const [chartData, setChartData] = useState<DayPt[]>([])
  const [selectedDate, setSelectedDate] = useState(today())
  const [todayTotal, setTodayTotal] = useState(0)
  const [todayUsage, setTodayUsage] = useState<UsageRow[]>([])
  const [avgMin, setAvgMin] = useState(0)

  const [topAllTime, setTopAllTime] = useState<{ name: string; icon: string; total: number }[]>([])
  const [range, setRange] = useState('7d')

  const [catalogOpen, setCatalogOpen] = useState(false)
  const [appForm, setAppForm] = useState({ name: '', icon: '', category: '' })
  const [editApp, setEditApp] = useState<AppCatalog | null>(null)

  const [importing, setImporting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [showAllApps, setShowAllApps] = useState(false)

  useEffect(() => { load() }, [range, selectedDate])

  async function load() {
    const days = Math.min(rangeToDays(range), 365)

    const [allApps, allEntries, usageForDay, allUsage] = await Promise.all([
      db.appCatalog.toArray(),
      db.dailyEntries.toArray(),
      db.entryAppUsage.where('entryDate').equals(selectedDate).toArray(),
      db.entryAppUsage.toArray(),
    ])

    setApps(allApps)

    const entryMap = new Map<string, DailyEntry>()
    allEntries.forEach(e => entryMap.set(e.date, e))

    const entry = entryMap.get(selectedDate)
    const total = entry?.screenTimeMinutes ?? 0
    setTodayTotal(total)

    const appById = new Map<number, AppCatalog>()
    allApps.forEach(a => { if (a.id != null) appById.set(a.id, a) })

    const dayUsage = usageForDay
      .map(u => {
        const a = appById.get(u.appId)
        return {
          name: a?.name || '?',
          icon: a?.icon || '\ud83d\udcf1',
          minutes: u.minutes,
          packageName: a?.packageName,
        }
      })
      .sort((a, b) => b.minutes - a.minutes)

    setTodayUsage(dayUsage)

    const d: DayPt[] = []
    let totalM = 0
    let daysCount = 0
    for (let i = days - 1; i >= 0; i--) {
      const dt = daysAgo(i)
      const mins = entryMap.get(dt)?.screenTimeMinutes ?? 0
      d.push({ label: shortDate(dt), minutes: mins })
      if (mins > 0) { totalM += mins; daysCount++ }
    }
    setChartData(d)
    setAvgMin(daysCount ? round0(totalM / daysCount) : 0)

    const totals: Record<number, number> = {}
    allUsage.forEach(u => { totals[u.appId] = (totals[u.appId] || 0) + u.minutes })

    const top = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id, total]) => {
        const a = appById.get(Number(id))
        return { name: a?.name || '?', icon: a?.icon || '\ud83d\udcf1', total }
      })

    setTopAllTime(top)

    if (selectedDate > today()) setSelectedDate(today())
  }

  async function saveApp() {
    if (editApp) await db.appCatalog.update(editApp.id!, appForm)
    else await db.appCatalog.add(appForm)
    setAppForm({ name: '', icon: '', category: '' })
    setEditApp(null)
    showSaved()
    load()
  }

  async function delApp(id: number) {
    await db.appCatalog.delete(id)
    await db.entryAppUsage.where('appId').equals(id).delete()
    showSaved()
    load()
  }

  async function clearImportedApps() {
    const imported = await db.appCatalog.where('category').equals('Importado').toArray()
    for (const a of imported) {
      await db.entryAppUsage.where('appId').equals(a.id!).delete()
      await db.appCatalog.delete(a.id!)
    }
    toast.success(`${imported.length} apps importadas eliminadas`)
    load()
  }

  async function clearAllScreenTimeData() {
    await db.entryAppUsage.clear()
    await db.appCatalog.clear()
    const allEntries = await db.dailyEntries.toArray()
    for (const e of allEntries) {
      if (e.screenTimeMinutes !== undefined) {
        await db.dailyEntries.update(e.date, { screenTimeMinutes: undefined })
      }
    }
    toast.success('Todos los datos de pantalla eliminados')
    setConfirmClear(false)
    load()
  }

  async function importFromAndroid() {
    if (!isAndroid) {
      toast.error('Solo disponible en Android')
      return
    }
    setImporting(true)
    try {
      const granted = await checkUsageAccess()
      if (!granted) {
        toast('Activa el permiso:\nAjustes → Acceso a datos de uso → LifeOS', { icon: '\ud83d\udd12', duration: 6000 })
        await openUsageAccessSettings()
        return
      }

      const days = Math.min(rangeToDays(range), 30)
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - days + 1)
      from.setHours(0, 0, 0, 0)

      const usageData = await getUsageByApps(from, to)
      if (usageData.length === 0) {
        toast('Sin datos de uso en este rango', { icon: 'ℹ️' })
        return
      }

      const installed = await getInstalledApps()
      const labelMap: Record<string, string> = {}
      installed.forEach(a => { labelMap[a.packageName] = a.label })

      const allCatalog = await db.appCatalog.toArray()
      const catalogByPkg: Record<string, AppCatalog> = {}
      allCatalog.forEach(a => { if (a.packageName) catalogByPkg[a.packageName] = a })

      let imported = 0
      const minutesByDateMs: Record<string, number> = {}

      for (const entry of usageData) {
        minutesByDateMs[entry.dateKey] = (minutesByDateMs[entry.dateKey] || 0) + entry.totalMs

        const label = labelMap[entry.packageName] || entry.packageName.split('.').pop() || entry.packageName
        let cat = catalogByPkg[entry.packageName]

        if (cat) {
          const fresh = labelMap[entry.packageName]
          if (fresh && fresh !== cat.name) {
            await db.appCatalog.update(cat.id!, { name: fresh })
            cat = { ...cat, name: fresh }
            catalogByPkg[entry.packageName] = cat
          }
        } else {
          const newId = await db.appCatalog.add({
            name: label,
            icon: '\ud83d\udcf1',
            category: 'Importado',
            packageName: entry.packageName,
          } as AppCatalog)
          cat = { id: newId as number, name: label, icon: '\ud83d\udcf1', category: 'Importado', packageName: entry.packageName }
          catalogByPkg[entry.packageName] = cat
        }

        const entryDate = entry.dateKey

        const existing = await db.entryAppUsage
          .where('entryDate').equals(entryDate)
          .and((u: EntryAppUsage) => u.appId === cat!.id!)
          .first()

        if (existing) await db.entryAppUsage.update(existing.id!, { minutes: entry.totalMinutes })
        else await db.entryAppUsage.add({ entryDate, appId: cat.id!, minutes: entry.totalMinutes })

        imported++
      }

      for (const [dateKey, totalMs] of Object.entries(minutesByDateMs)) {
        const existing = await db.dailyEntries.get(dateKey)
        await db.dailyEntries.put({ ...(existing || {}), date: dateKey, screenTimeMinutes: Math.round(totalMs / 60_000) })
      }

      toast.success(`${imported} registros importados`)
      load()
    } catch (err) {
      console.error(err)
      toast.error('Error al importar datos')
    } finally {
      setImporting(false)
    }
  }

  const categories = useMemo(() => [...new Set(apps.map(a => a.category))].filter(Boolean).sort(), [apps])
  const importedCount = useMemo(() => apps.filter(a => a.category === 'Importado').length, [apps])

  const metaLabel = selectedDate === today() ? 'Hoy' : shortDate(selectedDate)
  const metaStatus = todayTotal <= 120 ? 'Bajo control' : todayTotal <= 180 ? 'Medio' : 'Alto'

  const avgPill = avgMin > 0 ? `Prom: ${fmtMin(avgMin)}` : null
  const maxTicks = chartData.length > 14 ? 6 : undefined

  const list = showAllApps ? todayUsage : todayUsage.slice(0, 4)
  const _sumList = todayUsage.reduce((s, u) => s + u.minutes, 0)
  const canGoNext = selectedDate < today()

  const [view, setView] = useState<'detail' | 'insights'>('detail')

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)] shrink-0">
              <Smartphone size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold">Tiempo de pantalla</h1>
              <p className="text-xs text-white/30 mt-0.5">Tendencia · detalle · ranking</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {chartData.some(d => d.minutes > 0) && (
              <button
                onClick={() => setView(v => v === 'detail' ? 'insights' : 'detail')}
                className={`btn-secondary text-xs flex items-center gap-1.5 ${view === 'insights' ? 'bg-accent/15 text-accent border-accent/30' : ''}`}
              >
                <BarChart3 size={13} />
                <span className="hidden sm:inline">{view === 'insights' ? 'Detalle' : 'Insights'}</span>
              </button>
            )}
            {isAndroid && (
              <button
                onClick={importFromAndroid}
                disabled={importing}
                className={`btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50 ${importing ? 'bg-accent/10 text-accent border-accent/30' : ''}`}
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span className="hidden sm:inline">{importing ? 'Importando…' : 'Importar'}</span>
              </button>
            )}
            <button
              onClick={() => { setEditApp(null); setAppForm({ name: '', icon: '', category: '' }); setCatalogOpen(true) }}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Apps</span>
            </button>
          </div>
        </div>
      </div>

      {/* Range selector */}
      <div className="mb-5 overflow-x-auto pb-0.5 flex justify-center">
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* ════════ DETAIL VIEW ════════ */}
          {view === 'detail' && (
            <>
              {/* Hero card */}
              {(todayTotal > 0 || avgMin > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="glass-card !bg-gradient-to-br from-accent/8 via-transparent to-transparent border-accent/10 p-4 mb-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">{metaLabel}</p>
                      <p className="text-3xl md:text-4xl font-black tabular-nums font-mono">{fmtMin(todayTotal)}</p>
                      <p className="text-[11px] text-white/25 mt-1">
                        {todayUsage.length} apps · {metaStatus}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {avgMin > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-violet-400/70 bg-violet-500/10 px-2 py-0.5 rounded-full font-medium">
                          <TrendingUp size={11} />
                          {fmtMin(avgMin)}/prom
                        </div>
                      )}
                      <div className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        todayTotal <= 120
                          ? 'text-emerald-400/70 bg-emerald-500/10'
                          : todayTotal <= 180
                            ? 'text-amber-400/70 bg-amber-500/10'
                            : 'text-red-400/70 bg-red-500/10'
                      }`}>
                        <Zap size={11} />
                        {metaStatus}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick stats */}
              {(todayTotal > 0 || avgMin > 0) && (
                <div className="flex items-center justify-center gap-5 mb-5 py-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-accent font-mono">{fmtMin(todayTotal)}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">{metaLabel}</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold font-mono">{fmtMin(avgMin)}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Promedio</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.06]" />
                  <div className="text-center">
                    <p className="text-xl font-bold font-mono">{todayUsage.length}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Apps</p>
                  </div>
                </div>
              )}

              {/* Day navigator + app list */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => { setShowAllApps(false); setSelectedDate(addDays(selectedDate, -1)) }}
                    className="btn-ghost p-1.5"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-center min-w-0">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Detalle por app</p>
                    <h3 className="text-sm font-semibold text-white/60 capitalize truncate">
                      {displayDate(selectedDate)}
                    </h3>
                  </div>
                  <button
                    onClick={() => { if (canGoNext) { setShowAllApps(false); setSelectedDate(addDays(selectedDate, 1)) } }}
                    className="btn-ghost p-1.5 disabled:opacity-30"
                    disabled={!canGoNext}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {todayUsage.length > 0 ? (
                  <div className="space-y-2">
                    {list.map((u, i) => {
                      const pct = todayTotal > 0 ? clamp((u.minutes / todayTotal) * 100, 0, 100) : 0
                      const bar = COLORS[i % COLORS.length]
                      return (
                        <motion.div
                          key={`${u.name}-${i}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="glass-card-hover p-3 flex items-center gap-3"
                        >
                          <span className="w-9 h-9 rounded-xl bg-surface-200/60 flex items-center justify-center text-[14px] shrink-0">
                            {u.icon || '\ud83d\udcf1'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{u.name}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs font-mono text-white/40">{u.minutes > 0 ? fmtMin(u.minutes) : '< 1m'}</span>
                                <span className="text-[9px] text-white/20 bg-surface-200/50 px-1.5 py-0.5 rounded-full">{round0(pct)}%</span>
                              </div>
                            </div>
                            <div className="mt-1.5 h-1 bg-surface-300/50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, backgroundColor: bar }} />
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                    {todayUsage.length > 4 && (
                      <button
                        onClick={() => setShowAllApps(v => !v)}
                        className="w-full text-center text-xs text-accent hover:text-accent/80 transition-colors pt-1"
                      >
                        {showAllApps ? 'Ver menos' : `Ver más (${todayUsage.length - 4} apps más)`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-10 text-center">
                    <Smartphone size={34} className="text-white/10 mx-auto mb-3" />
                    <p className="text-sm text-white/30">Sin datos para esta fecha</p>
                    {isAndroid && (
                      <p className="text-xs text-white/15 mt-1">Tip: usa "Importar" para traer Digital Wellbeing</p>
                    )}
                  </div>
                )}
              </div>

              {/* All-time ranking */}
              {topAllTime.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Ranking acumulado</p>
                  <div className="space-y-2">
                    {topAllTime.map((a, i) => {
                      const max = topAllTime[0]?.total || 1
                      const pct = clamp((a.total / max) * 100, 0, 100)
                      const bar = COLORS[i % COLORS.length]
                      return (
                        <motion.div
                          key={`${a.name}-${i}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="glass-card-hover p-3 flex items-center gap-3"
                        >
                          <span className="text-[10px] font-bold text-white/25 w-4 text-center shrink-0">{i + 1}</span>
                          <span className="w-8 h-8 rounded-xl bg-surface-200/60 flex items-center justify-center text-[13px] shrink-0">{a.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{a.name}</p>
                              <span className="text-xs font-mono text-white/35 shrink-0">{fmtMin(a.total)}</span>
                            </div>
                            <div className="mt-1.5 h-1 bg-surface-300/50 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: bar }} />
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════ INSIGHTS VIEW ════════ */}
          {view === 'insights' && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: <Smartphone size={17} className="text-pink-400" />,      bg: 'bg-pink-500/10',    label: metaLabel,  value: fmtMin(todayTotal) },
                  { icon: <Clock size={17} className="text-violet-400" />,          bg: 'bg-violet-500/10',  label: 'Promedio', value: fmtMin(avgMin) },
                  { icon: <TrendingDown size={17} className="text-emerald-400" />,  bg: 'bg-emerald-500/10', label: 'Meta',     value: metaStatus },
                  { icon: <BarChart3 size={17} className="text-accent" />,          bg: 'bg-accent/10',      label: 'Apps',     value: String(apps.length) },
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
                      <p className="text-lg font-bold tabular-nums leading-tight font-mono">{s.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trend chart */}
              <Card delay={0.1}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white/50">Evolución</h3>
                  {avgPill && (
                    <span className="text-[10px] text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full font-medium">
                      {avgPill}
                    </span>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="stG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                      interval={maxTicks ? Math.floor(chartData.length / maxTicks) : 'preserveStartEnd'}
                    />
                    <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                    <Tooltip {...tt} formatter={(v: number) => [fmtMin(v), 'Tiempo']} />
                    {avgMin > 0 && (
                      <ReferenceLine y={avgMin} stroke="rgba(255,255,255,.12)" strokeDasharray="4 4" />
                    )}
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="#f43f5e"
                      fill="url(#stG)"
                      strokeWidth={2}
                      dot={{ fill: '#f43f5e', r: 2.2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                <p className="text-[10px] text-white/15 mt-2 text-center">
                  Línea punteada = promedio del rango
                </p>
              </Card>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Delete confirm overlay */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmClear(false)}>
          <div className="glass-card p-5 max-w-xs w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <Trash2 size={24} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">¿Eliminar todo?</p>
            <p className="text-xs text-white/40 mb-4">Se borrarán todas las apps y datos de pantalla</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)} className="btn-secondary flex-1 text-xs">Cancelar</button>
              <button onClick={clearAllScreenTimeData} className="btn-primary flex-1 text-xs bg-red-500 hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* App catalog modal */}
      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} title="Apps" size="md">
        {importedCount > 0 && (
          <div className="flex items-center justify-between mb-3 p-2.5 bg-surface-200/40 rounded-xl border border-white/[0.04]">
            <span className="text-xs text-white/40">{importedCount} apps importadas</span>
            <button
              onClick={clearImportedApps}
              className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
            >
              Limpiar importados
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            value={appForm.icon}
            onChange={e => setAppForm(f => ({ ...f, icon: e.target.value }))}
            className="input-field w-14 text-center"
            placeholder={'\ud83d\udcf1'}
          />
          <input
            value={appForm.name}
            onChange={e => setAppForm(f => ({ ...f, name: e.target.value }))}
            className="input-field flex-1"
            placeholder="Nombre"
          />
          <SheetSelect
            value={appForm.category}
            onChange={v => setAppForm(f => ({ ...f, category: v }))}
            className="w-36"
            placeholder="Categoría"
            options={['Social', 'Comunicación', 'Entretenimiento', 'Productividad', 'Importado', 'Otros'].map(c => ({
              value: c,
              label: c,
            }))}
          />
          <button
            onClick={saveApp}
            disabled={!appForm.name || !appForm.category}
            className="btn-primary px-4 disabled:opacity-40"
          >
            {editApp ? '✓' : <Plus size={14} />}
          </button>
        </div>

        {categories.map(cat => (
          <div key={cat} className="mb-4">
            <p className="text-[9px] uppercase tracking-wider text-white/20 mb-1.5">{cat}</p>
            <div className="space-y-1">
              {apps.filter(a => a.category === cat).map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-3 py-2 bg-surface-200/40 border border-white/[0.04] rounded-xl"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm">{a.icon || '\ud83d\udcf1'} {a.name}</span>
                    {a.packageName && (
                      <span className="text-[9px] text-white/20 truncate hidden sm:block">{a.packageName}</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditApp(a)
                        setAppForm({ name: a.name, icon: a.icon || '', category: a.category })
                      }}
                      className="btn-ghost p-1"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => delApp(a.id!)}
                      className="btn-ghost p-1 text-red-400/40 hover:text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Modal>
    </div>
  )
}
