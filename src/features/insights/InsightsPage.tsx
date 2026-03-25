import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import { Moon, BookOpen, Dumbbell, Flame, TrendingUp } from 'lucide-react'
import { db } from '@/data/db'
import { daysAgo, shortDate, fmtMin } from '@/utils/date'
import { Card } from '@/components/ui/Card'
import { RangeSelector, rangeToDays } from '@/components/ui/RangeSelector'
import { useSectionPrefs } from '@/context/SectionPrefsContext'
import { useTheme } from '@/context/ThemeContext'

export function InsightsPage() {
  const { enabled, advanced } = useSectionPrefs()
  const { accentHex } = useTheme()
  const [range, setRange] = useState('30d')
  const [moodData, setMoodData] = useState<any[]>([])
  const [habitData, setHabitData] = useState<any[]>([])
  const [sleepData, setSleepData] = useState<any[]>([])
  const [readData, setReadData] = useState<any[]>([])
  const [streaks, setStreaks] = useState({ habits: 0, reading: 0, sleep: 0, exercise: 0 })
  const [averages, setAverages] = useState({ mood: 0, sleep: 0, sleepQual: 0, habitPct: 0, readDays: 0 })

  useEffect(() => { load() }, [range])

  async function load() {
    const allH = await db.habits.toArray()
    const habits = allH.filter(h => h.active)
    const days = rangeToDays(range)

    const mood: any[] = [], hab: any[] = [], slp: any[] = [], rd: any[] = []
    let moodSum = 0, moodCount = 0, sleepSum = 0, sleepCount = 0, sleepQualSum = 0, sleepQualCount = 0
    let habitDoneSum = 0, habitDays = 0, readDaysCount = 0

    for (let i = Math.min(days, 365) - 1; i >= 0; i--) {
      const dt = daysAgo(i); const lbl = shortDate(dt)
      const e = await db.dailyEntries.get(dt)
      if (e?.mood) { mood.push({ label: lbl, mood: e.mood }); moodSum += e.mood; moodCount++ }
      const dayH = await db.entryHabits.where('entryDate').equals(dt).toArray()
      const done = dayH.filter(h => h.done).length
      hab.push({ label: lbl, done })
      if (habits.length > 0) { habitDoneSum += done; habitDays++ }

      if (e?.sleepHours || e?.sleepQuality) {
        slp.push({ label: lbl, hours: e.sleepHours || 0, quality: e.sleepQuality || 0 })
        if (e.sleepHours) { sleepSum += e.sleepHours; sleepCount++ }
        if (e.sleepQuality) { sleepQualSum += e.sleepQuality; sleepQualCount++ }
      }

      const dayR = await db.entryReadings.where('entryDate').equals(dt).toArray()
      const isReadBasicAndDone = dayR.length > 0
      rd.push({ label: lbl, pages: dayR.reduce((s, r) => s + r.pagesRead, 0), done: isReadBasicAndDone ? 1 : 0 })
      if (isReadBasicAndDone) readDaysCount++
    }

    setMoodData(mood); setHabitData(hab); setSleepData(slp); setReadData(rd)
    setAverages({
      mood: moodCount > 0 ? Math.round((moodSum / moodCount) * 10) / 10 : 0,
      sleep: sleepCount > 0 ? Math.round((sleepSum / sleepCount) * 10) / 10 : 0,
      sleepQual: sleepQualCount > 0 ? Math.round((sleepQualSum / sleepQualCount) * 10) / 10 : 0,
      habitPct: habitDays > 0 && habits.length > 0 ? Math.round((habitDoneSum / (habitDays * habits.length)) * 100) : 0,
      readDays: readDaysCount
    })

    // Streaks
    let hS = 0, rS = 0, sS = 0, eS = 0
    for (let i = 0; i < 365; i++) {
      const dt = daysAgo(i)
      const e = await db.dailyEntries.get(dt)
      const dayH = await db.entryHabits.where('entryDate').equals(dt).toArray()
      const dayR = await db.entryReadings.where('entryDate').equals(dt).toArray()
      const dayW = await db.entryWorkouts.where('entryDate').equals(dt).toArray()
      if (habits.length > 0 && dayH.filter(h => h.done).length === habits.length && hS === i) hS++
      if (dayR.length > 0 && rS === i) rS++
      if ((e?.sleepHours || e?.sleepQuality) && sS === i) sS++
      if ((e?.workoutDone || dayW.length > 0) && eS === i) eS++
    }
    setStreaks({ habits: hS, reading: rS, sleep: sS, exercise: eS })
  }

  const tt = { contentStyle: { background: 'rgb(var(--surface-100))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '12px', color: '#fff' } }

  const streakItems = [
    enabled.habits && { l: 'Habitos', v: streaks.habits, icon: Flame, c: 'text-orange-400', bg: 'bg-orange-400' },
    enabled.reading && { l: 'Lectura', v: streaks.reading, icon: BookOpen, c: 'text-emerald-400', bg: 'bg-emerald-400' },
    enabled.sleep && { l: 'Sueno', v: streaks.sleep, icon: Moon, c: 'text-indigo-400', bg: 'bg-indigo-400' },
    enabled.workout && { l: 'Ejercicio', v: streaks.exercise, icon: Dumbbell, c: 'text-rose-400', bg: 'bg-rose-400' },
  ].filter(Boolean) as { l: string; v: number; icon: any; c: string; bg: string }[]

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.15)]">
            <TrendingUp size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Insights</h1>
            <p className="text-xs text-white/30 mt-0.5">Resumen y tendencias</p>
          </div>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Averages */}
      <div className="grid grid-cols-3 gap-2">
        {averages.mood > 0 && (
          <Card className="p-3 text-center">
            <p className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Mood prom.</p>
            <p className="text-2xl font-bold">{averages.mood}<span className="text-xs text-white/25">/5</span></p>
          </Card>
        )}
        {averages.sleep > 0 && advanced.sleep && (
          <Card className="p-3 text-center">
            <p className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Sueno prom.</p>
            <p className="text-2xl font-bold">{averages.sleep}<span className="text-xs text-white/25">h</span></p>
          </Card>
        )}
        {averages.sleepQual > 0 && !advanced.sleep && (
          <Card className="p-3 text-center">
            <p className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Calidad Sueno</p>
            <p className="text-2xl font-bold">{averages.sleepQual}<span className="text-xs text-white/25">/4</span></p>
          </Card>
        )}
        {averages.readDays > 0 && !advanced.reading && (
          <Card className="p-3 text-center">
            <p className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Dias leidos</p>
            <p className="text-2xl font-bold">{averages.readDays}<span className="text-xs text-white/25">/ {rangeToDays(range)}</span></p>
          </Card>
        )}
        {averages.habitPct > 0 && (
          <Card className="p-3 text-center">
            <p className="text-[9px] text-white/25 uppercase tracking-wide mb-1">Habitos</p>
            <p className="text-2xl font-bold">{averages.habitPct}<span className="text-xs text-white/25">%</span></p>
          </Card>
        )}
      </div>

      {/* Streaks */}
      {streakItems.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {streakItems.map((x, i) => (
            <Card key={x.l} delay={i * .04} className="flex items-center gap-3 p-3">
              <div className={`w-9 h-9 rounded-xl ${x.bg}/10 flex items-center justify-center ${x.c}`}>
                <x.icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 leading-tight">{x.l}</p>
                <p className="text-xl font-bold leading-tight">
                  {x.v}<span className="text-[10px] text-white/20 ml-0.5 font-normal">dias</span>
                </p>
              </div>
              {x.v >= 3 && <Flame size={14} className="text-orange-500/50 ml-auto" />}
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {enabled.mood && moodData.length > 0 && (
          <Card delay={.1}>
            <h3 className="text-xs font-semibold text-white/40 mb-3">Mood</h3>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={moodData}>
                <defs>
                  <linearGradient id="mG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentHex} stopOpacity={.3} />
                    <stop offset="95%" stopColor={accentHex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval="preserveStartEnd" />
                <YAxis domain={[1, 5]} tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Area type="monotone" dataKey="mood" stroke={accentHex} fill="url(#mG)" strokeWidth={2} dot={{ fill: accentHex, r: 1.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
        {enabled.habits && habitData.length > 0 && (
          <Card delay={.15}>
            <h3 className="text-xs font-semibold text-white/40 mb-3">Habitos</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={habitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Bar dataKey="done" fill={accentHex} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
        {enabled.sleep && sleepData.length > 0 && (
          <Card delay={.2}>
            <h3 className="text-xs font-semibold text-white/40 mb-3">Sueno</h3>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={sleepData}>
                <defs>
                  <linearGradient id="sG2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Area type="monotone" dataKey={advanced.sleep ? "hours" : "quality"} stroke="#818cf8" fill="url(#sG2)" strokeWidth={2} dot={{ fill: '#818cf8', r: 1.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
        {enabled.reading && readData.length > 0 && (
          <Card delay={.25}>
            <h3 className="text-xs font-semibold text-white/40 mb-3">Lectura</h3>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={readData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,.2)' }} width={20} />
                <Tooltip {...tt} />
                <Bar dataKey={advanced.reading ? "pages" : "done"} fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  )
}
