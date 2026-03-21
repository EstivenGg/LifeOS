import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, BookOpen, Dumbbell, Moon, Download,
  ListChecks, PenLine, Scale, Timer, Smartphone, TrendingUp,
  GraduationCap, Film, LayoutGrid, X, ClipboardList, Droplet, type LucideIcon,
} from 'lucide-react'
import { ThemeSelector } from '@/components/ui/ThemeSelector'

/* ─── Route catalogue ────────────────────────────────────────────────────── */
const ALL_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard',  end: true  },
  { to: '/daylog',    icon: PenLine,       label: 'Diario',    end: false },
  { to: '/calendar',  icon: CalendarDays,  label: 'Calendario',end: false },
  { to: '/tasks',     icon: ClipboardList, label: 'Tareas',    end: false },
  { to: '/insights',  icon: TrendingUp,    label: 'Insights',  end: false },
  { to: '/habits',    icon: ListChecks,    label: 'Hábitos',   end: false },
  { to: '/books',     icon: BookOpen,      label: 'Lectura',   end: false },
  { to: '/media',     icon: Film,          label: 'Media',     end: false },
  { to: '/workouts',  icon: Dumbbell,      label: 'Entrenos',  end: false },
  { to: '/sleep',     icon: Moon,          label: 'Sueño',     end: false },
  { to: '/study',     icon: GraduationCap, label: 'Estudio',   end: false },
  { to: '/weight',    icon: Scale,         label: 'Peso',      end: false },
  { to: '/pomodoro',  icon: Timer,         label: 'Pomodoro',  end: false },
  { to: '/screentime',icon: Smartphone,    label: 'Pantalla',  end: false },
  { to: '/export',    icon: Download,      label: 'Exportar',  end: false },
] as const

/** Quick-access tabs: Dashboard · Diario · FAB · Calendario · Insights */
const QUICK = [ALL_NAV[0], ALL_NAV[1], ALL_NAV[2], ALL_NAV[3]] as const

/* ─── Z-index hierarchy ──────────────────────────────────────────────────── *
 *  Carousel dock  : z-[60]
 *  Menu backdrop  : z-[65]   ← must be above dock
 *  Menu sheet     : z-[68]   ← above backdrop
 *  Bottom nav bar : z-[70]   ← always on top
 * ────────────────────────────────────────────────────────────────────────── */

/* ─── Single quick-access tab ────────────────────────────────────────────── */
interface TabProps { to: string; icon: LucideIcon; label: string; end: boolean }

function Tab({ to, icon: Icon, label, end }: TabProps) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className="flex-1 flex flex-col items-center justify-end pb-2 gap-[3px] min-h-[56px] focus-visible:outline-none"
    >
      {({ isActive }) => (
        <>
          <motion.div
            animate={{ y: isActive ? -2 : 0, scale: isActive ? 1.13 : 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className={`w-9 h-[26px] flex items-center justify-center rounded-xl transition-colors duration-150 ${isActive ? 'bg-accent/20' : ''}`}
          >
            <Icon size={20} className={`transition-colors duration-150 ${isActive ? 'text-accent' : 'text-white/30'}`} />
          </motion.div>
          <span className={`text-[9px] font-semibold leading-none tracking-wide transition-colors duration-150 ${isActive ? 'text-accent' : 'text-white/25'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

const PANEL_SPRING = { type: 'spring', stiffness: 380, damping: 40, mass: 0.85 } as const

/* ─── Main component ─────────────────────────────────────────────────────── */
export function MobileBottomNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      {/* ── Backdrop — z-[65] sits above carousel dock (z-[60]) ─────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={close}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Bottom sheet — z-[68] ────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={PANEL_SPRING}
            role="dialog"
            aria-modal="true"
            aria-label="Todas las secciones"
            className="fixed inset-x-0 bottom-0 z-[68] md:hidden"
          >
            <div className="bg-surface-100/98 backdrop-blur-2xl rounded-t-[32px] border-t border-white/[0.08] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] overflow-hidden">

              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
                <div className="w-10 h-[3px] rounded-full bg-white/12" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-1 pb-3">
                <h2 className="text-sm font-black text-white/60 tracking-widest uppercase">Secciones</h2>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={close}
                  className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.06] flex items-center justify-center text-white/35 hover:text-white/60 transition-colors"
                >
                  <X size={15} strokeWidth={2.5} />
                </motion.button>
              </div>

              {/* Nav grid */}
              <nav aria-label="Navegacion completa" className="grid grid-cols-4 gap-1.5 px-3 pb-3">
                {ALL_NAV.map((item, i) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={close}
                    aria-label={item.label}
                    className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    {({ isActive }) => (
                      <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 480, damping: 32, delay: i * 0.018 }}
                        className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-colors duration-150 ${
                          isActive ? '' : 'active:bg-surface-200/60'
                        }`}
                      >
                        {/* Icon container */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                          isActive
                            ? 'bg-accent/20 shadow-[0_0_18px_rgb(var(--accent)/0.25)]'
                            : 'bg-surface-200/60 border border-white/[0.05]'
                        }`}>
                          <item.icon
                            size={22}
                            className={`transition-colors duration-150 ${isActive ? 'text-accent' : 'text-white/40'}`}
                          />
                        </div>

                        {/* Label */}
                        <span className={`text-[10px] font-semibold leading-tight text-center transition-colors duration-150 ${
                          isActive ? 'text-accent' : 'text-white/40'
                        }`}>
                          {item.label}
                        </span>

                        {/* Active dot */}
                        {isActive && (
                          <motion.div
                            layoutId="sheet-dot"
                            className="w-1 h-1 rounded-full bg-accent"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.div>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Theme selector */}
              <div
                className="px-5 pt-3 pb-3 border-t border-white/[0.05] flex flex-col items-center gap-2.5"
                style={{ paddingBottom: 'calc(72px + max(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)), 8px))' }}
              >
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.15em]">Tema de color</p>
                <ThemeSelector />
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom nav bar — z-[70] always on top ────────────────────────── */}
      <nav
        aria-label="Navegacion principal"
        className="fixed bottom-0 inset-x-0 z-[70] md:hidden"
      >
        <div
          className="relative bg-surface-50/95 backdrop-blur-xl border-t border-white/[0.06]"
          style={{ paddingBottom: 'max(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)), 6px)' }}
        >
          <div className="flex items-end h-[58px] px-1 max-w-md mx-auto">

            {/* Left 2 tabs */}
            <Tab {...QUICK[0]} />
            <Tab {...QUICK[1]} />

            {/* Center FAB */}
            <div className="flex-none w-[72px] flex justify-center items-center relative">
              <motion.button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={open ? 'Cerrar menu' : 'Abrir todas las secciones'}
                className="absolute -top-[22px] w-[52px] h-[52px] rounded-[16px] bg-accent flex items-center justify-center shadow-xl shadow-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50 focus-visible:outline-offset-2"
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 600, damping: 25 }}
              >
                <span
                  className="absolute inset-0 rounded-[16px] pointer-events-none"
                  style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, transparent 55%)' }}
                />
                <AnimatePresence mode="wait" initial={false}>
                  {open ? (
                    <motion.span
                      key="x"
                      initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                      className="relative z-10"
                    >
                      <X size={21} className="text-white" strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="grid"
                      initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                      className="relative z-10"
                    >
                      <LayoutGrid size={21} className="text-white" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Right 2 tabs */}
            <Tab {...QUICK[2]} />
            <Tab {...QUICK[3]} />

          </div>
        </div>
      </nav>
    </>
  )
}
