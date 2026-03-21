import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, Minus, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ModeToggle } from '@/components/ui/ModeToggle'
import { FocusNote } from '@/components/ui/FocusNote'
import type * as T from '@/data/types'

const PAGE_CHIPS = [5, 10, 25, 50]

interface Props {
  isAdv: boolean
  isHorizontal: boolean
  books: T.Book[]
  entryReadings: T.EntryReading[]
  totalReadingPages: number
  onToggleAdv: () => void
  onAdd: (bookId: number) => void
  onUpdate: (id: number, patch: Partial<T.EntryReading>) => void
  onRemove: (id: number) => void
  onNavigateToBooks: () => void
}

export function ReadingSection({
  isAdv, isHorizontal, books, entryReadings, totalReadingPages,
  onToggleAdv, onAdd, onUpdate, onRemove, onNavigateToBooks,
}: Props) {
  const unloggedBooks = books.filter(b => !entryReadings.find(r => r.bookId === b.id))
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <Card className={isHorizontal ? 'h-full flex flex-col pt-8 pb-4' : 'flex flex-col py-6'}>
      <div className="flex items-center justify-between mb-6 px-2 sm:px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-400/15 flex items-center justify-center border border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
            <BookOpen size={20} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">Lectura</h3>
            <p className="text-[10px] font-bold text-emerald-400/60 tracking-widest uppercase">
              {totalReadingPages > 0 ? `${totalReadingPages} págs leídas` : 'Hábito intelectual'}
            </p>
          </div>
        </div>
        <ModeToggle isAdv={isAdv} onToggle={onToggleAdv} />
      </div>

      <div className={`flex-1 overflow-y-auto disable-scrollbars px-2 sm:px-4 relative ${isHorizontal ? 'pb-12 fade-bottom-mask' : ''}`}>
        {!isAdv ? (
          /* ── Basic mode ── */
          books.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center">
              <div className="w-12 h-12 rounded-full bg-surface-200/50 flex items-center justify-center mx-auto mb-3">
                <BookOpen size={24} className="text-white/20" />
              </div>
              <p className="text-sm text-white/40 mb-3">Tu biblioteca digital está vacía.</p>
              <button onClick={onNavigateToBooks} className="btn-ghost scale-95 border border-white/5 bg-surface-200/40 text-xs px-4 py-2">
                Añadir mi primer libro
              </button>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {books.map(b => {
                const logged = entryReadings.find(r => r.bookId === b.id)
                return (
                  <motion.button
                    key={b.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => logged ? onRemove(logged.id!) : onAdd(b.id!)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-[20px] transition-all duration-300 border ${
                      logged
                        ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_12px_rgba(52,211,153,0.1)]'
                        : 'bg-surface-200/40 border-white/5 hover:border-white/10 hover:bg-surface-300/40'
                    }`}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${logged ? 'bg-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'bg-surface-300/50'}`}>
                      <motion.div
                        initial={false}
                        animate={logged ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        <b className="text-emerald-400 drop-shadow text-xs leading-none">✓</b>
                      </motion.div>
                      {!logged && <BookOpen size={14} className="text-white/20 absolute" />}
                    </div>
                    <span className={`text-[15px] sm:text-base font-medium transition-colors duration-300 text-left line-clamp-1 flex-1 ${logged ? 'text-white' : 'text-white/60'}`}>
                      {b.title}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          )
        ) : (
          /* ── Advanced mode ── */
          <div className="space-y-3">
            {entryReadings.length === 0 && unloggedBooks.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[160px] text-center">
                <BookOpen size={32} className="text-white/10 mb-3" />
                <p className="text-sm text-white/35">No hay libros en tu biblioteca.</p>
                <button onClick={onNavigateToBooks} className="mt-3 btn-ghost scale-95 border border-white/5 bg-surface-200/40 text-xs px-4 py-2">
                  Añadir libro
                </button>
              </div>
            )}

            {/* Logged book cards */}
            {entryReadings.map(r => {
              const book = books.find(b => b.id === r.bookId)
              const pages = r.pagesRead || 0

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[24px] border border-white/[0.07] bg-surface-200/35 overflow-hidden"
                >
                  {/* Book header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(52,211,153,0.1)]">
                      <BookOpen size={16} className="text-emerald-400" />
                    </div>
                    <span className="text-sm font-bold text-white/90 line-clamp-1 flex-1 leading-tight">
                      {book?.title || 'Libro desconocido'}
                    </span>
                    <button
                      onClick={() => onRemove(r.id!)}
                      className="w-7 h-7 flex items-center justify-center shrink-0 rounded-full text-white/20 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Pages counter */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between bg-surface-300/30 rounded-2xl p-2 border border-white/[0.05]">
                      {/* − button */}
                      <button
                        onClick={() => onUpdate(r.id!, { pagesRead: Math.max(0, pages - 1) })}
                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-400/10 text-white/30 hover:text-emerald-400 flex items-center justify-center transition-all active:scale-95"
                      >
                        <Minus size={14} />
                      </button>

                      {/* Editable number */}
                      <div className="flex flex-col items-center flex-1">
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={pages || ''}
                          onChange={e => onUpdate(r.id!, { pagesRead: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-20 bg-transparent border-none outline-none text-center text-3xl font-black text-white tabular-nums placeholder:text-white/15 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-[9px] font-black text-emerald-400/40 uppercase tracking-[0.25em]">páginas</span>
                      </div>

                      {/* + button */}
                      <button
                        onClick={() => onUpdate(r.id!, { pagesRead: pages + 1 })}
                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-400/10 text-white/30 hover:text-emerald-400 flex items-center justify-center transition-all active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Quick-add chips */}
                    <div className="flex gap-1.5 mt-2">
                      {PAGE_CHIPS.map(n => (
                        <motion.button
                          key={n}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => onUpdate(r.id!, { pagesRead: pages + n })}
                          className="flex-1 py-1.5 rounded-xl text-[10px] font-black text-emerald-400/60 hover:text-emerald-300 bg-emerald-400/5 hover:bg-emerald-400/15 border border-emerald-400/10 hover:border-emerald-400/25 transition-all"
                        >
                          +{n}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="px-4 pb-4">
                    <FocusNote
                      iconMode
                      value={r.note || ''}
                      onChange={v => onUpdate(r.id!, { note: v })}
                      placeholder="Ideas principales, citas, impresiones..."
                      className="w-full justify-center bg-surface-300/20 py-2.5 rounded-[14px] border border-white/[0.04]"
                    />
                  </div>
                </motion.div>
              )
            })}

            {/* Add another book — expandable picker */}
            {unloggedBooks.length > 0 && (
              <div className="pt-1">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPickerOpen(v => !v)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                    pickerOpen
                      ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300'
                      : 'bg-surface-200/40 border-white/[0.06] text-white/50 hover:border-emerald-400/20 hover:text-emerald-400/80 hover:bg-emerald-400/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${pickerOpen ? 'bg-emerald-400/20' : 'bg-white/5'}`}>
                      <Plus size={14} className={pickerOpen ? 'text-emerald-400' : 'text-white/40'} />
                    </div>
                    <span className="text-sm font-bold">Añadir libro</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${pickerOpen ? 'bg-emerald-400/20 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                      {unloggedBooks.length}
                    </span>
                  </div>
                  <motion.div animate={{ rotate: pickerOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={15} className="opacity-50" />
                  </motion.div>
                </motion.button>

                <AnimatePresence>
                  {pickerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-2xl border border-emerald-400/10 bg-surface-200/30 overflow-hidden">
                        {unloggedBooks.map((b, i) => (
                          <motion.button
                            key={b.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { onAdd(b.id!); setPickerOpen(false) }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-emerald-400/8 transition-colors ${
                              i !== unloggedBooks.length - 1 ? 'border-b border-white/[0.04]' : ''
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/15 flex items-center justify-center shrink-0">
                              <BookOpen size={13} className="text-emerald-400/70" />
                            </div>
                            <span className="text-sm font-medium text-white/70 line-clamp-1 flex-1">{b.title}</span>
                            <Plus size={13} className="text-emerald-400/40 shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
