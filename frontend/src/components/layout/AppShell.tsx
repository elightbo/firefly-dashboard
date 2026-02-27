import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, TrendingUp, RefreshCw, ClipboardList, LogOut, Settings, Bookmark, Receipt, Car, TriangleAlert, Menu, X, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { api, useGetMeQuery, useLogoutMutation } from '@/store/api'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark(d => !d)] as const
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ask', label: 'Ask', icon: MessageSquare },
  { to: '/trends', label: 'Trends', icon: TrendingUp },
  { to: '/report', label: 'Report', icon: ClipboardList },
  { to: '/my-budgets', label: 'My Budgets', icon: Bookmark },
  { to: '/pay-stubs', label: 'Pay Stubs', icon: Receipt },
  { to: '/vehicles', label: 'Garage', icon: Car },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
  )

export function AppShell() {
  const [syncing, setSyncing] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, toggleDark] = useDarkMode()
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

  function closeMobile() { setMobileOpen(false) }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg tracking-tight">Budget</span>
          <nav className="hidden md:flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right: desktop actions + mobile hamburger */}
        <div className="flex items-center gap-2">
          {/* Desktop-only actions */}
          <div className="hidden md:flex items-center gap-2">
            {me && <span className="text-sm text-muted-foreground">{me.username}</span>}
            <button
              onClick={toggleDark}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NavLink to="/settings" className={navLinkClass} title="Settings">
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-b bg-card px-4 py-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkClass} onClick={closeMobile}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <div className="border-t mt-2 pt-2 space-y-1">
            <button
              onClick={toggleDark}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
            <NavLink to="/settings" className={navLinkClass} onClick={closeMobile}>
              <Settings className="h-4 w-4" />
              Settings
            </NavLink>
            <button
              onClick={() => { handleSync(); closeMobile() }}
              disabled={syncing}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
            <button
              onClick={() => { handleLogout(); closeMobile() }}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

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
      <main className="p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
