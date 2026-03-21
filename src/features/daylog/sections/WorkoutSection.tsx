import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Dumbbell, Activity, Bike, Mountain,
  Footprints, Trophy, Waves, Zap, ChevronDown,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ModeToggle } from '@/components/ui/ModeToggle'
import { DoneToggle } from '@/components/ui/DoneToggle'
import { FocusNote } from '@/components/ui/FocusNote'
import { PremiumSelect } from '@/components/ui/PremiumSelect'
import { formatPace, formatSpeed } from '@/utils/date'
import type * as T from '@/data/types'
import toast from 'react-hot-toast'

const ACTIVITY_TYPES: { type: T.PhysicalActivityType; label: string; icon: any }[] = [
  { type: 'gym',      label: 'Gym',      icon: Dumbbell   },
  { type: 'running',  label: 'Correr',   icon: Footprints },
  { type: 'swimming', label: 'Nadar',    icon: Waves      },
  { type: 'cycling',  label: 'Bici',     icon: Bike       },
  { type: 'hiking',   label: 'Montaña',  icon: Mountain   },
  { type: 'walking',  label: 'Caminar',  icon: Footprints },
  { type: 'sports',   label: 'Deporte',  icon: Trophy     },
  { type: 'other',    label: 'Otro',     icon: Activity   },
]

const FIELD_ORDER = [
  'distanceKm', 'durationMin', 'pace', 'speed',
  'heartRate', 'laps', 'elevationGain', 'maxAltitude',
  'steps', 'sportType', 'intensity',
] as const

const INTENSITY_OPTIONS = [
  { value: 'Baja',   label: 'Baja',   hint: 'Ritmo suave'        },
  { value: 'Media',  label: 'Media',  hint: 'Esfuerzo moderado'  },
  { value: 'Alta',   label: 'Alta',   hint: 'Exigente'           },
  { value: 'Máxima', label: 'Máxima', hint: 'Tope del día'       },
] as const

interface Props {
  entry: T.DailyEntry
  isAdv: boolean
  isHorizontal: boolean
  entryWorkouts: T.EntryWorkout[]
  routines: T.Routine[]
  activityFields: Record<string, string[]>
  activeSports: T.PhysicalActivityType[]
  workoutDone: boolean
  onToggleAdv: () => void
  onUpdate: (patch: Partial<T.DailyEntry>) => void
  onStartWorkout: (routineId: number) => void
  onStartGeneric: (type: T.PhysicalActivityType, label: string) => void
  onUpdGenericWk: (id: number, patch: Partial<T.EntryWorkout>) => void
  onUpdSet: (wid: number, exIdx: number, setIdx: number, patch: Partial<T.WorkoutSetEntry>) => void
  onAddSet: (wid: number, exIdx: number) => void
  onRmSet: (wid: number, exIdx: number, setIdx: number) => void
  onRmWk: (id: number) => void
}

// ─── Generic activity summary chips ──────────────────────────────────────────
function genericSummary(w: T.EntryWorkout): string {
  const parts: string[] = []
  if (w.distanceKm) parts.push(`${w.distanceKm} km`)
  if (w.durationMin) parts.push(`${w.durationMin} min`)
  if (w.heartRate) parts.push(`${w.heartRate} bpm`)
  if (w.intensity) parts.push(w.intensity)
  return parts.length ? parts.join(' · ') : 'Sin datos'
}

// ─── Collapsible session wrapper ─────────────────────────────────────────────
function SessionCard({
  id, open, onToggle, onRemove, header, children,
}: {
  id: number
  open: boolean
  onToggle: () => void
  onRemove: () => void
  header: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 rounded-2xl border border-white/[0.06] bg-surface-200/40 overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
        >
          {header}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 ml-auto"
          >
            <ChevronDown size={15} className="text-white/30" />
          </motion.div>
        </button>
        <button
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-white/[0.05]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function WorkoutSection({
  entry, isAdv, isHorizontal, entryWorkouts, routines, activityFields, activeSports, workoutDone,
  onToggleAdv, onUpdate, onStartWorkout, onStartGeneric,
  onUpdGenericWk, onUpdSet, onAddSet, onRmSet, onRmWk,
}: Props) {
  const [showGymPicker, setShowGymPicker] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  function toggleExpand(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Auto-expand newly added sessions
  function handleStartWorkout(routineId: number) {
    onStartWorkout(routineId)
    // will be expanded on next render via the new id — handled below
  }

  const activeSportDefs = ACTIVITY_TYPES.filter(act => activeSports.includes(act.type))

  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      <div className="flex items-center justify-between mb-6 px-2 sm:px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-400/15 flex items-center justify-center border border-orange-400/20 shadow-[0_0_15px_rgba(251,146,60,0.15)]">
            <Activity size={20} className="text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Actividad Física</h3>
            <p className="text-[10px] font-bold text-orange-400/60 tracking-widest uppercase">
              {entryWorkouts.length > 0
                ? `${entryWorkouts.length} sesión${entryWorkouts.length !== 1 ? 'es' : ''}`
                : 'Mantén el ritmo'}
            </p>
          </div>
        </div>
        <ModeToggle isAdv={isAdv} onToggle={onToggleAdv} />
      </div>

      {!isAdv ? (
        <div className={`flex-1 flex flex-col px-2 sm:px-4 ${isHorizontal ? 'pb-4' : ''}`}>
          <DoneToggle
            done={workoutDone}
            onToggle={() => onUpdate({ workoutDone: !entry.workoutDone })}
            icon={<Activity size={22} />}
            label="He entrenado hoy"
            color="orange"
            fullCard
          />
        </div>
      ) : (
        <div className={`flex-1 overflow-y-auto disable-scrollbars px-2 sm:px-4 relative ${isHorizontal ? 'pb-4 fade-bottom-mask' : ''}`}>

          {/* ── Sport quickbar — grid fills the row evenly ── */}
          <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: `repeat(${Math.min(activeSportDefs.length, 4)}, 1fr)` }}>
            {activeSportDefs.map(act => (
              <motion.button
                key={act.type}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (act.type === 'gym') {
                    if (routines.length === 1) { handleStartWorkout(routines[0].id!); setExpandedIds(prev => new Set([...prev, -1])) }
                    else if (routines.length > 1) setShowGymPicker(true)
                    else toast('Crea una rutina primero en Actividad Física', { icon: '💪' })
                  } else {
                    onStartGeneric(act.type, act.label)
                  }
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-surface-200/50 hover:bg-surface-200 active:bg-surface-300 text-white/50 hover:text-orange-400 transition-all border border-white/[0.04]"
              >
                <act.icon size={20} />
                <span className="text-[9px] uppercase font-bold tracking-wider">{act.label}</span>
              </motion.button>
            ))}
          </div>

          {/* ── Gym routine picker ── */}
          <AnimatePresence>
            {showGymPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="p-3 bg-surface-200/60 rounded-2xl border border-orange-400/15">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Elige tu rutina</p>
                  <div className="space-y-1.5">
                    {routines.map(r => (
                      <motion.button
                        key={r.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { onStartWorkout(r.id!); setShowGymPicker(false) }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-100/80 hover:bg-orange-400/10 border border-white/[0.04] hover:border-orange-400/20 transition-all text-left"
                      >
                        <Dumbbell size={16} className="text-orange-400 shrink-0" />
                        <span className="text-sm font-semibold">{r.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Logged sessions (collapsible) ── */}
          {entryWorkouts.map(w => {
            const isGym = !w.type || w.type === 'gym'
            const actDef = ACTIVITY_TYPES.find(a => a.type === w.type)
            const ActIcon = actDef?.icon || Dumbbell
            const isOpen = expandedIds.has(w.id!)

            if (!isGym) {
              const snapshotFields: string[] = w.trackedFields ?? activityFields[w.type!] ?? []
              const legacyDataFields = (['distanceKm', 'durationMin', 'heartRate', 'laps', 'maxAltitude', 'elevationGain', 'steps', 'sportType', 'intensity'] as const).filter(f => {
                const val = w[f as keyof T.EntryWorkout]
                return val !== undefined && val !== '' && val !== null
              })
              const fieldSet = new Set([...snapshotFields, ...legacyDataFields])
              const orderedFields = FIELD_ORDER.filter(f => fieldSet.has(f))
              const hasDist = w.distanceKm !== undefined && w.distanceKm > 0
              const hasDur = w.durationMin !== undefined && w.durationMin > 0
              const showDerived = hasDist && hasDur

              return (
                <SessionCard
                  key={w.id}
                  id={w.id!}
                  open={isOpen}
                  onToggle={() => toggleExpand(w.id!)}
                  onRemove={() => onRmWk(w.id!)}
                  header={
                    <>
                      <div className="w-8 h-8 rounded-lg bg-orange-400/15 flex items-center justify-center shrink-0">
                        <ActIcon size={15} className="text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white/85 truncate">{w.title || actDef?.label || 'Actividad'}</p>
                        <p className="text-[10px] text-white/35 truncate">{genericSummary(w)}</p>
                      </div>
                    </>
                  }
                >
                  {/* Title editable */}
                  <input
                    value={w.title || ''}
                    onChange={e => onUpdGenericWk(w.id!, { title: e.target.value })}
                    className="bg-transparent border-none p-0 text-sm font-bold hover:bg-white/5 focus:bg-white/10 rounded-lg px-1 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 w-full min-h-[36px] leading-9 mb-2"
                    placeholder="Título de la sesión"
                  />

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {orderedFields.map(f => {
                      if (f === 'pace') {
                        if (!showDerived) return null
                        return (
                          <div key={f} className="bg-gradient-to-br from-orange-400/[0.08] to-transparent rounded-xl p-3 flex flex-col items-center border border-orange-400/10">
                            <div className="flex items-center gap-1 mb-1">
                              <Zap size={10} className="text-orange-400" />
                              <label className="text-[9px] text-orange-400/70 uppercase font-bold tracking-wider">Ritmo /km</label>
                            </div>
                            <span className="text-base font-bold text-white/90 tabular-nums">{formatPace(w.distanceKm, w.durationMin)}</span>
                          </div>
                        )
                      }
                      if (f === 'speed') {
                        if (!showDerived) return null
                        return (
                          <div key={f} className="bg-gradient-to-br from-orange-400/[0.08] to-transparent rounded-xl p-3 flex flex-col items-center border border-orange-400/10">
                            <div className="flex items-center gap-1 mb-1">
                              <Zap size={10} className="text-orange-400" />
                              <label className="text-[9px] text-orange-400/70 uppercase font-bold tracking-wider">Velocidad</label>
                            </div>
                            <span className="text-base font-bold text-white/90 tabular-nums">{formatSpeed(w.distanceKm, w.durationMin)}</span>
                          </div>
                        )
                      }
                      const fieldMeta: Record<string, { label: string; placeholder: string; type?: string; unit?: string }> = {
                        distanceKm:    { label: 'Distancia',   placeholder: '5.0',  unit: 'km'  },
                        durationMin:   { label: 'Duración',    placeholder: '45',   unit: 'min' },
                        heartRate:     { label: 'Cardio',      placeholder: '130',  unit: 'bpm' },
                        laps:          { label: 'Vueltas',     placeholder: '40'               },
                        elevationGain: { label: 'Desnivel',    placeholder: '300',  unit: 'm'   },
                        maxAltitude:   { label: 'Altitud Máx', placeholder: '2400', unit: 'm'   },
                        steps:         { label: 'Pasos',       placeholder: '6000'             },
                        sportType:     { label: 'Deporte',     placeholder: 'Pádel', type: 'text' },
                      }
                      if (f === 'intensity') {
                        return (
                          <div key={f} className="bg-surface-300/20 rounded-xl p-3 flex flex-col items-center">
                            <label className="text-[9px] text-white/40 uppercase font-bold tracking-wider mb-1.5">Intensidad</label>
                            <PremiumSelect
                              value={w.intensity || ''}
                              onChange={value => onUpdGenericWk(w.id!, { intensity: value || undefined })}
                              options={[...INTENSITY_OPTIONS]}
                              title="Intensidad"
                              placeholder="Nivel"
                              allowClear
                              clearLabel="Sin intensidad"
                              buttonClassName="w-full min-h-[40px] h-10 rounded-lg py-1.5 text-xs text-center bg-transparent"
                            />
                          </div>
                        )
                      }
                      const meta = fieldMeta[f]
                      if (!meta) return null
                      const isText = meta.type === 'text'
                      const val = w[f as keyof T.EntryWorkout]
                      return (
                        <div key={f} className="bg-surface-300/20 rounded-xl p-3 flex flex-col items-center">
                          <label className="text-[9px] text-white/40 uppercase font-bold tracking-wider mb-1.5">
                            {meta.label}{meta.unit ? ` (${meta.unit})` : ''}
                          </label>
                          <input
                            type={isText ? 'text' : 'number'}
                            step={f === 'distanceKm' ? '0.1' : undefined}
                            value={val as any ?? ''}
                            onChange={e => onUpdGenericWk(w.id!, { [f]: isText ? e.target.value : (e.target.value ? parseFloat(e.target.value) : undefined) } as any)}
                            className="input-field w-full text-center text-sm bg-transparent h-10 rounded-lg"
                            placeholder={meta.placeholder}
                          />
                        </div>
                      )
                    })}
                    {showDerived && !orderedFields.includes('pace') && (
                      <div className="bg-gradient-to-br from-orange-400/[0.08] to-transparent rounded-xl p-3 flex flex-col items-center border border-orange-400/10">
                        <div className="flex items-center gap-1 mb-1"><Zap size={10} className="text-orange-400" /><label className="text-[9px] text-orange-400/70 uppercase font-bold tracking-wider">Ritmo /km</label></div>
                        <span className="text-base font-bold text-white/90 tabular-nums">{formatPace(w.distanceKm, w.durationMin)}</span>
                      </div>
                    )}
                    {showDerived && !orderedFields.includes('speed') && (
                      <div className="bg-gradient-to-br from-orange-400/[0.08] to-transparent rounded-xl p-3 flex flex-col items-center border border-orange-400/10">
                        <div className="flex items-center gap-1 mb-1"><Zap size={10} className="text-orange-400" /><label className="text-[9px] text-orange-400/70 uppercase font-bold tracking-wider">Velocidad</label></div>
                        <span className="text-base font-bold text-white/90 tabular-nums">{formatSpeed(w.distanceKm, w.durationMin)}</span>
                      </div>
                    )}
                  </div>
                  <FocusNote value={w.notes || ''} onChange={v => onUpdGenericWk(w.id!, { notes: v })} placeholder="Notas de la actividad..." label="" rows={1} />
                </SessionCard>
              )
            }

            // ── Gym routine card ──
            const routine = routines.find(r => r.id === w.routineId)
            const totalSets = w.exercises?.reduce((sum, ex) => sum + ex.sets.length, 0) ?? 0

            return (
              <SessionCard
                key={w.id}
                id={w.id!}
                open={isOpen}
                onToggle={() => toggleExpand(w.id!)}
                onRemove={() => onRmWk(w.id!)}
                header={
                  <>
                    <div className="w-8 h-8 rounded-lg bg-orange-400/15 flex items-center justify-center shrink-0">
                      <Dumbbell size={15} className="text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-orange-300/90 truncate">{routine?.name || 'Rutina de Gym'}</p>
                      <p className="text-[10px] text-white/35">
                        {w.exercises?.length ?? 0} ejercicio{(w.exercises?.length ?? 0) !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </>
                }
              >
                {w.exercises?.map((ex, exIdx) => (
                  <div key={exIdx} className="mb-4 last:mb-1">
                    <p className="text-xs font-semibold text-white/55 mb-2 pl-0.5">{ex.exerciseName}</p>
                    <div className="grid grid-cols-[1.75rem,1fr,1fr,1fr,2.75rem] gap-1.5 text-[9px] font-semibold text-white/25 uppercase tracking-wide mb-1.5 px-0.5">
                      <span /><span className="text-center">Reps</span><span className="text-center">Kg</span><span className="text-center">RPE</span><span />
                    </div>
                    <div className="space-y-1.5">
                      {ex.sets.map((s, si) => (
                        <div key={si} className="grid grid-cols-[1.75rem,1fr,1fr,1fr,2.75rem] gap-1.5 items-center">
                          <span className="text-[10px] text-white/20 text-center font-mono tabular-nums">{si + 1}</span>
                          <input type="number" inputMode="numeric" min="0" value={s.reps || ''} onChange={e => onUpdSet(w.id!, exIdx, si, { reps: parseInt(e.target.value) || 0 })} className="input-field h-11 px-1 text-center text-sm" />
                          <input type="number" inputMode="decimal" min="0" step="0.5" value={s.weight ?? ''} onChange={e => onUpdSet(w.id!, exIdx, si, { weight: e.target.value ? parseFloat(e.target.value) : undefined })} className="input-field h-11 px-1 text-center text-sm" placeholder="—" />
                          <input type="number" inputMode="numeric" min="1" max="10" value={s.rpe ?? ''} onChange={e => onUpdSet(w.id!, exIdx, si, { rpe: e.target.value ? parseInt(e.target.value) : undefined })} className="input-field h-11 px-1 text-center text-sm" placeholder="—" />
                          <button onClick={() => onRmSet(w.id!, exIdx, si)} aria-label="Eliminar set" className="h-11 w-full flex items-center justify-center rounded-xl text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => onAddSet(w.id!, exIdx)}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-accent/60 hover:text-accent bg-accent/5 hover:bg-accent/10 transition-colors"
                    >
                      <Plus size={13} /> Agregar set
                    </button>
                  </div>
                ))}
              </SessionCard>
            )
          })}
        </div>
      )}
    </Card>
  )
}
