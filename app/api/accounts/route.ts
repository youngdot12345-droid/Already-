import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";
import { getServerSession } from "@/lib/trading/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const user = await query<{ id: string; email: string; name: string }>(
      `SELECT id,email,name FROM users WHERE lower(email)=lower($1) LIMIT 1`,
      [session.email],
    );
    if (!user.rows[0]) return NextResponse.json({ error: "User record not initialized." }, { status: 404 });

    const accounts = await query(
      `SELECT id,account_type,currency,balance,equity,margin,free_margin,created_at
       FROM trading_accounts
       WHERE user_id=$1
       ORDER BY CASE account_type WHEN 'demo' THEN 0 ELSE 1 END`,
      [user.rows[0].id],
    );

    return NextResponse.json({
      user: user.rows[0],
      accounts: accounts.rows,
      activeAccountPolicy: "client may display either account; server verifies ownership on every operation",
      liveExecutionEnabled: false,
    });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
