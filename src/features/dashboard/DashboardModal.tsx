import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, PenLine, CheckCircle2, ListChecks, BookOpen, Dumbbell, Brain, Smartphone, GraduationCap, Moon, Timer, Droplets, Scale, Smile, Meh, Frown, Laugh, Activity, Bike, Mountain, Footprints, Flame, Trophy, Waves } from 'lucide-react'
import { db } from '@/data/db'
import { useSectionPrefs, SectionId } from '@/context/SectionPrefsContext'
import { formatPace, formatSpeed } from '@/utils/date'
import type * as T from '@/data/types'

const SLEEP_QUALITY: Record<number, { label: string, color: string }> = {
    1: { label: 'Mal', color: 'text-red-400' },
    2: { label: 'Regular', color: 'text-amber-400' },
    3: { label: 'Bien', color: 'text-emerald-400' },
    4: { label: 'Super', color: 'text-indigo-400' }
}

const ACTIVITY_ICONS: Record<string, any> = {
    gym: Dumbbell,
    running: Footprints,
    swimming: Waves,
    cycling: Bike,
    hiking: Mountain,
    walking: Footprints,
    sports: Trophy,
    other: Activity
}

interface DashboardModalProps {
    isOpen: boolean
    onClose: () => void
    date: string
    metric: { id: SectionId; label: string; value: string; navSection?: string } | null
    icon: any
    colorStr: string
}

export function DashboardModal({ isOpen, onClose, date, metric, icon: Icon, colorStr }: DashboardModalProps) {
    const navigate = useNavigate()
    const { advanced } = useSectionPrefs()
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        if (isOpen && metric) loadData()
        else setData(null)
    }, [isOpen, metric, date])

    async function loadData() {
        if (!metric) return
        const id = metric.id

        const entry = await db.dailyEntries.get(date)

        if (id === 'habits') {
            const allH = (await db.habits.toArray()).filter(h => h.active)
            const eh = await db.entryHabits.where('entryDate').equals(date).toArray()
            const cats = await db.habitCategories.toArray()
            setData({ habits: allH, entryHabits: eh, categories: cats, entry })
        }
        else if (id === 'reading') {
            const er = await db.entryReadings.where('entryDate').equals(date).toArray()
            const books = await db.books.toArray()
            setData({ readings: er, books, entry })
        }
        else if (id === 'workout') {
            const ew = await db.entryWorkouts.where('entryDate').equals(date).toArray()
            const rut = await db.routines.toArray()
            setData({ workouts: ew, routines: rut, entry })
        }
        else if (id === 'study') {
            const es = await db.entryStudy.where('entryDate').equals(date).toArray()
            const plat = await db.studyPlatforms.toArray()
            setData({ studies: es, platforms: plat, entry })
        }
        else if (id === 'screentime') {
            const eu = await db.entryAppUsage.where('entryDate').equals(date).toArray()
            const apps = await db.appCatalog.toArray()
            setData({ usages: eu, apps: apps, entry })
        }
        else if (id === 'pomodoro') {
            const poms = await db.pomodoroSessions.where('entryDate').equals(date).toArray()
            setData({ poms, entry })
        }
        else {
            setData({ entry })
        }
    }

    if (!isOpen || !metric) return null

    const isAdv = data?.entry?.advancedOverrides?.[metric.id] ?? advanced[metric.id]
    const valText = metric.value === '--' ? 'Sin registrar' : metric.value
    const CurrentIcon = Icon || CheckCircle2

    function renderContent() {
        if (!data) return <div className="py-10 text-center"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent inset-0 mx-auto rounded-full" /></div>

        if (metric!.id === 'habits') {
            const { habits, entryHabits, categories } = data
            const doneIds = new Set(entryHabits.filter((e: any) => e.done).map((e: any) => e.habitId))
            const doneH = habits.filter((h: any) => doneIds.has(h.id))
            const missedH = habits.filter((h: any) => !doneIds.has(h.id))

            return (
                <div className="text-left space-y-4">
                    {doneH.length > 0 && (
                        <div>
                            <p className="text-[10px] text-accent font-bold uppercase tracking-wider mb-2">Completados</p>
                            <div className="space-y-1">
                                {doneH.map((h: any) => (
                                    <div key={h.id} className="flex items-center gap-2 text-sm bg-accent/5 px-3 py-2 rounded-lg">
                                        <CheckCircle2 size={14} className="text-accent" />
                                        <span>{h.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {missedH.length > 0 && (
                        <div>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2 mt-4">Faltantes</p>
                            <div className="space-y-1">
                                {missedH.map((h: any) => (
                                    <div key={h.id} className="flex items-center gap-2 text-sm bg-white/5 opacity-50 px-3 py-2 rounded-lg">
                                        <div className="w-3.5 h-3.5 rounded-full border border-white/30" />
                                        <span>{h.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {habits.length === 0 && <p className="text-xs text-center text-white/40">No hay hábitos configurados para monitorear.</p>}
                </div>
            )
        }

        if (metric!.id === 'reading') {
            const { readings, books } = data
            if (readings.length === 0) return <p className="text-sm text-center text-white/40 py-4">No hay lecturas registradas.</p>

            return (
                <div className="text-left space-y-3">
                    {readings.map((r: any) => {
                        const b = books.find((x: any) => x.id === r.bookId)
                        return (
                            <div key={r.id} className="bg-surface-200/50 p-3 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <BookOpen size={14} className="text-emerald-400" />
                                    <span className="font-semibold text-sm flex-1">{b?.title || 'Libro desconocido'}</span>
                                    {!isAdv && <span className="text-emerald-400 text-xs">✓ Completado</span>}
                                </div>
                                {isAdv && (
                                    <>
                                        <p className="text-xs text-white/40 mb-2">{r.pagesRead || 0} páginas leídas</p>
                                        {r.note && (
                                            <div className="bg-surface-300/40 p-2 rounded-lg text-xs italic text-white/70 border-l-2 border-emerald-400">
                                                "{r.note}"
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            )
        }

        if (metric!.id === 'workout') {
            const { workouts, routines, entry } = data

            if (!isAdv) {
                if (!entry?.workoutDone) return <p className="text-sm text-center text-white/40 py-4">Sin registro básico.</p>
                return (
                    <div className="bg-orange-400/10 p-4 rounded-xl flex items-center justify-center gap-3">
                        <CheckCircle2 size={24} className="text-orange-400" />
                        <span className="font-semibold text-orange-400">Actividad realizada</span>
                    </div>
                )
            }

            if (workouts.length === 0) return <p className="text-sm text-center text-white/40 py-4">No hay actividades registradas.</p>

            return (
                <div className="text-left space-y-3">
                    {workouts.map((w: any) => {
                        const isGym = !w.type || w.type === 'gym'
                        const ActIcon = ACTIVITY_ICONS[w.type || 'gym'] || Dumbbell

                        if (!isGym) {
                            return (
                                <div key={w.id} className="bg-surface-200/50 p-3 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                        <ActIcon size={14} className="text-orange-400" />
                                        <span className="font-semibold text-sm">{w.title || 'Actividad'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {w.distanceKm !== undefined && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Distancia</p><p>{w.distanceKm} km</p></div>}
                                        {w.durationMin !== undefined && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Duración</p><p>{w.durationMin} min</p></div>}
                                        {(w.distanceKm !== undefined && w.durationMin !== undefined) && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Ritmo</p><p>{formatPace(w.distanceKm, w.durationMin)} /km</p></div>}
                                        {(w.distanceKm !== undefined && w.durationMin !== undefined) && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Velocidad</p><p>{formatSpeed(w.distanceKm, w.durationMin)}</p></div>}
                                        {w.heartRate !== undefined && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Cardio</p><p>{w.heartRate} bpm</p></div>}
                                        {w.laps !== undefined && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Vueltas</p><p>{w.laps}</p></div>}
                                        {w.elevationGain !== undefined && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Desnivel</p><p>{w.elevationGain} m</p></div>}
                                        {w.maxAltitude !== undefined && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Altitud</p><p>{w.maxAltitude} m</p></div>}
                                        {w.steps !== undefined && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Pasos</p><p>{w.steps}</p></div>}
                                        {w.sportType && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Deporte</p><p className="truncate">{w.sportType}</p></div>}
                                        {w.intensity && <div className="bg-surface-300/30 p-2 rounded"><p className="text-[9px] text-white/40 uppercase">Intensidad</p><p>{w.intensity}</p></div>}
                                    </div>
                                    {w.notes && (
                                        <div className="mt-2 bg-surface-300/40 p-2 rounded-lg text-xs italic text-white/70 border-l-2 border-orange-400 line-clamp-3">
                                            {w.notes}
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        // Legacy Gym Rutina Block
                        const r = routines.find((x: any) => x.id === w.routineId)
                        return (
                            <div key={w.id} className="bg-surface-200/50 p-3 rounded-xl">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                    <Dumbbell size={14} className="text-orange-400" />
                                    <span className="font-semibold text-sm">{r?.name || 'Rutina Gimnasio'}</span>
                                </div>
                                <div className="space-y-3">
                                    {w.exercises?.map((ex: any, i: number) => (
                                        <div key={i}>
                                            <span className="text-xs text-white/60 mb-1 inline-block">{ex.exerciseName}</span>
                                            <div className="space-y-1">
                                                {ex.sets.map((set: any, j: number) => (
                                                    <div key={j} className="flex items-center gap-4 text-[10px] ml-2">
                                                        <span className="text-white/30 font-mono w-4">{j + 1}.</span>
                                                        <span className="w-16 text-center bg-surface-300/30 rounded px-1">{set.reps || 0} reps</span>
                                                        <span className="w-16 text-center bg-surface-300/30 rounded px-1">{set.weight ? `${set.weight}kg` : '-'}</span>
                                                        <span className="w-16 text-center bg-surface-300/30 rounded px-1">{set.rpe ? `RPE ${set.rpe}` : '-'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        if (metric!.id === 'sleep') {
            const { entry } = data
            if (!isAdv) {
                if (!entry?.sleepQuality) return <p className="text-sm text-center text-white/40 py-4">Sin registro de calidad.</p>
                const qs = SLEEP_QUALITY[entry.sleepQuality]
                return (
                    <div className="flex flex-col items-center py-4">
                        <span className={`text-4xl mb-2 ${qs?.color}`}>
                            {entry.sleepQuality === 1 && <Frown size={48} />}
                            {entry.sleepQuality === 2 && <Meh size={48} />}
                            {entry.sleepQuality === 3 && <Smile size={48} />}
                            {entry.sleepQuality === 4 && <Laugh size={48} />}
                        </span>
                        <span className="font-semibold">{qs?.label}</span>
                    </div>
                )
            } else {
                if (!entry?.sleepHours) return <p className="text-sm text-center text-white/40 py-4">Sin horas de sueño registradas.</p>
                return (
                    <div className="flex justify-center gap-6 py-2">
                        <div className="text-center">
                            <p className="text-[10px] text-white/40 uppercase mb-1">Dormír</p>
                            <p className="font-semibold">{entry.sleepBedtime || '--:--'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-white/40 uppercase mb-1">Despertar</p>
                            <p className="font-semibold">{entry.sleepWakeTime || '--:--'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-accent uppercase mb-1">Total</p>
                            <p className="font-semibold text-accent">{entry.sleepHours}h</p>
                        </div>
                    </div>
                )
            }
        }

        if (metric!.id === 'screentime') {
            const { usages, apps } = data
            if (usages.length === 0) return <p className="text-sm text-center text-white/40 py-4">No hay desglose de apps.</p>
            const sorted = [...usages].sort((a: any, b: any) => b.minutes - a.minutes)
            return (
                <div className="text-left space-y-2">
                    {sorted.map((u: any, i: number) => {
                        const app = apps.find((x: any) => x.id === u.appId)
                        return (
                            <div key={u.id} className="flex items-center gap-3 bg-surface-200/50 p-2 rounded-xl">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-surface-300/50 text-white/40'}`}>{i + 1}</span>
                                <span className="text-base">{app?.icon || '📱'}</span>
                                <span className="text-xs font-medium flex-1 truncate">{app?.name}</span>
                                <span className="text-xs font-mono text-pink-400">{Math.floor(u.minutes / 60)}h {u.minutes % 60}m</span>
                            </div>
                        )
                    })}
                </div>
            )
        }

        if (metric!.id === 'study') {
            const { studies, platforms, entry } = data
            if (!isAdv) {
                if (!studies.length) return <p className="text-sm text-center text-white/40 py-4">Sin registro básico.</p>
                return (
                    <div className="bg-blue-400/10 p-4 rounded-xl flex items-center justify-center gap-3">
                        <CheckCircle2 size={24} className="text-blue-400" />
                        <span className="font-semibold text-blue-400">Estudio realizado</span>
                    </div>
                )
            }

            if (studies.length === 0) return <p className="text-sm text-center text-white/40 py-4">No hay sesiones de estudio.</p>
            return (
                <div className="text-left space-y-3">
                    {studies.map((s: any) => {
                        const p = platforms.find((x: any) => x.id === s.platformId)
                        return (
                            <div key={s.id} className="bg-surface-200/50 p-3 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-blue-400 line-clamp-1">{s.topic || 'Sin tema'}</span>
                                    <span className="text-[10px] font-mono opacity-60 bg-surface-300/50 px-2 py-0.5 rounded">{s.minutes} min</span>
                                </div>
                                {(p || s.course) && (
                                    <p className="text-[10px] text-white/40 mb-2">
                                        {p && <span>{p.icon} {p.name}</span>}
                                        {p && s.course && <span className="mx-1">•</span>}
                                        {s.course && <span>{s.course}</span>}
                                    </p>
                                )}
                                {s.note && (
                                    <div className="bg-surface-300/40 p-2 rounded-lg text-xs italic text-white/70 border-l-2 border-blue-400 line-clamp-3">
                                        {s.note}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )
        }

        // Default / Just show the generic card value as it has no extra deep fields
        return null
    }

    const content = renderContent()

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 backdrop-blur-sm bg-black/60"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-sm max-h-[85vh] flex flex-col bg-surface-100 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="shrink-0 p-5 flex flex-col items-center relative border-b border-white/[0.04]">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-200/50 text-white/40 hover:text-white/80 transition-colors"
                            title="Cerrar"
                        >
                            <X size={16} />
                        </button>
                        <div className={`w-14 h-14 rounded-2xl bg-surface-300/60 flex items-center justify-center mb-3 ${colorStr}`}>
                            <CurrentIcon size={28} />
                        </div>
                        <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{metric.label}</h3>
                        <p className="text-3xl font-bold">{valText}</p>
                    </div>

                    {/* Scrolling Body */}
                    {content && (
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {content}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="p-4 shrink-0 border-t border-white/[0.04] bg-surface-100">
                        <button
                            onClick={() => {
                                onClose()
                                navigate(`/daylog/${date}?focus=${metric.navSection || metric.id}`)
                            }}
                            className="w-full py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent font-semibold flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all"
                        >
                            <PenLine size={16} /> Editar en el Diario
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
