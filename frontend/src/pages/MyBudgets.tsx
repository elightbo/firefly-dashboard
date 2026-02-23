import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetBudgetsQuery, useGetPinnedBudgetsQuery, useSetPinnedBudgetsMutation } from '@/store/api'
import { formatCurrency } from '@/lib/format'

export function MyBudgets() {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>([])

  const { data: budgets, isLoading: budgetsLoading } = useGetBudgetsQuery()
  const { data: pinned, isLoading: pinnedLoading } = useGetPinnedBudgetsQuery()
  const [setPinnedBudgets, { isLoading: saving }] = useSetPinnedBudgetsMutation()

  const isLoading = budgetsLoading || pinnedLoading

  function enterEdit() {
    setDraft(pinned ?? [])
    setEditing(true)
  }

  function toggleBudget(name: string) {
    setDraft(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  async function handleSave() {
    await setPinnedBudgets({ names: draft })
    setEditing(false)
  }

  function handleCancel() {
    setEditing(false)
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    )
  }

  const withLimits = budgets?.filter(b => b.limit !== null) ?? []

  // ── Edit mode ─────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Customize My Budgets</h1>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Select budgets to pin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {withLimits.length === 0 && (
              <p className="text-sm text-muted-foreground">No budgets with limits found.</p>
            )}
            {withLimits.map(budget => (
              <label
                key={budget.id}
                className="flex items-center gap-3 py-2 px-1 rounded-md hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={draft.includes(budget.name)}
                  onChange={() => toggleBudget(budget.name)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="flex-1 text-sm font-medium">{budget.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.limit!)}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── View mode ─────────────────────────────────────────────────────────────
  const pinnedBudgets = withLimits.filter(b => pinned?.includes(b.name))

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Budgets</h1>
        <button
          onClick={enterEdit}
          className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Customize
        </button>
      </div>

      {pinnedBudgets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-4">
              No budgets pinned yet.{' '}
              <button
                onClick={enterEdit}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Click Customize
              </button>{' '}
              to choose which budgets to track here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pinned budgets <span className="ml-1 text-xs">— this month</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pinnedBudgets.map(budget => {
              const pct = budget.percentUsed ?? 0
              const over = pct > 100
              return (
                <div key={budget.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate">{budget.name}</span>
                    <span className={`tabular-nums text-xs ${over ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.limit!)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    className={over ? '[&>div]:bg-red-500' : ''}
                  />
                  {over && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Over by {formatCurrency(Math.abs(budget.remaining!))}
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
