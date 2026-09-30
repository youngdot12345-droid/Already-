import { NextResponse } from "next/server";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { getDbStatus } from "@/lib/trading/db";

export async function GET() {
  return NextResponse.json({
    platform: "Already",
    mode: "foundation",
    database: getDbStatus(),
    capabilities: {
      marketData: "demo",
      trading: "demo",
      mcp: MCP_TOOLS.map((tool) => tool.name),
      persistentOrders: false,
      liveBrokerExecution: false,
    },
    protected: [
      "funds.withdraw",
      "security.change",
      "account.delete",
      "ai.permissions.change",
    ],
  });
}
