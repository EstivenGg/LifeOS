import toast from 'react-hot-toast'
export function showSaved() {
  toast.success('Guardado',{duration:1200,style:{background:'#1c1c26',color:'#fff',border:'1px solid rgba(124,91,245,0.2)',fontSize:'0.8rem',padding:'8px 16px',borderRadius:'12px'},iconTheme:{primary:'#7c5bf5',secondary:'#fff'}})
}
