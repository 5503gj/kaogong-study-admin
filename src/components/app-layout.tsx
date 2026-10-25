import { Outlet } from 'react-router-dom'
import { AppHeader } from './app-header'
import { SideNav } from './app-sidebar'

export function AppLayout() {
  return (
    <div className="app-frame">
      <aside className="app-rail">
        <SideNav />
      </aside>
      <div className="app-main">
        <AppHeader />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
