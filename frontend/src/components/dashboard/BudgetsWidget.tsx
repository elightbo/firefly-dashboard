import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetBudgetsQuery } from '@/store/api'
import { formatCurrency } from '@/lib/format'

export function BudgetsWidget() {
  const { data: budgets, isLoading } = useGetBudgetsQuery()

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Budgets</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  const withLimits = budgets?.filter(b => b.limit !== null) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Budgets <span className="ml-1 text-xs">— this month</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {withLimits.length === 0 && (
          <p className="text-sm text-muted-foreground">No budgets with limits set.</p>
        )}
        {withLimits.map(budget => {
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
  )
}
