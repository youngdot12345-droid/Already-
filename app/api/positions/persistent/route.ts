import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";
import { getServerSession } from "@/lib/trading/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId is required." }, { status: 400 });

  try {
    const account = await query<{account_type:"demo"|"real";currency:string}>(
      `SELECT a.account_type, a.currency
       FROM trading_accounts a
       JOIN users u ON u.id = a.user_id
       WHERE a.id=$1 AND lower(u.email)=lower($2)`,
      [accountId, session.email]
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
