import type { PoolClient } from "pg";

/** Records money retained by Already when its internal trading engine is the counterparty. */
export async function recordAdminTradeLoss(client:PoolClient, positionId:string, accountId:string, amount:number){
  if(!Number.isFinite(amount)||amount<=0) return;
  await client.query(
    `INSERT INTO platform_revenue_ledger(id,source_type,source_id,amount,currency)
     VALUES($1,'trade_loss',$2,$3,'USD')`,
    [crypto.randomUUID(),positionId,amount]
  );
}
