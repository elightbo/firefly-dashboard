import { PiggyBank } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetPiggyBanksQuery } from '@/store/api'
import { formatCurrency } from '@/lib/format'

export function PiggyBanksWidget() {
  const { data: banks, isLoading } = useGetPiggyBanksQuery()

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Savings Goals</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <PiggyBank className="h-4 w-4" /> Savings Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {banks?.length === 0 && (
          <p className="text-sm text-muted-foreground">No piggy banks found.</p>
        )}
        {banks?.map(bank => (
          <div key={bank.id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium truncate">{bank.name}</span>
              <span className="tabular-nums text-xs text-muted-foreground">
                {formatCurrency(bank.currentAmount)}
                {bank.targetAmount !== null && ` / ${formatCurrency(bank.targetAmount)}`}
              </span>
            </div>
            {bank.targetAmount !== null && (
              <Progress value={bank.progress ?? 0} />
            )}
            <div className="flex justify-between mt-0.5">
              {bank.progress !== null && (
                <span className="text-xs text-muted-foreground">{bank.progress.toFixed(0)}%</span>
              )}
              {bank.deadline && (
                <span className="text-xs text-muted-foreground ml-auto">
                  by {new Date(bank.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
