import { getServerSession, type TradingSession } from "@/lib/trading/session";
import type { AiPermission } from "@/lib/trading/types";
import { DEFAULT_AI_PERMISSIONS, NEVER_GRANT } from "@/lib/mcp/permissions";

export async function getServerAiPermissions(): Promise<{
  session: TradingSession | null;
  permissions: readonly string[];
}> {
  const session = await getServerSession();
  if (!session) return { session: null, permissions: [] };

  const permissions = [...DEFAULT_AI_PERMISSIONS] as string[];
  if (process.env.AI_TRADING_ENABLED === "true") {
    permissions.push("orders.place", "orders.modify", "positions.close");
  }
  return {
    session,
    permissions: permissions.filter((permission) => !NEVER_GRANT.includes(permission)),
  };
}

export function hasServerAiPermission(
  permission: AiPermission,
  granted: readonly string[],
) {
  return !NEVER_GRANT.includes(permission) && granted.includes(permission);
}
