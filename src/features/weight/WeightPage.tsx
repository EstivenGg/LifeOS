import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { db } from '@/data/db'
import { Card } from '@/components/ui/Card'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { daysAgo, shortDate, today } from '@/utils/date'
import { showSaved } from '@/utils/toast'
import type { DailyEntry } from '@/data/types'

type Pt = { label: string; weight: number }

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
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }

export function WeightPage() {
  const [data, setData] = useState<Pt[]>([])
  const [cur, setCur] = useState<number | undefined>()
  const [avg, setAvg] = useState(0)
  const [mn, setMn] = useState(0)
  const [mx, setMx] = useState(0)
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable')
  const [range, setRange] = useState('90d')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [range])

  async function load() {
    const days = Math.min(rangeToDays(range), 365)

    // Perf: single bulk fetch + map (igual que Sleep)
    const allEntries = await db.dailyEntries.toArray()
    const entryMap = new Map<string, DailyEntry>()
    allEntries.forEach(e => entryMap.set(e.date, e))

    const d: Pt[] = []
    const ws: number[] = []

    for (let i = days - 1; i >= 0; i--) {
      const dt = daysAgo(i)
      const e = entryMap.get(dt)
      if (e?.weightKg) {
        d.push({ label: shortDate(dt), weight: e.weightKg })
        ws.push(e.weightKg)
      }
    }

    setData(d)

    if (ws.length) {
      const a = ws.reduce((s, n) => s + n, 0) / ws.length
      setAvg(round1(a))
      setMn(Math.min(...ws))
      setMx(Math.max(...ws))
      setCur(ws[ws.length - 1])

      // Trend: promedio últimos 7 vs previos 7 (si hay 14)
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
    }

    const te = entryMap.get(today())
    if (te?.weightKg) setCur(te.weightKg)
  }

  async function saveW(vRaw: number) {
    const v = round1(clamp(vRaw, 20, 300))
    setCur(v)
    setSaving(true)

    const d = today()
    const ex = await db.dailyEntries.get(d)
    if (ex) await db.dailyEntries.update(d, { weightKg: v })
    else await db.dailyEntries.put({ date: d, weightKg: v })

    setSaving(false)
    showSaved()
    load()
  }

  const hasData = data.length > 1
  const deltaFromAvg = useMemo(() => {
    if (cur == null || avg === 0) return null
    return round1(cur - avg)
  }, [cur, avg])

  const TI = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const tc = trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-white/40'

  // Mobile-friendly ticks
  const maxTicks = data.length > 14 ? 6 : undefined

  const trendLabel = trend === 'up' ? 'Subiendo' : trend === 'down' ? 'Bajando' : 'Estable'
  const deltaPill = deltaFromAvg != null
    ? `${deltaFromAvg > 0 ? '+' : ''}${deltaFromAvg} kg vs prom`
    : null

  return (
    <div className="max-w-6xl mx-auto pb-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold">Peso corporal</h1>
        <p className="text-xs text-white/30 mt-0.5">Registro, promedios y tendencia</p>
        <div className="mt-3 flex justify-center md:justify-start">
          <RangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {/* Registrar hoy (más compacto + feedback) */}
      <Card className="mb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-white/50">Registrar hoy</h3>
          {saving && (
            <span className="text-[10px] text-white/30 bg-surface-200/40 px-2 py-0.5 rounded-full">
              Guardando…
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Scale size={18} className="text-amber-400" />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min={20}
              max={300}
              value={cur ?? ''}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v > 0) saveW(v)
              }}
              placeholder="72.5"
              className="input-field w-28 text-lg font-mono text-center"
            />
            <span className="text-sm text-white/30">kg</span>
          </div>

          {deltaPill && (
            <span className="ml-auto text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {deltaPill}
            </span>
          )}
        </div>
      </Card>

      {/* KPIs — estilo tipo “Books/Media” (más compactos) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Actual', value: cur != null ? `${cur}` : '—', unit: 'kg', icon: <Scale size={17} className="text-amber-400" />, bg: 'bg-amber-500/10' },
          { label: 'Promedio', value: avg ? `${avg}` : '—', unit: 'kg', icon: <Minus size={17} className="text-white/40" />, bg: 'bg-white/5' },
          { label: 'Rango', value: mn ? `${mn} → ${mx}` : '—', icon: <Minus size={17} className="text-white/25" />, bg: 'bg-white/5' },
          { label: 'Tendencia', value: trendLabel, icon: <TI size={17} className={tc} />, bg: trend === 'down' ? 'bg-emerald-500/10' : trend === 'up' ? 'bg-red-500/10' : 'bg-white/5', valueClass: tc },
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
              <p className={`text-base font-bold leading-tight ${k.valueClass || ''}`}>
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
          {avg > 0 && (
            <span className="text-[10px] text-amber-300/70 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
              Prom: {avg}kg
            </span>
          )}
        </div>

        {hasData ? (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={data}>
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
              <Tooltip {...tt} formatter={(v: number | string) => [`${v} kg`, 'Peso']} />

              {avg > 0 && <ReferenceLine y={avg} stroke="rgba(255,255,255,.12)" strokeDasharray="4 4" />}

              <Area
                type="monotone"
                dataKey="weight"
                stroke="#f59e0b"
                fill="url(#wG)"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 2.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-14 text-center">
            <Scale size={34} className="text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">Registra tu peso para ver la gráfica</p>
            <p className="text-xs text-white/15 mt-1">Con 2+ registros ya aparece la tendencia</p>
          </div>
        )}
      </Card>
    </div>
  )
}