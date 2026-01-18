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
