import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { Bot, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetMonthlyBudgetReportQuery, useChatMutation } from '@/store/api'
import { formatCurrency, formatPct } from '@/lib/format'

function monthName(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function Report() {
  const { data, isLoading } = useGetMonthlyBudgetReportQuery()
  const [chat, { isLoading: chatLoading }] = useChatMutation()
  const [analysis, setAnalysis] = useState<string | null>(null)

  async function handleAnalysis() {
    const result = await chat(
      'Generate a monthly budget planning report. Look at my spending over the last 3 months, ' +
      'identify trends or concerns in each budget category, and suggest realistic budget limits ' +
      'for next month. Be specific and actionable.'
    ).unwrap()
    setAnalysis(result.answer)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!data) return null

  const chartData = data.budgets
    .filter(b => b.avgSpend > 0 || (b.currentLimit ?? 0) > 0)
    .slice(0, 12)
    .map(b => ({
      name: b.name.length > 16 ? b.name.slice(0, 15) + '…' : b.name,
      fullName: b.name,
      'Avg Spend': b.avgSpend,
      'Suggested': b.suggestedLimit,
      'Current Limit': b.currentLimit ?? 0,
    }))

  const savingsRateColor = data.projectedSavingsRate >= 20
    ? 'text-emerald-600'
    : data.projectedSavingsRate >= 10
      ? 'text-amber-500'
      : 'text-red-500'

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monthly Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Budget plan for {monthName(data.reportMonth)} — based on{' '}
          {data.lookbackMonths.map(m => m.label).join(', ')}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.avgMonthlyIncome)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.lookbackMonths.length}-month average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Suggested Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totalSuggestedLimits)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              vs {formatCurrency(data.totalCurrentLimits)} current limits
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projected Savings Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${savingsRateColor}`}>
              {formatPct(data.projectedSavingsRate)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">if suggested limits are followed</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Spend vs Suggested Limit — top categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatCurrency(v, true)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name ?? '']}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Avg Spend" fill="#f43f5e" radius={[0, 3, 3, 0]} maxBarSize={14} />
              <Bar dataKey="Suggested" fill="#22c55e" radius={[0, 3, 3, 0]} maxBarSize={14} />
              <Bar dataKey="Current Limit" fill="#6366f1" radius={[0, 3, 3, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Budget</th>
                  {data.lookbackMonths.map(m => (
                    <th key={m.month} className="text-right py-2 px-2 font-medium">{m.label}</th>
                  ))}
                  <th className="text-right py-2 px-2 font-medium">Avg</th>
                  <th className="text-right py-2 px-2 font-medium">Current Limit</th>
                  <th className="text-right py-2 pl-2 font-medium text-emerald-700">Suggested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.budgets.filter(b => b.avgSpend > 0).map(b => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 font-medium truncate max-w-[160px]">{b.name}</td>
                    {b.monthlySpend.map((v, i) => (
                      <td key={i} className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                        {v > 0 ? formatCurrency(v) : '—'}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-right tabular-nums font-medium">
                      {formatCurrency(b.avgSpend)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                      {b.currentLimit != null ? formatCurrency(b.currentLimit) : '—'}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums font-semibold text-emerald-700">
                      {formatCurrency(b.suggestedLimit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-4">Total</td>
                  {data.lookbackMonths.map((_, i) => (
                    <td key={i} className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(
                        data.budgets.reduce((s, b) => s + (b.monthlySpend[i] ?? 0), 0)
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-right tabular-nums">
                    {formatCurrency(data.budgets.reduce((s, b) => s + b.avgSpend, 0))}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(data.totalCurrentLimits)}
                  </td>
                  <td className="py-2 pl-2 text-right tabular-nums text-emerald-700">
                    {formatCurrency(data.totalSuggestedLimits)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Claude analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Claude's Take</CardTitle>
            {!analysis && (
              <button
                onClick={handleAnalysis}
                disabled={chatLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {chatLoading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
                  : <><Bot className="h-3.5 w-3.5" /> Generate Analysis</>
                }
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {analysis ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{analysis}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Generate Analysis" to have Claude review your spending patterns and explain the suggestions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
