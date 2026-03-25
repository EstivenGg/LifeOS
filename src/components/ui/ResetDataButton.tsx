import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { db } from '@/data/db'

export function ResetDataButton() {
  const [step, setStep] = useState<0 | 1 | 2>(0) // 0=idle, 1=confirm, 2=wiping

  async function wipeAll() {
    setStep(2)
    try {
      // Clear all Dexie tables
      await Promise.all(db.tables.map(t => t.clear()))
      // Clear localStorage prefs
      const keys = Object.keys(localStorage)
      for (const k of keys) {
        if (k.startsWith('lifeos')) localStorage.removeItem(k)
      }
      // Reload fresh
      window.location.replace('/')
    } catch {
      setStep(0)
    }
  }

  if (step === 0) {
    return (
      <button
        onClick={() => setStep(1)}
        className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-red-400/40 hover:text-red-400/70 active:scale-95 transition-all py-1.5 px-3 rounded-xl"
      >
        <Trash2 size={11} />
        Borrar datos
      </button>
    )
  }

  if (step === 2) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-3.5 h-3.5 border-2 border-red-400/50 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] text-red-400/60 font-medium">Borrando...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <div className="flex items-center gap-1.5 text-[10px] text-red-400/70 font-medium">
        <AlertTriangle size={12} />
        <span>Se perderá toda la información</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStep(0)}
          className="text-[10px] font-semibold text-white/30 hover:text-white/60 px-3 py-1.5 rounded-lg bg-white/[0.04] active:scale-95 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={wipeAll}
          className="text-[10px] font-bold text-white px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 active:scale-95 transition-all"
        >
          Sí, borrar todo
        </button>
      </div>
    </div>
  )
}
