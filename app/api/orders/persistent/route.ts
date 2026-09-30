import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId is required." }, { status: 400 });

  try {
    const result = await query(
      `SELECT id, symbol, side, type, volume, price, stop_loss, take_profit, status, created_at
       FROM orders WHERE account_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [accountId]
    );
    return NextResponse.json({ orders: result.rows });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
