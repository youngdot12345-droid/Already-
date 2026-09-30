import { NextResponse } from "next/server";
import { canAi } from "@/lib/mcp/permissions";
import { validateOrderRisk, normalizeOrder } from "@/lib/trading/risk";
import { addOrder, demoQuotes, getOpenPositionCount, listOrders } from "@/lib/trading/store";
import type { Order, Side } from "@/lib/trading/types";

export const dynamic = "force-dynamic";
const LIMITS = { maxVolume: 10, maxOpenPositions: 5 };

export async function GET() { return NextResponse.json({ source: "demo", orders: listOrders() }); }

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";
  const side = body.side as Side;
  const permissionList = Array.isArray(body.permissions) ? body.permissions : [];
  if (!canAi("orders.place", permissionList)) return NextResponse.json({ error: "AI order permission is not granted." }, { status: 403 });
  if (!["buy", "sell"].includes(side)) return NextResponse.json({ error: "Side must be buy or sell." }, { status: 400 });
  const quote = demoQuotes[symbol];
  if (!quote) return NextResponse.json({ error: "Symbol not supported." }, { status: 400 });
  const entryPrice = side === "buy" ? quote.ask : quote.bid;
  const order: Order = normalizeOrder({
    id: crypto.randomUUID(), symbol, side, type: "market", volume: Number(body.volume), price: entryPrice,
    stopLoss: body.stopLoss === undefined ? undefined : Number(body.stopLoss),
    takeProfit: body.takeProfit === undefined ? undefined : Number(body.takeProfit),
    status: "filled", createdAt: new Date().toISOString(),
  });
  const errors = validateOrderRisk({ entryPrice, openPositions: getOpenPositionCount(), limits: LIMITS, side,
    volume: order.volume, stopLoss: order.stopLoss, takeProfit: order.takeProfit });
  if (errors.length) return NextResponse.json({ error: "Risk validation failed.", details: errors }, { status: 422 });
  return NextResponse.json({ ok: true, order: addOrder(order), mode: "demo" }, { status: 201 });
}
