import type { AiPermission } from "@/lib/trading/types";

export const NEVER_GRANT: readonly string[]=["funds.withdraw","security.change","account.delete","ai.permissions.change"];

export const DEFAULT_AI_PERMISSIONS: readonly AiPermission[]=[
  "market.read","account.read","analysis.read"
];

export function canAi(permission: string, granted: readonly string[]){
  if(NEVER_GRANT.includes(permission)) return false;
  return granted.includes(permission);
}
