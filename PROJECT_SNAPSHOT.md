# XpendWise Comprehensive Project Snapshot

## 1. Executive Summary

### 1.1 What This Repository Is
XpendWise is a personal-finance application built as a split-stack product:
- A FastAPI backend under `backend/` for authenticated APIs, financial analysis, Lex intelligence, export flows, and persistence.
- A React + TypeScript frontend under `frontend/` for the mobile-style product UI, dashboard, chatbot, Lex entry points, split and EMI screens, and Supabase-authenticated app state.

### 1.2 Product Direction
The repository is positioned as a financial capital-discipline engine rather than a simple subscription tracker. The implemented architecture combines:
- deterministic financial reducers and behavior scoring
- LLM-backed Lex responses with model-tier routing
- a separate support chatbot for product/helpdesk questions
- Supabase-backed authenticated CRUD for core finance objects

### 1.3 Current Reality
The codebase contains both production-style flows and a few in-progress or partially stubbed areas. In practice:
- Core subscription, expense, bank-account, conversation, and export flows are implemented.
- Lex is wired to OpenAI and backed by behavior / surplus / trajectory reducers.
- A local `LexAIProvider` placeholder exists in `backend/app/ai_provider.py`, but it is not integrated into runtime inference.
- Some UI surfaces, such as Split and EMI, currently rely partly or fully on frontend-local state rather than end-to-end backend persistence.
- Some documented features are present in schema or state but are not yet fully closed-loop in execution.

---

## 2. Repository Layout

### 2.1 Top-Level Structure
- `backend/`: FastAPI app, business logic, SQL schema, tests, model placeholder, utilities.
- `frontend/`: Vite React app, shared state, screens, chatbot UI, API client, theme and secure-mode behavior.
- `tests/`: Playwright-style visual test entry points.
- `PROJECT_SNAPSHOT.md`: this architectural snapshot.
- `README.md`: setup and product overview.

### 2.2 Backend Layout
- `backend/app/main.py`: FastAPI app bootstrap, CORS, router registration, request logging.
- `backend/app/routers/`: domain routers including subscriptions, expenses, dashboard, insights, actions, conversations, capital, commitments, onboarding, bank_accounts, export, chatbot.
- `backend/app/lex.py`: Lex orchestration pipeline.
- `backend/app/openai_client.py`: OpenAI tier routing and JSON response generation.
- `backend/app/behavior_engine.py`: deterministic behavior intelligence engine.
- `backend/app/behavior_classifier.py`: LLM-assisted persona / maturity classification hooks.
- `backend/app/behavior_change_detector.py`: proactive alert and forecast support.
- `backend/app/surplus_engine.py`, `capital_allocation_engine.py`, `trajectory_engine.py`: capital discipline calculations.
- `backend/sql/schema.sql`: Supabase/Postgres schema with RLS and indexes.
- `backend/models/`: local model artifact storage, including `LFM2.5-1.2B-Instruct-Q4_K_M.gguf`.

### 2.3 Frontend Layout
- `frontend/App.tsx`: shell app, tab routing, screen switching.
- `frontend/store.tsx`: central app state, Supabase-authenticated data loading, Lex session state, secure mode, alerts, local split/EMI state.
- `frontend/src/lib/api.ts`: Supabase client and authenticated backend fetch wrapper.
- `frontend/components/Chatbot.tsx`: premium support chatbot UI.
- `frontend/screens/`: Dashboard, Insights, ExpenseList, SplitScreen, EMIScreen, Settings, Login, Onboarding, CategoryLogs, SubscriptionDetail, and related views.

---

## 3. Core Functional Domains

### 3.1 Authentication and Session Model
- Frontend uses Supabase auth via `@supabase/supabase-js`.
- Backend dependencies enforce authenticated access for protected routes.
- The frontend explicitly guards sign-out behavior so background auth churn does not force accidental navigation.

### 3.2 Subscription Management
- Backend CRUD exists for subscriptions.
- Schema tracks name, category, amount, billing cycle, next renewal date, auto-pay, and status.
- Action recommendations can identify expensive or entertainment subscriptions and suggest cancellation or switching billing cadence.
- Frontend exposes subscription surfaces and detail views.

### 3.3 Expense Tracking
- Backend CRUD exists for expenses.
- Schema tracks amount, category, date, and payment method.
- Frontend renders a daily-spend / expense-ledger flow and uses expense data inside dashboard and Lex context reduction.

### 3.4 Linked Liquidity / Bank Accounts
- Backend supports bank account CRUD via `bank_accounts` router and schema.
- Frontend dashboard uses linked accounts as a liquidity section.
- Store load path includes a cleanup pass that deduplicates certain bank-account records after fetch.

### 3.5 Capital Discipline and Fixed Commitments
- Backend includes capital, commitments, surplus, allocation, and trajectory engines.
- Schema contains `income`, `fixed_commitments`, `capital_allocation_preferences`, and `capital_trajectory_snapshots`.
- Lex context reduction attempts to pull these records and compute:
	- monthly surplus
	- burn rate
	- recommended allocation percentages
	- 5-year and 10-year current vs disciplined capital paths
	- a discipline score

### 3.6 Export Flows
- `backend/app/routers/export.py` provides:
	- full-profile JSON export
	- expense CSV export
	- monthly statement export

### 3.7 Onboarding and Activation Logic
- Lex supports an activation mode when the user has too little data.
- Data coverage scoring is based on expenses, subscriptions, 90-day history, and category diversity.
- Onboarding router is registered in the backend and the frontend includes onboarding-related screens.

---

## 4. Lex Intelligence Stack

### 4.1 Runtime AI Path
Lex currently runs through OpenAI-backed code, not the local model placeholder.
- `backend/app/openai_client.py` defines:
	- Tier 1: `gpt-4o-mini`
	- Tier 2: `gpt-4o`
- `select_model_tier` upgrades to the deep model for strategic / forecast / long-history prompts.
- `generate_lex_response` forces JSON output so the frontend can consume text, routing, actions, and metadata.

### 4.2 Lex Pipeline
`backend/app/lex.py` performs a multi-layer pipeline:
- data coverage scoring and mode selection
- reduced financial context generation
- deterministic behavior metrics
- advanced behavior signals
- optional behavior persona classification
- proactive-alert injection
- capital intelligence reduction
- OpenAI response generation
- optional message persistence to conversation history

### 4.3 Lex Modes
- `activation`: minimal data, guided onboarding-style replies
- `analysis`: moderate data, standard Tier 1 reasoning
- `strategic`: rich data, higher-depth reasoning with Tier 2 routing available

### 4.4 Conversation Persistence
`backend/app/routers/conversations.py` implements:
- conversation creation
- conversation listing / retrieval / deletion
- message append and retrieval
- action audit logging

Schema support exists for:
- `lex_conversations`
- `lex_messages`
- `lex_action_log`

### 4.5 Important Implementation Note
`backend/app/ai_provider.py` still contains:
- `MockAIProvider` with static mock insights
- `LexAIProvider` placeholder pointing at a local GGUF path

That file is currently a stub path and should be treated as a future integration point rather than the active Lex runtime.

---

## 5. Deterministic Intelligence and Alerts

### 5.1 Behavior Intelligence
The snapshot previously described the behavior engine at a conceptual level; that remains directionally correct. The implemented backend computes deterministic metrics and advanced signals through:
- `backend/app/behavior_engine.py`
- `backend/app/behavior_classifier.py`
- `backend/app/behavior_change_detector.py`

### 5.2 Proactive Intelligence
The current schema and frontend state include a richer proactive layer than the original snapshot explicitly documented.

Implemented data structures include:
- `behavior_alerts` table
- `financial_maturity_history` table
- proactive alert state in `frontend/store.tsx`
- maturity forecast state in `frontend/store.tsx`

The dashboard consumes these alert and forecast concepts, although exact end-to-end completeness varies by route and dataset availability.

### 5.3 Budget Management
The schema contains `category_budgets`, and Lex action execution persists `reduce_budget` actions by upserting `(user_id, category)` budget rows. A dedicated budget-management surface is now available:
- **Backend**: `backend/app/routers/budgets.py` — GET (list), POST (upsert), DELETE CRUD endpoints on `category_budgets`.
- **Frontend**: `frontend/screens/BudgetScreen.tsx` — full UI with per-category progress bars (spent vs limit), inline edit, add via category picker, and delete. Navigable from the Dashboard "Category Budgets" card.

---

## 6. Support Chatbot

### 6.1 Backend Behavior
`backend/app/routers/chatbot.py` implements a dedicated support bot path separate from Lex.
- Model: `gpt-4o-mini`
- Transport: raw OpenAI Chat Completions HTTP call via `httpx`
- Role: product support, privacy/help/safety/navigation/troubleshooting
- Output contract: concise reply plus parsed suggestion chips from `[SUGGEST]` lines

### 6.2 Frontend Behavior
`frontend/components/Chatbot.tsx` provides the animated support-chat surface.
- Framer Motion is actively used.
- Lucide icons are used heavily across the UI.
- The component parses bold segments and suggestion chips for premium-styled display.

---

## 7. Frontend Product Surface

### 7.1 Main Screens Present in the Repo
- Dashboard
- Expenses / Daily Spend
- Subscriptions
- Insights
- Settings
- Split
- EMI
- Category Logs
- Subscription Detail
- Login / Forgot Password / Update Password
- Landing / Onboarding / Insight Reveal

### 7.2 Frontend-Managed Features
The frontend store currently manages several product concepts in local state, including:
- secure mode toggle
- theme mode
- EMI sample data
- friend balances
- shared expenses
- Lex message history and pending actions
- proactive alerts and maturity forecast state

This means the UI surface is broader than the backend persistence surface in some areas.

### 7.3 Split and EMI Audit
The current repo state is uneven across these two domains:

- Split flow: UI-only today.
	- `SplitScreen.tsx` reads `friends` and `sharedExpenses` directly from `frontend/store.tsx` mock/local state.
	- add/invite actions are placeholder alerts.
	- settlement only mutates local React state.
	- No backend router, table, or API client calls were found for split groups, shared expenses, or friend balances.

- EMI flow: partially modeled, but current screen is still UI-local.
	- `EMIScreen.tsx` adds and removes EMI rows only via `setEmis` in local store state.
	- The dashboard includes EMI totals using that same local state.
	- Backend support exists only indirectly through `fixed_commitments` CRUD and Lex debt/commitment reasoning.
	- There is no dedicated EMI table, EMI router, or frontend API integration for the current EMI screen.

### 7.4 UI / Visual Stack
Confirmed frontend dependencies include:
- React 19
- TypeScript
- Vite 6
- Tailwind CSS
- Framer Motion
- Lucide React
- Recharts
- Supabase JS

### 7.5 Experimental / Secondary AI Wiring
`frontend/package.json` and `frontend/vite.config.ts` include `@google/genai` and Gemini env exposure. The main active application intelligence path is still the backend OpenAI integration, but the frontend contains signs of experimental or future Gemini-related wiring.

---

## 8. Database Schema Snapshot

### 8.1 Core Tables Confirmed
- `subscriptions`
- `expenses`
- `category_budgets`
- `lex_conversations`
- `lex_messages`
- `lex_action_log`
- `financial_maturity_history`
- `behavior_alerts`
- `income`
- `capital_allocation_preferences`
- `capital_trajectory_snapshots`
- `fixed_commitments`
- `bank_accounts`

### 8.2 Security Model
- Row Level Security is enabled broadly across user-owned tables.
- Per-user access policies are defined in `schema.sql`.
- Supporting indexes exist for conversations, maturity history, alerts, trajectory, commitments, and bank accounts.

---

## 9. API Surface Registered in FastAPI

`main.py` currently mounts these routers:
- `/subscriptions`
- `/expenses`
- `/dashboard`
- `/insights`
- `/actions`
- `/conversations`
- `/capital`
- `/commitments`
- `/onboarding`
- `/bank-accounts`
- `/export`
- `/chatbot`
- `/budgets`

Additional utility endpoints:
- `/`
- `/health`

---

## 10. Testing and Validation Surface

### 10.1 Backend Tests Present
- `backend/test_backend.py`
- `backend/test_lex_logic.py`
- `backend/test_local_ai.py`
- `backend/test_phase3.py`
- `backend/app/test_main.py`

### 10.2 Frontend / Visual Tests Present
- `tests/screenshots.spec.ts`
- `frontend/tests/screenshots/`
- `test-results/`

This means the repository already includes both backend verification and screenshot-style frontend validation assets, which the previous snapshot did not call out.

---

## 11. Current-State Caveats and Gaps

### 11.1 Implemented but Not Fully Closed-Loop
- `category_budgets` now has a full CRUD router (`/budgets`) and a dedicated `BudgetScreen` with Dashboard navigation. Lex `reduce_budget` actions also write here.
- Split is frontend-only today with no backend persistence path.
- EMI has backend-adjacent support through `fixed_commitments`, but the current EMI screen itself is still local-state driven and not wired to commitments CRUD.
- The support chatbot is fully separated from Lex, but Privacy Policy / Terms of Service content was not found as a first-class routed frontend feature during this review.

### 11.2 Runtime vs Placeholder AI
- OpenAI is the active runtime path for Lex and chatbot features.
- The local GGUF model and `LexAIProvider` class are placeholders at this stage.

### 11.3 Workspace Detail Worth Noting
- The canonical npm app is `frontend/package.json`.
- A root-level `package-lock.json` exists, but the actual dev workflow runs from `frontend/`.

---

## 12. Practical Summary

XpendWise is currently best understood as a premium finance app with:
- real authenticated CRUD for core money objects
- a substantial deterministic financial intelligence layer
- OpenAI-backed Lex orchestration with conversation persistence
- a separate support chatbot
- an ambitious frontend surface that already includes alerts, split, EMI, and secure-mode UX
- a few partially implemented bridges where schema, frontend, and action execution are not yet fully aligned

This document should be used as the current repository-grounded source of truth, not just the intended product vision.
