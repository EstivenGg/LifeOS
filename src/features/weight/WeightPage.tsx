import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { Scale, TrendingDown, TrendingUp, Minus, Target, Activity } from 'lucide-react'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { daysAgo, shortDate, today } from '@/utils/date'
import { useWeightUnit } from '@/context/SectionPrefsContext'
import type { DailyEntry } from '@/data/types'

type Pt = { label: string; weight: number; date: string }

const tt = {
  contentStyle: {
    background: '#1c1c26',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
  },
}

function round1(n: number) { return Math.round(n * 10) / 10 }

export function WeightPage() {
  const { unit, kgToDisplay } = useWeightUnit()
  const [data, setData] = useState<Pt[]>([])
  const [cur, setCur] = useState<number | undefined>()
  const [avg, setAvg] = useState(0)
  const [mn, setMn] = useState(0)
  const [mx, setMx] = useState(0)
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [range, setRange] = useState('90d')
  const [weekAvg, setWeekAvg] = useState(0)
  const [monthAvg, setMonthAvg] = useState(0)
  const [totalChange, setTotalChange] = useState(0)

  useEffect(() => { load() }, [range])

  async function load() {
    const days = Math.min(rangeToDays(range), 365)

    const allEntries = await db.dailyEntries.toArray()
    const entryMap = new Map<string, DailyEntry>()
    allEntries.forEach(e => entryMap.set(e.date, e))

    const d: Pt[] = []
    const ws: number[] = []

    for (let i = days - 1; i >= 0; i--) {
      const dt = daysAgo(i)
      const e = entryMap.get(dt)
      if (e?.weightKg) {
        d.push({ label: shortDate(dt), weight: e.weightKg, date: dt })
        ws.push(e.weightKg)
      }
    }
    // Note: ws stores raw kg; display conversion happens at render time

    setData(d)

    if (ws.length) {
      const a = ws.reduce((s, n) => s + n, 0) / ws.length
      setAvg(round1(a))
      setMn(Math.min(...ws))
      setMx(Math.max(...ws))
      setCur(ws[ws.length - 1])
      setTotalChange(round1(ws[ws.length - 1] - ws[0]))

      // Week avg (last 7 entries)
      const w7 = ws.slice(-7)
      setWeekAvg(round1(w7.reduce((s, n) => s + n, 0) / w7.length))

      // Month avg (last 30 entries)
      const m30 = ws.slice(-30)
      setMonthAvg(round1(m30.reduce((s, n) => s + n, 0) / m30.length))

      // Trend
      if (ws.length >= 14) {
        const r7 = ws.slice(-7)
        const p7 = ws.slice(-14, -7)
        const ar = r7.reduce((s, n) => s + n, 0) / 7
        const ap = p7.reduce((s, n) => s + n, 0) / 7
        const diff = ar - ap
        setTrend(diff > 0.3 ? 'up' : diff < -0.3 ? 'down' : 'stable')
      } else {
        setTrend('stable')
      }
    } else {
      setAvg(0); setMn(0); setMx(0); setTrend('stable'); setCur(undefined)
      setWeekAvg(0); setMonthAvg(0); setTotalChange(0)
    }

    const te = entryMap.get(today())
    if (te?.weightKg) setCur(te.weightKg)
  }

  const hasData = data.length > 1

  // Derived display values (converted from kg)
  const displayData = useMemo(() =>
    data.map(pt => ({ ...pt, weight: kgToDisplay(pt.weight) })),
    [data, kgToDisplay]
  )
  const displayCur = cur != null ? kgToDisplay(cur) : undefined
  const displayAvg = avg ? kgToDisplay(avg) : 0
  const displayMn = mn ? kgToDisplay(mn) : 0
  const displayMx = mx ? kgToDisplay(mx) : 0
  const displayWeekAvg = weekAvg ? kgToDisplay(weekAvg) : 0
  const displayMonthAvg = monthAvg ? kgToDisplay(monthAvg) : 0
  const displayTotalChange = totalChange ? Math.round(kgToDisplay(Math.abs(totalChange)) * 10) / 10 * Math.sign(totalChange) : 0

  const deltaFromAvg = useMemo(() => {
    if (displayCur == null || displayAvg === 0) return null
    return round1(displayCur - displayAvg)
  }, [displayCur, displayAvg])

  const TI = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const tc = trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-white/40'

  const maxTicks = data.length > 14 ? 6 : undefined
  const trendLabel = trend === 'up' ? 'Subiendo' : trend === 'down' ? 'Bajando' : 'Estable'

  return (
    <div className="max-w-6xl mx-auto pb-6">
      {/* Header with current weight highlight */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/15 flex items-center justify-center border border-amber-400/20">
            <Scale size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Peso corporal</h1>
            <p className="text-xs text-white/30">Analiza tu progreso y tendencia</p>
          </div>
        </div>
        <div className="mt-3 flex justify-center md:justify-start">
          <RangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {/* Current weight hero */}
      {displayCur != null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5"
        >
          <Card className="!bg-gradient-to-br from-amber-500/8 via-transparent to-transparent border-amber-400/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">Peso actual</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tabular-nums text-white">{displayCur}</span>
                  <span className="text-lg font-bold text-amber-400/50">{unit}</span>
                </div>
                {deltaFromAvg != null && (
                  <span className="text-[11px] text-amber-300/60 mt-1 inline-block">
                    {deltaFromAvg > 0 ? '+' : ''}{deltaFromAvg} {unit} vs promedio
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${trend === 'down' ? 'bg-emerald-500/10' : trend === 'up' ? 'bg-red-500/10' : 'bg-white/5'}`}>
                  <TI size={15} className={tc} />
                  <span className={`text-sm font-semibold ${tc}`}>{trendLabel}</span>
                </div>
                {displayTotalChange !== 0 && data.length > 1 && (
                  <span className="text-[10px] text-white/25">
                    {displayTotalChange > 0 ? '+' : ''}{displayTotalChange} {unit} en el periodo
                  </span>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Prom. semanal', value: displayWeekAvg ? `${displayWeekAvg}` : '—', unit, icon: <Activity size={17} className="text-amber-400/70" />, bg: 'bg-amber-500/8' },
          { label: 'Prom. mensual', value: displayMonthAvg ? `${displayMonthAvg}` : '—', unit, icon: <Target size={17} className="text-amber-400/50" />, bg: 'bg-amber-500/6' },
          { label: 'Prom. periodo', value: displayAvg ? `${displayAvg}` : '—', unit, icon: <Minus size={17} className="text-white/40" />, bg: 'bg-white/5' },
          { label: 'Rango', value: displayMn ? `${displayMn} → ${displayMx}` : '—', icon: <Minus size={17} className="text-white/25" />, bg: 'bg-white/5' },
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
              <p className="text-base font-bold leading-tight">
                {k.value}
                {'unit' in k && k.unit ? <span className="text-[10px] text-white/25 ml-1">{k.unit}</span> : null}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <Card delay={0.15}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/50">Evolución</h3>
          <div className="flex items-center gap-2">
            {data.length > 0 && (
              <span className="text-[10px] text-white/25">{data.length} registros</span>
            )}
            {displayAvg > 0 && (
              <span className="text-[10px] text-amber-300/70 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
                Prom: {displayAvg} {unit}
              </span>
            )}
          </div>
        </div>

        {hasData ? (
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={displayData}>
              <defs>
                <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                interval={maxTicks ? Math.floor(data.length / maxTicks) : 'preserveStartEnd'}
              />
              <YAxis
                domain={[
                  (min: number) => Math.floor(min - 1),
                  (max: number) => Math.ceil(max + 1),
                ]}
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip {...tt} formatter={(v: number | string) => [`${v} ${unit}`, 'Peso']} />

              {displayAvg > 0 && <ReferenceLine y={displayAvg} stroke="rgba(255,255,255,.12)" strokeDasharray="4 4" />}

              <Area
                type="monotone"
                dataKey="weight"
                stroke="#f59e0b"
                fill="url(#wG)"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 2.5 }}
                activeDot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#1c1c26' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-14 text-center">
            <Scale size={34} className="text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Registra tu peso en el DayLog para ver la gráfica</p>
            <p className="text-xs text-white/15 mt-1">Con 2+ registros ya aparece la tendencia</p>
          </div>
        )}
      </Card>
    </div>
  )
}
