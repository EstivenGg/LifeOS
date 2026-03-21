import { useTheme, THEMES } from '@/context/ThemeContext'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="flex items-center justify-center gap-2.5 py-1"
      role="group"
      aria-label="Seleccionar tema de color"
    >
      {THEMES.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          title={t.label}
          aria-label={`Tema ${t.label}`}
          aria-pressed={theme === t.id}
          className={`w-4 h-4 rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40 focus-visible:outline-offset-2 ${
            theme === t.id
              ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-surface-50 scale-125'
              : 'opacity-40 hover:opacity-75 hover:scale-110'
          }`}
          style={{ background: t.accent }}
        />
      ))}
    </div>
  )
}
