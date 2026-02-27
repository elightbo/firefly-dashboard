import {
  getNetWorth,
  listPiggyBanks,
  getPiggyBankStatus,
  compareSpending,
  analyzeIncomeAllocation,
  listBudgets,
  getBudgetStatus,
  getTaggedSpending,
  rememberFact,
  listMemoriesWithIds,
  forgetMemory,
  updateMemory,
  getPayStubSummary,
  listPayStubs,
  getNetWorthHistory,
  listVehicles,
  getVehicleSpending,
  type Period,
} from '../functions/index.js';

type ToolInput = Record<string, unknown>;

// Executes a whitelisted tool by name with the input Claude provided.
// Throws if the tool name is not recognized.
export async function dispatchTool(name: string, input: ToolInput): Promise<unknown> {
  switch (name) {
    case 'get_net_worth':
      return getNetWorth();

    case 'list_piggy_banks':
      return listPiggyBanks();

    case 'get_piggy_bank_status':
      return getPiggyBankStatus(input.id as string);

    case 'compare_spending':
      return compareSpending(input.period as Period | undefined);

    case 'analyze_income_allocation':
      return analyzeIncomeAllocation(input.period as Period | undefined);

    case 'list_budgets':
      return listBudgets();

    case 'get_budget_status':
      return getBudgetStatus(input.id_or_name as string);

    case 'get_tagged_spending':
      return getTaggedSpending(input.tag as string, input.period as Period | undefined);

    case 'remember_fact':
      return rememberFact(input.fact as string);

    case 'list_memories':
      return listMemoriesWithIds();

    case 'forget_memory':
      return forgetMemory(input.id as number);

    case 'update_memory':
      return updateMemory(input.id as number, input.content as string);

    case 'get_net_worth_history':
      return getNetWorthHistory(input.months as number | undefined);

    case 'get_pay_stub_summary':
      return getPayStubSummary(input.period as Period | undefined);

    case 'list_pay_stubs':
      return listPayStubs(input.limit as number | undefined);

    case 'list_vehicles':
      return listVehicles();

    case 'get_vehicle_spending':
      return getVehicleSpending(input.vehicle_id as number, input.period as Period | undefined);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
