import{motion}from'framer-motion'
import{type ReactNode}from'react'
interface P{children:ReactNode;className?:string;hover?:boolean;delay?:number;onClick?:()=>void}
export function Card({children,className='',hover=false,delay=0,onClick}:P){
  return(<motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay,ease:'easeOut'}}
    onClick={onClick}
    className={`${hover?'glass-card-hover':'glass-card'} p-5 ${onClick?'cursor-pointer':''} ${className}`}>{children}</motion.div>)
}
