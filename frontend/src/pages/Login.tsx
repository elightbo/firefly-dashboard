import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation, useGetMeQuery, useGetSetupNeededQuery } from '@/store/api'

export function Login() {
  const navigate = useNavigate()
  const { data: me, isLoading: checkingSession } = useGetMeQuery()
  const { data: setupData } = useGetSetupNeededQuery()
  const [login, { isLoading, error }] = useLoginMutation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (me) navigate('/', { replace: true })
  }, [me, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login({ username, password }).unwrap()
      navigate('/', { replace: true })
    } catch {
      // error reflected via the `error` value from useLoginMutation
    }
  }

  if (checkingSession) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm bg-card border rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Budget</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {'data' in error
                ? (error.data as { error: string }).error
                : 'Login failed'}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {setupData?.setupNeeded && (
          <p className="mt-5 text-xs text-muted-foreground text-center border-t pt-4">
            First time? Default credentials:{' '}
            <span className="font-mono">admin</span> /{' '}
            <span className="font-mono">changeme</span>
          </p>
        )}
      </div>
    </div>
  )
}
