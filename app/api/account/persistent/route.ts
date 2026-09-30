import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  try {
    const result = await query(
      `SELECT a.id, a.currency, a.balance, a.equity, a.margin, a.free_margin
       FROM trading_accounts a
       WHERE a.user_id = $1
       ORDER BY a.created_at ASC
       LIMIT 1`,
      [userId]
    );
    if (!result.rows[0]) return NextResponse.json({ account: null });
    return NextResponse.json({ account: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
