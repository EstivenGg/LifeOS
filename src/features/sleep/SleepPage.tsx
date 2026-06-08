import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import { Moon, Sun } from 'lucide-react'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { daysAgo, shortDate } from '@/utils/date'
import type { DailyEntry } from '@/data/types'

// ─── Time helpers (unchanged logic) ──────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function bedtimeToChartVal(t: string): number {
  const mins = timeToMinutes(t)
  return mins < 720 ? (mins / 60) + 24 : mins / 60
}

function wakeToChartVal(t: string): number {
  return timeToMinutes(t) / 60
}

function chartValToLabel(val: number): string {
  const normH = Math.floor(val % 24)
  const m = Math.round((val % 1) * 60)
  return `${normH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// ─── Types ───────────────────────────────────────────────────────────────────
type ChartPoint = {
  label: string
  hours: number
  bedtime?: number
  wake?: number
  bedLabel?: string
  wakeLabel?: string
}

type ChartTab = 'hours' | 'schedule'

// ─── Component ───────────────────────────────────────────────────────────────
export function SleepPage() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [avg7h, setAvg7h] = useState(0)
  const [avg30h, setAvg30h] = useState(0)
  const [avgBed, setAvgBed] = useState('')
  const [avgWake, setAvgWake] = useState('')
  const [consistency, setConsistency] = useState<number | null>(null)
  const [range, setRange] = useState('30d')
  const [chartTab, setChartTab] = useState<ChartTab>('hours')

  useEffect(() => { load() }, [range])

  async function load() {
    const days = Math.min(rangeToDays(range), 365)

    // ── Performance: single bulk fetch, build lookup map ──
    const allEntries = await db.dailyEntries.toArray()
    const entryMap = new Map<string, DailyEntry>()
    allEntries.forEach(e => entryMap.set(e.date, e))

    const d: ChartPoint[] = []
    const h7: number[] = []
    const h30: number[] = []
    const beds: number[] = []
    const wakes: number[] = []

    for (let i = days - 1; i >= 0; i--) {
      const dt = daysAgo(i)
      const e = entryMap.get(dt)
      if (e?.sleepHours) {
        const pt: ChartPoint = { label: shortDate(dt), hours: e.sleepHours }

        if (e.sleepBedtime) {
          pt.bedtime = bedtimeToChartVal(e.sleepBedtime)
          pt.bedLabel = e.sleepBedtime
          beds.push(pt.bedtime)
        }
        if (e.sleepWakeTime) {
          pt.wake = wakeToChartVal(e.sleepWakeTime)
          pt.wakeLabel = e.sleepWakeTime
          wakes.push(pt.wake)
        }

        d.push(pt)
        if (i < 7) h7.push(e.sleepHours)
        if (i < 30) h30.push(e.sleepHours)
      }
    }

    setData(d)
    setAvg7h(h7.length ? Math.round((h7.reduce((a, b) => a + b, 0) / h7.length) * 10) / 10 : 0)
    setAvg30h(h30.length ? Math.round((h30.reduce((a, b) => a + b, 0) / h30.length) * 10) / 10 : 0)

    if (beds.length > 0) {
      const avgB = beds.reduce((a, b) => a + b, 0) / beds.length
      setAvgBed(chartValToLabel(avgB))
    } else setAvgBed('')

    if (wakes.length > 0) {
      const avgW = wakes.reduce((a, b) => a + b, 0) / wakes.length
      setAvgWake(chartValToLabel(avgW))
    } else setAvgWake('')

    // Consistency score (lower std dev = more consistent, 0-100)
    if (beds.length >= 3 && wakes.length >= 3) {
      const bedMean = beds.reduce((a, b) => a + b, 0) / beds.length
      const bedStd = Math.sqrt(beds.reduce((a, b) => a + (b - bedMean) ** 2, 0) / beds.length)
      const wakeMean = wakes.reduce((a, b) => a + b, 0) / wakes.length
      const wakeStd = Math.sqrt(wakes.reduce((a, b) => a + (b - wakeMean) ** 2, 0) / wakes.length)
      const combinedStd = (bedStd + wakeStd) / 2
      const score = Math.max(0, Math.min(100, Math.round(100 - (combinedStd / 3) * 100)))
      setConsistency(score)
    } else setConsistency(null)
  }

  // ── Derived ──
  const scheduleData = useMemo(() => data.filter(d => d.bedtime != null || d.wake != null), [data])
  const hasSchedule = scheduleData.length > 0
  const hasData = data.length > 0

  const avgHoursForRange = useMemo(() => {
    if (!data.length) return 0
    return Math.round((data.reduce((s, d) => s + d.hours, 0) / data.length) * 10) / 10
  }, [data])

  const consistencyLabel = consistency !== null
    ? consistency >= 80 ? 'Muy estable'
      : consistency >= 60 ? 'Regular'
        : consistency >= 40 ? 'Variable'
          : 'Irregular'
    : null

  // ── Summary chips: keep ONLY 7d + 30d to avoid redundancy ──
  const summaryChips = useMemo(() => {
    const chips: { label: string; value: string; color: string }[] = []
    if (avg7h) chips.push({ label: '7d', value: `${avg7h}h`, color: 'text-indigo-400' })
    if (avg30h) chips.push({ label: '30d', value: `${avg30h}h`, color: 'text-indigo-300' })
    return chips
  }, [avg7h, avg30h])

  // ── Tooltips ──
  const hoursTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-[#1c1c26] border border-white/[0.06] rounded-xl p-3 text-xs text-white">
        <p className="text-white/40 mb-1">{d?.label}</p>
        <p><Moon size={10} className="inline mr-1 text-indigo-400" />{d?.hours}h</p>
      </div>
    )
  }

  const scheduleTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="bg-[#1c1c26] border border-white/[0.06] rounded-xl p-3 text-xs text-white">
        <p className="text-white/40 mb-1">{d?.label}</p>
        <p><Moon size={10} className="inline mr-1 text-indigo-400" />Dormí: {d?.bedLabel || '—'}</p>
        <p><Sun size={10} className="inline mr-1 text-amber-400" />Desperté: {d?.wakeLabel || '—'}</p>
      </div>
    )
  }

  // ── Max ticks for mobile legibility ──
  const maxTicks = data.length > 14 ? 6 : undefined

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* ── Hero header ── */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)]">
            <Moon size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Sueño</h1>
            <p className="text-xs text-white/30 mt-0.5">Promedios, horario y consistencia</p>
          </div>
        </div>
        <div className="flex justify-center md:justify-start">
          <RangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {/* ── Mini summary strip (only 7d/30d) ── */}
      {summaryChips.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 snap-x snap-mandatory">
          {summaryChips.map(chip => (
            <div
              key={chip.label}
              className="flex items-center gap-1.5 bg-surface-200/40 border border-white/[0.04] rounded-full px-3 py-1.5 shrink-0 snap-start"
            >
              <span className="text-[9px] text-white/30 uppercase tracking-wider font-semibold">{chip.label}</span>
              <span className={`text-xs font-bold ${chip.color}`}>{chip.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasData && (
        <Card className="text-center py-12">
          <Moon size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Aún no hay registros de sueño</p>
          <p className="text-xs text-white/15 mt-1">Empieza a registrar tu sueño en el Diario</p>
        </Card>
      )}

      {hasData && (
        <>
          {/* ── Compact KPI grid (2x2 on mobile) ── */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Card hover className="p-3">
              <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Promedio</p>
              <p className="text-xl font-bold">
                {avgHoursForRange}
                <span className="text-xs text-white/25 ml-0.5">h</span>
              </p>
              <p className="text-[10px] text-white/20 mt-0.5">{range}</p>
            </Card>

            {consistency !== null ? (
              <Card hover className="p-3">
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Consistencia</p>
                <p className="text-xl font-bold">
                  {consistency}
                  <span className="text-xs text-white/25 ml-0.5">/100</span>
                </p>
                {consistencyLabel && <p className="text-[10px] text-white/20 mt-0.5">{consistencyLabel}</p>}
              </Card>
            ) : (
              <Card hover className="p-3">
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Consistencia</p>
                <p className="text-xl font-bold text-white/25">—</p>
                <p className="text-[10px] text-white/15 mt-0.5">Faltan datos</p>
              </Card>
            )}

            {avgBed && (
              <Card hover className="p-3">
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Dormir</p>
                <p className="text-xl font-bold font-mono">{avgBed}</p>
              </Card>
            )}

            {avgWake && (
              <Card hover className="p-3">
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-semibold">Despertar</p>
                <p className="text-xl font-bold font-mono">{avgWake}</p>
              </Card>
            )}
          </div>

          {/* ── Charts card (tabs inside header) ── */}
          <Card className="mb-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white/50 truncate">
                  {chartTab === 'hours' ? 'Horas de sueño' : 'Tendencia de horarios'}
                </h3>
                {chartTab === 'hours' && avgHoursForRange > 0 && (
                  <span className="text-[10px] text-indigo-400/70">
                    Prom: {avgHoursForRange}h
                  </span>
                )}
              </div>

              {hasSchedule && (
                <div className="flex bg-surface-200/40 rounded-lg p-0.5 border border-white/[0.04] shrink-0">
                  {(['hours', 'schedule'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setChartTab(tab)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors active:scale-95 ${chartTab === tab
                          ? 'bg-accent/15 text-accent'
                          : 'text-white/30 hover:text-white/50'
                        }`}
                    >
                      {tab === 'hours' ? 'Horas' : 'Horario'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* HOURS */}
            {(chartTab === 'hours' || !hasSchedule) && (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="slG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                    interval={maxTicks ? Math.floor(data.length / maxTicks) : 'preserveStartEnd'}
                  />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
                  <Tooltip content={hoursTooltip} />
                  {avgHoursForRange > 0 && (
                    <ReferenceLine y={avgHoursForRange} stroke="#818cf8" strokeDasharray="4 4" strokeOpacity={0.3} />
                  )}
                  <Area type="monotone" dataKey="hours" stroke="#818cf8" fill="url(#slG)" strokeWidth={2} dot={{ fill: '#818cf8', r: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* SCHEDULE */}
            {chartTab === 'schedule' && hasSchedule && (
              <>
                <div className="mt-2 mb-2 flex gap-4 text-[10px] text-white/30">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Dormir</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Despertar</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={scheduleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                      interval={scheduleData.length > 14 ? Math.floor(scheduleData.length / 6) : 'preserveStartEnd'}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                      tickFormatter={(v: number) => chartValToLabel(v)}
                      domain={[
                        (min: number) => Math.floor(Math.min(min, 18)),
                        (max: number) => Math.ceil(Math.max(max, 30)),
                      ]}
                    />
                    <Tooltip content={scheduleTooltip} />
                    <Line type="monotone" dataKey="bedtime" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3, strokeWidth: 0 }} connectNulls name="Dormir" />
                    <Line type="monotone" dataKey="wake" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24', r: 3, strokeWidth: 0 }} connectNulls name="Despertar" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-white/15 mt-2 text-center">Líneas más planas = horario más estable</p>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
