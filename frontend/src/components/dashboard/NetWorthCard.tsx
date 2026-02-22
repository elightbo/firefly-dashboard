import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetNetWorthQuery } from '@/store/api'
import { formatCurrency, formatPct } from '@/lib/format'

export function NetWorthCard() {
  const { data, isLoading } = useGetNetWorthQuery()

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Net Worth</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    )
  }

  const trend = data?.trend ?? 0
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  const assets = data?.accounts.filter(a => a.type === 'asset') ?? []
  const liabilities = data?.accounts.filter(a => a.type === 'liabilities') ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tracking-tight">
          {formatCurrency(data?.total ?? 0)}
        </p>
        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          <TrendIcon className="h-4 w-4" />
          <span>{formatPct(trend)} vs 30 days ago</span>
        </div>

        {assets.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assets</p>
            {assets.map(a => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate">{a.name}</span>
                <span className="font-medium tabular-nums text-emerald-600">{formatCurrency(a.balance)}</span>
              </div>
            ))}
          </div>
        )}

        {liabilities.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Liabilities</p>
            {liabilities.map(a => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate">{a.name}</span>
                <span className="font-medium tabular-nums text-red-500">{formatCurrency(a.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
