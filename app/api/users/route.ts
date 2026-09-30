import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || !name) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });

  try {
    const user = await query<{ id: string; email: string; name: string; created_at: string }>(
      `INSERT INTO users (id, email, name) VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, email, name, created_at`,
      [email, name]
    );

    const userId = user.rows[0].id;
    const demo = await query(
      `INSERT INTO trading_accounts (id, user_id, account_type, currency, balance, equity, free_margin)
       SELECT gen_random_uuid(), $1, 'demo', 'USD', 10000, 10000, 10000
       WHERE NOT EXISTS (
         SELECT 1 FROM trading_accounts WHERE user_id=$1 AND account_type='demo'
       )
       RETURNING id, account_type, currency, balance, equity, margin, free_margin`,
      [userId]
    );

    const real = await query(
      `INSERT INTO trading_accounts (id, user_id, account_type, currency, balance, equity, free_margin)
       SELECT gen_random_uuid(), $1, 'real', 'USD', 0, 0, 0
       WHERE NOT EXISTS (
         SELECT 1 FROM trading_accounts WHERE user_id=$1 AND account_type='real'
       )
       RETURNING id, account_type, currency, balance, equity, margin, free_margin`,
      [userId]
    );

    const accounts = await query(
      `SELECT id, account_type, currency, balance, equity, margin, free_margin
       FROM trading_accounts WHERE user_id=$1 ORDER BY CASE account_type WHEN 'demo' THEN 0 ELSE 1 END`,
      [userId]
    );

    return NextResponse.json({
      user: user.rows[0],
      accounts: accounts.rows,
      demoAccount: demo.rows[0] ?? accounts.rows.find((x:any)=>x.account_type==="demo") ?? null,
      realAccount: real.rows[0] ?? accounts.rows.find((x:any)=>x.account_type==="real") ?? null,
      liveExecutionEnabled: false,
      message: "Demo and real account records are available. Real-money execution remains disabled until a verified broker/execution connection is configured."
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database unavailable or schema is not initialized." }, { status: 503 });
  }
}
