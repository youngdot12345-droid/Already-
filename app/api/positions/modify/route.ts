import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";
import { recordAudit } from "@/lib/mcp/audit";
import { getServerAiPermissions, hasServerAiPermission } from "@/lib/mcp/server-permissions";

export async function POST(request: Request) {
  const { session, permissions } = await getServerAiPermissions();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasServerAiPermission("orders.modify", permissions)) {
    recordAudit({ actor: "ai", action: "orders.modify", allowed: false });
    return NextResponse.json({ error: "AI order-modify permission is not enabled for this server." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const positionId = typeof body.positionId === "string" ? body.positionId : "";
  const stopLoss = body.stopLoss === undefined ? null : Number(body.stopLoss);
  const takeProfit = body.takeProfit === undefined ? null : Number(body.takeProfit);
  if (!positionId) return NextResponse.json({ error: "positionId is required." }, { status: 400 });
  if (stopLoss !== null && (!Number.isFinite(stopLoss) || stopLoss <= 0)) return NextResponse.json({ error: "Invalid stop-loss." }, { status: 400 });
  if (takeProfit !== null && (!Number.isFinite(takeProfit) || takeProfit <= 0)) return NextResponse.json({ error: "Invalid take-profit." }, { status: 400 });

  try {
    const current = await query<{ side: "buy"|"sell"; entry_price: number; account_type: "demo"|"real" }>(
      `SELECT p.side, p.entry_price, a.account_type
       FROM positions p
       JOIN trading_accounts a ON a.id = p.account_id
       JOIN users u ON u.id = a.user_id
       WHERE p.id = $1 AND p.status = 'open' AND lower(u.email) = lower($2)`,
      [positionId, session.email]
    );
    const position = current.rows[0];
    if (!position) return NextResponse.json({ error: "Open position not found." }, { status: 404 });

    if (position.account_type !== "demo") {
      return NextResponse.json({
        error: "Real-money execution is disabled until a verified broker/execution connection is configured.",
        code: "LIVE_EXECUTION_DISABLED"
      }, { status: 403 });
    }

    if (stopLoss !== null && (position.side === "buy" ? stopLoss >= position.entry_price : stopLoss <= position.entry_price))
      return NextResponse.json({ error: "Stop-loss is on the wrong side of entry." }, { status: 422 });
    if (takeProfit !== null && (position.side === "buy" ? takeProfit <= position.entry_price : takeProfit >= position.entry_price))
      return NextResponse.json({ error: "Take-profit is on the wrong side of entry." }, { status: 422 });

    const result = await query(
      `UPDATE positions SET stop_loss = $1, take_profit = $2 WHERE id = $3 AND status = 'open'
       RETURNING id, symbol, side, volume, entry_price, stop_loss, take_profit`,
      [stopLoss, takeProfit, positionId]
    );
    recordAudit({ actor: "ai", action: "orders.modify", allowed: true, metadata: { positionId } });
    return NextResponse.json({ ok: true, position: result.rows[0], mode: "demo-persistent" });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
