import { query } from "@/lib/trading/postgres";

export type AuditEvent = {
  id:string; actor:"user"|"ai"|"system"; action:string; allowed:boolean;
  createdAt:string; metadata?:Record<string,string>;
};

export async function recordPersistentAudit(event:Omit<AuditEvent,"id"|"createdAt">){
  const id=crypto.randomUUID();
  const createdAt=new Date().toISOString();
  await query(
    `INSERT INTO audit_events(id,actor,action,allowed,metadata,created_at)
     VALUES($1,$2,$3,$4,$5::jsonb,$6)`,
    [id,event.actor,event.action,event.allowed,JSON.stringify(event.metadata??{}),createdAt]
  );
  return {...event,id,createdAt};
}

export async function listPersistentAudit(limit=100){
  const safeLimit=Math.min(Math.max(Number(limit)||100,1),500);
  const r=await query<any>(
    `SELECT id,actor,action,allowed,metadata,created_at
     FROM audit_events ORDER BY created_at DESC LIMIT $1`,[safeLimit]);
  return r.rows.map((x:any)=>({
    id:x.id,actor:x.actor,action:x.action,allowed:x.allowed,
    metadata:x.metadata??undefined,createdAt:x.created_at
  }));
}
