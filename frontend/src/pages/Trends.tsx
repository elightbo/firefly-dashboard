import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetMonthlyOverviewQuery, useGetMonthlyBudgetSpendingQuery } from '@/store/api'
import { formatCurrency } from '@/lib/format'

const BUDGET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#14b8a6', '#0ea5e9', '#f43f5e',
  '#94a3b8', // Other
]

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function OverviewChart() {
  const { data, isLoading } = useGetMonthlyOverviewQuery()

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Income vs Spending</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    )
  }

  const chartData = (data ?? []).map(p => ({
    month: monthLabel(p.month),
    Income: p.income,
    Spending: p.spending,
    'Savings Rate': p.savingsRate,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Income vs Spending — last 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="money"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v, true)}
              width={58}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={40}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value, name) =>
                name === 'Savings Rate'
                  ? [`${value ?? 0}%`, name ?? '']
                  : [formatCurrency(Number(value ?? 0)), name ?? '']
              }
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="money" dataKey="Income" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar yAxisId="money" dataKey="Spending" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="Savings Rate"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function BudgetBreakdownChart() {
  const { data, isLoading } = useGetMonthlyBudgetSpendingQuery()

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Spending by Budget</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    )
  }

  const budgets = data?.budgets ?? []
  const chartData = (data?.months ?? []).map(m => ({
    month: monthLabel(m.month),
    ...m.totals,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Spending by Budget — last 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v, true)}
              width={58}
            />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name ?? '']}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {budgets.map((budget, i) => (
              <Bar
                key={budget}
                dataKey={budget}
                stackId="a"
                fill={BUDGET_COLORS[i % BUDGET_COLORS.length]}
                radius={i === budgets.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function Trends() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
      <OverviewChart />
      <BudgetBreakdownChart />
    </div>
  )
}
