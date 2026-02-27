# Future Ideas

Parking lot for features to build later. Not prioritized.

---

## Monthly budget report

A beginning-of-month report that analyzes the prior month and suggests budget amounts for the coming month.

**What it would do:**
- Look at actual spending per budget over the last 3–6 months
- Factor in income trends
- Suggest budget limits for each category (e.g. "You averaged $520 on Groceries over the last 3 months — suggested limit: $500")
- Flag categories that are consistently over budget
- Highlight areas where you could trim to hit a savings rate target

**Implementation options:**
- **LLM-generated** — add a `generate_monthly_report(month)` tool that calls `getMonthlyBudgetSpending` + `getMonthlyOverview` and asks Claude to reason over the data and produce recommendations. No new schema needed.
- **Dedicated page** — a `/report` page in the UI that auto-runs at the start of each month, or has a "Generate Report" button
- **Scheduled email/notification** — cron job on the 1st of the month that generates and stores the report

**Visual report page (`/report`):**
- Budget-by-budget breakdown: last 3 month average vs suggested limit for the new month (editable before saving back to Firefly)
- Bar chart comparing suggested vs current limits side by side
- Summary stats: projected savings rate if suggestions are followed, total budgeted vs expected income
- LLM commentary below the visuals explaining the reasoning and flagging anything unusual
- "Apply to Firefly" button that pushes the new budget limits back via the API (future)

**Easiest starting point:** Add a "Generate monthly report" button to the Q&A console or dashboard that pre-fills the question and triggers the LLM. All the data is already available via existing tools.

---

## Pay stub tracking

**Problem:** The system only sees net pay hitting the bank. Everything that happens before that — taxes, 401k, HSA — is invisible. This means:
- Savings rate is understated (doesn't include pre-tax retirement contributions)
- "Gross income" is unknown
- Can't answer "what % of my gross do I take home?"

**Proposed `pay_stubs` table:**
```
id            serial PK
pay_date      date
employer      text
gross         numeric
federal_tax   numeric
state_tax     numeric
fica          numeric          -- Social Security + Medicare
retirement_401k numeric
employer_401k_match numeric   -- free money, easy to forget
hsa           numeric
other_pretax  numeric
net           numeric
```

**New LLM tools this would unlock:**
- `get_ytd_retirement_contributions` — 401k + HSA + employer match
- `get_true_savings_rate(period)` — (net savings + 401k + HSA + match) / gross
- `get_effective_tax_rate(period)` — (federal + state + fica) / gross
- `get_gross_income(period)` — for real income allocation analysis

**Entry method:** Manual form in the UI (pay stubs don't come often). Could also parse ADP/Gusto exports if desired later.

---

## Trends page

Currently a stub at `/trends`. Ideas for what to put here:
- Net worth over time (monthly snapshots would need to be stored — currently we only have current balance)
- Spending by budget/category over trailing 12 months (bar chart)
- Savings rate trend over time
- Budget utilization heatmap (month × budget)

Note: some of these need historical snapshots. Could add a `net_worth_snapshots` table populated by the daily sync cron.

---

## Chat improvements

- **Streaming responses** — SSE from the `/chat` endpoint so the answer types in rather than appearing all at once. Anthropic SDK supports `stream: true`.
- **Conversation history** — currently each chat turn is stateless. Could persist message history per session so Claude has context across multiple questions in a conversation.
- **Local LLM** — user expressed interest in swapping Claude for a local model (Ollama etc.). The dispatch/tools layer is model-agnostic; would just need an Ollama-compatible client and tool-use support in the model.

---

## Docker / Unraid deployment

Phase 7 from the original plan — not started yet:
- Multi-stage Dockerfile for backend (build TS → run JS)
- Nginx-served static frontend or backend serves it
- `docker-compose.yml` already has `full` profile for backend + frontend
- Unraid Community Applications template

---

## User management + Cloudflare Tunnel access

**Goal:** Expose the dashboard externally via Cloudflare Tunnel so family members can access it.

**Features needed:**
- **Authentication** — basic auth or OAuth (Cloudflare Access can handle this in front of the tunnel for free, no app changes needed for simple use cases)
- **Per-user views** — e.g. a spouse-friendly page that shows only the budget categories they care about, saved as a preference per user
- **Read-only mode** — external users shouldn't be able to trigger syncs or write memories

**Simplest path:**
- Use Cloudflare Access (Zero Trust) in front of the tunnel for auth — no backend changes needed
- Add a `user_preferences` table: `user_id`, `key`, `value` (JSON)
- Add a `/my-budgets` page where a user can pin the budget categories they want to track
- The pinned view shows just those categories with current spend vs limit

**Notes:**
- Cloudflare Tunnel is already likely running on Unraid if using other self-hosted apps
- Cloudflare Access free tier supports up to 50 users with email OTP — no passwords needed

---

## Recurring transaction detection

Automatically identify subscriptions and regular bills from transaction history.

**What it would do:**
- Scan withdrawals for transactions with the same description appearing on a regular cadence (monthly, weekly, annual)
- Surface a "Subscriptions" view showing detected recurring charges with amount and last charged date
- Flag if a known recurring charge is missing (e.g. Netflix didn't charge this month)
- New LLM tool: `list_recurring_transactions` — returns detected recurrings with frequency and monthly cost

**Implementation sketch:**
- Query transactions grouped by description, look for N+ occurrences with consistent spacing
- Store detected recurrings in a `recurring_transactions` table (or compute on the fly)
- Useful for "what subscriptions am I paying for?" Q&A

---

## Budget trend alerts

Proactive warnings when spending pace is on track to exceed a budget limit.

**What it would do:**
- For each budget with a monthly limit, compute: (spent so far / days elapsed) × days in month = projected spend
- Flag budgets where projection > limit (or > some threshold, e.g. 90%)
- Show on the dashboard as a warning banner or badge on the My Budgets page
- New LLM tool: `get_budget_alerts` — returns budgets at risk for the current month

**Implementation sketch:**
- Pure query function, no schema changes needed
- Could add a dismissible alert card to the Dashboard
- Threshold configurable via user preferences

---

## Net worth projections

Simple forward trajectory based on recent savings rate.

**What it would do:**
- Take average monthly net savings over the last 3/6 months
- Project net worth forward 1, 3, 5 years assuming that rate continues
- Overlay on the net worth history chart as a dotted continuation line
- New LLM tool: `get_net_worth_projection(years)` — returns projected values at key intervals

**Implementation sketch:**
- Extend the net worth history chart in Trends with a projection segment
- Use `getNetWorthHistory` + `getMonthlyOverview` as data sources — no new schema needed
- Could factor in known recurring expenses and expected income changes

---

## Firefly webhook on save

Trigger a sync automatically when a transaction is created/updated in Firefly, instead of polling. Natural foundation for notifications — webhook fires → sync → alert.

**What it would do:**
- Firefly III supports webhooks — POST to a URL when transactions are created, updated, or deleted
- Backend receives the webhook and runs a targeted sync (just the affected transaction) or a lightweight full sync
- Near-real-time data instead of waiting for the daily cron or manual sync

**Implementation sketch:**
- Add `POST /api/webhook/firefly` endpoint — verifies Firefly's HMAC signature, enqueues/runs sync
- Configure the webhook URL in Firefly III admin panel pointing to the tunnel URL
- Could do a targeted upsert of just the changed transaction rather than a full re-fetch
- Once webhook is live, hook in notification triggers (see Pushover Notifications below)

---

## Pushover notifications

Push alerts to phone via Pushover when interesting things happen. Depends on webhook being in place for real-time triggers; daily cron can handle digest-style alerts.

**Candidate triggers:**
- Transaction over a threshold (e.g. any charge > $100) — fires on webhook
- Budget exceeds X% of limit mid-month — fires on webhook or daily cron check
- Large or unusual recurring charge (amount changed vs last month)
- Daily/weekly spending digest — cron job summarizing yesterday or the past week
- Net worth milestone crossed (e.g. every $10k increment)
- Sync failure — so you know Firefly is unreachable

**Implementation sketch:**
- Add `PUSHOVER_USER_KEY` + `PUSHOVER_API_TOKEN` to `.env`
- Simple `notify(title, message, priority?)` helper that POSTs to `https://api.pushover.net/1/messages.json`
- Notification rules stored in `user_preferences` or hardcoded thresholds to start
- Per-user opt-in (one user might want alerts, another might not)

**Pushover specifics:**
- Free tier covers personal use (up to 10k messages/month)
- Supports priority levels: -1 (quiet), 0 (normal), 1 (high), 2 (requires acknowledgement)
- Supports a URL in the notification — could deep-link into the dashboard

---

## Misc

- **System prompt tuning** — as edge cases are discovered, refine the system prompt and tool descriptions to guide Claude toward better answers
- **Budget period awareness** — budgets in Firefly can be weekly/monthly/custom; the current implementation uses whatever the latest limit period is
- **Multi-currency** — schema stores `currency_code` but nothing converts; all math assumes one currency
