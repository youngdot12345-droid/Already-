import { NextResponse } from "next/server";
import { listAuditEvents } from "@/lib/mcp/audit";
export async function GET() {
  return NextResponse.json({ events: listAuditEvents(), note: "Demo audit store; persistent storage will be added with the production database." });
}
