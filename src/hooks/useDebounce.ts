import { useCallback, useEffect, useRef } from 'react'

export function useDebounce<T extends (...args: any[]) => any>(fn: T, delay = 400): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const latestFnRef = useRef(fn)
  const latestArgsRef = useRef<Parameters<T> | null>(null)

  latestFnRef.current = fn

  const flush = useCallback(() => {
    if (!latestArgsRef.current) return

    const args = latestArgsRef.current
    latestArgsRef.current = null

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }

    return latestFnRef.current(...args)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flush()
      }
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void flush()
    }
  }, [flush])

  return useCallback((...args: Parameters<T>) => {
    latestArgsRef.current = args

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      void flush()
    }, delay)
  }, [delay, flush]) as unknown as T
}
