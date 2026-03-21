interface P{value?:number;onChange:(v:number)=>void;label?:string}
const labels=[{max:25,t:'Pobre',c:'text-red-400'},{max:50,t:'OK',c:'text-yellow-400'},{max:75,t:'Bueno',c:'text-emerald-400'},{max:100,t:'Excelente',c:'text-cyan-400'}]
function getLabel(v:number){return labels.find(l=>v<=l.max)||labels[3]}
export function QualitySlider({value,onChange,label}:P){
  const v=value??50;const l=getLabel(v)
  return(<div>
    {label&&<label className="text-xs text-white/40 mb-1.5 block">{label}</label>}
    <div className="flex items-center gap-3">
      <input type="range" min="0" max="100" value={v} onChange={e=>onChange(parseInt(e.target.value))}
        className="flex-1 h-1.5 bg-surface-300 rounded-full appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"/>
      <span className={`text-sm font-mono font-bold w-8 text-right ${l.c}`}>{v}</span>
      <span className={`text-xs w-16 ${l.c}`}>{l.t}</span>
    </div>
  </div>)
}
