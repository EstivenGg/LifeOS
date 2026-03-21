import { useState } from 'react'

export type GridCols = 1 | 2 | 3 | 4

/**
 * Maps a column count to a Tailwind grid class string.
 * All class names are listed fully so Tailwind JIT detects them.
 */
export const GRID_CLASSES: Record<GridCols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

export function useGridColumns(sectionKey: string, defaultCols: GridCols = 3) {
  const storageKey = `lifeos-grid-cols-${sectionKey}`

  const [cols, setCols] = useState<GridCols>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      const n = saved ? parseInt(saved, 10) : defaultCols
      return ([1, 2, 3, 4].includes(n) ? n : defaultCols) as GridCols
    } catch {
      return defaultCols
    }
  })

  function setAndSave(n: GridCols) {
    setCols(n)
    try {
      localStorage.setItem(storageKey, String(n))
    } catch {
      // localStorage unavailable (private mode, quota, etc.)
    }
  }

  return { cols, setAndSave, gridClass: GRID_CLASSES[cols] }
}
