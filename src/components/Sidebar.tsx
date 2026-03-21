import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, BookOpen, Dumbbell, Moon, Download,
  ListChecks, PenLine, Zap, Scale, Timer, Smartphone,
  GraduationCap, Film, ClipboardList, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { ThemeSelector } from '@/components/ui/ThemeSelector'

interface NavItem { to: string; icon: LucideIcon; label: string; end: boolean }
interface NavGroup { label: string | null; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { to: '/',          icon: LayoutDashboard, label: 'Dashboard',   end: true  },
      { to: '/daylog',    icon: PenLine,         label: 'Diario',      end: false },
      { to: '/calendar',  icon: CalendarDays,    label: 'Calendario',  end: false },
      { to: '/tasks',     icon: ClipboardList,   label: 'Tareas',      end: false },
      { to: '/insights',  icon: TrendingUp,      label: 'Insights',    end: false },
    ],
  },
  {
    label: 'Seguimiento',
    items: [
      { to: '/habits',     icon: ListChecks,    label: 'Hábitos',  end: false },
      { to: '/workouts',   icon: Dumbbell,      label: 'Entrenos', end: false },
      { to: '/sleep',      icon: Moon,          label: 'Sueño',    end: false },
      { to: '/weight',     icon: Scale,         label: 'Peso',     end: false },
      { to: '/screentime', icon: Smartphone,    label: 'Pantalla', end: false },
    ],
  },
  {
    label: 'Aprender',
    items: [
      { to: '/books',    icon: BookOpen,      label: 'Lectura',  end: false },
      { to: '/study',    icon: GraduationCap, label: 'Estudio',  end: false },
      { to: '/media',    icon: Film,          label: 'Media',    end: false },
      { to: '/pomodoro', icon: Timer,         label: 'Pomodoro', end: false },
    ],
  },
  {
    label: null,
    items: [
      { to: '/export', icon: Download, label: 'Exportar', end: false },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] flex-col z-40 bg-surface-50 border-r border-white/[0.05]">

      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-accent/20 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgb(var(--accent)/0.2)] shrink-0">
            <Zap size={17} className="text-accent" fill="currentColor" strokeWidth={0} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[16px] font-black tracking-tight text-white">LifeOS</span>
            <span className="text-[9px] bg-accent/15 text-accent/80 px-1.5 py-0.5 rounded font-mono leading-none">v5</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 px-3 overflow-y-auto disable-scrollbars pb-4"
        aria-label="Navegación principal"
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/20 px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {({ isActive }) => (
                    <>
                      {/* Animated background pill */}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-bg"
                          className="absolute inset-0 rounded-xl bg-accent/10"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                      )}

                      <div className={`relative flex items-center gap-3 px-3 py-2 transition-colors duration-150 ${
                        isActive ? 'text-white' : 'text-white/38 hover:text-white/65 hover:bg-white/[0.03] rounded-xl'
                      }`}>
                        {/* Icon container */}
                        <div className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          isActive
                            ? 'bg-accent/22 shadow-[0_0_14px_rgb(var(--accent)/0.3)]'
                            : 'bg-white/[0.05]'
                        }`}>
                          <item.icon
                            size={15}
                            className={`transition-colors duration-150 ${isActive ? 'text-accent' : ''}`}
                          />
                        </div>

                        {/* Label */}
                        <span className="text-[13px] font-medium leading-none">{item.label}</span>
                      </div>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 pt-3 pb-4 border-t border-white/[0.05] space-y-3">
        <div>
          <p className="text-[9px] font-black text-white/18 uppercase tracking-[0.15em] text-center mb-2">Tema de color</p>
          <ThemeSelector />
        </div>
        <p className="text-[9px] text-white/12 text-center">LifeOS · Local-first · Bogotá 🇨🇴</p>
      </div>

    </aside>
  )
}
