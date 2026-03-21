import { motion } from 'framer-motion'
import { Smartphone, RefreshCw, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { isAndroid } from '@/services/screentime'
import type * as T from '@/data/types'

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const RANK = [
  { numBg: 'bg-amber-400/15',  numBorder: 'border-amber-400/30',  numText: 'text-amber-400',   bar: 'from-amber-400/20 to-transparent'  },
  { numBg: 'bg-slate-400/15',  numBorder: 'border-slate-400/30',  numText: 'text-slate-300',   bar: 'from-slate-400/15 to-transparent'  },
  { numBg: 'bg-orange-500/15', numBorder: 'border-orange-500/30', numText: 'text-orange-400',  bar: 'from-orange-500/15 to-transparent' },
]

interface AppRowProps {
  rank: number
  app: T.AppCatalog | undefined
  usage: T.EntryAppUsage
  total: number
}

function AppRow({ rank, app, usage, total }: AppRowProps) {
  const share = total ? (usage.minutes / total) * 100 : 0
  const r = RANK[rank] ?? RANK[2]

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 rounded-[18px] border border-white/[0.06] bg-surface-200/30 overflow-hidden">
      {/* Animated bar fill */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${share}%` }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: rank * 0.12 }}
        className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${r.bar} z-0`}
      />

      {/* Rank badge */}
      <div className={`relative z-10 shrink-0 w-5 h-5 rounded-full ${r.numBg} border ${r.numBorder} flex items-center justify-center`}>
        <span className={`text-[9px] font-black ${r.numText}`}>{rank + 1}</span>
      </div>

      {/* App icon */}
      <span className="relative z-10 text-xl shrink-0 leading-none">{app?.icon || '📱'}</span>

      {/* Name */}
      <span className="relative z-10 flex-1 text-sm font-bold text-white/80 truncate">{app?.name || '—'}</span>

      {/* Time + share */}
      <div className="relative z-10 shrink-0 flex flex-col items-end gap-0.5">
        <span className="text-sm font-black text-white/90 tabular-nums">{fmtTime(usage.minutes)}</span>
        <span className="text-[9px] font-bold text-white/25">{Math.round(share)}%</span>
      </div>
    </div>
  )
}

interface Props {
  entry: T.DailyEntry
  isHorizontal: boolean
  apps: T.AppCatalog[]
  sortedApps: T.EntryAppUsage[]
  importing: boolean
  isToday: boolean
  onImport: () => void
}

export function ScreenTimeSection({ entry, isHorizontal, apps, sortedApps, importing, isToday, onImport }: Props) {
  const totalMins = entry.screenTimeMinutes || 0
  const topApps = sortedApps.slice(0, 3)

  const SyncBtn = isAndroid && isToday ? (
    <button
      onClick={onImport}
      disabled={importing}
      className="flex items-center gap-1.5 px-3 py-2 bg-pink-400/10 hover:bg-pink-400/20 text-pink-400/60 hover:text-pink-400 rounded-xl border border-pink-400/15 transition-all disabled:opacity-50 text-xs font-bold"
    >
      <motion.div
        animate={{ rotate: importing ? 360 : 0 }}
        transition={{ repeat: importing ? Infinity : 0, duration: 1, ease: 'linear' }}
      >
        {importing ? <Loader2 size={13} /> : <RefreshCw size={13} />}
      </motion.div>
      {importing ? 'Importando' : 'Sync'}
    </button>
  ) : null

  if (!isHorizontal) {
    /* ── Vertical ── */
    return (
      <Card className="flex flex-col py-6">
        <div className="flex items-center justify-between mb-6 px-2 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-400/15 flex items-center justify-center border border-pink-400/20 shadow-[0_0_15px_rgba(244,114,182,0.15)]">
              <Smartphone size={20} className="text-pink-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white/90">Pantalla</h3>
              <p className="text-[10px] font-bold text-pink-400/60 tracking-widest uppercase">
                {totalMins > 0 ? `${fmtTime(totalMins)} hoy` : 'Uso de apps'}
              </p>
            </div>
          </div>
          {SyncBtn}
        </div>

        {/* Total time */}
        <div className="flex items-baseline justify-center gap-1 mb-6">
          <span className="text-5xl font-black text-white tabular-nums">{Math.floor(totalMins / 60)}</span>
          <span className="text-lg font-black text-pink-400/50 mr-1">h</span>
          <span className="text-5xl font-black text-white tabular-nums">{totalMins % 60}</span>
          <span className="text-lg font-black text-pink-400/50">m</span>
        </div>

        {/* Top apps */}
        <div className="flex-1 px-2 sm:px-4 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 px-1">Top apps</p>
          {topApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-[20px] border border-white/5 bg-surface-200/20">
              <Smartphone size={26} className="text-white/10 mb-2" />
              <p className="text-xs text-white/25">Sin registro</p>
            </div>
          ) : (
            topApps.map((u, i) => (
              <AppRow key={u.id} rank={i} app={apps.find(a => a.id === u.appId)} usage={u} total={totalMins} />
            ))
          )}
        </div>
      </Card>
    )
  }

  /* ── Horizontal: split layout ── */
  return (
    <Card className="h-full flex flex-col pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2 sm:px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-pink-400/15 flex items-center justify-center border border-pink-400/20">
            <Smartphone size={16} className="text-pink-400" />
          </div>
          <h3 className="text-sm font-bold text-white/70">Pantalla</h3>
        </div>
        {SyncBtn}
      </div>

      {/* Two-column body */}
      <div className="flex-1 flex gap-5 px-2 sm:px-6 min-h-0">

        {/* Left: Big time circle */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-pink-400/15" />
            <div className="absolute inset-2 rounded-full border border-pink-400/5" />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative z-10 flex flex-col items-center">
              {totalMins > 0 ? (
                <>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-4xl font-black text-white tabular-nums">{Math.floor(totalMins / 60)}</span>
                    <span className="text-base font-black text-pink-400/50">h</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-black text-white/70 tabular-nums">{totalMins % 60}</span>
                    <span className="text-xs font-black text-pink-400/40">m</span>
                  </div>
                </>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.35, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Smartphone size={30} className="text-white/20" />
                </motion.div>
              )}
            </div>
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-pink-400/40 mt-2">tiempo total</p>
        </div>

        {/* Right: Top apps */}
        <div className="flex-1 flex flex-col justify-center gap-2 min-h-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 shrink-0">Top apps</p>
          {topApps.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Smartphone size={32} className="text-white/20" />
              </motion.div>
              <p className="text-xs text-white/20">Sin datos de apps</p>
            </div>
          ) : (
            topApps.map((u, i) => (
              <AppRow key={u.id} rank={i} app={apps.find(a => a.id === u.appId)} usage={u} total={totalMins} />
            ))
          )}
        </div>
      </div>
    </Card>
  )
}
