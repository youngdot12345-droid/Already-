import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";
import { canAi } from "@/lib/mcp/permissions";
import { recordAudit } from "@/lib/mcp/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const positionId = typeof body.positionId === "string" ? body.positionId : "";
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];
  if (!canAi("positions.close", permissions)) {
    recordAudit({ actor: "ai", action: "positions.close", allowed: false });
    return NextResponse.json({ error: "Position-close permission is not granted." }, { status: 403 });
  }
  if (!positionId) return NextResponse.json({ error: "positionId is required." }, { status: 400 });

  try {
    const result = await query(
      `UPDATE positions SET status = 'closed', closed_at = NOW()
       WHERE id = $1 AND status = 'open'
       RETURNING id, account_id, symbol, side, volume, entry_price, closed_at`,
      [positionId]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Open position not found." }, { status: 404 });
    recordAudit({ actor: "ai", action: "positions.close", allowed: true, metadata: { positionId } });
    return NextResponse.json({ ok: true, position: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
}
