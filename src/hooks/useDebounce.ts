import{useRef,useCallback}from'react'
export function useDebounce<T extends(...args:any[])=>any>(fn:T,delay=400):T{
  const ref=useRef<ReturnType<typeof setTimeout>>()
  return useCallback((...args:any[])=>{if(ref.current)clearTimeout(ref.current);ref.current=setTimeout(()=>fn(...args),delay)},[fn,delay])as unknown as T
}
