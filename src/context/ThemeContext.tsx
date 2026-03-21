import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ThemeId = 'violet' | 'blue' | 'red' | 'green' | 'amber'

export interface ThemeDef {
  id: ThemeId
  label: string
  /** Hex accent for preview swatches and Recharts fills */
  accent: string
}

export const THEMES: ThemeDef[] = [
  { id: 'violet', label: 'Violeta', accent: '#7c5bf5' },
  { id: 'blue',   label: 'Azul',    accent: '#3b82f6' },
  { id: 'red',    label: 'Rojo',    accent: '#ef4444' },
  { id: 'green',  label: 'Verde',   accent: '#22c55e' },
  { id: 'amber',  label: 'Ámbar',   accent: '#f59e0b' },
]

interface ThemeCtx {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  /** Current accent color as hex — use for Recharts and other JS-driven colors */
  accentHex: string
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'violet',
  setTheme: () => {},
  accentHex: '#7c5bf5',
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    let saved: ThemeId = 'violet'
    try {
      const raw = localStorage.getItem('lifeos-theme') as ThemeId | null
      if (raw && THEMES.some(t => t.id === raw)) saved = raw
    } catch {}
    // Apply immediately in the initializer to avoid a paint flash
    document.documentElement.setAttribute('data-theme', saved)
    return saved
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function setTheme(id: ThemeId) {
    setThemeState(id)
    document.documentElement.setAttribute('data-theme', id)
    try { localStorage.setItem('lifeos-theme', id) } catch {}
  }

  const accentHex = THEMES.find(t => t.id === theme)?.accent ?? '#7c5bf5'

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentHex }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
