import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId is required." }, { status: 400 });

  try {
    const account = await query<{account_type:"demo"|"real";currency:string}>(
      `SELECT account_type, currency FROM trading_accounts WHERE id=$1`,
      [accountId]
    );
    if (!account.rows[0]) return NextResponse.json({ error: "Trading account not found." }, { status: 404 });

    const result = await query(
      `SELECT id, order_id, symbol, side, volume, entry_price, stop_loss, take_profit, opened_at
       FROM positions WHERE account_id = $1 AND status = 'open' ORDER BY opened_at DESC`,
      [accountId]
    );

    return NextResponse.json({
      accountType: account.rows[0].account_type,
      currency: account.rows[0].currency,
      positions: result.rows
    });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
