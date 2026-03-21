import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { Toaster } from 'react-hot-toast'

export function Layout() {
  return (
    <div className="min-h-screen bg-surface">
      {/*
        Toast container — raised 88px so it clears the mobile bottom nav
        (58px bar + safe-area + breathing room). Fine on desktop too.
      */}
      <Toaster
        position="bottom-right"
        containerStyle={{ bottom: 88, right: 16 }}
        toastOptions={{
          style: {
            background: 'rgb(var(--surface-200))',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            fontSize: '13px',
          },
        }}
      />

      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content */}
      <main
        className="md:ml-[240px] min-h-screen flex flex-col"
        style={{ paddingTop: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))' }}
      >
        {/*
          pb-[88px] gives clearance for the mobile bottom nav bar.
          md:pb-8 restores normal desktop padding.
        */}
        <div className="p-4 md:p-8 flex-1 pb-[88px] md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation — hidden on md+ */}
      <MobileBottomNav />
    </div>
  )
}
