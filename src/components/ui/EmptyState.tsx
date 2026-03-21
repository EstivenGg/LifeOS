import{type ReactNode}from'react'
interface P{icon:ReactNode;title:string;desc?:string;action?:ReactNode}
export function EmptyState({icon,title,desc,action}:P){
  return(<div className="text-center py-12 px-4">
    <div className="mx-auto mb-4 opacity-25">{icon}</div>
    <p className="text-white/40 font-medium mb-1">{title}</p>
    {desc&&<p className="text-white/20 text-sm mb-4">{desc}</p>}
    {action}
  </div>)
}
