import { memo, useCallback, useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Info, ToggleLeft, ToggleRight } from 'lucide-react'
import { Modal } from './Modal'
import { SECTION_DEFS, SectionId, useSectionPrefs, useWeightUnit } from '@/context/SectionPrefsContext'

interface Props {
  open: boolean
  onClose: () => void
}

/* ─── Pre-built lookup map (avoids .find() per row per render) ───────────── */
const SECTION_MAP = Object.fromEntries(SECTION_DEFS.map(d => [d.id, d])) as Record<SectionId, typeof SECTION_DEFS[number]>

const ICON_COLOR: Record<SectionId, string> = {
  mood: 'text-yellow-400',
  habits: 'text-accent',
  sleep: 'text-indigo-400',
  water: 'text-sky-400',
  screentime: 'text-pink-400',
  study: 'text-blue-400',
  reading: 'text-emerald-400',
  workout: 'text-orange-400',
  pomodoro: 'text-rose-400',
  meditation: 'text-violet-400',
  weight: 'text-amber-400',
}

interface RowProps {
  id: SectionId
  enabled: boolean
  isAdvanced: boolean
  hasAdvanced: boolean
  onToggle: () => void
  onToggleAdvanced: () => void
}

const SortableSectionRow = memo(function SortableSectionRow({ id, enabled, isAdvanced, hasAdvanced, onToggle, onToggleAdvanced }: RowProps) {
  const def = SECTION_MAP[id]
  const Icon = def.icon
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2.5 py-2.5 rounded-xl ${
        enabled ? 'bg-surface-200/50' : 'bg-surface-200/20 opacity-50'
      } ${isDragging ? 'ring-1 ring-accent/40 z-10' : ''}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="p-1 text-white/25 shrink-0 cursor-grab active:cursor-grabbing"
        aria-label={`Mover ${def.label}`}
        style={{ touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      {/* Icon */}
      <div className={`w-7 h-7 rounded-lg bg-surface-300/60 flex items-center justify-center shrink-0 ${ICON_COLOR[id]}`}>
        <Icon size={14} />
      </div>

      {/* Label + advanced tag */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium leading-tight">{def.label}</p>
          {!def.daylog && (
            <span className="text-[8px] bg-surface-300/80 text-white/30 px-1.5 py-0.5 rounded-full leading-none">Solo dashboard</span>
          )}
        </div>
        {/* Advanced mode toggle inline */}
        {hasAdvanced && enabled && (
          <button
            type="button"
            onClick={onToggleAdvanced}
            className="flex items-center gap-1 mt-0.5 group"
          >
            {isAdvanced ? (
              <ToggleRight size={14} className="text-accent" />
            ) : (
              <ToggleLeft size={14} className="text-white/25 group-hover:text-white/40" />
            )}
            <span className={`text-[10px] leading-none ${isAdvanced ? 'text-accent/70' : 'text-white/25 group-hover:text-white/40'}`}>
              {isAdvanced ? 'Avanzado' : 'Basico'}
            </span>
          </button>
        )}
      </div>

      {/* Enable/disable toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${enabled ? 'bg-accent' : 'bg-white/10'}`}
        aria-label={enabled ? `Desactivar ${def.label}` : `Activar ${def.label}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150 ${enabled ? 'left-5' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
})

export function SectionPrefsModal({ open, onClose }: Props) {
  const { enabled, advanced, dashboardOrder, toggle, toggleAdvanced, setDashboardOrder } = useSectionPrefs()
  const { unit, setUnit } = useWeightUnit()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = dashboardOrder.indexOf(active.id as SectionId)
    const newIndex = dashboardOrder.indexOf(over.id as SectionId)
    if (oldIndex < 0 || newIndex < 0) return

    setDashboardOrder(arrayMove(dashboardOrder, oldIndex, newIndex) as SectionId[])
  }, [dashboardOrder, setDashboardOrder])

  // Stable callbacks per section — avoids new arrow fn per row per render
  const toggleHandlers = useMemo(() =>
    Object.fromEntries(dashboardOrder.map(id => [id, {
      onToggle: () => toggle(id),
      onToggleAdvanced: () => toggleAdvanced(id),
    }])) as Record<SectionId, { onToggle: () => void; onToggleAdvanced: () => void }>,
    [dashboardOrder, toggle, toggleAdvanced]
  )

  return (
    <Modal open={open} onClose={onClose} title="Personalizar secciones">
      <div className="flex items-start gap-2 p-3 bg-accent/5 rounded-xl mb-4 text-xs text-white/50">
        <Info size={13} className="text-accent/60 shrink-0 mt-0.5" />
        <span>
          Arrastra para reordenar. Desactivar <strong className="text-white/70">no borra datos</strong>.
          Las secciones con modo avanzado muestran info detallada.
        </span>
      </div>

      <div className="flex items-center justify-between px-1 mb-4">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Unidad de peso</span>
        <div className="flex bg-surface-200/50 rounded-xl p-0.5 border border-white/[0.04]">
          {(['kg', 'lbs'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                unit === u ? 'bg-accent/20 text-accent' : 'text-white/30 hover:text-white/60'
              }`}
            >{u}</button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={dashboardOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {dashboardOrder.map(id => (
              <SortableSectionRow
                key={id}
                id={id}
                enabled={enabled[id]}
                isAdvanced={advanced[id]}
                hasAdvanced={SECTION_MAP[id].hasAdvanced}
                onToggle={toggleHandlers[id].onToggle}
                onToggleAdvanced={toggleHandlers[id].onToggleAdvanced}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Modal>
  )
}
