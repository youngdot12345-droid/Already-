import type { AiPermission } from "@/lib/trading/types";
export type McpTool = { name: string; description: string; permission: AiPermission };

export const MCP_TOOLS: readonly McpTool[] = [
  { name: "market.get_quote", description: "Read the latest quote.", permission: "market.read" },
  { name: "market.get_candles", description: "Read OHLC candles.", permission: "market.read" },
  { name: "account.get_summary", description: "Read the trading account summary.", permission: "account.read" },
  { name: "analysis.get_indicators", description: "Read calculated market indicators.", permission: "analysis.read" },
  { name: "orders.place", description: "Place an authorized trading order.", permission: "orders.place" },
  { name: "orders.modify", description: "Modify stop-loss or take-profit.", permission: "orders.modify" },
  { name: "positions.close", description: "Close an authorized open position.", permission: "positions.close" },
];

export function findMcpTool(name: string) { return MCP_TOOLS.find((tool) => tool.name === name); }
