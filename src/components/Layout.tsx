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
            background: 'rgb(var(--surface-100))',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: 500,
            padding: '10px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          },
          success: {
            iconTheme: {
              primary: 'rgb(var(--accent))',
              secondary: 'rgba(0,0,0,0)',
            },
            style: {
              border: '1px solid rgb(var(--accent) / 0.35)',
              boxShadow: '0 0 0 1px rgb(var(--accent) / 0.1), 0 8px 32px rgba(0,0,0,0.45)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'rgba(0,0,0,0)',
            },
            style: {
              border: '1px solid rgba(239,68,68,0.35)',
              boxShadow: '0 0 0 1px rgba(239,68,68,0.1), 0 8px 32px rgba(0,0,0,0.45)',
            },
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
        <div className="p-4 md:p-8 flex-1 pb-[112px] md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation — hidden on md+ */}
      <MobileBottomNav />
    </div>
  )
}
