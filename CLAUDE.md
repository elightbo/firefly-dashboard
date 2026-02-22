# Budget — Claude Dev Guide

Personal financial intelligence platform that syncs Firefly III data into a local Postgres reporting DB, exposes whitelisted query functions, uses Claude (tool use) for natural language Q&A, and presents a React dashboard.

---

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 24 (nvm) |
| Package manager | pnpm |
| Backend | Fastify 5 + TypeScript |
| ORM | Drizzle ORM (Postgres dialect) |
| Database | Postgres 16 (Docker) |
| LLM | Anthropic SDK — Claude tool use agentic loop |
| Frontend | React 19 + Vite + TypeScript |
| State / data fetching | Redux Toolkit + RTK Query |
| Routing | React Router v6 |
| UI | Tailwind v3 + shadcn/ui (components in `frontend/src/components/ui/`) |
| API docs | Scalar + @fastify/swagger (`/docs`) |

---

## Running locally

```bash
# 1. Start Postgres
docker compose up -d db

# 2. Backend (from /backend)
pnpm dev        # ts-node-dev, port 3001

# 3. Frontend (from /frontend)
pnpm dev        # Vite, port 5173 — proxies /api/* → localhost:3001
```

Trigger a manual sync:
```bash
curl -X POST http://localhost:3001/sync
```

Run migrations after schema changes:
```bash
cd backend
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## Environment

`backend/.env` (not committed — see `.env.example`):

```
DATABASE_URL=postgresql://budget:budget@localhost:5432/budget
FIREFLY_BASE_URL=http://firefly.home
FIREFLY_TOKEN=<personal access token from Firefly III>
ANTHROPIC_API_KEY=<key>
PORT=3001
CLAUDE_MODEL=claude-sonnet-4-6
# SYNC_START_DATE=2020-01-01   # optional full-history load
```

---

## Architecture decisions

### Firefly III auth — Personal Access Token (not OAuth)
Firefly's API is user-scoped. OAuth Client Credentials grants have no user context and return 401. PAT is the correct approach for self-hosted personal use.

### Sync strategy
`POST /sync` triggers a full upsert of all data. Transactions are fetched from `SYNC_START_DATE` (default: 1 year back). All account types are synced (not just asset) because Firefly auto-creates expense/revenue accounts and transactions reference them via FK.

### Piggy bank transactions
The regular `/transactions` endpoint does not reliably return `piggy_bank_id`. The sync builds a reverse map by fetching `/piggy-banks/{id}/events` for each piggy bank, then joins on `transaction_journal_id`.

### Spending grouping — budget over category
This user tracks spending via **budgets**, not categories. The `compare_spending` function uses `COALESCE(budget_name, category, 'Uncategorized')` so budget names appear as the primary grouping. This is stored on each transaction as `budget_name` (synced from `journal.budget_name` in the Firefly API response).

### LLM layer — whitelisted tools only
Claude can only call functions explicitly registered in `backend/src/llm/tools.ts`. The dispatch function in `backend/src/llm/dispatch.ts` is the gatekeeper — unknown tool names throw. Max 5 agentic rounds per chat turn.

### LLM memory
Claude can call `remember_fact(fact)` to persist facts about the user's setup to the `memories` table. All stored memories are injected into the system prompt at the start of every chat under "What you know about this user". Tell Claude things like "I track spending via budgets", "my emergency fund target is 6 months", etc. and it will remember them.

### Cache invalidation
RTK Query uses a single `'FinancialData'` tag on all queries. After sync, the AppShell calls `dispatch(api.util.invalidateTags(['FinancialData']))` to refetch everything.

### Docker Compose profiles
`backend` and `frontend` services are under the `full` profile so `docker compose up -d db` only starts Postgres during development.

---

## Project structure

```
budget/
├── docker-compose.yml
├── CLAUDE.md
├── IDEAS.md
├── plan.md
├── backend/
│   ├── drizzle/               # generated migrations
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts      # Drizzle schema (accounts, transactions, piggy_banks, budgets, memories)
│   │   │   └── index.ts       # db client
│   │   ├── sync/
│   │   │   ├── client.ts      # FireflyClient (PAT, paginated getAll)
│   │   │   ├── types.ts       # Firefly API response shapes
│   │   │   ├── syncAccounts.ts
│   │   │   ├── syncBudgets.ts
│   │   │   ├── syncPiggyBanks.ts
│   │   │   ├── syncTransactions.ts
│   │   │   ├── buildPiggyBankMap.ts
│   │   │   └── index.ts       # orchestrator
│   │   ├── functions/         # whitelisted query functions (what the LLM can call)
│   │   │   ├── getNetWorth.ts
│   │   │   ├── getPiggyBankStatus.ts
│   │   │   ├── compareSpending.ts
│   │   │   ├── analyzeIncomeAllocation.ts
│   │   │   ├── getBudgetStatus.ts
│   │   │   ├── getTaggedSpending.ts
│   │   │   ├── memory.ts      # rememberFact, listMemories
│   │   │   ├── utils.ts       # resolvePeriod, previousPeriod, toNum, pct
│   │   │   └── index.ts
│   │   ├── llm/
│   │   │   ├── chat.ts        # agentic loop, injects memories into system prompt
│   │   │   ├── dispatch.ts    # tool name → function gatekeeper
│   │   │   └── tools.ts       # Anthropic tool definitions
│   │   └── index.ts           # Fastify server, routes, cron
└── frontend/
    └── src/
        ├── components/
        │   ├── ui/            # shadcn/ui components (manually placed — CLI had path issues)
        │   ├── dashboard/     # NetWorthCard, BudgetsWidget, PiggyBanksWidget, etc.
        │   └── layout/        # AppShell (nav + sync button)
        ├── pages/             # Dashboard, QAConsole, Trends
        ├── store/
        │   └── api.ts         # RTK Query slice
        └── types/             # shared TypeScript types
```

---

## Known quirks

- **shadcn CLI** installed components to `frontend/@/components/ui/` instead of `frontend/src/components/ui/`. Components were manually moved. Don't re-run `shadcn init` — just add new components manually.
- **Empty JSON body on POST /sync**: Scalar sends `Content-Type: application/json` with no body. Handled via a custom `addContentTypeParser` in `src/index.ts` that accepts empty strings.
- **Firefly liability balances** are stored as negative numbers, so `sum(assets + liabilities)` gives correct net worth naturally.
- **Stale dev servers**: If something seems wrong after killing VS Code, check for lingering `pnpm dev` processes with `ps aux | grep pnpm`.
