import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetIncomeAllocationQuery } from '@/store/api'
import { formatCurrency, formatPct } from '@/lib/format'

export function IncomeAllocationCard() {
  const { data, isLoading } = useGetIncomeAllocationQuery('month_to_date')

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Income Allocation</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  const rows = [
    { label: 'Income', value: data?.income ?? 0, className: 'text-emerald-600' },
    { label: 'Spending', value: data?.spending ?? 0, className: 'text-red-500' },
    { label: 'Net Savings', value: data?.netSavings ?? 0, className: (data?.netSavings ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Income Allocation <span className="text-xs ml-1">— this month</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map(({ label, value, className }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`font-semibold tabular-nums text-sm ${className}`}>
                {formatCurrency(value)}
              </span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="text-sm font-medium">Savings Rate</span>
            <span className="font-bold tabular-nums">
              {formatPct(data?.savingsRate ?? 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
