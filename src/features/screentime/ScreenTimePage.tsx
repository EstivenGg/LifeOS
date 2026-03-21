import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine,
} from 'recharts'
import {
  Smartphone, Plus, Pencil, Trash2, Clock, TrendingDown, Download, Loader2,
  ChevronLeft, ChevronRight, BarChart3,
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

    // Bulk fetches (much faster + less “laggy”)
    const [allApps, allEntries, usageForDay, allUsage] = await Promise.all([
      db.appCatalog.toArray(),
      db.dailyEntries.toArray(),
      db.entryAppUsage.where('entryDate').equals(selectedDate).toArray(),
      db.entryAppUsage.toArray(),
    ])

    setApps(allApps)

    // DailyEntries lookup
    const entryMap = new Map<string, DailyEntry>()
    allEntries.forEach(e => entryMap.set(e.date, e))

    const entry = entryMap.get(selectedDate)
    const total = entry?.screenTimeMinutes ?? 0
    setTodayTotal(total)

    // Today usage list (joined with catalog)
    const appById = new Map<number, AppCatalog>()
    allApps.forEach(a => { if (a.id != null) appById.set(a.id, a) })

    const dayUsage = usageForDay
      .map(u => {
        const a = appById.get(u.appId)
        return {
          name: a?.name || '?',
          icon: a?.icon || '📱',
          minutes: u.minutes,
          packageName: a?.packageName,
        }
      })
      .sort((a, b) => b.minutes - a.minutes)

    setTodayUsage(dayUsage)

    // Chart data + average (only days with >0 count for avg)
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

    // Top all-time apps
    const totals: Record<number, number> = {}
    allUsage.forEach(u => { totals[u.appId] = (totals[u.appId] || 0) + u.minutes })

    const top = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id, total]) => {
        const a = appById.get(Number(id))
        return { name: a?.name || '?', icon: a?.icon || '📱', total }
      })

    setTopAllTime(top)

    // If user navigated into future, snap back
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
        toast('Activa el permiso:\nAjustes → Acceso a datos de uso → LifeOS', { icon: '🔒', duration: 6000 })
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
            icon: '📱',
            category: 'Importado',
            packageName: entry.packageName,
          } as AppCatalog)
          cat = { id: newId as number, name: label, icon: '📱', category: 'Importado', packageName: entry.packageName }
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
  const metaStatus = todayTotal <= 120 ? '✅ Bajo control' : todayTotal <= 180 ? '⚠️ Medio' : '🚨 Alto'

  const avgPill = avgMin > 0 ? `Prom: ${fmtMin(avgMin)}` : null
  const maxTicks = chartData.length > 14 ? 6 : undefined

  const list = showAllApps ? todayUsage : todayUsage.slice(0, 4)
  const sumList = todayUsage.reduce((s, u) => s + u.minutes, 0)
  const canGoNext = selectedDate < today()

  return (
    <div className="max-w-6xl mx-auto pb-6">
      {/* Header (más premium, estilo Books/Media) */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">Tiempo de pantalla</h1>
            <p className="text-xs text-white/30 mt-0.5">Tendencia, detalle por día y ranking</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button onClick={clearAllScreenTimeData} className="text-xs text-red-400 hover:text-red-300 transition-colors">Sí</button>
                <button onClick={() => setConfirmClear(false)} className="text-xs text-white/30 hover:text-white/50 transition-colors">No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="btn-ghost text-xs text-red-400/60 hover:text-red-400"
                title="Limpiar todo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs (compactos tipo “Stats row”) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: metaLabel,
            value: fmtMin(todayTotal),
            icon: <Smartphone size={17} className="text-pink-400" />,
            bg: 'bg-pink-500/10',
            helper: metaStatus,
          },
          {
            label: 'Promedio',
            value: fmtMin(avgMin),
            icon: <Clock size={17} className="text-violet-400" />,
            bg: 'bg-violet-500/10',
            helper: range === '7d' ? 'Últimos 7 días' : range === '30d' ? 'Últimos 30 días' : 'Rango',
          },
          {
            label: 'Meta',
            value: todayTotal <= 120 ? '120m' : todayTotal <= 180 ? '≤ 180m' : '≤ 120m',
            icon: <TrendingDown size={17} className="text-emerald-400" />,
            bg: 'bg-emerald-500/10',
            helper: todayTotal <= 120 ? 'Perfecto' : 'Ajusta un poco',
          },
          {
            label: 'Rango',
            value: range.toUpperCase(),
            icon: <BarChart3 size={17} className="text-accent" />,
            bg: 'bg-accent/10',
            helper: 'Cambia arriba',
          },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="glass-card p-3.5 flex items-center gap-3"
          >
            <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/35 truncate">{k.label}</p>
              <p className="text-base font-bold leading-tight font-mono">{k.value}</p>
              <p className="text-[10px] text-white/20 truncate mt-0.5">{k.helper}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-xs text-white/25">
          {selectedDate !== today() ? (
            <button onClick={() => setSelectedDate(today())} className="text-accent hover:text-accent/80 transition-colors">
              Volver a hoy
            </button>
          ) : (
            <span>Hoy seleccionado</span>
          )}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Trend chart */}
        <Card delay={0.1}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/50">Evolución</h3>
            {avgPill && (
              <span className="text-[10px] text-pink-300/80 bg-pink-500/10 px-2 py-0.5 rounded-full font-medium">
                {avgPill}
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={210}>
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

        {/* Day detail */}
        <Card delay={0.15}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { setShowAllApps(false); setSelectedDate(addDays(selectedDate, -1)) }}
              className="btn-ghost p-1"
              title="Día anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center min-w-0">
              <h3 className="text-sm font-semibold text-white/60 capitalize truncate">
                {displayDate(selectedDate)}
              </h3>
              <p className="text-xl font-bold font-mono">{fmtMin(todayTotal)}</p>
              {todayUsage.length > 0 && (
                <p className="text-[10px] text-white/20 mt-0.5">
                  {todayUsage.length} apps · suma lista: {fmtMin(sumList)}
                </p>
              )}
            </div>

            <button
              onClick={() => { if (canGoNext) { setShowAllApps(false); setSelectedDate(addDays(selectedDate, 1)) } }}
              className="btn-ghost p-1 disabled:opacity-30"
              disabled={!canGoNext}
              title="Día siguiente"
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
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="bg-surface-200/30 border border-white/[0.04] rounded-xl p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-xl bg-surface-300 flex items-center justify-center text-[12px] shrink-0"
                        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset` }}
                      >
                        {u.icon || '📱'}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{u.name}</p>
                        {u.packageName && (
                          <p className="text-[9px] text-white/15 truncate">{u.packageName}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono text-white/40">{u.minutes > 0 ? fmtMin(u.minutes) : '< 1m'}</p>
                        <p className="text-[9px] text-white/20">{round0(pct)}%</p>
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 bg-surface-300 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: bar }} />
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
            <div className="py-14 text-center">
              <Smartphone size={34} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">Sin datos para esta fecha</p>
              {isAndroid && (
                <p className="text-xs text-white/15 mt-1">Tip: usa “Importar” para traer Digital Wellbeing</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* All-time ranking (más “pro”) */}
      {topAllTime.length > 0 && (
        <Card delay={0.2}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/50">Ranking acumulado</h3>
            <span className="text-[10px] text-white/20">Todo el historial</span>
          </div>

          <div className="space-y-2">
            {topAllTime.map((a, i) => {
              const max = topAllTime[0]?.total || 1
              const pct = clamp((a.total / max) * 100, 0, 100)
              const bar = COLORS[i % COLORS.length]
              return (
                <div key={`${a.name}-${i}`} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white/25 w-5">{i + 1}</span>
                  <span className="text-base w-6">{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{a.name}</p>
                    <div className="mt-1 h-1.5 bg-surface-300 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: bar }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-white/35 w-16 text-right">{fmtMin(a.total)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* App catalog modal */}
      <Modal open={catalogOpen} onClose={() => setCatalogOpen(false)} title="Apps" size="md">
        {/* Imported banner */}
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

        {/* Add/Edit row */}
        <div className="flex gap-2 mb-4">
          <input
            value={appForm.icon}
            onChange={e => setAppForm(f => ({ ...f, icon: e.target.value }))}
            className="input-field w-14 text-center"
            placeholder="📱"
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
            title={editApp ? 'Guardar' : 'Agregar'}
          >
            {editApp ? '✓' : <Plus size={14} />}
          </button>
        </div>

        {/* Grouped list */}
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
                    <span className="text-sm">{a.icon || '📱'} {a.name}</span>
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
                      title="Editar"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => delApp(a.id!)}
                      className="btn-ghost p-1 text-red-400/40 hover:text-red-400"
                      title="Eliminar"
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