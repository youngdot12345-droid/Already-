import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export async function POST(request: Request) {
  const token = request.headers.get("x-schema-setup-token");
  if (!process.env.DATABASE_SETUP_TOKEN || token !== process.env.DATABASE_SETUP_TOKEN) return NextResponse.json({ error: "Schema setup is protected." }, { status: 403 });
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS trading_accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, currency CHAR(3) NOT NULL DEFAULT 'USD', balance NUMERIC(20,8) NOT NULL DEFAULT 0, equity NUMERIC(20,8) NOT NULL DEFAULT 0, margin NUMERIC(20,8) NOT NULL DEFAULT 0, free_margin NUMERIC(20,8) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE, symbol TEXT NOT NULL, side TEXT NOT NULL CHECK (side IN ('buy','sell')), type TEXT NOT NULL CHECK (type IN ('market','limit','stop')), volume NUMERIC(20,8) NOT NULL CHECK (volume > 0), price NUMERIC(30,12), stop_loss NUMERIC(30,12), take_profit NUMERIC(30,12), status TEXT NOT NULL CHECK (status IN ('pending','filled','cancelled')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS positions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE, order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE, symbol TEXT NOT NULL, side TEXT NOT NULL CHECK (side IN ('buy','sell')), volume NUMERIC(20,8) NOT NULL CHECK (volume > 0), entry_price NUMERIC(30,12) NOT NULL, stop_loss NUMERIC(30,12), take_profit NUMERIC(30,12), status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')), opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), closed_at TIMESTAMPTZ)`);
    return NextResponse.json({ ok: true, schema: "initialized" });
  } catch { return NextResponse.json({ ok: false, error: "Schema initialization failed." }, { status: 503 }); }
}
