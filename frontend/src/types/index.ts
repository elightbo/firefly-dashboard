export interface NetWorthResult {
  total: number
  trend: number
  accounts: Array<{ id: string; name: string; type: string; balance: number }>
}

export interface PiggyBankStatusResult {
  id: string
  name: string
  currentAmount: number
  targetAmount: number | null
  progress: number | null
  deadline: string | null
}

export interface BudgetStatusResult {
  id: string
  name: string
  period: string | null
  limit: number | null
  spent: number
  remaining: number | null
  percentUsed: number | null
}

export interface IncomeAllocationResult {
  period: { start: string; end: string }
  income: number
  spending: number
  netSavings: number
  savingsRate: number
}

export interface CompareSpendingResult {
  period: { start: string; end: string }
  categoryTotals: Record<string, number>
  totalSpending: number
  trend: number
}

export interface ChatResult {
  answer: string
  toolsUsed: string[]
}

export interface MonthlyOverviewPoint {
  month: string
  income: number
  spending: number
  savingsRate: number
}

export interface BudgetReportItem {
  id: string
  name: string
  currentLimit: number | null
  monthlySpend: number[]
  avgSpend: number
  suggestedLimit: number
}

export interface MonthlyBudgetReportResult {
  reportMonth: string
  lookbackMonths: Array<{ month: string; label: string }>
  avgMonthlyIncome: number
  budgets: BudgetReportItem[]
  totalCurrentLimits: number
  totalSuggestedLimits: number
  projectedSavingsRate: number
}

export interface MonthlyBudgetSpendingResult {
  months: Array<{ month: string; totals: Record<string, number> }>
  budgets: string[]
}

export type Period = 'month_to_date' | 'year_to_date' | 'last_30_days' | 'last_90_days' | 'year'
