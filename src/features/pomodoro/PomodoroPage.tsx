import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Maximize2, Minimize2, GraduationCap, Briefcase, MoreHorizontal } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { db } from '@/data/db'
import { today, daysAgo, shortDate } from '@/utils/date'
import { Card } from '@/components/ui/Card'
import { showSaved } from '@/utils/toast'

type Phase = 'work' | 'shortBreak' | 'longBreak'
const DUR: Record<Phase, number> = { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 }
const LABELS: Record<Phase, string> = { work: 'Deep Work', shortBreak: 'Descanso', longBreak: 'Descanso largo' }

export function PomodoroPage() {
  const [phase, setPhase] = useState<Phase>('work')
  const [timeLeft, setTimeLeft] = useState(DUR.work)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [count, setCount] = useState(0)
  const [label, setLabel] = useState('')
  const [context, setContext] = useState<'study' | 'work' | 'other'>('work')
  const [focus, setFocus] = useState(false)
  const [weekData, setWeekData] = useState<{ label: string; sessions: number }[]>([])
  const intRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    loadStats()
    return () => { if (intRef.current) clearInterval(intRef.current) }
  }, [])

  async function loadStats() {
    const s = await db.pomodoroSessions.where('entryDate').equals(today()).toArray()
    setDone(s.filter(x => x.completed).length)
    const w: typeof weekData = []
    for (let i = 6; i >= 0; i--) {
      const dt = daysAgo(i)
      const ds = await db.pomodoroSessions.where('entryDate').equals(dt).toArray()
      w.push({ label: shortDate(dt), sessions: ds.filter(x => x.completed).length })
    }
    setWeekData(w)
  }

  useEffect(() => {
    if (running) {
      intRef.current = setInterval(() => {
        setTimeLeft(p => {
          if (p <= 1) {
            clearInterval(intRef.current)
            setRunning(false)
            handleComplete()
            return 0
          }
          return p - 1
        })
      }, 1000)
    } else if (intRef.current) {
      clearInterval(intRef.current)
    }
    return () => { if (intRef.current) clearInterval(intRef.current) }
  }, [running])

  async function handleComplete() {
    // Beep
    try {
      const ctx = new AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 800; g.gain.value = 0.2
      o.start()
      setTimeout(() => { o.stop(); ctx.close() }, 300)
    } catch {}

    if (phase === 'work') {
      await db.pomodoroSessions.add({
        entryDate: today(), startedAt: new Date().toISOString(),
        durationMinutes: 25, completed: true,
        label: label || 'Deep Work', context,
      })
      showSaved(); loadStats()
      const n = count + 1; setCount(n)
      if (n % 4 === 0) { setPhase('longBreak'); setTimeLeft(DUR.longBreak) }
      else { setPhase('shortBreak'); setTimeLeft(DUR.shortBreak) }
    } else {
      setPhase('work'); setTimeLeft(DUR.work)
    }
  }

  function switchP(p: Phase) { setRunning(false); setPhase(p); setTimeLeft(DUR[p]) }

  const mm = Math.floor(timeLeft / 60)
  const ss = timeLeft % 60
  const pct = ((DUR[phase] - timeLeft) / DUR[phase]) * 100
  const circ = 2 * Math.PI * 120
  const pColor = phase === 'work' ? '#f43f5e' : phase === 'shortBreak' ? '#22c55e' : '#38bdf8'
  const tt = { contentStyle: { background: '#1c1c26', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '12px', color: '#fff' } }

  const timerUI = (
    <div className="flex flex-col items-center">
      <div className="relative w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="120" fill="none" stroke="rgba(255,255,255,.03)" strokeWidth="5" />
          <motion.circle cx="130" cy="130" r="120" fill="none" stroke={pColor} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circ}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 0.5 }}
            style={{ filter: `drop-shadow(0 0 10px ${pColor}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-mono font-bold" style={{ color: pColor }}>
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-white/25 mt-1">{LABELS[phase]}</span>
        </div>
      </div>

      {phase === 'work' && !focus && (
        <div className="flex flex-col items-center gap-3 mb-5 w-full max-w-xs">
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="¿En qué trabajas?" className="input-field text-center text-sm w-full" />
          <div className="flex gap-1.5">
            {([['study', GraduationCap, 'Estudio'], ['work', Briefcase, 'Trabajo'], ['other', MoreHorizontal, 'Otro']] as const).map(([v, I, l]) => (
              <button key={v} onClick={() => setContext(v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${context === v ? 'bg-accent/15 text-accent' : 'text-white/25'}`}>
                <I size={12} />{l}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => { setRunning(false); setTimeLeft(DUR[phase]) }} className="btn-ghost p-3 rounded-xl">
          <RotateCcw size={18} />
        </button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setRunning(r => !r)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${running ? 'bg-white/10 text-white' : 'bg-accent text-white glow-accent'}`}>
          {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </motion.button>
        <button onClick={() => setFocus(f => !f)} className="btn-ghost p-3 rounded-xl">
          {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  )

  // Focus mode overlay
  if (focus) return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-xl flex items-center justify-center">
        <div className="text-center">
          {timerUI}
          <div className="mt-6 flex gap-2 justify-center">
            {(['work', 'shortBreak', 'longBreak'] as Phase[]).map(p => (
              <button key={p} onClick={() => switchP(p)}
                className={`px-3 py-1.5 rounded-lg text-xs ${phase === p ? 'bg-surface-200 text-white' : 'text-white/20'}`}>
                {LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pomodoro</h1>

      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {(['work', 'shortBreak', 'longBreak'] as Phase[]).map(p => (
          <button key={p} onClick={() => switchP(p)}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${phase === p ? 'bg-surface-200 text-white border border-white/10' : 'text-white/25'}`}>
            {LABELS[p]}
          </button>
        ))}
      </div>

      <Card className="flex flex-col items-center py-8 mb-6">{timerUI}</Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white/50">Hoy</h3>
          <span className="text-xs text-white/25">{done} completadas</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: Math.max(done, 8) }, (_, i) => (
            <div key={i} className={`w-7 h-1.5 rounded-full ${i < done ? 'bg-rose-400' : 'bg-surface-300'}`} />
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white/50 mb-3">Semana</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} />
            <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} allowDecimals={false} />
            <Tooltip {...tt} />
            <Bar dataKey="sessions" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
