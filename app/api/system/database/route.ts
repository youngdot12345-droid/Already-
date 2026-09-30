import { NextResponse } from "next/server";
import { query } from "@/lib/trading/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await query<{ now: string }>("SELECT NOW() AS now");
    return NextResponse.json({ ok: true, database: "postgres", connected: true, serverTime: result.rows[0]?.now });
  } catch {
    return NextResponse.json(
      { ok: false, database: "postgres", connected: false },
      { status: 503 }
    );
  }
}
