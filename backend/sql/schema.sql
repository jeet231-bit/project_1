-- subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    billing_cycle TEXT NOT NULL, -- e.g., 'monthly', 'yearly'
    next_renewal_date DATE NOT NULL,
    auto_pay BOOLEAN DEFAULT TRUE,
    status TEXT NOT NULL, -- e.g., 'active', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce row-level security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to access their own data
CREATE POLICY "Allow users to manage their own subscriptions"
ON subscriptions
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own expenses"
ON expenses
FOR ALL
USING (auth.uid() = user_id);

-- ===================================================================
-- Layer 3: Behavioral Intelligence — category budgets
-- ===================================================================
CREATE TABLE IF NOT EXISTS category_budgets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL,
    monthly_limit NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, category)
);

ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own budgets"
ON category_budgets FOR ALL USING (auth.uid() = user_id);

-- ===================================================================
-- Layer 4: Strategic AI — long-term Lex intelligence memory
-- ===================================================================

-- Each conversation session (one per user, can have many)
CREATE TABLE IF NOT EXISTS lex_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT,                              -- auto-generated from first query
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    strategy_summary TEXT,                   -- condensed strategic profile for cross-session continuity
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS lex_messages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    conversation_id UUID REFERENCES lex_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,                              -- which model produced this (null for user msgs)
    tokens_used INT,                         -- track cost per message
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action audit log — track every executed action
CREATE TABLE IF NOT EXISTS lex_action_log (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    conversation_id UUID REFERENCES lex_conversations(id),
    action_type TEXT NOT NULL,
    label TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT NOT NULL,                    -- success / failed / skipped
    detail TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lex_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lex_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lex_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their conversations"
ON lex_conversations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see their conversation messages"
ON lex_messages FOR ALL
USING (conversation_id IN (SELECT id FROM lex_conversations WHERE user_id = auth.uid()));

CREATE POLICY "Users see their action logs"
ON lex_action_log FOR ALL USING (auth.uid() = user_id);

-- Index for fast conversation lookups
CREATE INDEX IF NOT EXISTS idx_lex_conversations_user ON lex_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lex_messages_convo ON lex_messages(conversation_id, created_at);


-- ===================================================================
-- Layer 5: Financial Maturity History — longitudinal persona tracking
-- ===================================================================

CREATE TABLE IF NOT EXISTS financial_maturity_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    maturity_score INT NOT NULL,                 -- 0-100 Financial Maturity Index
    classification TEXT NOT NULL,                 -- At Risk / Foundation / Developing / Advanced
    persona TEXT NOT NULL,                        -- The Optimizer, The Drifter, etc.
    persona_confidence FLOAT DEFAULT 0.5,
    components JSONB DEFAULT '{}',               -- component scores snapshot
    behavior_snapshot JSONB DEFAULT '{}',         -- key metrics at time of snapshot
    previous_persona TEXT,                        -- persona from the prior snapshot (for evolution)
    persona_changed BOOLEAN DEFAULT FALSE,
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE financial_maturity_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their maturity history"
ON financial_maturity_history FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_maturity_history_user ON financial_maturity_history(user_id, snapshot_at DESC);


-- ===================================================================
-- Layer 6: Proactive Intelligence — behavior change alerts
-- ===================================================================

CREATE TABLE IF NOT EXISTS behavior_alerts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    alert_type TEXT NOT NULL,                       -- maturity_drop, burden_spike, volatility_surge, persona_shift, drift_increase, maturity_forecast
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metric_deltas JSONB DEFAULT '{}',               -- { delta_maturity: -8, delta_volatility: +18, ... }
    suggested_action TEXT,                          -- human-readable action
    suggested_action_type TEXT,                     -- cancel_subscription, reduce_budget, review_spending, etc.
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE behavior_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their behavior alerts"
ON behavior_alerts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_behavior_alerts_user ON behavior_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_alerts_unread ON behavior_alerts(user_id, is_read, is_dismissed);


-- ===================================================================
-- Layer 7: Capital Discipline Engine — income, allocation & trajectory
-- ===================================================================

-- User income sources (salary, freelance, side income, etc.)
CREATE TABLE IF NOT EXISTS income (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    source TEXT NOT NULL,                            -- e.g. 'Salary', 'Freelance', 'Investments'
    amount NUMERIC(12, 2) NOT NULL,                  -- amount per period
    frequency TEXT NOT NULL DEFAULT 'monthly',        -- 'monthly', 'yearly', 'weekly'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their income records"
ON income FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_income_user ON income(user_id);


-- Capital allocation preferences (user's desired split of surplus)
CREATE TABLE IF NOT EXISTS capital_allocation_preferences (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    savings_pct NUMERIC(5, 2) NOT NULL DEFAULT 50,       -- % of surplus → savings
    investment_pct NUMERIC(5, 2) NOT NULL DEFAULT 30,     -- % of surplus → investment
    debt_repayment_pct NUMERIC(5, 2) NOT NULL DEFAULT 10, -- % of surplus → debt payoff
    lifestyle_pct NUMERIC(5, 2) NOT NULL DEFAULT 10,      -- % of surplus → discretionary
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

ALTER TABLE capital_allocation_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their allocation preferences"
ON capital_allocation_preferences FOR ALL USING (auth.uid() = user_id);


-- Capital trajectory snapshots (periodic forecast records)
CREATE TABLE IF NOT EXISTS capital_trajectory_snapshots (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    monthly_income NUMERIC(12, 2) NOT NULL,
    monthly_expenses NUMERIC(12, 2) NOT NULL,
    monthly_subscriptions NUMERIC(12, 2) NOT NULL,
    monthly_surplus NUMERIC(12, 2) NOT NULL,
    burn_rate NUMERIC(5, 2) NOT NULL,                    -- expenses / income as ratio
    allocation_snapshot JSONB DEFAULT '{}',               -- copy of allocation prefs at snapshot time
    current_path_5y NUMERIC(14, 2),                       -- projected capital on current path (5 yr)
    disciplined_path_5y NUMERIC(14, 2),                   -- projected capital if disciplined (5 yr)
    current_path_10y NUMERIC(14, 2),
    disciplined_path_10y NUMERIC(14, 2),
    forecast_series JSONB DEFAULT '[]',                   -- [{month, current, disciplined}, ...]
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE capital_trajectory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their trajectory snapshots"
ON capital_trajectory_snapshots FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trajectory_user ON capital_trajectory_snapshots(user_id, snapshot_at DESC);


-- ===================================================================
-- Layer 8: Fixed Commitments — rent, EMI, insurance, etc.
-- ===================================================================

CREATE TABLE IF NOT EXISTS fixed_commitments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,                              -- e.g. 'Rent', 'Car EMI', 'Health Insurance'
    category TEXT NOT NULL DEFAULT 'General',        -- Rent, EMI, Insurance, Utility, Loan, etc.
    amount NUMERIC(12, 2) NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',        -- 'monthly', 'yearly', 'weekly', 'quarterly'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fixed_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their fixed commitments"
ON fixed_commitments FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fixed_commitments_user ON fixed_commitments(user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- LAYER 9: BANK ACCOUNTS (Linked Liquidity)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bank_accounts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    bank_name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'Savings',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    last_four TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their bank accounts"
ON bank_accounts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id);
