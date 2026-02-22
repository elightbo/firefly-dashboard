import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGetMeQuery, useGetUsersQuery, useCreateUserMutation, useDeleteUserMutation } from '@/store/api'

export function Settings() {
  const { data: me } = useGetMeQuery()
  const { data: userList = [] } = useGetUsersQuery()
  const [createUser, { isLoading: creating }] = useCreateUserMutation()
  const [deleteUser] = useDeleteUserMutation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      const user = await createUser({ username, password }).unwrap()
      setSuccess(`User "${user.username}" created successfully.`)
      setUsername('')
      setPassword('')
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to create user'
      setError(msg)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      await deleteUser(id).unwrap()
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to delete user'
      alert(msg)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {userList.map(u => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="text-sm font-medium">{u.username}</span>
                  {u.id === me?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </div>
                {u.id !== me?.id && (
                  <button
                    onClick={() => handleDelete(u.id, u.username)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    title={`Remove ${u.username}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Add user form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Add User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-username" className="text-sm font-medium">Username</label>
                <input
                  id="new-username"
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-password" className="text-sm font-medium">Password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <div>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {creating ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
