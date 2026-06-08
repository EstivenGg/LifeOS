import { useState, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, BookOpen, Dumbbell, Moon, Download,
  ListChecks, PenLine, Scale, Timer, Smartphone, TrendingUp,
  GraduationCap, Film, LayoutGrid, X, ClipboardList, type LucideIcon,
} from 'lucide-react'
import { ThemeSelector } from '@/components/ui/ThemeSelector'
import { ResetDataButton } from '@/components/ui/ResetDataButton'

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

/** Quick-access tabs */
const QUICK = [ALL_NAV[0], ALL_NAV[1], ALL_NAV[2], ALL_NAV[3]] as const

/* ─── Z-index hierarchy ──────────────────────────────────────────────────── *
 *  Carousel dock  : z-[60]
 *  Menu backdrop  : z-[65]   ← must be above dock
 *  Menu sheet     : z-[68]   ← above backdrop
 *  Bottom nav bar : z-[70]   ← always on top
 * ────────────────────────────────────────────────────────────────────────── */

/* ─── Quick-access tab ───────────────────────────────────────────────────── */
interface TabProps { to: string; icon: LucideIcon; label: string; end: boolean }

function Tab({ to, icon: Icon, label, end }: TabProps) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className="flex-1 flex items-center justify-center h-full focus-visible:outline-none"
    >
      {({ isActive }) => (
        <div className="relative flex flex-col items-center justify-center gap-[3px] w-full h-full">
          {isActive && (
            <motion.div
              layoutId="bottom-tab-bg"
              className="absolute inset-x-1 inset-y-2 rounded-2xl bg-accent/12"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <Icon
            size={19}
            className={`relative z-10 transition-colors duration-150 ${isActive ? 'text-accent' : 'text-white/35'}`}
          />
          <span className={`relative z-10 text-[9px] font-bold leading-none tracking-wide transition-colors duration-150 ${isActive ? 'text-accent' : 'text-white/28'}`}>
            {label}
          </span>
        </div>
      )}
    </NavLink>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function MobileBottomNav() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(v => !v), [])

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-[65] md:hidden transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgb(var(--accent) / 0.08) 0%, rgba(0,0,0,0.7) 70%)',
        }}
      />

      {/* ── Bottom sheet ─────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal={open}
        aria-label="Todas las secciones"
        className={`fixed inset-x-0 bottom-0 z-[68] md:hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="relative rounded-t-[28px] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgb(var(--surface-100)) 0%, rgb(var(--surface-50)) 100%)',
          }}
        >
          {/* Top accent glow */}
          <div
            className="absolute inset-x-0 top-0 h-40 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 90px at 50% -20px, rgb(var(--accent) / 0.1) 0%, transparent 100%)',
            }}
          />

          {/* Top edge highlight */}
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 10%, rgb(var(--accent) / 0.3) 50%, transparent 90%)',
            }}
          />

          {/* Handle */}
          <div className="relative flex justify-center pt-3 pb-1" aria-hidden="true">
            <div
              className="w-8 h-[3px] rounded-full transition-colors duration-300"
              style={{
                backgroundColor: open
                  ? 'rgb(var(--accent) / 0.35)'
                  : 'rgba(255,255,255,0.1)',
              }}
            />
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between px-5 pt-1 pb-3">
            <h2 className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase">
              Secciones
            </h2>
            <button
              onClick={close}
              className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 active:scale-90 transition-all duration-150"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Nav grid */}
          <nav aria-label="Navegacion completa" className="relative grid grid-cols-4 gap-1 px-2.5 pb-2">
            {ALL_NAV.map((item, i) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={close}
                aria-label={item.label}
                className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                style={{
                  transitionDelay: open ? `${i * 20}ms` : '0ms',
                }}
              >
                {({ isActive }) => (
                  <div
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all duration-200 ${
                      isActive ? '' : 'active:scale-[0.93]'
                    }`}
                    style={{
                      opacity: open ? 1 : 0,
                      transform: open ? 'translateY(0)' : 'translateY(8px)',
                      transition: `opacity 250ms ease, transform 250ms ease`,
                      transitionDelay: open ? `${60 + i * 25}ms` : '0ms',
                    }}
                  >
                    {/* Icon container */}
                    <div
                      className={`relative w-[50px] h-[50px] rounded-[16px] flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? ''
                          : 'bg-white/[0.04] border border-white/[0.06]'
                      }`}
                      style={isActive ? {
                        background: `linear-gradient(135deg, rgb(var(--accent) / 0.2) 0%, rgb(var(--accent) / 0.08) 100%)`,
                        border: '1px solid rgb(var(--accent) / 0.2)',
                        boxShadow: '0 0 20px rgb(var(--accent) / 0.15), inset 0 1px 0 rgb(var(--accent) / 0.1)',
                      } : undefined}
                    >
                      <item.icon
                        size={21}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={`transition-colors duration-150 ${isActive ? 'text-accent' : 'text-white/35'}`}
                      />
                    </div>

                    {/* Label */}
                    <span className={`text-[10px] font-semibold leading-tight text-center transition-colors duration-150 ${
                      isActive ? 'text-accent' : 'text-white/35'
                    }`}>
                      {item.label}
                    </span>

                    {/* Active bar */}
                    <div
                      className="h-[2px] rounded-full transition-all duration-200"
                      style={{
                        width: isActive ? 16 : 0,
                        backgroundColor: isActive ? 'rgb(var(--accent) / 0.6)' : 'transparent',
                        boxShadow: isActive ? '0 0 8px rgb(var(--accent) / 0.4)' : 'none',
                      }}
                    />
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Divider with accent gradient */}
          <div className="mx-5 h-px" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgb(var(--accent) / 0.15) 50%, transparent 100%)',
          }} />

          {/* Theme selector */}
          <div
            className="px-5 pt-4 pb-3 flex flex-col items-center gap-3"
            style={{
              paddingBottom: 'calc(104px + max(env(safe-area-inset-bottom, 0px), 10px))',
              opacity: open ? 1 : 0,
              transition: 'opacity 300ms ease',
              transitionDelay: open ? '350ms' : '0ms',
            }}
          >
            <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.2em]">Tema</p>
            <ThemeSelector />
            <div className="mt-2 pt-2 border-t border-white/[0.04]">
              <ResetDataButton />
            </div>
          </div>

        </div>
      </div>

      {/* ── Floating pill nav — z-[70] always on top ─────────────────────── */}
      <nav
        aria-label="Navegacion principal"
        className="fixed bottom-0 inset-x-0 z-[70] md:hidden pointer-events-none"
      >
        <div
          className="pointer-events-auto mx-3 relative"
          style={{ marginBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)' }}
        >
          {/* FAB */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-[26px] z-20">
            {/* Glow ring behind FAB when open */}
            <div
              className="absolute inset-0 rounded-[18px] transition-all duration-500"
              style={{
                boxShadow: open
                  ? '0 0 0 3px rgb(var(--accent) / 0.15), 0 0 30px rgb(var(--accent) / 0.3)'
                  : '0 0 0 0px transparent, 0 0 0px transparent',
              }}
            />
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-label={open ? 'Cerrar menu' : 'Abrir todas las secciones'}
              className="relative w-[52px] h-[52px] rounded-[18px] bg-accent flex items-center justify-center active:scale-[0.85] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50 focus-visible:outline-offset-2"
              style={{
                boxShadow: `0 8px 24px rgb(var(--accent) / 0.45), 0 2px 8px rgb(var(--accent) / 0.3)`,
              }}
            >
              {/* Glass highlight */}
              <span
                className="absolute inset-0 rounded-[18px] pointer-events-none"
                style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.25) 0%, transparent 50%)' }}
              />
              {/* Icon swap */}
              <div className="relative z-10 w-[21px] h-[21px]">
                <LayoutGrid
                  size={21}
                  className={`absolute inset-0 text-white transition-all duration-200 ${
                    open ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                  }`}
                />
                <X
                  size={21}
                  strokeWidth={2.5}
                  className={`absolute inset-0 text-white transition-all duration-200 ${
                    open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Pill */}
          <div
            className="rounded-[26px] border border-white/[0.08] h-[62px] flex items-center px-1"
            style={{
              background: 'linear-gradient(180deg, rgb(var(--surface-100) / 0.97) 0%, rgb(var(--surface-50) / 0.95) 100%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <Tab {...QUICK[0]} />
            <Tab {...QUICK[1]} />
            <div className="w-[64px] shrink-0" />
            <Tab {...QUICK[2]} />
            <Tab {...QUICK[3]} />
          </div>
        </div>
      </nav>
    </>
  )
}
