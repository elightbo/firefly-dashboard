import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetCompareSpendingQuery } from '@/store/api'
import { formatCurrency, formatPct } from '@/lib/format'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6',
]

export function SpendingChart() {
  const { data, isLoading } = useGetCompareSpendingQuery('month_to_date')

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    )
  }

  const chartData = Object.entries(data?.categoryTotals ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }))

  const trend = data?.trend ?? 0

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Spending by Category <span className="text-xs ml-1">— this month</span>
          </CardTitle>
          <span className={`text-sm font-semibold ${trend <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatPct(trend)} vs last period
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v, true)}
              width={55}
            />
            <Tooltip
              formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Spent']}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
