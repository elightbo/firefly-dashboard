import { useState } from 'react'
import { Trash2, UserPlus, CheckCircle2, Plus, Pencil, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useGetMeQuery, useGetUsersQuery, useCreateUserMutation, useDeleteUserMutation,
  useGetLLMConfigsQuery, useCreateLLMConfigMutation, useUpdateLLMConfigMutation,
  useActivateLLMConfigMutation, useDeleteLLMConfigMutation, useChangePasswordMutation,
} from '@/store/api'
import type { LLMConfig } from '@/types'

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai_compatible', label: 'OpenAI-compatible (Ollama, OpenRouter…)' },
]

const ANTHROPIC_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-haiku-4-5-20251001',
]

interface LLMFormState {
  name: string
  provider: string
  model: string
  baseUrl: string
  apiKey: string
}

const emptyForm = (): LLMFormState => ({ name: '', provider: 'anthropic', model: 'claude-sonnet-4-6', baseUrl: '', apiKey: '' })

function LLMProviderForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: LLMFormState
  onSave: (f: LLMFormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof LLMFormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Display name</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Claude Sonnet"
            className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Provider</label>
          <select
            value={form.provider}
            onChange={e => set('provider', e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Model</label>
          {form.provider === 'anthropic' ? (
            <select
              value={form.model}
              onChange={e => set('model', e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ANTHROPIC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              {!ANTHROPIC_MODELS.includes(form.model) && <option value={form.model}>{form.model}</option>}
            </select>
          ) : (
            <input
              value={form.model}
              onChange={e => set('model', e.target.value)}
              placeholder="e.g. llama3.2"
              className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
        {form.provider === 'openai_compatible' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Base URL</label>
            <input
              value={form.baseUrl}
              onChange={e => set('baseUrl', e.target.value)}
              placeholder="http://ollama:11434"
              className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">
          API Key {initial.apiKey === '__set__' && <span className="text-muted-foreground">(leave blank to keep existing)</span>}
          {form.provider === 'openai_compatible' && <span className="text-muted-foreground"> (leave blank for Ollama)</span>}
        </label>
        <input
          type="password"
          value={form.apiKey}
          onChange={e => set('apiKey', e.target.value)}
          placeholder={initial.apiKey === '__set__' ? '••••••••' : form.provider === 'anthropic' ? 'sk-ant-…' : 'gsk_…'}
          className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name || !form.model}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  )
}

function LLMProvidersCard() {
  const { data: configs = [] } = useGetLLMConfigsQuery()
  const [createConfig, { isLoading: creating }] = useCreateLLMConfigMutation()
  const [updateConfig, { isLoading: updating }] = useUpdateLLMConfigMutation()
  const [activateConfig] = useActivateLLMConfigMutation()
  const [deleteConfig] = useDeleteLLMConfigMutation()

  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleCreate(form: LLMFormState) {
    await createConfig({
      name: form.name,
      provider: form.provider,
      model: form.model,
      baseUrl: form.baseUrl || undefined,
      apiKey: form.apiKey || undefined,
    }).unwrap()
    setShowAdd(false)
  }

  async function handleUpdate(id: number, form: LLMFormState) {
    await updateConfig({
      id,
      name: form.name,
      provider: form.provider,
      model: form.model,
      baseUrl: form.baseUrl || undefined,
      apiKey: form.apiKey || undefined,
    }).unwrap()
    setEditingId(null)
  }

  async function handleDelete(cfg: LLMConfig) {
    setDeleteError(null)
    try {
      await deleteConfig(cfg.id).unwrap()
    } catch (err: unknown) {
      setDeleteError((err as { data?: { error?: string } })?.data?.error ?? 'Failed to delete')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">LLM Providers</CardTitle>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {configs.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground">No providers configured. Add one to get started.</p>
        )}

        {configs.map(cfg => (
          editingId === cfg.id ? (
            <LLMProviderForm
              key={cfg.id}
              initial={{ name: cfg.name, provider: cfg.provider, model: cfg.model, baseUrl: cfg.baseUrl ?? '', apiKey: cfg.apiKeySet ? '__set__' : '' }}
              onSave={f => handleUpdate(cfg.id, f)}
              onCancel={() => setEditingId(null)}
              saving={updating}
            />
          ) : (
            <div key={cfg.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
              <div className="flex items-center gap-2.5">
                {cfg.isActive && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{cfg.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {cfg.provider === 'anthropic' ? 'Anthropic' : 'OpenAI-compat'}
                    </span>
                    {cfg.isActive && <span className="text-xs text-emerald-600 font-medium">active</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cfg.model}{cfg.baseUrl ? ` · ${cfg.baseUrl}` : ''}{cfg.apiKeySet ? ' · key set' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!cfg.isActive && (
                  <button
                    onClick={() => activateConfig(cfg.id)}
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    Set active
                  </button>
                )}
                <button
                  onClick={() => setEditingId(cfg.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cfg)}
                  disabled={cfg.isActive}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-30"
                  title={cfg.isActive ? 'Cannot delete the active provider' : `Delete ${cfg.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        ))}

        {showAdd && (
          <LLMProviderForm
            initial={emptyForm()}
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
            saving={creating}
          />
        )}

        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      </CardContent>
    </Card>
  )
}

function ChangePasswordCard() {
  const [changePassword, { isLoading }] = useChangePasswordMutation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (next !== confirm) { setError('New passwords do not match'); return }
    try {
      await changePassword({ currentPassword: current, newPassword: next }).unwrap()
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err: unknown) {
      setError((err as { data?: { error?: string } })?.data?.error ?? 'Failed to change password')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Current password</label>
            <input type="password" required value={current} onChange={e => setCurrent(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">New password</label>
            <input type="password" required minLength={8} value={next} onChange={e => setNext(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Confirm new password</label>
            <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">Password changed successfully.</p>}
          <div>
            <button type="submit" disabled={isLoading}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isLoading ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

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

      <LLMProvidersCard />
      <ChangePasswordCard />

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
