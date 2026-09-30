import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId is required." }, { status: 400 });
  try {
    const result = await query(
      `SELECT id, order_id, symbol, side, volume, entry_price, stop_loss, take_profit, opened_at
       FROM positions WHERE account_id = $1 AND status = 'open' ORDER BY opened_at DESC`,
      [accountId]
    );
    return NextResponse.json({ positions: result.rows });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
