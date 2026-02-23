import {
  pgTable,
  text,
  numeric,
  date,
  timestamp,
  boolean,
  serial,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // asset, expense, revenue, liability, etc.
  balance: numeric('balance', { precision: 15, scale: 4 }).notNull().default('0'),
  currencyCode: text('currency_code').notNull().default('USD'),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Piggy Banks
// ---------------------------------------------------------------------------
export const piggyBanks = pgTable('piggy_banks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetAmount: numeric('target_amount', { precision: 15, scale: 4 }),
  currentAmount: numeric('current_amount', { precision: 15, scale: 4 }).notNull().default('0'),
  deadline: date('deadline'),
  tags: text('tags').array().notNull().default([]),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  piggyBankId: text('piggy_bank_id').references(() => piggyBanks.id, { onDelete: 'set null' }),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 15, scale: 4 }).notNull(),
  type: text('type').notNull(), // withdrawal, deposit, transfer, etc.
  budgetName: text('budget_name'),
  category: text('category'),
  description: text('description'),
  tags: text('tags').array().notNull().default([]),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Memories — facts the LLM has been asked to remember about the user's setup
// ---------------------------------------------------------------------------
export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Users — local authentication
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id:           serial('id').primaryKey(),
  username:     text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  usernameIdx: uniqueIndex('users_username_idx').on(table.username),
}));

// ---------------------------------------------------------------------------
// User Preferences — per-user key/value store (e.g. pinned budgets)
// ---------------------------------------------------------------------------
export const userPreferences = pgTable('user_preferences', {
  id:     serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key:    text('key').notNull(),
  value:  text('value').notNull(),
}, (table) => ({
  userKeyIdx: uniqueIndex('user_preferences_user_key_idx').on(table.userId, table.key),
}));

// ---------------------------------------------------------------------------
// Net Worth Snapshots — one row per day written by sync, used for history chart
// ---------------------------------------------------------------------------
export const netWorthSnapshots = pgTable('net_worth_snapshots', {
  id:        serial('id').primaryKey(),
  date:      date('date').notNull().unique(),
  total:     numeric('total', { precision: 15, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Pay Stubs — manual gross income + pre-tax deductions per earner
// ---------------------------------------------------------------------------
export const payStubs = pgTable('pay_stubs', {
  id:            serial('id').primaryKey(),
  userId:        integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  payDate:       date('pay_date').notNull(),
  employer:      text('employer').notNull(),
  gross:         numeric('gross', { precision: 15, scale: 4 }).notNull(),
  retirement:    numeric('retirement', { precision: 15, scale: 4 }).notNull().default('0'),
  employerMatch: numeric('employer_match', { precision: 15, scale: 4 }).notNull().default('0'),
  stockOptions:  numeric('stock_options', { precision: 15, scale: 4 }).notNull().default('0'),
  notes:         text('notes'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// LLM Configs — user-managed list of AI providers; one is active at a time
// ---------------------------------------------------------------------------
export const llmConfigs = pgTable('llm_configs', {
  id:        serial('id').primaryKey(),
  name:      text('name').notNull(),
  provider:  text('provider').notNull(), // 'anthropic' | 'openai_compatible'
  baseUrl:   text('base_url'),           // required for openai_compatible (e.g. http://ollama:11434)
  apiKey:    text('api_key'),            // optional for local Ollama
  model:     text('model').notNull(),
  isActive:  boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------
export const budgets = pgTable('budgets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // Firefly budgets define limits per period via budget_limits; we store latest.
  period: text('period'), // monthly, weekly, etc.
  limit: numeric('limit', { precision: 15, scale: 4 }),
  spent: numeric('spent', { precision: 15, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
