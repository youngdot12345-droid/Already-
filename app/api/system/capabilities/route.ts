import { NextResponse } from "next/server";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { getDbStatus } from "@/lib/trading/db";
import { PLATFORM_CURRENCY } from "@/lib/trading/currency";

export async function GET() {
  return NextResponse.json({
    platform: "Already",
    mode: "foundation",
    baseCurrency: PLATFORM_CURRENCY,
    accountModes: {
      demo: {
        enabled: true,
        startingBalance: 10000,
        currency: "USD",
        execution: "demo"
      },
      real: {
        enabled: true,
        startingBalance: 0,
        currency: "USD",
        execution: "disabled-until-verified-broker"
      }
    },
    database: getDbStatus(),
    capabilities: {
      marketData: "demo",
      trading: "demo",
      mcp: MCP_TOOLS.map((tool) => tool.name),
      persistentOrders: true,
      withdrawals: {
        providers: ["opay", "paypal"],
        displayCurrency: PLATFORM_CURRENCY,
        localSettlement: { opay: "NGN" }
      },
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
