CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  equity NUMERIC(20,8) NOT NULL DEFAULT 0,
  margin NUMERIC(20,8) NOT NULL DEFAULT 0,
  free_margin NUMERIC(20,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  type TEXT NOT NULL CHECK (type IN ('market','limit','stop')),
  volume NUMERIC(20,8) NOT NULL CHECK (volume > 0),
  price NUMERIC(30,12),
  stop_loss NUMERIC(30,12),
  take_profit NUMERIC(30,12),
  status TEXT NOT NULL CHECK (status IN ('pending','filled','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  volume NUMERIC(20,8) NOT NULL CHECK (volume > 0),
  entry_price NUMERIC(30,12) NOT NULL,
  stop_loss NUMERIC(30,12),
  take_profit NUMERIC(30,12),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_account_created_idx ON orders(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS positions_account_status_idx ON positions(account_id, status);
\nCREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor TEXT NOT NULL CHECK (actor IN ('user','ai','system')),
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at DESC);


CREATE TABLE IF NOT EXISTS payout_methods (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('opay','paypal')),
  account_reference TEXT NOT NULL,
  display_name TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payout_methods_user_provider_ref_idx
  ON payout_methods(user_id, provider, account_reference);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  payout_method_id UUID NOT NULL REFERENCES payout_methods(id),
  amount NUMERIC(20,8) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','processing','completed','failed','cancelled')),
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS withdrawals_user_created_idx
  ON withdrawals(user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS withdrawal_fee_rules (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('opay','paypal')),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('fixed','percentage','fixed_plus_percentage')),
  fixed_fee NUMERIC(20,8) NOT NULL DEFAULT 0 CHECK (fixed_fee >= 0),
  percentage_fee NUMERIC(10,6) NOT NULL DEFAULT 0 CHECK (percentage_fee >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_ledger (
  id UUID PRIMARY KEY,
  withdrawal_id UUID NOT NULL REFERENCES withdrawals(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('withdrawal','fee','refund')),
  amount NUMERIC(20,8) NOT NULL,
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
