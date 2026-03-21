import{motion}from'framer-motion'
interface P{value:number;max:number;color?:string;height?:string}
export function ProgressBar({value,max,color='bg-accent',height='h-2'}:P){
  const pct=max>0?Math.min((value/max)*100,100):0
  return(<div className={`w-full ${height} bg-surface-300 rounded-full overflow-hidden`}>
    <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.6,ease:'easeOut'}} className={`h-full ${color} rounded-full`}/>
  </div>)
}
