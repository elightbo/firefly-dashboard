import type { FastifyInstance } from 'fastify';
import {
  getNetWorth,
  getPiggyBankStatus,
  listPiggyBanks,
  compareSpending,
  analyzeIncomeAllocation,
  getBudgetStatus,
  listBudgets,
  getTaggedSpending,
  getMonthlyOverview,
  getMonthlyBudgetSpending,
  getMonthlyBudgetReport,
  getPayStubSummary,
  getNetWorthHistory,
  getVehicleSpending,
  getVehicleMonthlySpending,
  type Period,
} from '../functions/index.js';

const PERIODS = ['month_to_date', 'year_to_date', 'last_30_days', 'last_90_days', 'year'];

const periodParam = {
  type: 'string',
  enum: PERIODS,
  default: 'month_to_date',
  description: 'Reporting period',
};

export async function functionRoutes(app: FastifyInstance) {
  // GET /functions/net-worth
  app.get('/functions/net-worth', {
    schema: {
      tags: ['Functions'],
      summary: 'Get current net worth and 30-day trend',
    },
  }, async () => getNetWorth());

  // GET /functions/piggy-banks
  app.get('/functions/piggy-banks', {
    schema: {
      tags: ['Functions'],
      summary: 'List all piggy banks',
    },
  }, async () => listPiggyBanks());

  // GET /functions/piggy-banks/:id
  app.get<{ Params: { id: string } }>('/functions/piggy-banks/:id', {
    schema: {
      tags: ['Functions'],
      summary: 'Get piggy bank status and progress',
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req) => getPiggyBankStatus(req.params.id));

  // GET /functions/compare-spending
  app.get<{ Querystring: { period?: Period } }>('/functions/compare-spending', {
    schema: {
      tags: ['Functions'],
      summary: 'Compare spending by category vs previous period',
      querystring: { type: 'object', properties: { period: periodParam } },
    },
  }, async (req) => compareSpending(req.query.period));

  // GET /functions/income-allocation
  app.get<{ Querystring: { period?: Period } }>('/functions/income-allocation', {
    schema: {
      tags: ['Functions'],
      summary: 'Analyze income vs spending vs net savings',
      querystring: { type: 'object', properties: { period: periodParam } },
    },
  }, async (req) => analyzeIncomeAllocation(req.query.period));

  // GET /functions/budgets
  app.get('/functions/budgets', {
    schema: {
      tags: ['Functions'],
      summary: 'List all budgets with current month status',
    },
  }, async () => listBudgets());

  // GET /functions/budgets/:idOrName
  app.get<{ Params: { idOrName: string } }>('/functions/budgets/:idOrName', {
    schema: {
      tags: ['Functions'],
      summary: 'Get budget status by ID or name (case-insensitive)',
      params: { type: 'object', properties: { idOrName: { type: 'string' } } },
    },
  }, async (req) => getBudgetStatus(req.params.idOrName));

  // GET /functions/tagged-spending
  app.get<{ Querystring: { tag: string; period?: Period } }>('/functions/tagged-spending', {
    schema: {
      tags: ['Functions'],
      summary: 'Get spending filtered by tag',
      querystring: {
        type: 'object',
        required: ['tag'],
        properties: {
          tag: { type: 'string', description: 'Tag to filter by' },
          period: periodParam,
        },
      },
    },
  }, async (req) => getTaggedSpending(req.query.tag, req.query.period));

  // GET /functions/monthly-overview
  app.get<{ Querystring: { months?: number } }>('/functions/monthly-overview', {
    schema: {
      tags: ['Functions'],
      summary: 'Monthly income, spending, and savings rate for the last N months',
      querystring: {
        type: 'object',
        properties: {
          months: { type: 'integer', minimum: 1, maximum: 24, default: 12, description: 'Number of months to return' },
        },
      },
    },
  }, async (req) => getMonthlyOverview(req.query.months));

  // GET /functions/budget-report
  app.get<{ Querystring: { lookback?: number; targetMonth?: string } }>('/functions/budget-report', {
    schema: {
      tags: ['Functions'],
      summary: 'Monthly budget planning report — averages, suggested limits, projected savings rate',
      querystring: {
        type: 'object',
        properties: {
          lookback: { type: 'integer', minimum: 1, maximum: 12, default: 3, description: 'Number of complete months to average over' },
          targetMonth: { type: 'string', description: 'Month to plan for in YYYY-MM format. Defaults to next month.' },
        },
      },
    },
  }, async (req) => getMonthlyBudgetReport(req.query.lookback, req.query.targetMonth));

  // GET /functions/monthly-budget-spending
  app.get<{ Querystring: { months?: number } }>('/functions/monthly-budget-spending', {
    schema: {
      tags: ['Functions'],
      summary: 'Monthly spending broken down by budget for the last N months',
      querystring: {
        type: 'object',
        properties: {
          months: { type: 'integer', minimum: 1, maximum: 24, default: 12, description: 'Number of months to return' },
        },
      },
    },
  }, async (req) => getMonthlyBudgetSpending(req.query.months));

  // GET /functions/net-worth-history
  app.get<{ Querystring: { months?: number } }>('/functions/net-worth-history', {
    schema: {
      tags: ['Functions'],
      summary: 'Historical net worth snapshots (one per sync day)',
      querystring: {
        type: 'object',
        properties: {
          months: { type: 'integer', minimum: 1, maximum: 60, default: 12, description: 'Number of months of history to return' },
        },
      },
    },
  }, async (req) => getNetWorthHistory(req.query.months));

  // GET /functions/pay-stub-summary
  app.get<{ Querystring: { period?: Period } }>('/functions/pay-stub-summary', {
    schema: {
      tags: ['Functions'],
      summary: 'Household gross income and pre-tax savings summary for a period',
      querystring: {
        type: 'object',
        properties: { period: periodParam },
      },
    },
  }, async (req) => getPayStubSummary(req.query.period));

  // GET /functions/vehicle-monthly-spending
  app.get<{ Querystring: { months?: number } }>('/functions/vehicle-monthly-spending', {
    schema: {
      tags: ['Functions'],
      summary: 'Monthly spending per vehicle for the last N months',
      querystring: {
        type: 'object',
        properties: {
          months: { type: 'integer', minimum: 1, maximum: 24, default: 12 },
        },
      },
    },
  }, async (req) => getVehicleMonthlySpending(req.query.months));

  // GET /functions/vehicle-spending
  app.get<{ Querystring: { vehicleId: string; period?: Period } }>('/functions/vehicle-spending', {
    schema: {
      tags: ['Functions'],
      summary: 'Get spending for a vehicle across all its tags',
      querystring: {
        type: 'object',
        required: ['vehicleId'],
        properties: {
          vehicleId: { type: 'string', description: 'Vehicle ID' },
          period: periodParam,
        },
      },
    },
  }, async (req) => getVehicleSpending(parseInt(req.query.vehicleId, 10), req.query.period));
}
