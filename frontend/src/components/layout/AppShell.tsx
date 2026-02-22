import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, TrendingUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { api } from '@/store/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ask', label: 'Ask', icon: MessageSquare },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
]

export function AppShell() {
  const [syncing, setSyncing] = useState(false)
  const dispatch = useDispatch()

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/sync', { method: 'POST' })
      dispatch(api.util.invalidateTags(['FinancialData']))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg tracking-tight">Budget</span>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
