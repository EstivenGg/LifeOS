# LifeOS — Guía de desarrollo

## Plataforma objetivo

Esta es una app **mobile-first para Android** empaquetada con Capacitor. El target principal son celulares Android de gama media. Todo cambio debe pensarse primero para pantalla de celular (320px–430px) y después para desktop.

## Principio core: rendimiento premium

La app debe verse premium (glassmorphism, animaciones suaves, colores vibrantes) **sin sacrificar fluidez en celulares**. Ante la duda, priorizar rendimiento sobre efecto visual.

### Reglas de performance

- **No usar `backdrop-blur`** en elementos que se rendericen en listas o que se animen (cards, grids, modals). Usar fondos sólidos con opacidad (`bg-surface-100/80`) que se ven igual de premium sin costo GPU.
- **No usar `transition-all`** — siempre especificar la propiedad exacta: `transition-transform`, `transition-colors`, `transition-opacity`.
- **Preferir CSS `active:scale-*`** sobre `motion.button whileTap` de framer-motion para interacciones simples (botones, toggles). Framer motion solo para animaciones complejas (progress bars, stagger lists).
- **Animaciones de entrada**: usar `opacity` + `translateY` (GPU composited). Evitar `scale` en animaciones de entrada/salida de modals. Easing: `ease-out` o curva custom, nunca springs en listas largas.
- **DB queries**: siempre usar `Promise.all()` para queries paralelas. Nunca loops secuenciales de await.
- **Memoización**: `useMemo` para listas filtradas/derivadas, `useCallback` para handlers pasados a componentes memorizados, `React.memo` para filas de listas.
- **Context values**: siempre memoizar el `value` del Provider con `useMemo` para evitar re-renders en cascada.

## Responsive — pantallas a considerar

| Dispositivo          | Ancho   | Notas                                          |
|----------------------|---------|-------------------------------------------------|
| Android small        | 320px   | Mínimo soportado. Todo debe caber sin overflow. |
| Android medio        | 360px   | Target principal (Samsung Galaxy A series).      |
| Android grande       | 412px+  | Pixels, Samsung S series.                        |
| Tablet / desktop     | 768px+  | Sidebar visible, layout más amplio.              |

### Reglas responsive

- **Bottom nav**: ocupa ~100px desde el borde inferior (pill 62px + FAB 26px + safe-area). Todo contenido debe tener padding-bottom suficiente (`pb-[112px]` en Layout).
- **Modals**: deben ser bottom-sheet en móvil (`items-end` + `rounded-t-3xl`) y centrados en desktop (`md:items-center` + `md:rounded-3xl`). Z-index `z-[80]` mínimo para estar sobre el bottom nav (`z-[70]`).
- **Grids**: usar `gap-1.5 sm:gap-2` en grids de cards. En 3 columnas verificar que los textos no hagan overflow en 320px.
- **Iconos y touch targets**: mínimo 32px (w-8 h-8) para botones táctiles. Preferir 44px cuando haya espacio.
- **Padding**: `p-4` base en móvil, `md:p-8` en desktop. Nunca menos de `p-3` en contenido.
- **Textos largos**: usar `truncate` o `line-clamp-*` para evitar que nombres de apps, libros, hábitos rompan el layout.

## Stack técnico

- React + Vite + TypeScript + Tailwind CSS
- Framer Motion (animaciones complejas únicamente)
- Dexie.js (IndexedDB, local-first)
- Capacitor (Android wrapper)
- dnd-kit (drag-and-drop en settings)
- Recharts (gráficos)
- UI en español

## Build y deploy

```bash
npm run build          # tsc -b && vite build (chunk warning es pre-existente, ignorar)
npx cap sync android   # sincronizar con proyecto Android
```
