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
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetMonthlyOverviewQuery, useGetMonthlyBudgetSpendingQuery, useGetNetWorthHistoryQuery, useGetBudgetsQuery } from '@/store/api'
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

function NetWorthHistoryChart() {
  const { data, isLoading } = useGetNetWorthHistoryQuery(12)

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Net Worth History</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Net Worth History</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No snapshots yet — trigger a sync to record today's net worth.
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(p => ({ date: p.date, 'Net Worth': p.total }))
  const values = data.map(p => p.total)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || Math.abs(max) * 0.05 || 1000

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth — last 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d: string) => {
                const [year, month] = d.split('-')
                return new Date(Number(year), Number(month) - 1, 1)
                  .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v, true)}
              width={64}
              domain={[min - padding, max + padding]}
            />
            <Tooltip
              formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Net Worth']}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="Net Worth"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#nwGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Returns background + text colors for a heatmap cell based on % of budget used.
function cellStyle(pct: number | null): { backgroundColor: string; color: string } {
  if (pct === null || pct <= 0) {
    return { backgroundColor: 'hsl(220, 13%, 93%)', color: 'transparent' }
  }
  const hue = Math.max(0, 120 - Math.min(pct, 120)) // 120=green → 0=red
  const overBudget = pct > 100
  return {
    backgroundColor: `hsl(${hue}, 62%, ${overBudget ? 46 : 60}%)`,
    color: overBudget ? '#fff' : '#1a1a1a',
  }
}

const LEGEND_STOPS = [0, 30, 60, 80, 95, 110]

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function BudgetHeatmapChart() {
  const { data: spendingData, isLoading: spendingLoading } = useGetMonthlyBudgetSpendingQuery()
  const { data: budgetData, isLoading: budgetsLoading } = useGetBudgetsQuery()

  if (spendingLoading || budgetsLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Budget Utilization</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    )
  }

  const months = spendingData?.months ?? []
  const budgets = spendingData?.budgets ?? []

  if (months.length === 0 || budgets.length === 0) return null

  const thisMonth = currentMonthKey()

  // Map budget name → current monthly limit (null = no limit set)
  const limitByName = new Map<string, number>()
  for (const b of (budgetData ?? [])) {
    if (b.limit !== null) limitByName.set(b.name, b.limit)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Budget Utilization — % of monthly limit used
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max space-y-0.5">

            {/* Month header */}
            <div className="flex">
              <div className="w-36 shrink-0" />
              {months.map(m => {
                const isCurrent = m.month === thisMonth
                return (
                  <div
                    key={m.month}
                    className={`w-12 mx-px text-center text-[10px] pb-1 leading-tight ${isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
                  >
                    {monthLabel(m.month)}
                    {isCurrent && <span className="block text-[8px] leading-none mt-px opacity-70">now</span>}
                  </div>
                )
              })}
            </div>

            {/* One row per budget */}
            {budgets.map(budget => {
              const limit = limitByName.get(budget) ?? null
              return (
                <div key={budget} className="flex items-center gap-0">
                  <div
                    className="w-36 shrink-0 text-xs text-right pr-2.5 text-muted-foreground truncate"
                    title={budget}
                  >
                    {budget}
                  </div>
                  {months.map(m => {
                    const isCurrent = m.month === thisMonth
                    const spend = m.totals[budget] ?? 0
                    const pct = limit !== null && limit > 0 ? (spend / limit) * 100 : null
                    const style = cellStyle(pct)
                    const progressNote = isCurrent ? ' · in progress' : ''
                    const tooltip = limit !== null
                      ? `${budget} · ${monthLabel(m.month)}${progressNote}\n${formatCurrency(spend)} of ${formatCurrency(limit)} (${Math.round(pct ?? 0)}%)`
                      : `${budget} · ${monthLabel(m.month)}${progressNote}\n${formatCurrency(spend)} (no limit set)`
                    return (
                      <div
                        key={m.month}
                        className={`w-12 h-8 mx-px rounded-sm flex items-center justify-center text-[10px] font-semibold leading-none${isCurrent ? ' ring-1 ring-primary/50 ring-offset-1' : ''}`}
                        style={style}
                        title={tooltip}
                      >
                        {pct !== null && spend > 0 ? `${Math.round(pct)}%` : ''}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Legend */}
            <div className="flex items-center gap-2 pt-3 ml-36 pl-2.5">
              <span className="text-[10px] text-muted-foreground">0%</span>
              {LEGEND_STOPS.map(v => (
                <div
                  key={v}
                  className="w-6 h-3 rounded-sm"
                  style={{ backgroundColor: cellStyle(v > 0 ? v : null).backgroundColor }}
                />
              ))}
              <span className="text-[10px] text-muted-foreground">110%+</span>
              <span className="text-[10px] text-muted-foreground ml-3">— = no limit set</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
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
      <NetWorthHistoryChart />
      <OverviewChart />
      <BudgetBreakdownChart />
      <BudgetHeatmapChart />
    </div>
  )
}
