import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";
import { validateOrderRisk } from "@/lib/trading/risk";
import { demoQuotes, getOpenPositionCount } from "@/lib/trading/store";
import type { Side } from "@/lib/trading/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";
  const side = body.side as Side;
  const volume = Number(body.volume);
  if (!accountId || !symbol || !["buy","sell"].includes(side)) {
    return NextResponse.json({ error: "accountId, symbol and side are required." }, { status: 400 });
  }
  const quote = demoQuotes[symbol];
  if (!quote) return NextResponse.json({ error: "Symbol not supported." }, { status: 400 });
  const entryPrice = side === "buy" ? quote.ask : quote.bid;
  const stopLoss = body.stopLoss === undefined ? undefined : Number(body.stopLoss);
  const takeProfit = body.takeProfit === undefined ? undefined : Number(body.takeProfit);
  const errors = validateOrderRisk({
    entryPrice, openPositions: getOpenPositionCount(),
    limits: { maxVolume: 10, maxOpenPositions: 5 },
    side, volume, stopLoss, takeProfit
  });
  if (errors.length) return NextResponse.json({ error: "Risk validation failed.", details: errors }, { status: 422 });

  try {
    const result = await query(
      `INSERT INTO orders (id, account_id, symbol, side, type, volume, price, stop_loss, take_profit, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'market', $4, $5, $6, $7, 'filled')
       RETURNING id, symbol, side, type, volume, price, stop_loss, take_profit, status, created_at`,
      [accountId, symbol, side, volume, entryPrice, stopLoss ?? null, takeProfit ?? null]
    );
    const order = result.rows[0];
    await query(
      `INSERT INTO positions (id, account_id, order_id, symbol, side, volume, entry_price, stop_loss, take_profit, status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'open')`,
      [accountId, order.id, symbol, side, volume, entryPrice, stopLoss ?? null, takeProfit ?? null]
    );
    return NextResponse.json({ ok: true, order, mode: "demo-persistent" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database unavailable or account does not exist." }, { status: 503 });
  }
}
