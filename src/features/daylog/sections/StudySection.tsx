import { motion } from 'framer-motion'
import { GraduationCap, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ModeToggle } from '@/components/ui/ModeToggle'
import { DoneToggle } from '@/components/ui/DoneToggle'
import { FocusNote } from '@/components/ui/FocusNote'
import { PremiumSelect } from '@/components/ui/PremiumSelect'
import type * as T from '@/data/types'

interface PlatformOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface Props {
  isAdv: boolean
  isHorizontal: boolean
  entryStudies: T.EntryStudy[]
  platformOptions: PlatformOption[]
  totalStudyMinutes: number
  studyDone: boolean
  onToggleAdv: () => void
  onAdd: () => void
  onAddBasic: () => void
  onUpdate: (id: number, patch: Partial<T.EntryStudy>) => void
  onRemove: (id: number) => void
}

export function StudySection({
  isAdv, isHorizontal, entryStudies, platformOptions,
  totalStudyMinutes, studyDone, onToggleAdv, onAdd, onAddBasic, onUpdate, onRemove,
}: Props) {
  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      <div className="flex items-center justify-between mb-8 px-2 sm:px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-400/15 flex items-center justify-center border border-blue-400/20 shadow-[0_0_15px_rgba(96,165,250,0.15)]">
            <GraduationCap size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Estudio</h3>
            <p className="text-[10px] font-bold text-blue-400/60 tracking-widest uppercase">
              {totalStudyMinutes > 0
                ? `${Math.floor(totalStudyMinutes / 60)}h ${totalStudyMinutes % 60}m de enfoque`
                : 'Registro académico'}
            </p>
          </div>
        </div>
        <ModeToggle isAdv={isAdv} onToggle={onToggleAdv} />
      </div>

      {!isAdv ? (
        <div className={`flex-1 flex flex-col px-2 sm:px-4 ${isHorizontal ? 'pb-4' : ''}`}>
          <DoneToggle
            done={studyDone}
            onToggle={onAddBasic}
            icon={<GraduationCap size={22} />}
            label="He estudiado hoy"
            color="blue"
            fullCard
          />
        </div>
      ) : (
        <div className={`flex-1 overflow-y-auto disable-scrollbars px-2 sm:px-4 relative ${isHorizontal ? 'pb-4 fade-bottom-mask' : ''}`}>
          <div className="space-y-4">
            {entryStudies.map(s => (
              <div key={s.id} className="relative p-5 sm:p-6 bg-surface-200/30 rounded-[28px] border border-white/5 transition-all">
                <div className="flex items-center justify-between mb-5">
                  <input
                    value={s.topic || ''}
                    onChange={e => onUpdate(s.id!, { topic: e.target.value })}
                    placeholder="¿Qué aprendiste hoy?"
                    className="bg-transparent border-none outline-none text-xl font-bold text-white placeholder:text-white/20 w-full"
                  />
                  <button
                    onClick={() => onRemove(s.id!)}
                    className="w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-white/5 text-white/20 hover:bg-red-500/10 hover:text-red-400 transition-colors ml-2"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <PremiumSelect
                    value={s.platformId ?? ''}
                    onChange={value => onUpdate(s.id!, { platformId: value ? Number(value) : undefined })}
                    options={platformOptions}
                    title="Plataforma"
                    placeholder="Plataforma"
                    allowClear
                    clearLabel="Sin plataforma"
                    className="w-full"
                    buttonClassName="h-12 rounded-[16px] text-sm bg-surface-300/40 border-none"
                  />
                  <input
                    value={s.course || ''}
                    onChange={e => onUpdate(s.id!, { course: e.target.value })}
                    placeholder="Curso o Materia"
                    className="input-field h-12 rounded-[16px] text-sm bg-surface-300/40 border-none px-4"
                  />
                </div>

                <div className="flex items-center justify-between w-full bg-surface-300/30 p-2 pl-4 mb-4 rounded-[16px] border border-white/5 shadow-inner">
                  <span className="text-sm font-medium text-white/50">Tiempo dedicado</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={s.minutes || ''}
                      onChange={e => onUpdate(s.id!, { minutes: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="input-field w-20 h-10 bg-surface-300 text-center font-semibold rounded-xl text-white border-none"
                    />
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest pr-2">min</span>
                  </div>
                </div>

                <FocusNote
                  iconMode
                  value={s.note || ''}
                  onChange={v => onUpdate(s.id!, { note: v })}
                  placeholder="Añade apuntes o un resumen de esta sesión..."
                  className="w-full justify-center bg-surface-300/20 py-2.5 rounded-[14px]"
                />
              </div>
            ))}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onAdd}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-[20px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400/80 hover:text-blue-300 font-bold transition-all border border-blue-500/20 shadow-[0_4px_15px_rgba(96,165,250,0.05)]"
            >
              <Plus size={18} strokeWidth={3} />
              Añadir sesión
            </motion.button>
          </div>
        </div>
      )}
    </Card>
  )
}
