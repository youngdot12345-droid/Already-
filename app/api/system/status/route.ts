import { NextResponse } from "next/server";
import { getDbStatus } from "@/lib/trading/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    service: "already-trading",
    environment: process.env.NODE_ENV,
    database: getDbStatus(),
    liveExecution: false,
    marketData: "demo",
  });
}
