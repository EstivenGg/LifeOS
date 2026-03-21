import{motion,AnimatePresence}from'framer-motion'
import{X}from'lucide-react'
import{type ReactNode}from'react'
interface P{open:boolean;onClose:()=>void;title?:string;children:ReactNode;size?:'sm'|'md'|'lg'|'xl'}
const sz={sm:'max-w-md',md:'max-w-2xl',lg:'max-w-4xl',xl:'max-w-6xl'}
export function Modal({open,onClose,title,children,size='md'}:P){
  return(<AnimatePresence>{open&&(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
      <motion.div initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:20}} transition={{duration:0.2}}
        className={`relative ${sz[size]} w-full glass-card p-6 glow-accent max-h-[85vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
        {title&&<div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={18}/></button></div>}
        {children}
      </motion.div>
    </motion.div>
  )}</AnimatePresence>)
}
