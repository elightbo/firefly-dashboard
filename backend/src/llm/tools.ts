import type Anthropic from '@anthropic-ai/sdk';

const PERIODS = ['month_to_date', 'year_to_date', 'last_30_days', 'last_90_days', 'year'] as const;

const periodProp = {
  type: 'string' as const,
  enum: [...PERIODS],
  description: 'Reporting period. Defaults to month_to_date.',
};

export const tools: Anthropic.Tool[] = [
  {
    name: 'get_net_worth',
    description: 'Get the current net worth across all asset accounts plus a 30-day percentage trend.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_piggy_banks',
    description: 'List all piggy banks / savings goals with their current amount, target, and progress. Use this first when the user mentions a piggy bank by name to look up its ID.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_piggy_bank_status',
    description: 'Get detailed status and progress for a specific piggy bank by ID.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Piggy bank ID (use list_piggy_banks to find it).' },
      },
      required: ['id'],
    },
  },
  {
    name: 'compare_spending',
    description: 'Compare spending by category for a period vs the equivalent previous period. Returns category totals and an overall trend percentage.',
    input_schema: {
      type: 'object',
      properties: { period: periodProp },
      required: [],
    },
  },
  {
    name: 'analyze_income_allocation',
    description: 'Analyze how income was split between spending and savings. Returns income, spending, net savings, and savings rate.',
    input_schema: {
      type: 'object',
      properties: { period: periodProp },
      required: [],
    },
  },
  {
    name: 'list_budgets',
    description: 'List all budgets with their current month limit, amount spent, and remaining. Use this when the user asks about budgets generally or to find a budget by name.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_budget_status',
    description: 'Get detailed status for a specific budget by ID or name.',
    input_schema: {
      type: 'object',
      properties: {
        id_or_name: { type: 'string', description: 'Budget ID or partial name (case-insensitive).' },
      },
      required: ['id_or_name'],
    },
  },
  {
    name: 'get_tagged_spending',
    description: 'Get all spending tagged with a specific tag for a period. Useful for tracking spending on a specific vehicle, project, or category.',
    input_schema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'The exact tag to filter by.' },
        period: periodProp,
      },
      required: ['tag'],
    },
  },
  {
    name: 'remember_fact',
    description: 'Persist a fact about the user\'s financial setup or preferences so it can be recalled in future conversations. Use this when the user shares something worth remembering (e.g. "I track spending via budgets, not categories", "my emergency fund target is 6 months of expenses").',
    input_schema: {
      type: 'object',
      properties: {
        fact: { type: 'string', description: 'The fact to remember, written as a clear statement.' },
      },
      required: ['fact'],
    },
  },
];
