import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, Clock, Eye, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MEDIA_CHART_TABS, MEDIA_TOOLTIP_STYLE } from '../constants'
import type {
  MediaChartTab,
  MediaPieDatum,
  MediaRatingDatum,
  MediaStatsSummary,
  MediaTagDatum,
} from '../types'

interface Props {
  totalItems: number
  chartTab: MediaChartTab
  stats: MediaStatsSummary
  statusData: MediaPieDatum[]
  typeData: MediaPieDatum[]
  tagData: MediaTagDatum[]
  ratingData: MediaRatingDatum[]
  accentHex: string
  onChartTabChange: (tab: MediaChartTab) => void
}

export function MediaStatsView({
  totalItems,
  chartTab,
  stats,
  statusData,
  typeData,
  tagData,
  ratingData,
  accentHex,
  onChartTabChange,
}: Props) {
  const statItems = [
    { icon: <Check size={17} className="text-accent" />, bg: 'bg-accent/10', label: 'Terminados', value: String(stats.finished) },
    { icon: <Clock size={17} className="text-emerald-400" />, bg: 'bg-emerald-500/10', label: 'Viendo', value: String(stats.watching) },
    { icon: <Eye size={17} className="text-sky-400" />, bg: 'bg-sky-500/10', label: 'Quiero ver', value: String(stats.wantToWatch) },
    { icon: <Star size={17} className="text-amber-400" />, bg: 'bg-amber-500/10', label: 'Val. media', value: stats.avgRating },
  ]

  return (
    <>
      {/* Stats grid — matches Habits insights pattern */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="glass-card p-3 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{item.label}</p>
              <p className="text-lg font-bold tabular-nums leading-tight font-mono">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart tab selector */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {MEDIA_CHART_TABS.map(tab => {
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChartTabChange(tab.id)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                chartTab === tab.id
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'border-white/10 text-white/35 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <Icon size={11} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Chart card */}
      <Card delay={0.1}>
        {chartTab === 'status' && <StatusChart data={statusData} totalItems={totalItems} />}
        {chartTab === 'type' && <TypeChart data={typeData} />}
        {chartTab === 'tags' && <TagsChart data={tagData} accentHex={accentHex} />}
        {chartTab === 'ratings' && <RatingsChart data={ratingData} />}
      </Card>

      <p className="text-[10px] text-white/20 text-center mt-4">{totalItems} elementos en la colección</p>
    </>
  )
}

function StatusChart({ data, totalItems }: { data: MediaPieDatum[]; totalItems: number }) {
  return (
    <>
      <p className="text-xs text-white/40 mb-4 font-medium">Estado de la colección</p>
      {data.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <PieChart width={190} height={190}>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={54} paddingAngle={3}>
              {data.map((entry, index) => <Cell key={`status-${index}`} fill={entry.color} stroke="transparent" />)}
            </Pie>
            <Tooltip {...MEDIA_TOOLTIP_STYLE} />
          </PieChart>

          <div className="space-y-3">
            {data.map(item => (
              <LegendRow key={item.name} color={item.color} label={item.name} value={item.value} />
            ))}
            <p className="text-[10px] text-white/25 pt-1">
              {totalItems} elemento{totalItems !== 1 ? 's' : ''} en total
            </p>
          </div>
        </div>
      ) : <EmptyChartState message="Sin datos." />}
    </>
  )
}

function TypeChart({ data }: { data: MediaPieDatum[] }) {
  return (
    <>
      <p className="text-xs text-white/40 mb-4 font-medium">Series vs Películas</p>
      {data.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <PieChart width={190} height={190}>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={54} paddingAngle={4}>
              {data.map((entry, index) => <Cell key={`type-${index}`} fill={entry.color} stroke="transparent" />)}
            </Pie>
            <Tooltip {...MEDIA_TOOLTIP_STYLE} />
          </PieChart>

          <div className="space-y-3">
            {data.map(item => (
              <LegendRow key={item.name} color={item.color} label={item.name} value={item.value} />
            ))}
          </div>
        </div>
      ) : <EmptyChartState message="Sin datos." />}
    </>
  )
}

function TagsChart({ data, accentHex }: { data: MediaTagDatum[]; accentHex: string }) {
  return (
    <>
      <p className="text-xs text-white/40 mb-4 font-medium">Tags más frecuentes</p>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
          <BarChart layout="vertical" data={data} margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} width={100} />
            <Tooltip {...MEDIA_TOOLTIP_STYLE} formatter={(value: number | string) => [`${value}`, 'Entradas']} />
            <Bar dataKey="count" fill={accentHex} radius={[0, 4, 4, 0]} name="Entradas" />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChartState message="Sin tags registrados." />}
    </>
  )
}

function RatingsChart({ data }: { data: MediaRatingDatum[] }) {
  return (
    <>
      <p className="text-xs text-white/40 mb-4 font-medium">Distribución de valoraciones</p>
      {data.some(item => item.count > 0) ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.40)' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
            <Tooltip {...MEDIA_TOOLTIP_STYLE} formatter={(value: number | string) => [`${value}`, 'Elementos']} />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Elementos" />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyChartState message="Sin valoraciones." />}
    </>
  )
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-sm font-bold text-white/80 ml-auto pl-4">{value}</span>
    </div>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return <p className="text-xs text-white/25 text-center py-10">{message}</p>
}
