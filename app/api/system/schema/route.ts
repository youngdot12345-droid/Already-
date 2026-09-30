import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export async function POST() {
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await query(`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await query(`CREATE TABLE IF NOT EXISTS trading_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency CHAR(3) NOT NULL DEFAULT 'USD', balance NUMERIC(20,8) NOT NULL DEFAULT 0,
      equity NUMERIC(20,8) NOT NULL DEFAULT 0, margin NUMERIC(20,8) NOT NULL DEFAULT 0,
      free_margin NUMERIC(20,8) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await query(`CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL, side TEXT NOT NULL CHECK (side IN ('buy','sell')),
      type TEXT NOT NULL CHECK (type IN ('market','limit','stop')), volume NUMERIC(20,8) NOT NULL CHECK (volume > 0),
      price NUMERIC(30,12), stop_loss NUMERIC(30,12), take_profit NUMERIC(30,12),
      status TEXT NOT NULL CHECK (status IN ('pending','filled','cancelled')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    return NextResponse.json({ ok: true, schema: "initialized" });
  } catch {
    return NextResponse.json({ ok: false, error: "Schema initialization failed." }, { status: 503 });
  }
}
