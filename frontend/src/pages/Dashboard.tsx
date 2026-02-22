import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import { BudgetsWidget } from '@/components/dashboard/BudgetsWidget'
import { PiggyBanksWidget } from '@/components/dashboard/PiggyBanksWidget'
import { IncomeAllocationCard } from '@/components/dashboard/IncomeAllocationCard'
import { SpendingChart } from '@/components/dashboard/SpendingChart'

export function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      {/* Top row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NetWorthCard />
        <IncomeAllocationCard />
        <PiggyBanksWidget />
      </div>
      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SpendingChart />
        <BudgetsWidget />
      </div>
    </div>
  )
}
