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

## Misc

- **System prompt tuning** — as edge cases are discovered, refine the system prompt and tool descriptions to guide Claude toward better answers
- **Budget period awareness** — budgets in Firefly can be weekly/monthly/custom; the current implementation uses whatever the latest limit period is
- **Multi-currency** — schema stores `currency_code` but nothing converts; all math assumes one currency
