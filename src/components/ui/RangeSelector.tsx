interface P{value:string;onChange:(v:string)=>void}
const opts=[{v:'7d',l:'7d'},{v:'14d',l:'14d'},{v:'30d',l:'30d'},{v:'60d',l:'60d'},{v:'90d',l:'90d'},{v:'6m',l:'6m'},{v:'1y',l:'1a'},{v:'all',l:'Todo'}]
export function rangeToDays(v:string):number{const m:Record<string,number>={'7d':7,'14d':14,'30d':30,'60d':60,'90d':90,'6m':180,'1y':365,'all':9999};return m[v]||30}
export function RangeSelector({value,onChange}:P){
  return(<div className="flex gap-1 bg-surface-200/40 rounded-lg p-0.5">
    {opts.map(o=>(<button key={o.v} onClick={()=>onChange(o.v)}
      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${value===o.v?'bg-accent/20 text-accent':'text-white/30 hover:text-white/50'}`}>{o.l}</button>))}
  </div>)
}
