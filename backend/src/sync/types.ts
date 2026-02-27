// ---------------------------------------------------------------------------
// Firefly III API v1 response shapes
// ---------------------------------------------------------------------------

export interface Pagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface Meta {
  pagination: Pagination;
}

export interface FireflyResponse<T> {
  data: T[];
  meta: Meta;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
export interface FireflyAccountAttributes {
  name: string;
  type: string;
  current_balance: string;
  currency_code: string;
  active: boolean;
}

export interface FireflyAccount {
  type: 'accounts';
  id: string;
  attributes: FireflyAccountAttributes;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export interface FireflyTransactionJournal {
  transaction_journal_id: number;
  type: string;
  date: string;
  amount: string;
  description: string;
  notes: string | null;
  source_id: number;
  destination_id: number;
  budget_id: number | null;
  budget_name: string | null;
  category_name: string | null;
  tags: string[];
  piggy_bank_id: number | null;
}

export interface FireflyTransactionGroupAttributes {
  group_title: string | null;
  transactions: FireflyTransactionJournal[];
}

export interface FireflyTransactionGroup {
  type: 'transactions';
  id: string;
  attributes: FireflyTransactionGroupAttributes;
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------
export interface FireflyBudgetAttributes {
  name: string;
  active: boolean;
}

export interface FireflyBudget {
  type: 'budgets';
  id: string;
  attributes: FireflyBudgetAttributes;
}

export interface FireflyBudgetLimitAttributes {
  start: string;
  end: string;
  amount: string;
  period: string | null;
  spent: Array<{ sum: string }>;
}

export interface FireflyBudgetLimit {
  type: 'budget_limits';
  id: string;
  attributes: FireflyBudgetLimitAttributes;
}

// ---------------------------------------------------------------------------
// Piggy Banks
// ---------------------------------------------------------------------------
export interface FireflyPiggyBankAttributes {
  name: string;
  target_amount: string;
  current_amount: string;
  target_date: string | null;
  notes: string | null;
}

export interface FireflyPiggyBank {
  type: 'piggy_banks';
  id: string;
  attributes: FireflyPiggyBankAttributes;
}

// ---------------------------------------------------------------------------
// Piggy Bank Events
// Events link transaction journals to piggy banks. The regular transaction
// list does not reliably return piggy_bank_id, so we use this endpoint instead.
// ---------------------------------------------------------------------------
export interface FireflyPiggyBankEventAttributes {
  transaction_journal_id: number;
  amount: string;
}

export interface FireflyPiggyBankEvent {
  type: 'piggy_bank_events';
  id: string;
  attributes: FireflyPiggyBankEventAttributes;
}
