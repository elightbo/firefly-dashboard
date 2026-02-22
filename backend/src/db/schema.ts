import {
  pgTable,
  text,
  numeric,
  date,
  timestamp,
  boolean,
  serial,
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
