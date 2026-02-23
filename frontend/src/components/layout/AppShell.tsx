import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, TrendingUp, RefreshCw, ClipboardList, LogOut, Settings, Bookmark, Receipt, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { api, useGetMeQuery, useLogoutMutation } from '@/store/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ask', label: 'Ask', icon: MessageSquare },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/report', label: 'Report', icon: ClipboardList },
  { to: '/my-budgets', label: 'My Budgets', icon: Bookmark },
  { to: '/pay-stubs', label: 'Pay Stubs', icon: Receipt },
]

export function AppShell() {
  const [syncing, setSyncing] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { data: me } = useGetMeQuery()
  const [logout] = useLogoutMutation()

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/sync', { method: 'POST' })
      dispatch(api.util.invalidateTags(['FinancialData']))
    } finally {
      setSyncing(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
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
        <div className="flex items-center gap-2">
          {me && (
            <span className="text-sm text-muted-foreground">{me.username}</span>
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )
            }
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </NavLink>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>
      {me?.isDefault && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-sm text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>
            You're using the default <span className="font-mono font-semibold">admin</span> account.
            Create a real user in{' '}
            <NavLink to="/settings" className="underline underline-offset-2 font-medium">Settings</NavLink>
            {' '}and then delete this one.
          </span>
        </div>
      )}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
