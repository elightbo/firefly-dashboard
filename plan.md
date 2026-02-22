# Firefly III AI Personal Reporting System

## Executive Summary
This system is a personal financial intelligence platform designed for **planning, insights, and natural language queries** using Firefly III data. Key points:

- **Purpose:** Track net worth, spending trends, budgets, goals, and piggy banks with AI-assisted explanations.
- **Data Source:** Firefly III API (accounts, transactions, budgets, goals, piggy banks, tags) synced into a local reporting DB.
- **Backend:** Node.js + Fastify + Drizzle ORM for DB queries and whitelisted functions.
- **Whitelisted Functions:** Predefined, safe DB functions returning structured JSON for the LLM.
- **LLM Layer:** Explains structured data in natural language; never queries DB directly.
- **Frontend:** React + TypeScript + RTK + React Router for dashboard, trends, and Q&A console.
- **Deployment:** Fully containerized for Unraid (Docker); backend, DB, frontend, optional LLM.
- **Version Control:** GitHub repository stores all code, migrations, Docker files, and documentation.
- **Scope:** Planning stage; incremental development anticipated; dashboard + Q&A interface optional but supported.

---

## Goal
Create a personal financial intelligence system using Firefly III data:
- Natural language question answering
- Dashboard visualizations
- Trend analysis, alerts, and piggy bank tracking
- Containerized deployment on Unraid

---

## Core Principles
- Local-first: all reporting runs on local DB, no live Firefly III calls except sync
- Whitelisted functions only: LLM interprets intent but cannot execute arbitrary queries
- Flexible frontend: combines Q&A console + dashboard widgets
- Modular: Docker-based deployment for easy Unraid installation

---

## Data Sources
- Firefly III REST API (v1)
  - Transactions
  - Accounts
  - Budgets
  - Goals
  - Piggy Banks
  - Tags
- Local reporting DB (synced daily)

---

## Reporting Database (v1)

**Tables / Objects**

### 1. Accounts
- `id` (string)  
- `name` (string)  
- `type` (checking, savings, credit, investment)  
- `balance` (number, latest snapshot)  

### 2. Piggy Banks
- `id` (string)  
- `name` (string)  
- `target_amount` (number)  
- `current_amount` (number)  
- `deadline` (date, optional)  
- `tags` (array of strings)  

### 3. Transactions
- `id` (string)  
- `account_id` (string)  
- `piggy_bank_id` (string, nullable)  
- `date` (ISO string)  
- `amount` (number)  
- `category` (string)  
- `description` (string)  
- `tags` (array of strings)  

### 4. Budgets
- `id` (string)  
- `category` (string)  
- `period` (monthly/weekly)  
- `limit` (number)  
- `spent` (number)  

### 5. Goals
- `id` (string)  
- `name` (string)  
- `target_amount` (number)  
- `current_amount` (number)  
- `deadline` (date)  

**Optional / Calculated**
- Net worth snapshots
- Spending trends / category aggregates

---

## Whitelisted Functions (v1)

| Function | Params | Returns | Description |
|----------|--------|---------|------------|
| `get_net_worth()` | none | `{ total: number, trend: number }` | Returns current net worth and trend |
| `get_goal_progress(goal_id)` | `goal_id: string` | `{ current: number, target: number, progress: % }` | Amount contributed toward goal |
| `compare_spending(period='month_to_date')` | `period: string` | `{ category_totals: { [category]: number }, trend: % }` | Compares spending trajectory to historical averages |
| `analyze_income_allocation()` | none | `{ savings: number, spending: number, investments: number }` | Shows where income went |
| `get_budget_status(category, period='month_to_date')` | `category: string`, `period: string` | `{ limit: number, spent: number, remaining: number }` | How you’re doing vs budget |
| `get_tagged_spending(tag, period)` | `tag: string`, `period: string` | `{ total: number, transactions: Transaction[] }` | Spending filtered by tag |
| `get_piggy_bank_status(piggy_bank_id)` | `piggy_bank_id: string` | `{ currentAmount: number, targetAmount: number, progress: % }` | Current balance & progress |

**Behavior**
- If function cannot answer: return message like `"Requested functionality not available. Available functions: ..."`

---

## Backend Architecture

- **Node.js + Fastify**  
  - Handles API endpoints for frontend & sync  
  - Executes whitelisted functions  

- **Drizzle ORM + SQLite/Postgres**  
  - Stores reporting DB with persistent volumes  
  - Type-safe access to transactions, budgets, piggy banks  

- **Daily Sync Job**  
  - Pulls data from Firefly III API  
  - Normalizes JSON → inserts/updates local DB  

- **LLM Layer**  
  - Converts structured outputs into natural language explanations  
  - Optional follow-ups & clarifications  

---

## Frontend Architecture

- **React + TypeScript + RTK + React Router**  
- **Pages / Views**:
  1. **Dashboard**  
     - Net worth & trend  
     - Piggy bank progress  
     - Budget overview  
     - Tagged spending & alerts
  2. **Q&A Console**  
     - Input natural language question → returns structured + explained answer
  3. **Trends & Alerts Panel**  
     - Category-level trends  
     - Goal progress trends  
     - Highlight anomalies / outliers  

- **Charts / Visualization**: Recharts / Chart.js / TanStack Charts  
- **Interactivity**: Drill down on transactions, filter by tags, view progress over time  

---

## Deployment (Unraid / Docker)

- **Containers**
  - `backend`: Node.js + Fastify + Drizzle ORM + Sync job
  - `database`: SQLite (persistent volume) or Postgres
  - `frontend`: React static build (served via Nginx or backend static route)
  - Optional: `LLM` container if using local model

- **Volumes**
  - Database files (persistent)  
  - Logs / analytics / configuration  

- **Networking**
  - Containers communicate over Docker network  
  - Frontend → backend via REST API  
  - Optional reverse proxy for access control  

- **Scheduling**
  - Daily sync via cron/node-cron  
  - Optional manual sync trigger  

---

## Example User Questions

- “How much did I spend on car repairs on my Fiesta ST this year?” → `get_tagged_spending("Fiesta ST", "year")`  
- “Is my Outback Fund on track?” → `get_piggy_bank_status("Outback Fund")`  
- “How did my income get allocated this month?” → `analyze_income_allocation()`  
- “Am I overspending this month compared to historical trend?” → `compare_spending("month_to_date")`  
- “What’s my net worth trend over the last 6 months?” → `get_net_worth()`  

---

## Notes

- Focus on **expandable, modular design**  
- Start small with v1 schema & functions, grow over time  
- Dashboard + Q&A console gives both proactive insights and interactive queries  
- Whitelisted functions + structured outputs keep LLM explanations deterministic  
- Fully containerized for easy Unraid deployment  